import { z } from "zod";
import { aiText } from "@/lib/ai";
import { CASES } from "@/data/interview";

const Body = z.object({
  caseId: z.string().max(60),
  stageId: z.string().max(60),
  history: z.array(z.object({ role: z.enum(["interviewer", "candidate"]), content: z.string().max(4000) })).max(30),
  message: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { caseId, stageId, history, message } = parsed.data;
  const c = CASES.find((x) => x.id === caseId);
  const stage = c?.stages.find((s) => s.id === stageId);
  if (!c || !stage) return Response.json({ error: "Unknown case" }, { status: 404 });

  const system = `You are a friendly but rigorous consulting case interviewer running a FICTIONAL practice case.
Case brief: ${c.brief}
Current stage: ${stage.title}, ${stage.prompt}
Information you may reveal if the candidate asks for it: ${stage.info ?? "none beyond the brief"}
${stage.exhibit ? `Exhibit already shown to the candidate: ${stage.exhibit.caption}, ${JSON.stringify(stage.exhibit.rows)}` : ""}
What a strong answer covers (do NOT reveal this list directly; use it to guide and probe): ${stage.goodAnswer.join("; ")}
Rules: only use the case information above, do not invent new data. If they ask for data you don't have, say it isn't available and ask them to make a reasonable assumption. Keep replies to 2-4 sentences. Ask one probing question at a time. If their answer for this stage is complete, say so briefly and tell them to move to the next stage.
Do not use dashes as punctuation.`;
  const transcript = [...history, { role: "candidate" as const, content: message }]
    .slice(-12)
    .map((h) => `${h.role === "candidate" ? "Candidate" : "Interviewer"}: ${h.content}`)
    .join("\n");
  const text = await aiText(system, transcript, 350);
  if (!text) return Response.json({ source: "rules" });
  return Response.json({ text, source: "ai" });
}
