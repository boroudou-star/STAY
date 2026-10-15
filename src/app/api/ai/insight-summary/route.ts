import { z } from "zod";
import { aiJSON } from "@/lib/ai";

const Body = z.object({
  entries: z
    .array(z.object({ question: z.string().max(600), answer: z.string().max(5000), area: z.string().max(60).optional(), company: z.string().max(80).optional() }))
    .min(1)
    .max(60),
  goal: z.string().max(80).optional(),
});
const Out = z.object({
  pointOfView: z.string().max(900),
  themes: z.array(z.string().max(120)).max(5),
  gaps: z.array(z.string().max(160)).max(3),
  talkingPoints: z.array(z.string().max(240)).max(3),
});

const SYSTEM = `You organise a student's own industry reflections into an "insight profile" they can use in interviews.
Use ONLY ideas present in their entries — do not add facts, companies, statistics or opinions they didn't express.
Return JSON:
- pointOfView: 3-4 sentences in second person summarising the views they've expressed.
- themes: up to 5 recurring themes in their thinking.
- gaps: up to 3 areas they haven't explored yet that would strengthen their perspective (phrase as suggestions, not facts).
- talkingPoints: up to 3 interview-ready talking points, each rephrasing one of THEIR own arguments.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const out = await aiJSON(SYSTEM, JSON.stringify(parsed.data), Out, 900);
  if (!out) return Response.json({ source: "rules" });
  return Response.json({ ...out, source: "ai" });
}
