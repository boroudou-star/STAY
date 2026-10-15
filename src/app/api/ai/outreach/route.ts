import { z } from "zod";
import { aiAvailable, aiText } from "@/lib/ai";

const Body = z.object({
  draft: z.string().max(3000),
  sender: z.object({
    name: z.string().optional(),
    university: z.string().optional(),
    degree: z.string().optional(),
    stage: z.string().optional(),
    goals: z.array(z.string()).optional(),
  }),
  recipient: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    company: z.string().optional(),
    background: z.string().optional(),
    searchTitle: z.string().optional(),
  }),
  topics: z.array(z.string()).optional(),
});

const SYSTEM = `You polish short LinkedIn coffee-chat requests written by a student or recent graduate.
Rules:
- Keep it under 300 characters if possible, never over 450.
- Use ONLY details present in the draft or the provided JSON. Do not invent biography, achievements, mutual connections or company facts.
- If the recipient name is unknown, keep the placeholder [Name] exactly.
- Polite, specific, low-pressure: ask for a brief chat, not a job or referral.
- Return only the message text. No quotes, no preamble.
Do not use dashes as punctuation.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!aiAvailable()) return Response.json({ text: parsed.data.draft, source: "rules", message: "AI isn't configured. Your template is ready to edit." });
  const { draft, ...ctx } = parsed.data;
  const text = await aiText(SYSTEM, `Context (JSON): ${JSON.stringify(ctx)}\n\nDraft:\n${draft}`, 300);
  if (!text) return Response.json({ text: draft, source: "rules", message: "AI is unavailable right now. Your draft is unchanged." });
  return Response.json({ text: text.replace(/^"|"$/g, ""), source: "ai" });
}
