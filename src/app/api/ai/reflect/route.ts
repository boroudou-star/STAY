import { z } from "zod";
import { aiJSON } from "@/lib/ai";
import { reflectHeuristic } from "@/lib/engine/insights";

const Body = z.object({
  question: z.string().min(1).max(600),
  answer: z.string().min(1).max(5000),
  area: z.string().max(60).optional(),
  company: z.string().max(80).optional(),
  item: z.object({ title: z.string().max(300), source: z.string().max(120) }).optional(),
});
const Out = z.object({ feedback: z.string().max(600), followUp: z.string().max(300) });

const SYSTEM = `You are a thoughtful career coach helping a university student build commercial awareness in an industry.
Given their question and answer, reply with:
- feedback: 2-3 sentences. Name one thing that's strong, then one concrete way to sharpen the thinking (e.g. take a clearer position, add evidence, explain the "so what", consider a counter-argument).
- followUp: ONE probing question that pushes their thinking one level deeper.
Rules: respond to what they actually wrote. Do not introduce facts, numbers, dates or news that aren't in their answer or the headline given. Encouraging, direct, no emojis.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  const rules = reflectHeuristic(b.question, b.answer);
  const ai = await aiJSON(SYSTEM, JSON.stringify(b), Out, 400);
  if (!ai) return Response.json(rules);
  return Response.json({ ...rules, feedback: ai.feedback, followUp: ai.followUp, source: "ai" });
}
