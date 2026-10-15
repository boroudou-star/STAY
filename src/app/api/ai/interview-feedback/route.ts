import { z } from "zod";
import { aiJSON } from "@/lib/ai";
import { fieldFor } from "@/data/hiring-bar";
import { scoreAnswer } from "@/lib/engine/interview";

const Body = z.object({
  question: z.object({
    id: z.string().max(120),
    kind: z.enum(["behavioural", "motivation", "technical", "company", "cv", "case", "commercial"]),
    text: z.string().max(800),
    competency: z.string().max(60).optional(),
    tests: z.string().max(300).optional(),
    modelPoints: z.array(z.string().max(300)).max(8).optional(),
    source: z.enum(["bank", "cv", "company", "ai"]),
  }),
  answer: z.string().min(1).max(6000),
  role: z.string().max(80).optional(),
  company: z.string().max(80).optional(),
  track: z.string().max(40).optional(),
});

const Score = z.number().int().min(1).max(5);
const Out = z.object({
  verdict: z.enum(["strong_hire", "hire", "borderline", "no_hire"]),
  headline: z.string().max(400),
  scores: z.object({ structure: Score, specificity: Score, impact: Score, relevance: Score, concision: Score }),
  strengths: z.array(z.string().max(220)).max(2),
  notes: z
    .array(z.object({ quote: z.string().max(200).nullable().optional(), issue: z.string().max(300), fix: z.string().max(300) }))
    .min(1)
    .max(6),
  lens: z.array(z.object({ criterion: z.string().max(160), met: z.boolean() })).max(6),
  rewrite: z.string().max(1400),
  followUp: z.string().max(300),
});

function system(field: ReturnType<typeof fieldFor>, role?: string, company?: string) {
  return `You are a ${field.interviewer}. You have interviewed hundreds of graduates${company ? ` and you are interviewing for ${company}` : ""}${role ? ` for a ${role} role` : ""}.
Your hiring bar: ${field.bar}

Score the candidate's answer like a strict, senior interviewer on a real panel. The candidate has asked for blunt, precise criticism so they can improve. Do not soften, do not pad with praise, do not be generic.

Calibration:
- Most first attempts by graduates are "borderline" or "no_hire". Only give "hire" if this answer would beat most candidates in a ${field.label} first round. "strong_hire" is rare.
- Scores 1 to 5 on structure, specificity, impact, relevance, concision. A 5 means genuinely excellent for an experienced interviewer, not just "present".
- A behavioural answer with no clear result cannot be above "borderline". A company or motivation answer that could be pasted into any application cannot be above "borderline".

Output rules:
- headline: your decision in one or two sentences, as you'd write it on the scorecard, naming the main reason.
- notes: 3 to 6 precise criticisms. Where possible quote the candidate's exact words (copy them exactly, max 15 words) in "quote", explain the problem from your seat in "issue", and give a concrete rewrite or action in "fix". Prioritise the issues that would most change your decision.
- lens: judge each of these ${field.label} criteria as met or not: ${(field.behavioural.concat(field.motivation)).map((c) => c.criterion).join("; ")}. Only include the ones relevant to this question type.
- rewrite: an outline of a stronger answer built from the candidate's own material. Where something is missing, write [Add: ...] rather than inventing facts about them.
- strengths: at most 2, specific, quoting what worked. Use an empty list if nothing stands out.
- followUp: the probing question you would ask next in the room.
- For technical questions, mark against the modelPoints; call out any missing or incorrect point explicitly.
- Never invent facts about the candidate, the company or the market. Plain British English. Do not use dashes as punctuation.`;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { question, answer, role, company, track } = parsed.data;
  const field = fieldFor(track);
  const rules = scoreAnswer(question, answer, { track, company });
  const ai = await aiJSON(system(field, role, company), JSON.stringify({ question, answer, role, company }), Out, 1600);
  if (!ai) return Response.json(rules);
  return Response.json({
    ...ai,
    notes: ai.notes.map((n) => ({ quote: n.quote && answer.includes(n.quote) ? n.quote : undefined, issue: n.issue, fix: n.fix })),
    lens: ai.lens.length ? ai.lens : rules.lens,
    improvements: ai.notes.map((n) => n.fix).slice(0, 3),
    field: field.noun,
    source: "ai",
  });
}
