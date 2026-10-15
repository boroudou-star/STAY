import { z } from "zod";
import { aiJSON } from "@/lib/ai";
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
});
const Score = z.number().int().min(1).max(5);
const Out = z.object({
  scores: z.object({ structure: Score, specificity: Score, impact: Score, relevance: Score, concision: Score }),
  strengths: z.array(z.string().max(200)).max(3),
  improvements: z.array(z.string().max(220)).max(3),
  followUp: z.string().max(300),
});

const SYSTEM = `You are an experienced UK graduate recruiter running a mock interview.
Score the candidate's answer 1-5 on: structure (STAR for behavioural; logical steps for technical/case), specificity, impact (clear outcomes), relevance (answers the question / shows the competency), concision (spoken length ~1-2 min).
Give up to 3 short strengths and up to 3 concrete improvements, then ONE realistic follow-up probe an interviewer would ask next.
Rules: judge only what they wrote. Never invent details about the candidate or the company. For technical questions, use the modelPoints as the marking guide. Be honest but encouraging.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { question, answer } = parsed.data;
  const rules = scoreAnswer(question, answer);
  const ai = await aiJSON(SYSTEM, JSON.stringify(parsed.data), Out, 700);
  if (!ai) return Response.json(rules);
  return Response.json({ ...ai, source: "ai" });
}
