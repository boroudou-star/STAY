import { z } from "zod";
import { aiJSON } from "@/lib/ai";

const Body = z.object({ cvText: z.string().min(1).max(20000) });
const Out = z.object({ skills: z.array(z.string().max(60)).max(40) });

const SYSTEM = `Extract technical and professional skills that are EXPLICITLY named in the CV text.
Do not infer skills from job titles or context. Return {"skills": [...]} using the wording in the text.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { cvText } = parsed.data;
  const out = await aiJSON(SYSTEM, cvText, Out, 500);
  if (!out) return Response.json({ skills: [], source: "rules" });
  // Guardrail: keep only skills whose text actually appears in the CV.
  const lower = cvText.toLowerCase();
  const skills = out.skills.filter((s) => lower.includes(s.toLowerCase()));
  return Response.json({ skills, source: "ai" });
}
