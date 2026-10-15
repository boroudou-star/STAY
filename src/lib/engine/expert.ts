import { AREA_EXPERTS, conceptFor, conceptsIn, type AreaExpert, type ConceptKnowledge } from "@/data/insight-expert";
import { AREA_MAP } from "@/data/insights";
import type { ChatTurn, ExpertSummary, ExpertTopic } from "@/lib/types";
import { tokens, wordCount } from "./text";

/**
 * The STAY industry expert, rule-based version.
 * It is used when no AI key is set, and as the fallback when an AI call fails.
 * It is stateless: every reply is worked out from the topic and the transcript so far.
 *
 * Principles: react to what the student actually wrote, never praise what wasn't earned,
 * correct answers that are off topic, teach when they're stuck, and only move deeper
 * once they've given a real answer.
 */

export const MAX_USER_TURNS = 8;

const GENERIC: AreaExpert = {
  title: "Industry expert",
  background: "has hired and mentored graduates across several industries",
  vocab: [],
  whyEmployers: "Employers want graduates who can explain an idea simply, back it with an example and say what it means for the business.",
  debates: ["Is this a lasting change or a short-term trend?"],
};

export function expertFor(topic: Pick<ExpertTopic, "area">): AreaExpert {
  return (topic.area && AREA_EXPERTS[topic.area]) || GENERIC;
}

/** "consulting expert", "AI industry expert": for use mid-sentence. */
export function expertNoun(topic: Pick<ExpertTopic, "area">) {
  const t = expertFor(topic).title;
  return t.startsWith("AI ") ? t : t.toLowerCase();
}

/** The concept this discussion is about, if STAY has knowledge for it. */
export function conceptOf(topic: ExpertTopic): ConceptKnowledge | undefined {
  if (topic.concept) return conceptFor(topic.concept);
  if (topic.kind === "concept" || topic.kind === "plan") return conceptFor(topic.question);
  if (topic.kind === "primer" && topic.primer && topic.area) {
    // Only borrow a concept when the primer is clearly about it
    const text = `${topic.primer.title} ${topic.primer.body} ${topic.question}`.toLowerCase();
    const scored = conceptsIn(AREA_MAP[topic.area].keyConcepts)
      .map((c) => ({ c, hits: c.keywords.filter((k) => hasTerm(text, k)).length }))
      .sort((a, b) => b.hits - a.hits);
    if (scored[0] && scored[0].hits >= 3) return scored[0].c;
  }
  return undefined;
}

/** Concept name for use mid-sentence: "inference cost", but "AI regulation" and "SaaS metrics" keep their capitals. */
export function cname(c: ConceptKnowledge) {
  const first = c.concept.split(" ")[0];
  return /[A-Z].*[A-Z&]|^[A-Z&]+$/.test(first) ? c.concept : c.concept.charAt(0).toLowerCase() + c.concept.slice(1);
}

function topicName(topic: ExpertTopic, c?: ConceptKnowledge) {
  if (c) return cname(c);
  if (topic.kind === "company" && topic.company) return topic.company;
  if (topic.item) return "this story";
  if (topic.primer) return topic.primer.title.toLowerCase();
  return "this topic";
}

/* ------------------------------------------------------------------ */
/* Reading an answer honestly                                          */
/* ------------------------------------------------------------------ */

export type AnswerKind = "meta" | "unsure" | "low" | "list" | "off" | "dodge" | "ok";

export interface Assessment {
  kind: AnswerKind;
  words: number;
  quote: string;
  reasoning: boolean;
  example: boolean;
  view: boolean;
  /** How many topic terms the answer uses */
  onTopic: number;
  listItems: string[];
}

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");

function hasTerm(text: string, term: string) {
  const t = term.toLowerCase();
  if (t.includes(" ") || t.length <= 3) return new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(text);
  return text.includes(t);
}

function topicTerms(topic: ExpertTopic, c?: ConceptKnowledge): string[] {
  if (c) return [...c.keywords, ...tokens(c.concept)];
  const out = [...tokens(topic.question)];
  if (topic.item) out.push(...tokens(topic.item.title));
  if (topic.primer) out.push(...tokens(`${topic.primer.title} ${topic.primer.body}`));
  if (topic.company) out.push(...tokens(topic.company), "customers", "revenue", "competitors", "money", "growth", "product", "business");
  if (topic.area) out.push(...expertFor(topic).vocab);
  return out;
}

function countOnTopic(answer: string, terms: string[]) {
  const lower = answer.toLowerCase();
  const stems = new Set(tokens(answer).map(stem));
  const hit = new Set<string>();
  for (const t of terms) {
    if (t.includes(" ") || t.length <= 3 ? hasTerm(lower, t) : stems.has(stem(t)) || lower.includes(t.toLowerCase())) hit.add(stem(t.toLowerCase()));
  }
  return hit.size;
}

const META = /\b(same question|asked (me )?(that|this|the same)|you('ve| have)? (already )?asked|you keep asking|repeat(ing|ed)? (yourself|the question)|already (answered|said)|this is (pointless|useless|stupid|annoying|boring)|stop asking|again\?)/i;
const UNSURE = /^(idk|i ?d(o|u)n'?t know|i do not know|not sure|no idea|dunno|no clue|unsure|i'?m not sure|i am not sure|explain( it| this| that)?( first| to me| please)?|can you explain|what does (that|this|it) mean|what is (that|this|it)|\?+|help|pass|skip)\b/i;
const REASON = /\b(because|since|so that|which means|this means|that means|therefore|as a result|leads? to|due to|driven by|that's why|thats why|so they|so it|so the|so companies|so people|in order to|otherwise|if .{2,40} then)\b/i;
const EXAMPLE = /\b(for example|for instance|such as|e\.g\.?|like when|take the case|in my (job|internship|project|course|degree|dissertation)|when i (worked|was|built|did))\b|\d/i;
const VIEW = /\b(i think|i believe|in my view|my view|i'd argue|i would argue|i expect|i'm not convinced|i am not convinced|i disagree|i agree|i'd bet|i doubt|i reckon|personally|i'm sceptical|i am sceptical|i'm skeptical|my bet|i'd say|i would say)\b/i;

function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A short, exact quote from the answer, preferring the sentence with their reasoning. */
export function quoteOf(answer: string, max = 14) {
  const ss = sentences(answer);
  const pick = ss.find((s) => REASON.test(s)) ?? ss.find((s) => VIEW.test(s)) ?? [...ss].sort((a, b) => wordCount(b) - wordCount(a))[0] ?? answer.trim();
  const words = pick.replace(/[.!?]+$/, "").split(/\s+/);
  return words.length > max ? `${words.slice(0, max).join(" ")}…` : words.join(" ");
}

function listItemsOf(answer: string) {
  const parts = answer
    .split(/,|;|\n|\band\b|\bor\b|\//i)
    .map((p) => p.trim().replace(/^[-•*\d.)\s]+/, ""))
    .filter(Boolean);
  if (parts.length < 3) return [];
  if (parts.some((p) => wordCount(p) > 3)) return [];
  if (REASON.test(answer) || VIEW.test(answer)) return [];
  return parts;
}

export function assessAnswer(answer: string, topic: ExpertTopic, opts: { allowOffTopic?: boolean } = {}): Assessment {
  const text = answer.trim();
  const c = conceptOf(topic);
  const words = wordCount(text);
  const onTopic = countOnTopic(text, topicTerms(topic, c));
  const base = { words, quote: quoteOf(text), reasoning: REASON.test(text), example: EXAMPLE.test(text), view: VIEW.test(text), onTopic, listItems: [] as string[] };
  if (!text) return { ...base, kind: "low" };
  if (META.test(text) && words < 30) return { ...base, kind: "meta" };
  if (UNSURE.test(text) && words < 14) return { ...base, kind: "unsure" };
  const items = listItemsOf(text);
  if (items.length) return { ...base, kind: "list", listItems: items };
  if (words < 6) return { ...base, kind: "low" };
  // Real words at all? ("asdf qwer zxcv")
  if (tokens(text).filter((w) => /[aeiou]/.test(w)).length < 2) return { ...base, kind: "low" };
  // Only call an answer off topic early on. Later answers rightly build on the conversation, not on keywords.
  if ((opts.allowOffTopic ?? true) && onTopic === 0 && words < 60) return { ...base, kind: "off" };
  return { ...base, kind: "ok" };
}

/* ------------------------------------------------------------------ */
/* Stages of the discussion                                            */
/* ------------------------------------------------------------------ */

export type Stage = "understand" | "example" | "mechanism" | "view" | "counter" | "sowhat";

const PLAN: Record<ExpertTopic["kind"], Stage[]> = {
  concept: ["understand", "example", "mechanism", "view", "counter", "sowhat"],
  primer: ["understand", "example", "mechanism", "view", "counter", "sowhat"],
  plan: ["understand", "example", "mechanism", "view", "counter", "sowhat"],
  news: ["understand", "mechanism", "view", "counter", "sowhat"],
  podcast: ["understand", "view", "counter", "sowhat"],
  company: ["understand", "mechanism", "view", "counter", "sowhat"],
};

export function stagesFor(topic: ExpertTopic) {
  return PLAN[topic.kind] ?? PLAN.concept;
}

/** Notes that already cover the first step let the discussion start one level deeper. */
function noteOffset(topic: ExpertTopic) {
  const n = topic.notes ?? {};
  const first = (n.summary ?? n.ideas ?? "").trim();
  return wordCount(first) >= 8 ? 1 : 0;
}

function employer(topic: ExpertTopic) {
  if (topic.company) return `an interviewer at ${topic.company}`;
  if (topic.area) return `an interviewer in ${AREA_MAP[topic.area].label.toLowerCase()}`;
  return "an interviewer";
}

function firstSentence(text: string) {
  return sentences(text)[0] ?? text;
}

/** Candidate questions for a stage, best first. Later ones are easier or come from a different angle. */
function questionsFor(stage: Stage, topic: ExpertTopic, c: ConceptKnowledge | undefined, lastQuote: string): string[] {
  const name = topicName(topic, c);
  const co = topic.company;
  const scaffold = c ? `Finish this sentence: "${c.scaffold}"` : undefined;
  const pick = (...qs: (string | undefined)[]) => qs.filter((q): q is string => Boolean(q));

  if (stage === "understand") {
    if (topic.kind === "primer" || topic.kind === "plan")
      return pick(topic.question, c ? `Forget the jargon. If a friend asked you what ${cname(c)} means, what would you say in one sentence?` : `Let's make it smaller. What is the one idea at the heart of this, in your own words?`, scaffold ?? `Finish this sentence: "This is really about ___."`);
    if (c) return pick(`Explain ${cname(c)} to me in your own words, as if I'd never heard of it. What is it, and why would a company care?`, `Forget the jargon. If a friend asked you what ${cname(c)} means, what would you say in one sentence?`, scaffold);
    if (topic.kind === "news") return pick(`I've only got the headline in front of me, so start there: what actually happened, in your own words, and who does it affect most?`, `Strip it back: who did what, and why did it make the news?`, `Finish this sentence: "This story is about ___, and the people most affected are ___."`);
    if (topic.kind === "podcast") return pick(`What was the episode about, and what was the main argument? One or two sentences.`, `If you had to tweet the episode's main idea, what would the tweet say?`, `Finish this sentence: "The guest's main point was ___."`);
    if (topic.kind === "company" && co) return pick(topic.question, `Start with the money: who pays ${co}, and what exactly are they paying for?`, `Finish this sentence: "${co} makes most of its money from ___, who pay because ___."`);
    return pick(topic.question, `Let's make it smaller. What is the one idea at the heart of this, in your own words?`, `Finish this sentence: "This is really about ___."`);
  }
  if (stage === "example") {
    if (c) return pick(`Give me one real example where ${cname(c)} matters: a company, a product, or something you've seen yourself.`, `Think of an app or company you actually use. Where does ${cname(c)} show up for them?`, scaffold);
    return pick(`Give me one concrete example: a company, product or story that shows what you mean.`, `Name one company where you've seen this happen. What did they do?`);
  }
  if (stage === "mechanism") {
    if (c) return pick(c.mechanism, `Walk me through cause and effect: what happens first, and what does that lead to?`);
    if (topic.kind === "news") return pick(`Why is this happening now rather than five years ago? Point to the driver: money, technology, regulation or customer behaviour.`, `Who gains from this and who loses? Name one of each.`);
    if (topic.kind === "company" && co) return pick(`Why do customers stay with ${co} instead of switching to a competitor? Name the competitor you have in mind.`, `What would a competitor need to do to take ${co}'s customers?`);
    return pick(`Walk me through how that actually works. What causes what?`, `Who gains from this and who loses? Name one of each.`);
  }
  if (stage === "view") {
    const debate = c?.debate ?? (topic.company ? undefined : expertFor(topic).debates[0]);
    if (topic.kind === "company" && co) return pick(`What's the biggest risk to ${co} in the next few years, and why that one rather than another?`, `If you were advising ${co}'s CEO, what would you tell them to worry about?`);
    if (topic.kind === "news") return pick(`What happens next? Give me a prediction specific enough that you could be proved wrong.`, debate ? `Here's a related debate: ${debate} Where do you land?` : undefined);
    if (topic.kind === "podcast") return pick(`Do you actually buy the guest's argument? What's the weakest part of it?`, `Where would you push back if you were interviewing the guest?`);
    return pick(debate ? `Here's where people genuinely disagree: ${debate} Which side are you closer to, and why?` : `Where do you stand on this, and why?`, `Pick a side, even if you're only 60% sure. What tips you?`);
  }
  if (stage === "counter") {
    return pick(
      lastQuote ? `Now argue against yourself. What's the strongest case against "${lastQuote}"?` : `Now argue against yourself. What's the strongest case against your view?`,
      `Who would disagree with you, and what's their best argument?`,
      `What evidence would change your mind?`,
    );
  }
  return pick(
    `Last one. If ${employer(topic)} asked why ${name} matters to their business, what would you say in two sentences?`,
    `How would you bring this up naturally in an interview? Give me the two sentences you'd actually say.`,
  );
}

/** Expert context worth adding after a good answer at this stage. */
function contextAfter(stage: Stage, topic: ExpertTopic, c: ConceptKnowledge | undefined, a: Assessment): [lead: string, text: string] | undefined {
  const ex = expertFor(topic);
  if (c) {
    if (stage === "understand") return [a.onTopic >= 2 ? "To sharpen it, the way I'd put it: " : "Here's what you're missing. ", c.explain];
    if (stage === "example") return ["Another one I use when explaining it: ", c.example];
    if (stage === "mechanism") return ["Why this matters for hiring: ", c.whyEmployers];
    if (stage === "view") return a.reasoning ? undefined : ["", `A position without a reason is just a guess, and interviewers will ask "why" straight away.`];
    if (stage === "counter") return ["", ex.whyEmployers];
    return undefined;
  }
  if (topic.kind === "company") {
    if (stage === "understand") return ["", `A habit worth building: always split it into who pays, what for, and how often. Recurring revenue, like subscriptions or a fee on every transaction, is valued more than one-off sales because it's predictable.`];
    if (stage === "mechanism") return ["", `The usual reasons customers stay are switching costs, network effects, brand, and price. Interviewers like it when you can say which one applies and why.`];
    if (stage === "view") return ex.debates[0] ? ["One tension people in the industry argue about: ", ex.debates[0]] : undefined;
    return undefined;
  }
  if (topic.kind === "news") {
    if (stage === "understand") return ["", `Good habit with any story: separate what happened from why it matters. Most candidates only do the first.`];
    if (stage === "mechanism") return ex.debates[0] ? ["It connects to a bigger argument in the industry: ", ex.debates[0]] : undefined;
    if (stage === "view") return ["", `Specific predictions are better than safe ones. "It will have an impact" tells an interviewer nothing.`];
    if (stage === "counter") return ["", ex.whyEmployers];
    return undefined;
  }
  if (topic.kind === "primer" && topic.primer && stage === "understand") return ["The background, in short: ", topic.primer.body];
  if (stage === "view") return ex.debates[1] ? ["For context, a live debate in the field: ", ex.debates[1]] : undefined;
  if (stage === "counter") return ["", ex.whyEmployers];
  return undefined;
}

/** An honest one-line reaction to a real answer. No praise unless it was earned. */
function reaction(stage: Stage, a: Assessment, c?: ConceptKnowledge): string {
  const q = `"${a.quote}"`;
  if (stage === "understand" && c && a.onTopic < 2) return `You're near the topic, but ${q} doesn't yet explain what ${cname(c)} actually is.`;
  if (stage === "view" && !a.view && !a.reasoning) return `I asked where you stand and I still can't tell. ${q} describes, it doesn't decide.`;
  if (stage === "example" && !a.example && a.words < 25) return `That's still abstract. An example needs a name: a company, a product or a moment you saw it happen.`;
  if (stage === "example" && a.example) return `That's concrete, which is what I wanted.`;
  if (a.reasoning && a.words >= 14) return `That's a real argument: in ${q} you link a cause to an effect.`;
  if (a.reasoning) return `You gave a reason, which is the right instinct, but it's thin. One sentence won't hold up if an interviewer pushes.`;
  if (a.words < 15) return `${q} is a start, but it's a statement, not an explanation. You haven't said why.`;
  return `You've said what, but not why. Look at ${q}: there's no "because" anywhere.`;
}

/* ------------------------------------------------------------------ */
/* Opening and replying                                                */
/* ------------------------------------------------------------------ */

export function expertOpener(topic: ExpertTopic): string {
  const c = conceptOf(topic);
  const stages = stagesFor(topic);
  const offset = noteOffset(topic);
  const n = topic.notes ?? {};
  if (offset && stages[offset]) {
    const summary = (n.summary ?? n.ideas ?? "").trim();
    const q = questionsFor(stages[offset], topic, c, quoteOf(summary))[0];
    return `I've read your notes. You summarised it as "${quoteOf(summary, 20)}". Let's go past the summary. ${q}`;
  }
  const q = questionsFor("understand", topic, c, "")[0];
  if (topic.kind === "primer" && topic.primer) return `Let's talk about ${topic.primer.title.toLowerCase()}. I'll push back where I disagree, so don't worry about being polished. ${q}`;
  if (c) return `Let's talk about ${cname(c)}. I'll push back when something's off, so just think out loud. ${q}`;
  if (topic.kind === "company" && topic.company) return `Let's dig into ${topic.company}. I'll be straight with you about what would and wouldn't land in an interview. ${q}`;
  return q;
}

export interface WalkedTurn {
  text: string;
  stage: Stage;
  a: Assessment;
}

interface Progress {
  walked: WalkedTurn[];
  stage: number; // index into stages of the question the latest answer was responding to
  okCount: number;
  lastOkQuote: string;
  /** Consecutive weak answers at the end, including the latest */
  strikes: number;
}

/** Replays the conversation: which stage each answer was for, and how it was judged. */
export function walk(topic: ExpertTopic, turns: ChatTurn[]): Progress {
  const stages = stagesFor(topic);
  let stage = noteOffset(topic);
  let okCount = 0;
  let lastOkQuote = "";
  let strikes = 0;
  const walked: WalkedTurn[] = [];
  const userTurns = turns.filter((t) => t.role === "user");
  userTurns.forEach((t, i) => {
    const st = stages[Math.min(stage, stages.length - 1)];
    let a = assessAnswer(t.text, topic, { allowOffTopic: st === "understand" || st === "example" });
    // Answered, but not the question that was asked
    if (a.kind === "ok" && st === "view" && !a.view && !a.reasoning) a = { ...a, kind: "dodge" };
    if (a.kind === "ok" && st === "example" && !a.example && a.words < 25) a = { ...a, kind: "dodge" };
    walked.push({ text: t.text, stage: st, a });
    const isLast = i === userTurns.length - 1;
    if (a.kind === "ok") {
      okCount++;
      lastOkQuote = a.quote;
      strikes = 0;
      if (!isLast) stage++;
    } else {
      strikes++;
    }
  });
  return { walked, stage, okCount, lastOkQuote, strikes };
}

function notAsked(candidates: string[], turns: ChatTurn[]) {
  const said = turns.filter((t) => t.role === "expert").map((t) => t.text);
  return candidates.find((q) => !said.some((s) => s.includes(q))) ?? candidates.at(-1) ?? "";
}

/** The text with an optional lead-in, unless the expert has already said it in this discussion. */
function fresh(text: string | undefined, turns: ChatTurn[], lead = "") {
  if (!text) return undefined;
  const key = text.slice(0, 50);
  return turns.some((t) => t.role === "expert" && t.text.includes(key)) ? undefined : `${lead}${text}`;
}

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ");

/** The expert's next message. `turns` must end with the user's latest answer. */
export function expertReply(topic: ExpertTopic, turns: ChatTurn[]): string {
  const last = [...turns].reverse().find((t) => t.role === "user");
  if (!last) return expertOpener(topic);
  const c = conceptOf(topic);
  const stages = stagesFor(topic);
  const p = walk(topic, turns);
  const a = p.walked.at(-1)!.a;
  const stage = stages[Math.min(p.stage, stages.length - 1)];
  const name = topicName(topic, c);
  const userCount = turns.filter((t) => t.role === "user").length;
  const qs = questionsFor(stage, topic, c, p.lastOkQuote);
  const explainShort = c ? firstSentence(c.explain) : topic.primer ? firstSentence(topic.primer.body) : undefined;

  if (a.kind !== "ok" && userCount >= MAX_USER_TURNS && p.strikes >= 2) {
    return `Let's stop here rather than go round in circles. Press "Wrap up & save" and I'll give you the key points to learn and an honest view of where you are.`;
  }

  if (a.kind === "meta") {
    const alt = notAsked(qs.slice(1).concat(qs[0]), turns);
    return join(
      `Fair point, I'll come at it differently.`,
      (c ? fresh(c.example, turns, "Take a concrete case: ") : fresh(topic.primer?.body, turns, "Here's the background: ")),
      alt,
    );
  }

  if (a.kind === "unsure") {
    const teach = [c?.explain, topic.primer?.body, c?.example, c?.whyEmployers, ...expertFor(topic).debates.map((d) => `People in the industry argue about this: ${d}`)]
      .map((t) => fresh(t, turns))
      .find(Boolean);
    if (!teach || p.strikes >= 4) return `It sounds like this one needs some reading first, and that's fine. Press "Wrap up & save" and I'll give you the key points so you can come back to it.`;
    const firstUnsure = p.walked.filter((w) => w.a.kind === "unsure").length === 1;
    return join(
      firstUnsure ? `No problem, that's what this is for.` : `Here's another way in.`,
      teach,
      `Now you try. ${notAsked(qs.slice(1).concat(qs[0]), turns)}`,
    );
  }

  if (a.kind === "low") {
    return join(
      a.words ? `"${a.quote}" is too short for me to work with. In an interview that would get a polite nod and a low mark, because it shows nothing about how you think.` : `I didn't get an answer there.`,
      p.strikes >= 2 ? fresh(explainShort, turns, "Some help: ") ?? fresh(c?.example, turns, "An example to get you going: ") : undefined,
      `Give me two or three sentences. ${notAsked(qs.slice(1).concat(qs[0]), turns)}`,
    );
  }

  if (a.kind === "dodge") {
    return join(reaction(stage, a, c), notAsked(qs.slice(1).concat(qs[0]), turns));
  }

  if (a.kind === "list") {
    const shown = a.listItems.slice(0, 4).join(", ");
    const first = a.listItems[0];
    return join(
      `You've given me a list (${shown}), not an answer.`,
      c ? `Knowing the names is fine, but the question is about ${cname(c)}, and a list doesn't tell me what you understand about it.` : `A list shows you know the names, but not what you think.`,
      fresh(explainShort, turns, "Quick reminder of what we're discussing: "),
      c ? `Pick one, say ${first}, and tell me what it has to do with ${cname(c)}.` : `Pick one, say ${first}, and tell me why it matters here.`,
    );
  }

  if (a.kind === "off") {
    return join(
      `I don't think that answers the question. You've written about "${a.quote}", but we're discussing ${name}.`,
      fresh(explainShort, turns, "To recap: "),
      notAsked(qs, turns),
    );
  }

  // A real answer: react honestly, add one piece of expert context, go one level deeper.
  const nextIdx = p.stage + 1;
  const react = reaction(stage, a, c);
  const ctxParts = contextAfter(stage, topic, c, a);
  const ctx = ctxParts && fresh(ctxParts[1], turns, ctxParts[0]);
  if (nextIdx >= stages.length || userCount >= MAX_USER_TURNS) {
    return join(react, ctx, `That's the full loop: what it is, an example, how it works, your view and the other side. Press "Wrap up & save" and I'll tell you honestly where this stands and turn it into an interview answer.`);
  }
  const next = questionsFor(stages[nextIdx], topic, c, a.quote);
  return join(react, ctx, notAsked(next, turns));
}

/* ------------------------------------------------------------------ */
/* Honest wrap-up                                                      */
/* ------------------------------------------------------------------ */

export function expertSummary(topic: ExpertTopic, turns: ChatTurn[]): ExpertSummary {
  const c = conceptOf(topic);
  const ex = expertFor(topic);
  const stages = stagesFor(topic);
  const name = topicName(topic, c);
  const users = turns.filter((t) => t.role === "user");
  const assessed = walk(topic, turns).walked.map((w) => ({ t: { text: w.text }, a: w.a, stage: w.stage }));
  const ok = assessed.filter((x) => x.a.kind === "ok");
  const weak = assessed.filter((x) => x.a.kind !== "ok");

  // Which stage each good answer belonged to
  const byStage = new Map<Stage, string>();
  for (const x of ok) if (!byStage.has(x.stage)) byStage.set(x.stage, x.t.text.trim());
  const anyReason = ok.some((x) => x.a.reasoning);
  const anyExample = ok.some((x) => x.a.example) || byStage.has("example");
  const anyView = ok.some((x) => x.a.view) || byStage.has("view");
  const countered = byStage.has("counter");
  const okWords = ok.reduce((n, x) => n + x.a.words, 0);

  const verdict: ExpertSummary["verdict"] =
    ok.length >= 4 && anyReason && anyView && anyExample && okWords >= 80 ? "strong" : ok.length >= 2 && (anyReason || anyView) && okWords >= 30 ? "developing" : "weak";

  const headline = !users.length
    ? `You haven't answered anything yet, so there's nothing to assess.`
    : verdict === "strong"
      ? `You explained it, used an example and took a position you could defend. This is usable interview material.`
      : verdict === "developing"
        ? `A start, but not interview-ready. ${!anyReason ? "You mostly stated things without saying why." : !anyExample ? "Your points have no concrete example behind them." : !anyView ? "You never committed to a view." : "You stopped before testing your view against the other side."}`
        : weak.length >= ok.length
          ? `Most of your answers were too short, unsure or off the topic, so there's very little of your own thinking to use yet.`
          : `There isn't enough depth here yet for an interviewer to see how you think.`;

  const strengths: string[] = [];
  const reasonX = ok.find((x) => x.a.reasoning && x.a.words >= 15);
  if (reasonX) strengths.push(`You gave a reason, not just a claim: "${reasonX.a.quote}"`);
  const exX = ok.find((x) => x.a.example);
  if (exX && strengths.length < 2) strengths.push(`You used something concrete: "${quoteOf(exX.t.text)}"`);
  const viewX = ok.find((x) => x.a.view);
  if (viewX && strengths.length < 2 && viewX !== reasonX) strengths.push(`You took a position: "${quoteOf(viewX.t.text)}"`);

  const gaps: string[] = [];
  if (!anyReason) gaps.push(`No reasoning. Add "because…" to every claim, then explain the link.`);
  if (!anyExample) gaps.push(`No real example. Name a company, product or moment you saw it happen.`);
  if (!anyView) gaps.push(`No position. Interviewers want to hear what you think, not a neutral summary.`);
  if (anyView && !countered) gaps.push(`You didn't test your view against the strongest counterargument.`);
  const shortOnes = weak.filter((x) => x.a.kind === "low" || x.a.kind === "unsure").length;
  if (shortOnes) gaps.push(`${shortOnes} of your ${users.length} answers ${shortOnes === 1 ? "was" : "were"} too short or "not sure". That's fine while learning, but it's the part to work on.`);

  const corrections: string[] = [];
  for (const x of weak) {
    if (x.a.kind === "list") corrections.push(`"${quoteOf(x.t.text)}" is a list of names, not an explanation of ${name}.${c ? ` ${firstSentence(c.explain)}` : ""}`);
    if (x.a.kind === "off") corrections.push(`"${x.a.quote}" wasn't about ${name}.${c ? ` ${firstSentence(c.explain)}` : ""}`);
  }

  const keyPoints = c
    ? [c.explain, c.example, `The debate: ${c.debate}`, c.whyEmployers]
    : [topic.primer?.body, ...ex.debates.map((d) => `A live debate: ${d}`), ex.whyEmployers].filter((x): x is string => Boolean(x)).slice(0, 4);

  const part = (st: Stage, label: string, missing: string) => (byStage.get(st) ? `${label} ${byStage.get(st)}` : `${label} [Add: ${missing}]`);
  const interviewAnswer = [
    part("understand", "What it is:", `one sentence explaining ${name} in your own words`),
    stages.includes("example") ? part("example", "Example:", "a named company or product where you've seen it") : undefined,
    stages.includes("mechanism") ? part("mechanism", "How it works:", "the cause and effect, with a because") : undefined,
    part("view", "My view:", "a clear position and why you hold it"),
    part("sowhat", "Why it matters to you:", `two sentences linking it to ${topic.company ?? "the employer's business"}`),
  ]
    .filter(Boolean)
    .join("\n");

  const missingStage = stages.find((st) => !byStage.has(st));
  const nextQuestion = missingStage ? questionsFor(missingStage, topic, c, "")[0] : c ? `${c.debate} What would change your mind?` : `What would change your mind about this?`;

  return { verdict, headline, strengths, gaps: gaps.slice(0, 4), corrections: corrections.slice(0, 3), keyPoints, interviewAnswer, nextQuestion, source: "rules" };
}

/** The user's own words, for the notebook and search. Real answers first. */
export function userAnswerText(topic: ExpertTopic, turns: ChatTurn[]) {
  const walked = walk(topic, turns).walked;
  const ok = walked.filter((w) => w.a.kind === "ok");
  return (ok.length ? ok : walked).map((w) => w.text.trim()).join("\n\n");
}
