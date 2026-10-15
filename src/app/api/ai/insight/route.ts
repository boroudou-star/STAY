import { z } from "zod";
import { aiText } from "@/lib/ai";

const Body = z.object({ facts: z.record(z.string(), z.unknown()), fallback: z.string().max(2000) });

const SYSTEM = `You are STAY, a warm, direct career coach for international university students and graduates in the UK.
Write ONE short paragraph (2-3 sentences, max 70 words) explaining the user's single biggest career priority right now and their highest-value actions this month.
Rules:
- Use ONLY the facts provided. Never invent dates, employers, events, vacancies, salaries or visa rules.
- You may mention task titles, gaps, the top event or top opportunity exactly as given.
- If needsSponsorship is true, you may suggest asking employers about sponsorship early, but never promise eligibility.
- Friendly, Gen-Z-aware but professional. Second person. No emojis, no lists, no headings.
Do not use dashes as punctuation.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { facts, fallback } = parsed.data;
  const text = await aiText(SYSTEM, `Facts (JSON):\n${JSON.stringify(facts)}`, 300);
  if (!text) return Response.json({ text: fallback, source: "rules" });
  return Response.json({ text, source: "ai" });
}
