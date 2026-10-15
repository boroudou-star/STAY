import { z } from "zod";
import { aiJSON } from "@/lib/ai";

const Body = z.object({
  company: z.string().min(1).max(80),
  role: z.string().max(80),
  industry: z.string().max(80),
  jobDescription: z.string().max(8000).optional(),
});
const Out = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().max(300),
        kind: z.enum(["behavioural", "motivation", "technical", "company", "commercial"]),
        tests: z.string().max(200),
        tips: z.array(z.string().max(200)).max(3),
      }),
    )
    .min(1)
    .max(8),
});

const SYSTEM = `You help a student prepare for a graduate interview.
Generate up to 8 questions they are LIKELY to face for this role and company type.
Rules:
- These are likely question types, not leaked or confirmed questions.
- If a job description is provided, tailor questions to the competencies and responsibilities it states.
- Do not state facts about the company (products, values, numbers, news) unless they appear in the job description. You may use the company name.
- Mix behavioural, motivation, technical/commercial as appropriate for the industry.
- tests: what the interviewer is assessing. tips: 1-3 short, practical tips.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const out = await aiJSON(SYSTEM, JSON.stringify(parsed.data), Out, 1400);
  if (!out) return Response.json({ questions: [], source: "rules" });
  return Response.json({ questions: out.questions, source: "ai" });
}
