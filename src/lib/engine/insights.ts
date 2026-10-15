import { AREA_MAP, INSIGHT_AREAS, TRACK_TO_AREAS, WEEK_PLAN, type Primer } from "@/data/insights";
import type { FeedItem, InsightAreaId, InsightEntry, InsightPrefs, ReflectionStep, UserProfile } from "@/lib/types";
import { addDays, daysBetween, todayISO } from "@/lib/utils";
import { seededIndex, tokens, topTerms, wordCount } from "./text";

/* ------------------------------------------------------------------ */
/* Areas & preferences                                                 */
/* ------------------------------------------------------------------ */

export function defaultAreas(p: UserProfile): InsightAreaId[] {
  const out: InsightAreaId[] = [];
  for (const g of p.careerGoals) for (const a of TRACK_TO_AREAS[g] ?? []) if (!out.includes(a)) out.push(a);
  return out.length ? out.slice(0, 3) : ["tech"];
}

export function effectivePrefs(p: UserProfile, prefs?: InsightPrefs | null): InsightPrefs {
  return {
    areas: prefs?.areas?.length ? prefs.areas : defaultAreas(p),
    companies: prefs?.companies ?? [],
    planStart: prefs?.planStart,
    planDone: prefs?.planDone ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Live feed parsing (server), headlines + links only, never article text */
/* ------------------------------------------------------------------ */

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

export interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  source?: string;
}

export function parseRss(xml: string, max = 10): RssItem[] {
  const items: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < max) {
    const block = m[1];
    const get = (tag: string) => {
      const r = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return r ? decode(r[1]) : undefined;
    };
    let title = get("title");
    const link = get("link");
    const source = get("source");
    if (!title || !link || !/^https?:\/\//.test(link)) continue;
    // Google News appends " - Source" to titles; strip it when we have the source separately
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    items.push({ title, link, pubDate: get("pubDate"), source });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Daily brief                                                         */
/* ------------------------------------------------------------------ */

export interface BriefQuestion {
  id: string;
  text: string;
  area?: InsightAreaId;
  company?: string;
  item?: FeedItem;
  steps: ReflectionStep[];
}

/* ------------------------------------------------------------------ */
/* Breaking a big question into small, answerable steps                */
/* ------------------------------------------------------------------ */

export type QuestionShape = "news" | "podcast" | "company" | "general";

const step = (key: string, label: string, prompt: string, hint: string, optional = false): ReflectionStep => ({ key, label, prompt, hint, optional });

export function newsSteps(company?: string): ReflectionStep[] {
  return [
    step("what", "What happened", "In one sentence, what happened? Stick to the facts in the story.", "e.g. The Bank of England held interest rates at…"),
    step("who", "Who is affected", `Who wins and who loses from this? Name at least one company, customer group or competitor.`, "e.g. Mortgage lenders win because… First-time buyers lose because…"),
    step("why", "Why now", "Why is this happening now? Think about money, technology, regulation or customer behaviour.", "e.g. Because inflation has fallen faster than expected…"),
    step("view", "Your view", "What do you think happens next, and why? Pick a side.", "I think… because…"),
    step(
      "line",
      "Interview line",
      company ? `How would you bring this up in an interview at ${company}? Two sentences.` : "How would you bring this up in an interview? Two sentences.",
      "I've been following… It matters for your team because…",
      true,
    ),
  ];
}

export function podcastSteps(): ReflectionStep[] {
  return [
    step("what", "The episode", "Which episode did you listen to, and what was it mainly about?", "e.g. An interview with a fintech founder about…"),
    step("idea", "One idea", "What is one idea or claim that stood out to you?", "e.g. They argued that…"),
    step("view", "Agree or not", "Do you agree? Why, or why not?", "I agree, because… / I'm not convinced, because…"),
    step("link", "Your career", "How does this connect to the jobs or companies you're interested in?", "This matters for analysts because…", true),
  ];
}

const COMPANY_STEPS: ((c: string) => ReflectionStep[])[] = [
  (c) => [
    step("customers", "Customers", `Who pays ${c}? Businesses, consumers, governments, or a mix?`, "e.g. Mostly small businesses and…"),
    step("product", "What they buy", "What exactly do those customers pay for?", "e.g. A current account, card payments and…"),
    step("model", "How they pay", "How does the money come in? Subscription, fees per use, commission, ads, licences?", "e.g. A small fee on every card payment, plus…"),
    step("stay", "Why they stay", `Why do customers keep paying ${c} instead of switching?`, "e.g. Because switching is a hassle and…"),
    step("view", "Your view", "Which part of the business do you think grows fastest, and why?", "I think… because…", true),
  ],
  (c) => [
    step("rivals", "Competitors", `Name 2 or 3 competitors of ${c}.`, "e.g. X, Y and Z"),
    step("edge", "Where they win", `Where is ${c} stronger than those rivals? One specific strength.`, "e.g. Faster product releases…"),
    step("weak", "Where they're weaker", `Where is ${c} weaker or more exposed?`, "e.g. Smaller sales team in…"),
    step("move", "Your move", `If you worked there, what would you do to widen the gap?`, "I would… because…"),
  ],
  (c) => [
    step("risk", "Name the risk", "Name one risk: regulation, competition, technology, the economy or reputation.", "e.g. New rules on how AI can be used in…"),
    step("impact", "How it hurts", `How exactly would it hurt ${c}? Revenue, costs, customers or brand?`, "e.g. It would slow sales to banks because…"),
    step("odds", "How likely, how soon", "How likely is it, and when could it happen?", "e.g. Likely within two years, because…"),
    step("response", "The response", `What should ${c} do about it?`, "They should… so that…"),
  ],
  (c) => [
    step("team", "Where", `Which team, product or area of ${c} would you want to join?`, "e.g. The risk analytics team…"),
    step("problem", "The problem", "What problem would you want to work on there?", "e.g. Reducing false fraud alerts…"),
    step("fit", "Your fit", "Which of your skills or experiences fits that work? Be specific.", "e.g. My dissertation project on…"),
    step("learn", "What you'd learn", "What would you hope to learn in that first year?", "e.g. How models are monitored in production…", true),
  ],
  (c) => [
    step("working", "What works", `What is working well at ${c} today?`, "e.g. Their brand with students…"),
    step("problem", "The problem", "What is one problem or missed opportunity?", "e.g. They rely on one product for most revenue…"),
    step("change", "Your change", "What would you change first, and why that first?", "I would… because…"),
    step("measure", "How you'd know", "How would you know it worked? Name one number you'd track.", "e.g. Revenue from new products as a share of total…"),
  ],
];

export function companySteps(company: string, variant: number) {
  return COMPANY_STEPS[variant % COMPANY_STEPS.length](company);
}

export function generalSteps(question: string): ReflectionStep[] {
  return [
    step("idea", "In your words", "Before answering, what is this question really about? One or two sentences, as if explaining to a friend.", "It's about how… "),
    step("example", "One example", "Give one real example you know: a company, product, news story or something from your own life.", "e.g. When Spotify… / In my part-time job…"),
    step("answer", "Your answer", question, "I think… because…"),
    step("sowhat", "So what", "Why would an employer in this field care about this?", "It matters because…", true),
  ];
}

export function stepsFor(shape: QuestionShape, question: string, opts: { company?: string; variant?: number } = {}): ReflectionStep[] {
  if (shape === "news") return newsSteps(opts.company);
  if (shape === "podcast") return podcastSteps();
  if (shape === "company" && opts.company) return companySteps(opts.company, opts.variant ?? 0);
  return generalSteps(question);
}

/** Joins step answers into one readable entry (labels kept so the notebook reads well). */
export function joinSteps(steps: ReflectionStep[], answers: Record<string, string>) {
  return steps
    .filter((s) => answers[s.key]?.trim())
    .map((s) => `${s.label}: ${answers[s.key].trim()}`)
    .join("\n");
}

/** Answers only, for scoring (labels would distort keyword checks). */
export function answersOnly(steps: ReflectionStep[], answers: Record<string, string>) {
  return steps
    .map((s) => answers[s.key]?.trim())
    .filter(Boolean)
    .join(" ");
}

export interface DailyBrief {
  date: string;
  primer: { area: InsightAreaId; primer: Primer };
  news: FeedItem[];
  podcasts: FeedItem[];
  questions: BriefQuestion[];
}

export function newsQuestion(item: FeedItem, companies: string[]): string {
  const c = companies.find((co) => item.title.toLowerCase().includes(co.toLowerCase())) ?? item.company;
  if (c) return `"${item.title}": what does this mean for ${c}, and how would you bring it up in an interview there?`;
  return `"${item.title}": what happened, why does it matter, and what do you think happens next?`;
}

export function companyVariant(dayIdx: number) {
  return dayIdx % 5;
}

export function companyQuestion(company: string, dayIdx: number) {
  const qs = [
    `How does ${company} make money, and who are its main customers?`,
    `Who are ${company}'s main competitors, and what makes ${company} different?`,
    `What's one risk ${company} faces in the next few years, and how should it respond?`,
    `What would you want to work on at ${company} in your first year, and why?`,
    `If you were ${company}'s CEO, what's the first thing you'd change?`,
  ];
  return qs[dayIdx % qs.length];
}

export function dailyBrief(prefs: InsightPrefs, live: FeedItem[], date = todayISO()): DailyBrief {
  const areas = prefs.areas.length ? prefs.areas : (["tech"] as InsightAreaId[]);
  const day = seededIndex(date, 997);
  const area = areas[day % areas.length];
  const primers = AREA_MAP[area].primers;
  const primer = primers[seededIndex(`${date}-${area}`, primers.length)];

  // Interleave live news by area/company so the brief stays balanced
  const news = live.filter((i) => i.kind === "news");
  const buckets = new Map<string, FeedItem[]>();
  for (const n of news) {
    const k = n.company ?? n.area ?? "other";
    buckets.set(k, [...(buckets.get(k) ?? []), n]);
  }
  const mixed: FeedItem[] = [];
  for (let i = 0; mixed.length < 8 && i < 10; i++) for (const b of buckets.values()) if (b[i] && mixed.length < 8) mixed.push(b[i]);

  const podcasts = live.filter((i) => i.kind === "podcast").slice(0, 4);

  const primerQ = primer.questions[day % primer.questions.length];
  const questions: BriefQuestion[] = [{ id: `q-${date}-primer`, text: primerQ, area, steps: generalSteps(primerQ) }];
  if (mixed[0]) {
    const company = mixed[0].company ?? prefs.companies.find((co) => mixed[0].title.toLowerCase().includes(co.toLowerCase()));
    questions.push({ id: `q-${date}-news`, text: newsQuestion(mixed[0], prefs.companies), area: mixed[0].area, company: mixed[0].company, item: mixed[0], steps: newsSteps(company) });
  }
  if (prefs.companies.length) {
    const c = prefs.companies[day % prefs.companies.length];
    questions.push({ id: `q-${date}-co`, text: companyQuestion(c, day), company: c, steps: companySteps(c, companyVariant(day)) });
  }
  if (questions.length < 3) {
    const other = AREA_MAP[areas[(day + 1) % areas.length]];
    const text = `Explain "${other.keyConcepts[day % other.keyConcepts.length]}" (${other.label}) as if to a friend, and say why it matters to employers.`;
    questions.push({ id: `q-${date}-concept`, text, area: other.id, steps: generalSteps(text) });
  }
  return { date, primer: { area, primer }, news: mixed, podcasts, questions };
}

/* ------------------------------------------------------------------ */
/* 7-day plan                                                          */
/* ------------------------------------------------------------------ */

export interface PlanDay {
  index: number;
  date: string;
  theme: string;
  task: string;
  question: string;
  done: boolean;
  isToday: boolean;
}

export function weekPlan(prefs: InsightPrefs, today = todayISO()): PlanDay[] {
  const start = prefs.planStart ?? today;
  const area = AREA_MAP[prefs.areas[0] ?? "tech"].label;
  const company = prefs.companies[0] ?? "a company you'd like to join";
  return WEEK_PLAN.map((d, i) => {
    const fill = (s: string) => s.replaceAll("{area}", area.toLowerCase()).replaceAll("{company}", company);
    const date = addDays(start, i);
    return { index: i, date, theme: d.theme, task: fill(d.task), question: fill(d.question), done: prefs.planDone.includes(i), isToday: date === today };
  });
}

/* ------------------------------------------------------------------ */
/* Guided reflection (deterministic fallback for AI feedback)          */
/* ------------------------------------------------------------------ */

export interface ReflectionCheck {
  key: "view" | "evidence" | "implication" | "depth";
  label: string;
  met: boolean;
}

export interface ReflectionFeedback {
  checks: ReflectionCheck[];
  feedback: string;
  followUp: string;
  source: "ai" | "rules";
}

export function reflectHeuristic(question: string, answer: string): ReflectionFeedback {
  const a = answer.toLowerCase();
  const words = wordCount(answer);
  const checks: ReflectionCheck[] = [
    { key: "view", label: "States your own view", met: /\b(i think|i believe|in my view|my view|i'd argue|i would argue|i expect|i'm not convinced|i disagree|i agree)\b/.test(a) },
    { key: "evidence", label: "Backs it with evidence or an example", met: /\d|%|£|\bfor example\b|\bsuch as\b|\bbecause\b|\bdata\b|\breport/.test(a) },
    { key: "implication", label: "Explains the 'so what'", met: /\b(so |therefore|which means|this means|as a result|implication|next|in future|will likely|could lead)\b/.test(a) },
    { key: "depth", label: "Enough depth (45+ words)", met: words >= 45 },
  ];
  const missing = checks.filter((c) => !c.met);
  const feedback = !missing.length
    ? "Strong reflection. You take a position, support it and explain why it matters. Save this; it's interview-ready material."
    : `Good start. To make this interview-ready: ${missing.map((m) => m.label.toLowerCase()).join("; ")}.`;
  const follow: Record<ReflectionCheck["key"], string> = {
    view: "What's your own opinion here? Would you bet for or against it, and why?",
    evidence: "What evidence or example supports your view? Even one number or case helps.",
    implication: "So what? Who wins or loses because of this, and what might happen next?",
    depth: "Can you add one more layer: a cause, a consequence, or a counter-argument?",
  };
  const followUp = missing[0] ? follow[missing[0].key] : `What would change your mind about this? (${question.slice(0, 60)}${question.length > 60 ? "…" : ""})`;
  return { checks, feedback, followUp, source: "rules" };
}

export function tagsFor(text: string, area?: InsightAreaId, company?: string) {
  const tags = new Set<string>();
  if (area) tags.add(AREA_MAP[area].label);
  if (company) tags.add(company);
  const lower = text.toLowerCase();
  for (const a of INSIGHT_AREAS) for (const k of a.keyConcepts) {
    const core = k.toLowerCase().split(/[ (&,]/)[0];
    if (core.length > 3 && lower.includes(core)) tags.add(k);
  }
  return [...tags].slice(0, 6);
}

/* ------------------------------------------------------------------ */
/* Insight profile, built only from the user's own words              */
/* ------------------------------------------------------------------ */

export interface InsightProfile {
  totalEntries: number;
  totalWords: number;
  streakDays: number;
  byArea: { area: InsightAreaId; label: string; count: number }[];
  byCompany: { company: string; count: number; latest?: InsightEntry }[];
  themes: { term: string; count: number }[];
  strongest: InsightEntry[];
  readiness: number; // 0..100 commercial-awareness readiness
}

export function streak(entries: InsightEntry[], today = todayISO()) {
  const days = new Set(entries.map((e) => e.date));
  let n = 0;
  let d = today;
  if (!days.has(d)) d = addDays(d, -1); // today not done yet doesn't break the streak
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function buildInsightProfile(entries: InsightEntry[], today = todayISO()): InsightProfile {
  const byAreaMap = new Map<InsightAreaId, number>();
  const byCompanyMap = new Map<string, InsightEntry[]>();
  for (const e of entries) {
    if (e.area) byAreaMap.set(e.area, (byAreaMap.get(e.area) ?? 0) + 1);
    if (e.company) byCompanyMap.set(e.company, [...(byCompanyMap.get(e.company) ?? []), e]);
  }
  const companyWords = [...byCompanyMap.keys()].flatMap((c) => tokens(c));
  const themes = topTerms(
    entries.map((e) => e.answer),
    10,
    companyWords,
  );
  const scored = entries
    .map((e) => ({ e, s: reflectHeuristic(e.question, e.answer).checks.filter((c) => c.met).length + Math.min(2, wordCount(e.answer) / 100) }))
    .sort((a, b) => b.s - a.s);
  const recentDays = new Set(entries.filter((e) => daysBetween(e.date, today) <= 14).map((e) => e.date)).size;
  const readiness = Math.min(100, Math.round(Math.min(entries.length, 15) * 4 + recentDays * 2 + Math.min(byCompanyMap.size, 3) * 5 + Math.min(byAreaMap.size, 3) * 3));
  return {
    totalEntries: entries.length,
    totalWords: entries.reduce((a, e) => a + wordCount(e.answer), 0),
    streakDays: streak(entries, today),
    byArea: [...byAreaMap.entries()].map(([area, count]) => ({ area, label: AREA_MAP[area]?.label ?? area, count })).sort((a, b) => b.count - a.count),
    byCompany: [...byCompanyMap.entries()]
      .map(([company, list]) => ({ company, count: list.length, latest: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] }))
      .sort((a, b) => b.count - a.count),
    themes,
    strongest: scored.slice(0, 3).map((x) => x.e),
    readiness,
  };
}

/** Plain-text export the user can paste into notes or use before interviews. Only their own words. */
export function exportNotebook(entries: InsightEntry[]) {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => `${e.date}${e.company ? ` · ${e.company}` : ""}${e.area ? ` · ${AREA_MAP[e.area]?.label}` : ""}\nQ: ${e.question}\nA: ${e.answer}${e.item?.url ? `\nSource: ${e.item.source}, ${e.item.url}` : ""}`)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Reading notes                                                       */
/* ------------------------------------------------------------------ */

export interface NoteSection {
  key: string;
  label: string;
  placeholder: string;
  rows: number;
}

export function noteSections(kind: FeedItem["kind"]): NoteSection[] {
  if (kind === "podcast") {
    return [
      { key: "episode", label: "Episode and guest", placeholder: "Which episode? Who was speaking, and what's their role?", rows: 2 },
      { key: "ideas", label: "Key ideas", placeholder: "The 2 or 3 main points, in your own words.", rows: 4 },
      { key: "facts", label: "Facts, numbers and names", placeholder: "Anything specific worth remembering: figures, companies, examples.", rows: 3 },
      { key: "questions", label: "Questions I still have", placeholder: "What didn't make sense, or what would you ask the guest?", rows: 2 },
      { key: "take", label: "My take", placeholder: "Do you agree? What would you add or challenge?", rows: 3 },
    ];
  }
  return [
    { key: "summary", label: "Summary in my words", placeholder: "What is this story about? 2 or 3 sentences, no copying.", rows: 3 },
    { key: "facts", label: "Key facts and numbers", placeholder: "Figures, dates and details worth remembering.", rows: 3 },
    { key: "players", label: "Who is involved", placeholder: "Companies, people, regulators, customers. Who gains, who loses?", rows: 3 },
    { key: "questions", label: "Questions I still have", placeholder: "What would you need to know to have a strong opinion?", rows: 2 },
    { key: "take", label: "My take", placeholder: "What do you think happens next, and why?", rows: 3 },
  ];
}

export function readingTips(kind: FeedItem["kind"]) {
  return kind === "podcast"
    ? ["Pause after each section and write one line.", "Note who is speaking: a founder and a regulator see things differently.", "Write down one claim you'd challenge."]
    : ["Read the headline and first paragraph, then write the summary before reading on.", "Look for numbers: money, growth, people affected.", "Ask who benefits, who loses, and what happens next."];
}

/** Map notes onto the reflection steps so the user doesn't retype. */
export function prefillFromNotes(kind: FeedItem["kind"], sections: Record<string, string>): Record<string, string> {
  if (kind === "podcast") return { what: sections.episode ?? "", idea: sections.ideas ?? "", view: sections.take ?? "" };
  return { what: sections.summary ?? "", who: sections.players ?? "", view: sections.take ?? "" };
}

export function noteWordCount(sections: Record<string, string>) {
  return Object.values(sections).reduce((a, t) => a + wordCount(t ?? ""), 0);
}
