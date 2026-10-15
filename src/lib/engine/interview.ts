import { BEHAVIOURAL, CASES, COMPANY_TEMPLATES, COMPETENCIES, MOTIVATION, technicalFor, type CaseStage } from "@/data/interview";
import { roleForTrack, TRACK_MAP } from "@/data/careers";
import type { AnswerFeedback, AnswerScores, CareerTrack, FeedItem, InterviewQuestion, MockSession, StoryEntry, UserProfile } from "@/lib/types";
import { coverage, tokens, wordCount } from "./text";

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
      `On "${it.text}" — what was the hardest part, and how did you handle it?`,
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
      text: `You list ${s} — tell me about the most substantial thing you've built or done with it.`,
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
/* Answer feedback (rule-based fallback for AI)                         */
/* ------------------------------------------------------------------ */

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

export function detectStar(answer: string) {
  const a = answer.toLowerCase();
  return {
    situation: /\b(when i|while i|during|at (my|the|a)|last (year|summer|term)|in my (first|second|third|final)|as part of)\b/.test(a),
    task: /\b(my (role|task|job|goal|responsibility)|i (needed|had|was asked) to|the goal was|our aim|we needed to|objective)\b/.test(a),
    action: /\bi (built|led|created|organised|organized|analysed|analyzed|designed|wrote|decided|spoke|set up|proposed|implemented|reached out|coordinated|split|tested|learned|researched|asked|persuaded|negotiated|fixed|introduced)\b/.test(a),
    result: /\b(as a result|result(ed)?|outcome|which led to|led to|we (won|delivered|launched|achieved|finished)|increased|reduced|improved|saved|grew|achieved|learned that|feedback)\b/.test(a),
  };
}

export function scoreAnswer(q: InterviewQuestion, answer: string): AnswerFeedback {
  const words = wordCount(answer);
  const a = answer.toLowerCase();
  const star = detectStar(answer);
  const starCount = Object.values(star).filter(Boolean).length;
  const numbers = (answer.match(/\d+(\.\d+)?\s?(%|k|m|£|people|users|members|hours|weeks|days)?|£\s?\d+/gi) ?? []).length;
  const iCount = (a.match(/\bi\b/g) ?? []).length;
  const weCount = (a.match(/\bwe\b/g) ?? []).length;
  const technical = q.kind === "technical" || q.kind === "case";

  let structure: number;
  let relevance: number;
  if (technical && q.modelPoints?.length) {
    const cov = q.modelPoints.map((pt) => coverage(pt, answer));
    const covered = cov.filter((c) => c >= 0.34).length;
    structure = clamp(1 + (covered / q.modelPoints.length) * 4);
    relevance = clamp(1 + (covered / q.modelPoints.length) * 4);
  } else {
    structure = clamp(1 + starCount);
    const qWords = new Set(tokens(`${q.text} ${q.competency ?? ""}`));
    const overlap = tokens(answer).filter((w) => qWords.has(w)).length;
    relevance = clamp(2 + Math.min(3, overlap / 2));
  }
  const specificity = clamp(1 + Math.min(2, numbers) + (/\b(for example|for instance|specifically|such as)\b/.test(a) ? 1 : 0) + (words > 80 ? 1 : 0));
  const impact = clamp(1 + (star.result ? 2 : 0) + Math.min(2, numbers));
  const [lo, hi] = technical ? [50, 260] : [110, 320];
  const concision = words < lo * 0.5 ? 1 : words < lo ? 3 : words <= hi ? 5 : words <= hi * 1.5 ? 3 : 2;
  const scores: AnswerScores = { structure, specificity, impact, relevance, concision };

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (!technical) {
    if (starCount >= 3) strengths.push("Clear STAR structure");
    else improvements.push(`Use STAR: you're missing ${(["situation", "task", "action", "result"] as const).filter((k) => !star[k]).join(", ")}`);
    if (iCount >= weCount && iCount > 1) strengths.push("Your personal contribution comes through");
    else if (weCount > iCount) improvements.push("Say more about what *you* did — use 'I' for your actions");
  } else if (q.modelPoints) {
    const missed = q.modelPoints.filter((pt) => coverage(pt, answer) < 0.34);
    if (missed.length < q.modelPoints.length) strengths.push(`Covered ${q.modelPoints.length - missed.length} of ${q.modelPoints.length} key points`);
    if (missed.length) improvements.push(`Also cover: ${missed[0]}`);
  }
  if (numbers > 0) strengths.push("Uses concrete numbers");
  else improvements.push("Add a number — size, time saved, people involved or an outcome");
  if (concision === 5) strengths.push("Good length for a spoken answer");
  else if (words < lo) improvements.push("Too short — aim for about 1–2 minutes spoken");
  else improvements.push("A bit long — lead with the point and trim the set-up");

  const weakest = (Object.entries(scores) as [keyof AnswerScores, number][]).sort((x, y) => x[1] - y[1])[0][0];
  const followUps: Record<keyof AnswerScores, string> = {
    structure: technical ? "Can you structure that answer into 2–3 clear steps?" : "Can you take me through the situation briefly, then focus on what you did?",
    specificity: "Can you give me a specific example or a number from that?",
    impact: "What was the measurable result, and how do you know?",
    relevance: q.competency ? `How does that example show ${q.competency.toLowerCase()} specifically?` : "How does that answer the question directly?",
    concision: words < lo ? "Could you expand on the most important part?" : "If you had 30 seconds, what's the headline?",
  };
  return { scores, strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3), followUp: followUps[weakest], source: "rules" };
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
