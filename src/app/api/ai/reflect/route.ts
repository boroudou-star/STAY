import { z } from "zod";
import { aiJSON } from "@/lib/ai";
import { reflectHeuristic } from "@/lib/engine/insights";

const Body = z.object({
  question: z.string().min(1).max(600),
  answer: z.string().min(1).max(5000),
  steps: z.array(z.object({ prompt: z.string().max(400), answer: z.string().max(2000) })).max(8).optional(),
  area: z.string().max(60).optional(),
  company: z.string().max(80).optional(),
  item: z.object({ title: z.string().max(300), source: z.string().max(120) }).optional(),
});
const Out = z.object({ feedback: z.string().max(600), followUp: z.string().max(300) });

const SYSTEM = `You are a thoughtful career coach helping a university student build commercial awareness in an industry.
They answered the question in small steps (each step's prompt and answer is included). Given their answers, reply with:
- feedback: 2-3 sentences. Name one thing that's strong, then one concrete way to sharpen the thinking (e.g. take a clearer position, add evidence, explain the "so what", consider a counter-argument).
- followUp: ONE probing question that pushes their thinking one level deeper.
Rules: respond to what they actually wrote, and refer to a specific step when useful. Do not introduce facts, numbers, dates or news that aren't in their answer or the headline given. Encouraging, direct, no emojis. Write in plain sentences and do not use dashes as punctuation.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  const rules = reflectHeuristic(b.question, b.answer);
  const ai = await aiJSON(SYSTEM, JSON.stringify(b), Out, 400);
  if (!ai) return Response.json(rules);
  return Response.json({ ...rules, feedback: ai.feedback, followUp: ai.followUp, source: "ai" });
}
