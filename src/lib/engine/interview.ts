import { BEHAVIOURAL, CASES, COMPANY_TEMPLATES, COMPETENCIES, MOTIVATION, technicalFor, type CaseStage } from "@/data/interview";
import { roleForTrack, TRACK_MAP } from "@/data/careers";
import { fieldFor, lensFix, withArticle, type FieldBar } from "@/data/hiring-bar";
import type { AnswerFeedback, AnswerScores, CareerTrack, FeedItem, HiringVerdict, InterviewQuestion, MockSession, RecruiterNote, StoryEntry, UserProfile } from "@/lib/types";
import { coverage, wordCount } from "./text";

/* ------------------------------------------------------------------ */
/* Question sets                                                       */
/* ------------------------------------------------------------------ */

export interface QuestionSet {
  behavioural: InterviewQuestion[];
  motivation: InterviewQuestion[];
  technical: InterviewQuestion[];
  company: InterviewQuestion[];
  cv: InterviewQuestion[];
}

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? `{${k}}`);

export function questionSet(p: UserProfile, opts: { company?: string; track?: CareerTrack; companyNews?: FeedItem[] } = {}): QuestionSet {
  const track = opts.track ?? p.careerGoals[0] ?? "exploring";
  const info = TRACK_MAP[track];
  const role = roleForTrack(track, p.preferredRoles);
  const vars = { role, industry: info.noun, company: opts.company?.trim() || "" };

  const motivation = MOTIVATION.map((q) => ({ ...q, text: fill(q.text, vars), source: "bank" as const }));
  const technical = technicalFor(track).map((q) => ({ ...q, source: "bank" as const }));
  const company: InterviewQuestion[] = vars.company
    ? COMPANY_TEMPLATES.map((q) => ({ ...q, id: `${q.id}-${vars.company.toLowerCase().replace(/\W+/g, "-")}`, text: fill(q.text, vars), source: "company" as const }))
    : [];
  // Tie a "recent news" question to a real headline when we have one for this company
  const headline = opts.companyNews?.find((n) => n.kind === "news");
  if (vars.company && headline) {
    company.push({
      id: `c-headline-${headline.id}`,
      kind: "commercial",
      text: `I saw a recent story: "${headline.title}" (${headline.source}). What's your take, and how might it affect ${vars.company}?`,
      tests: "Commercial awareness on a real, current story",
      tips: ["Open the story first and read it fully", "What happened → why it matters to the company → what you'd do or watch next"],
      source: "company",
    });
  }
  return {
    behavioural: BEHAVIOURAL.map((q) => ({ ...q, source: "bank" as const })),
    motivation,
    technical,
    company,
    cv: cvQuestions(p),
  };
}

/** Split free text (experience fields / pasted CV) into meaningful items. */
export function cvItems(p: UserProfile) {
  const fields: [string, string][] = [
    ["Internship", p.experience.internships],
    ["Work", p.experience.partTime],
    ["Project", p.experience.projects],
    ["Research", p.experience.research],
    ["Society role", p.experience.societyRoles],
    ["Volunteering", p.experience.volunteering],
    ["CV", p.experience.cvText],
  ];
  const items: { label: string; text: string }[] = [];
  for (const [label, text] of fields) {
    for (const raw of (text || "").split(/\n|;|•|•| - /)) {
      const t = raw.replace(/^[\s\-*·]+/, "").trim();
      if (wordCount(t) >= 3 && t.length <= 220 && !items.some((i) => i.text.toLowerCase() === t.toLowerCase())) items.push({ label, text: t });
    }
  }
  return items.slice(0, 8);
}

/** Questions built only from what the user wrote — "go through your CV and explain everything". */
export function cvQuestions(p: UserProfile): InterviewQuestion[] {
  const out: InterviewQuestion[] = [];
  cvItems(p).forEach((it, i) => {
    const probes = [
      `Walk me through this from your CV: "${it.text}". What was your specific contribution?`,
      `On "${it.text}": what was the hardest part, and how did you handle it?`,
      `About "${it.text}": what would you do differently if you did it again?`,
    ];
    out.push({
      id: `cv-${i}`,
      kind: "cv",
      text: probes[i % probes.length],
      tests: "Ownership, depth and honesty about your own experience",
      tips: ["Be ready to go 2–3 levels deeper on anything on your CV", "Use numbers you can defend", "Say 'I' for what you did and 'we' for the team"],
      source: "cv",
    });
  });
  p.technicalSkills.slice(0, 4).forEach((s, i) =>
    out.push({
      id: `cv-skill-${i}`,
      kind: "cv",
      text: `You list ${s}. Tell me about the most substantial thing you've built or done with it.`,
      tests: "Evidence behind listed skills",
      tips: ["Pick a concrete example", "If it's basic, say so honestly and show how you're improving it"],
      source: "cv",
    }),
  );
  if (!out.length) {
    out.push({
      id: "cv-empty",
      kind: "cv",
      text: "Walk me through your CV, focusing on the experience most relevant to this role.",
      tests: "Narrative and relevance",
      tips: ["Add your experience on the Profile page to get questions about each item"],
      source: "cv",
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Answer feedback: strict, field-specific, rule-based (AI fallback)   */
/* ------------------------------------------------------------------ */

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

export function detectStar(answer: string) {
  const a = answer.toLowerCase();
  return {
    situation: /\b(when i|while i|during|at (my|the|a)|last (year|summer|term)|in my (first|second|third|final)|as part of|in (year|my)|on my)\b/.test(a),
    task: /\b(my (role|task|job|goal|responsibility)|i (needed|had|was asked) to|the goal was|our aim|we needed to|objective|i was responsible)\b/.test(a),
    action: /\bi (built|led|created|organised|organized|analysed|analyzed|designed|wrote|decided|spoke|set up|proposed|implemented|reached out|coordinated|split|tested|learned|researched|asked|persuaded|negotiated|fixed|introduced|ran|calculated|presented|scheduled|delegated)\b/.test(a),
    result: /\b(as a result|result(ed)?|outcome|which led to|led to|we (won|delivered|launched|achieved|finished)|increased|reduced|improved|saved|grew|achieved|cut|raised|received|scored|was adopted|got (a|an|the))\b/.test(a),
  };
}

const VAGUE = /\b(helped( with| to)?|assisted( with)?|was involved (in|with)|was part of|participated in|worked on|contributed to|dealt with|was responsible for|handled)\b/i;
const HEDGE = /\b(i guess|kind of|sort of|i suppose|basically|probably|i think maybe|maybe)\b/i;
const CLICHE = /\b(passionate|hard[- ]?working|team player|perfectionist|go[- ]getter|think outside the box|fast[- ]paced|dynamic environment|prestigious|people person|i love working with people|always wanted to|dream (job|company)|thrive under pressure|detail[- ]oriented)\b/i;
const FILLER = /\b(etc\.?|and so on|stuff|things like that|various|a lot of things|loads of)\b/i;
const BLAME = /\b(lazy|useless|incompetent|didn'?t do anything|did nothing|their fault|blame[ds]?)\b/i;
const FAKE_WEAKNESS = /\b(perfectionist|work too hard|care too much|too detail[- ]oriented|too dedicated)\b/i;
const NUMBER = /(\d+(\.\d+)?\s?(%|k|m|bn|x|hours?|days?|weeks?|months?|people|users|customers|members|students|clients|ms|seconds?)?|£\s?\d+|\b(doubled|halved|tripled)\b)/gi;

/** Short exact quote around a regex match, kept inside the sentence it appears in. */
function quoteAround(answer: string, re: RegExp, words = 9) {
  const sent = sentences(answer).find((x) => re.test(x));
  if (!sent) return undefined;
  const m = sent.match(re);
  if (!m || m.index === undefined) return undefined;
  const before = sent.slice(0, m.index).trim().split(/\s+/).filter(Boolean).slice(-3).join(" ");
  const after = sent.slice(m.index + m[0].length).trim().split(/\s+/).filter(Boolean).slice(0, words).join(" ");
  return `${before ? `${before} ` : ""}${m[0]}${after ? ` ${after}` : ""}`.replace(/\s+/g, " ").replace(/\s*[.,;:!?]+$/, "").trim();
}

function sentences(answer: string) {
  return answer
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const VERDICT_TEXT: Record<HiringVerdict, (field: string) => string> = {
  strong_hire: (f) => `Strong hire. This answer would stand out in ${withArticle(f)} first round.`,
  hire: (f) => `Hire, with polish. It clears the bar for ${f}, but the points below would cost you against stronger candidates.`,
  borderline: (f) => `Borderline. In ${withArticle(f)} interview this would most likely be scored a "maybe", which usually means no offer.`,
  no_hire: (f) => `No hire on this answer. ${withArticle(f).replace(/^a/, "A")} interviewer would not move you forward on it.`,
};

export interface ScoreContext {
  track?: CareerTrack | string;
  company?: string;
}

export function scoreAnswer(q: InterviewQuestion, answer: string, ctx: ScoreContext = {}): AnswerFeedback {
  const bar = fieldFor(ctx.track);
  const a = answer.toLowerCase();
  const words = wordCount(answer);
  const sents = sentences(answer);
  const star = detectStar(answer);
  const numbers = answer.match(NUMBER)?.filter((n) => /\d|doubled|halved|tripled/i.test(n)) ?? [];
  const iCount = (a.match(/\bi\b/g) ?? []).length;
  const weCount = (a.match(/\bwe\b/g) ?? []).length;
  const technical = q.kind === "technical" || q.kind === "case";
  const motivation = q.kind === "motivation" || q.kind === "company" || q.kind === "commercial";
  const behavioural = !technical && !motivation;
  const company = ctx.company?.trim();
  const notes: RecruiterNote[] = [];
  const shorts: string[] = [];
  const strengths: string[] = [];
  let blocker = false;
  const push = (short: string, n: RecruiterNote) => {
    notes.push(n);
    shorts.push(short);
  };

  /* ---------- Red flags, each quoting the candidate ---------- */
  if (words < (technical ? 25 : 60)) {
    blocker = true;
    push("too thin", { issue: `Too thin to assess (${words} words). A real interviewer would have to drag the answer out of you, and that reads as unprepared.`, fix: technical ? "Aim for 80 to 200 words: state the approach, the key steps, and one check or caveat." : "Aim for 150 to 300 words, about 90 seconds spoken." });
  }
  if (VAGUE.test(answer)) {
    push("vague ownership", { quote: quoteAround(answer, VAGUE), issue: "Vague ownership. From this phrase I can't tell what you personally did, so I can't give you credit for it.", fix: 'Replace it with the exact action and object: "I wrote the SQL that…", "I built the…", "I decided to…".' });
  }
  if (weCount >= 3 && weCount > iCount) {
    push('"we" instead of "I"', { quote: quoteAround(answer, /\bwe\b/i, 7), issue: `You say "we" ${weCount} times and "I" ${iCount} times. I'm hiring you, not your team.`, fix: 'Keep "we" for the context, then switch to "I" for every action you took.' });
  }
  if (CLICHE.test(answer)) {
    push("clichés", { quote: quoteAround(answer, CLICHE, 5), issue: "Cliché. Nearly every candidate says this, so it earns zero marks and signals a rehearsed, generic answer.", fix: "Delete it and show the quality with one concrete example instead." });
  }
  if (HEDGE.test(answer)) {
    push("hedging", { quote: quoteAround(answer, HEDGE, 6), issue: "Hedging language makes you sound unsure of your own work.", fix: "State it plainly. If you're estimating, say so once, with the number." });
  }
  if (FILLER.test(answer)) {
    push("filler", { quote: quoteAround(answer, FILLER, 4), issue: "Filler hides exactly the detail I'm trying to score.", fix: "Name the specific items, or cut the list to the one that matters." });
  }
  if (BLAME.test(answer)) {
    blocker = true;
    push("blaming others", { quote: quoteAround(answer, BLAME, 6), issue: "Criticising teammates is a culture-fit red flag. Interviewers remember this more than anything else you say.", fix: "Describe the situation neutrally and focus on what you did to fix it." });
  }
  if (q.id === "m-strength" && FAKE_WEAKNESS.test(answer)) {
    push("a fake weakness", { quote: quoteAround(answer, FAKE_WEAKNESS, 5), issue: "A strength dressed up as a weakness. Interviewers see this every day and it costs you credibility.", fix: "Pick a real, job-relevant weakness and show the concrete steps you're taking on it." });
  }

  if (behavioural) {
    const firstAction = a.search(/\bi (built|led|created|organised|organized|analysed|analyzed|designed|wrote|decided|spoke|set up|proposed|implemented|reached out|coordinated|split|tested|asked|persuaded|negotiated|fixed|introduced|ran|calculated|presented)\b/);
    if (firstAction > a.length * 0.45 && words > 80) {
      push("too much set-up", { issue: "Too much set-up. Almost half the answer passes before you say what you did, and that is the only part being scored.", fix: "Situation and task in two sentences maximum. Spend around 60% of the time on your actions." });
    }
    if (!star.result) {
      blocker = true;
      push("no result", { issue: "No result. A STAR answer without an outcome is incomplete, and at most firms it caps the score for this competency.", fix: "End with what changed: a number, a grade, feedback you received, or what was adopted. Then one line on what you learned." });
    } else if (!numbers.length) {
      push("an unquantified result", { quote: quoteAround(answer, /\b(result|led to|improved|increased|reduced|achieved|delivered)\b/i, 8), issue: "The result isn't quantified, so it sounds like an opinion rather than evidence.", fix: 'Attach a number: "cut processing time from 3 hours to 20 minutes", "grew sign-ups by 40%", "a first-class mark".' });
    }
    if (/fail|didn'?t go|mistake|feedback/i.test(q.text) && !/\b(learn|learned|learnt|taught me|next time|differently|now i|since then)\b/i.test(answer)) {
      push("no lesson learned", { issue: "This question is really asking what you learned, and you never say it.", fix: 'Finish with "What I do differently now is…" and give a concrete example of applying it.' });
    }
  }

  if (motivation) {
    if (company && !a.includes(company.toLowerCase()) && q.kind !== "motivation") {
      blocker = true;
      push("no mention of the company", { issue: `You never mention ${company}. This answer could be pasted into any application, and the interviewer will notice.`, fix: `Name something specific to ${company}: a product, client, team, recent move or a person you spoke to.` });
    }
    const evidence = /\bi (led|built|worked|ran|joined|organised|organized|did|volunteered|founded|competed|completed|interned|analysed|analyzed|wrote|created)\b/i.test(answer);
    if (!evidence) {
      push("no evidence behind the motivation", { issue: "Motivation with no evidence. Saying you're interested is cheap; showing what you've already done about it is what convinces me.", fix: "Add one experience that proves the interest: a project, society role, competition, course or conversation." });
    }
  }

  let coveredPoints = 0;
  let caveatMissing = false;
  if (technical && q.modelPoints?.length) {
    const missed = q.modelPoints.filter((pt) => coverage(pt, answer) < 0.34);
    coveredPoints = q.modelPoints.length - missed.length;
    missed.slice(0, 3).forEach((m) => push("missing technical points", { issue: `Missing a point an interviewer at this level expects: ${m.charAt(0).toLowerCase()}${m.slice(1)}.`, fix: "Say it explicitly. Interviewers mark against a checklist, and knowledge you don't say out loud scores nothing." }));
    if (!/\b(first|then|next|finally|step|so|because)\b/i.test(answer)) push("no structure", { issue: "No visible structure. Technical answers are easier to follow, and to score, when you signpost the steps.", fix: 'Open with "There are three steps…" and number them as you go.' });
    if (!/\b(sensitiv|assum|caveat|depends|check|limitation|edge case|trade-?off|in practice|risk)/i.test(answer)) {
      caveatMissing = true;
      push("no judgement shown", { issue: "Textbook but mechanical. Strong candidates show judgement by naming the key assumption, sensitivity or a check they'd run.", fix: 'Close with one line such as "The answer is most sensitive to…" or "In practice I would sanity check…".' });
    }
  }

  if (words > (technical ? 260 : 340)) {
    push("too long", { issue: `Too long (${words} words, roughly ${Math.round(words / 140)} minutes spoken). Interviewers start to tune out after two minutes.`, fix: "Lead with the point, keep the context to two sentences, and stop after the result and lesson." });
  }

  /* ---------- Field lens ---------- */
  const lensChecks = technical ? [] : behavioural ? bar.behavioural : bar.motivation;
  const lens = lensChecks.map((c) => ({ criterion: c.criterion, met: c.test.test(answer) }));
  const lensRatio = lens.length ? lens.filter((l) => l.met).length / lens.length : coveredPoints / Math.max(1, q.modelPoints?.length ?? 1);
  const missedLens = lens.filter((l) => !l.met);
  if (!technical) {
    missedLens
      .filter((l) => !/quantified|clear star|personal contribution|personal evidence/i.test(l.criterion) || !notes.length)
      .slice(0, 2)
      .forEach((l) => push(`missing: ${l.criterion.split(/[:(]/)[0].trim().toLowerCase()}`, { issue: `Missing: ${l.criterion.charAt(0).toLowerCase()}${l.criterion.slice(1)}. This is one of the things ${withArticle(bar.noun)} interviewer is scoring.`, fix: lensFix(l.criterion) }));
  }

  /* ---------- Scores (strict: a typical first attempt lands around 2 to 3) ---------- */
  const vagueHits = [VAGUE, CLICHE, FILLER, HEDGE].filter((re) => re.test(answer)).length;
  let structure: number;
  let relevance: number;
  if (technical && q.modelPoints?.length) {
    structure = clamp(1 + (coveredPoints / q.modelPoints.length) * 4 - (/\b(first|then|next|finally|step)\b/i.test(answer) ? 0 : 1));
    relevance = clamp(1 + (coveredPoints / q.modelPoints.length) * 4);
  } else if (behavioural) {
    const starCount = Object.values(star).filter(Boolean).length;
    structure = clamp(starCount + (/\b(first|then|finally|second)\b/i.test(answer) ? 1 : 0) - (notes.some((n) => n.issue.startsWith("Too much set-up")) ? 1 : 0));
    relevance = clamp(1 + lensRatio * 4);
  } else {
    structure = clamp(2 + (sents.length >= 3 ? 1 : 0) + (/\b(first|second|because|that'?s why|so)\b/i.test(answer) ? 1 : 0));
    relevance = clamp(1 + lensRatio * 3 + (company && a.includes(company.toLowerCase()) ? 1 : 0));
  }
  const specificity = technical
    ? clamp(1 + (coveredPoints / Math.max(1, q.modelPoints?.length ?? 1)) * 3 + (numbers.length || /\b(e\.g\.|for example|such as)\b/i.test(answer) ? 1 : 0) - vagueHits)
    : clamp(1 + Math.min(2, numbers.length) + (/\b(for example|for instance|specifically|such as)\b/i.test(answer) ? 1 : 0) + (iCount >= 3 ? 1 : 0) - vagueHits);
  const impact = clamp(technical ? 1 + (coveredPoints / Math.max(1, q.modelPoints?.length ?? 1)) * 3 + (numbers.length ? 1 : 0) : 1 + (star.result ? 1.5 : 0) + Math.min(2, numbers.length) - (behavioural && !star.result ? 1 : 0));
  const [lo, hi] = technical ? [30, 260] : [80, 340];
  const concision = words < lo * 0.6 ? 1 : words < lo ? 2 : words <= hi ? 4 + (sents.length && words / sents.length < 28 ? 1 : 0) : words <= hi * 1.4 ? 2 : 1;
  const scores: AnswerScores = { structure, specificity, impact, relevance, concision };

  /* ---------- Verdict ---------- */
  const pct = overall(scores);
  let verdict: HiringVerdict = pct >= 86 ? "strong_hire" : pct >= 72 ? "hire" : pct >= 52 ? "borderline" : "no_hire";
  if (blocker && (verdict === "strong_hire" || verdict === "hire")) verdict = "borderline";
  if (caveatMissing && verdict === "strong_hire") verdict = "hire";
  // Strong hire is rare: it needs (almost) nothing to criticise and most of the field's criteria met.
  if (verdict === "strong_hire" && (notes.length > 1 || (lens.length > 0 && lensRatio < 0.8))) verdict = "hire";
  if (notes.length >= 5 && verdict !== "no_hire") verdict = verdict === "strong_hire" ? "hire" : "no_hire";
  const top = Array.from(new Set(shorts)).slice(0, 3);
  const headline = `${VERDICT_TEXT[verdict](bar.noun)}${top.length && verdict !== "strong_hire" ? ` Main problems: ${top.join(", ")}.` : ""}`;

  /* ---------- Strengths (specific, never padded) ---------- */
  if (behavioural && Object.values(star).filter(Boolean).length >= 3) strengths.push("Your answer follows a recognisable STAR shape.");
  if (numbers.length) strengths.push(`You quantify: "${numbers.slice(0, 2).join('", "').trim()}". Keep doing this.`);
  if (iCount >= 3 && iCount >= weCount) strengths.push("Your personal contribution is clear.");
  lens.filter((l) => l.met).slice(0, 1).forEach((l) => strengths.push(`Meets a ${bar.noun} criterion: "${l.criterion}".`));
  if (technical && q.modelPoints?.length && coveredPoints) strengths.push(`Covers ${coveredPoints} of ${q.modelPoints.length} points an interviewer will check for.`);

  /* ---------- A stronger version, built from their own material ---------- */
  const rewrite = buildRewrite(q, answer, { technical, motivation, company, bar, star, numbers: numbers.length });

  const weakest = (Object.entries(scores) as [keyof AnswerScores, number][]).sort((x, y) => x[1] - y[1])[0][0];
  return {
    scores,
    strengths: strengths.slice(0, 3),
    improvements: notes.map((n) => n.fix).slice(0, 3),
    followUp: bar.probes[weakest],
    source: "rules",
    verdict,
    headline,
    notes: notes.slice(0, 6),
    lens,
    rewrite,
    field: bar.noun,
  };
}

function buildRewrite(
  q: InterviewQuestion,
  answer: string,
  o: { technical: boolean; motivation: boolean; company?: string; bar: FieldBar; star: ReturnType<typeof detectStar>; numbers: number },
) {
  const sents = sentences(answer);
  const actionSents = sents.filter((x) => /\bi (built|led|created|organised|organized|analysed|analyzed|designed|wrote|decided|proposed|implemented|coordinated|split|tested|persuaded|negotiated|fixed|introduced|ran|calculated|presented)\b/i.test(x));
  const resultSent = sents.find((x) => /\b(result|led to|improved|increased|reduced|saved|achieved|delivered|won|grew)\b/i.test(x));
  if (o.technical && q.modelPoints?.length) {
    return [`Open: "There are ${q.modelPoints.length} parts to this."`, ...q.modelPoints.map((m, i) => `${i + 1}. ${m}`), "Close with one caveat or check you'd apply in practice."].join("\n");
  }
  if (o.motivation) {
    return [
      `Hook: one specific thing about ${o.company || "the firm"} that genuinely interests you [Add: a product, client, team, recent move, or someone you spoke to].`,
      `Proof: ${actionSents[0] ?? "[Add: one thing you've already done that shows this interest, with a detail]"}`,
      `Fit: what you'd contribute in the role, tied to what a ${o.bar.noun} team needs.`,
      "Close: one sentence on what you want to learn there.",
    ].join("\n");
  }
  return [
    `Situation (1 sentence): ${sents[0] ?? "[Add: where, when, what was at stake]"}`,
    `Task (1 sentence): ${sents.find((x) => /\b(my (role|task|job|goal)|i (needed|had|was asked) to|goal was)\b/i.test(x)) ?? "[Add: what you specifically had to achieve]"}`,
    `Action (2 or 3 "I" steps): ${actionSents.length ? actionSents.slice(0, 3).join(" ") : '[Add: "First I…, then I…, finally I…"]'}`,
    `Result: ${resultSent ? `${resultSent}${o.numbers ? "" : " [Add a number]"}` : "[Add: the measurable outcome, e.g. Time saved, grade, users, money]"}`,
    `Learning (1 sentence): ${sents.find((x) => /\b(learn|learned|learnt|taught me|next time|differently|now i)\b/i.test(x)) ?? "[Add: what you'd do differently, or now do as a habit]"}`,
  ].join("\n");
}


export function averageScores(list: AnswerScores[]): AnswerScores | null {
  if (!list.length) return null;
  const keys = ["structure", "specificity", "impact", "relevance", "concision"] as const;
  return Object.fromEntries(keys.map((k) => [k, Math.round((list.reduce((a, s) => a + s[k], 0) / list.length) * 10) / 10])) as unknown as AnswerScores;
}

export function overall(s: AnswerScores) {
  return Math.round(((s.structure + s.specificity + s.impact + s.relevance + s.concision) / 25) * 100);
}

export function sessionSummary(s: MockSession) {
  const scored = s.turns.filter((t) => t.feedback).map((t) => t.feedback!.scores);
  const avg = averageScores(scored);
  if (!avg) return null;
  const entries = Object.entries(avg) as [keyof AnswerScores, number][];
  const best = [...entries].sort((a, b) => b[1] - a[1])[0];
  const worst = [...entries].sort((a, b) => a[1] - b[1])[0];
  return { avg, overall: overall(avg), best: best[0], worst: worst[0] };
}

/* ------------------------------------------------------------------ */
/* Mock interview composition                                          */
/* ------------------------------------------------------------------ */

export function pickMockQuestions(set: QuestionSet, type: MockSession["type"], n: number, seed = Date.now()): InterviewQuestion[] {
  const rot = <T,>(arr: T[]) => {
    if (!arr.length) return arr;
    const k = Math.abs(seed) % arr.length;
    return [...arr.slice(k), ...arr.slice(0, k)];
  };
  const opener = set.motivation.find((q) => q.id === "m-yourself");
  let pool: InterviewQuestion[];
  switch (type) {
    case "behavioural":
      pool = rot(set.behavioural);
      break;
    case "company":
      pool = [...set.company, ...set.motivation.filter((q) => q.id === "m-why-industry" || q.id === "m-why-role"), ...rot(set.behavioural)];
      break;
    case "cv":
      pool = set.cv;
      break;
    case "technical":
      pool = rot(set.technical);
      break;
    default:
      pool = [...rot(set.behavioural).slice(0, 2), ...set.motivation.filter((q) => q.id === "m-why-role"), ...rot(set.technical).slice(0, 1), ...set.cv.slice(0, 1), ...set.company.slice(0, 1)];
  }
  const list = type === "technical" || type === "cv" ? pool : [opener!, ...pool].filter(Boolean);
  const unique = list.filter((q, i) => list.findIndex((x) => x.id === q.id) === i);
  return unique.slice(0, n);
}

/* ------------------------------------------------------------------ */
/* Case interview checking                                             */
/* ------------------------------------------------------------------ */

export function checkCaseStage(stage: CaseStage, answer: string) {
  const covered = stage.goodAnswer.map((pt) => ({ point: pt, hit: coverage(pt, answer) >= 0.34 }));
  const pct = Math.round((covered.filter((c) => c.hit).length / stage.goodAnswer.length) * 100);
  return { covered, pct };
}

export function caseById(id: string) {
  return CASES.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Story bank                                                          */
/* ------------------------------------------------------------------ */

export function storyCoverage(stories: StoryEntry[]) {
  return COMPETENCIES.map((c) => ({ competency: c, stories: stories.filter((s) => s.competencies.includes(c)).length }));
}

export function storyToAnswer(s: StoryEntry) {
  return [s.situation, s.task, s.action, s.result].filter(Boolean).join(" ");
}
