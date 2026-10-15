import { z } from "zod";
import { aiChat, aiJSON } from "@/lib/ai";
import { conceptOf, expertFor, expertReply, expertSummary } from "@/lib/engine/expert";
import { AREA_MAP } from "@/data/insights";
import type { ChatTurn, ExpertTopic } from "@/lib/types";

const AREAS = Object.keys(AREA_MAP) as [string, ...string[]];

const Topic = z.object({
  kind: z.enum(["news", "podcast", "company", "concept", "primer", "plan"]),
  question: z.string().min(1).max(600),
  area: z.enum(AREAS).optional(),
  company: z.string().max(80).optional(),
  concept: z.string().max(120).optional(),
  item: z.object({ title: z.string().max(300), url: z.string().max(1000).optional(), source: z.string().max(120), kind: z.enum(["news", "podcast", "primer"]) }).optional(),
  primer: z.object({ title: z.string().max(200), body: z.string().max(1500) }).optional(),
  notes: z.record(z.string(), z.string().max(3000)).optional(),
});

const Body = z.object({
  action: z.enum(["reply", "wrap"]),
  topic: Topic,
  turns: z.array(z.object({ role: z.enum(["expert", "user"]), text: z.string().max(4000) })).min(1).max(40),
});

const Summary = z.object({
  verdict: z.enum(["strong", "developing", "weak"]),
  headline: z.string().max(400),
  strengths: z.array(z.string().max(300)).max(3),
  gaps: z.array(z.string().max(300)).max(4),
  corrections: z.array(z.string().max(400)).max(3),
  keyPoints: z.array(z.string().max(400)).max(5),
  interviewAnswer: z.string().max(1500),
  nextQuestion: z.string().max(300),
});

function context(topic: ExpertTopic) {
  const c = conceptOf(topic);
  const ex = expertFor(topic);
  const lines = [`Question being discussed: ${topic.question}`];
  if (topic.area) lines.push(`Industry: ${AREA_MAP[topic.area].label}`);
  if (topic.company) lines.push(`Company the student is targeting: ${topic.company}`);
  if (topic.item) lines.push(`${topic.item.kind === "podcast" ? "Podcast" : "News headline"}: "${topic.item.title}" (${topic.item.source}). You have only seen the title, not the content.`);
  if (topic.primer) lines.push(`Background explainer the student read: ${topic.primer.title}. ${topic.primer.body}`);
  if (c) lines.push(`Reference knowledge on ${c.concept}: ${c.explain} Example: ${c.example} Debate: ${c.debate} Why employers care: ${c.whyEmployers}`);
  lines.push(`Live debates in this field: ${ex.debates.join(" ")}`);
  const notes = Object.entries(topic.notes ?? {}).filter(([, v]) => v.trim());
  if (notes.length) lines.push(`The student's own reading notes:\n${notes.map(([k, v]) => `${k}: ${v.trim()}`).join("\n")}`);
  return lines.join("\n");
}

function replySystem(topic: ExpertTopic) {
  const ex = expertFor(topic);
  return `You are STAY's ${ex.title}, a professional who ${ex.background}. You are talking one to one with a UK university student who is building industry knowledge for graduate job interviews. You are not a cheerleader: you are a sharp, kind expert who tells the truth.

${context(topic)}

How to respond on every turn:
- React to exactly what they wrote, quoting a few of their words when useful.
- If the answer is off topic, a list of names, very short, "I don't know", or a complaint about the questions, say so plainly, then help: explain the idea briefly in plain words and ask an easier or different question. Do not move deeper until they have given a real answer.
- If something they said is wrong or confused, correct it directly and explain why.
- Never praise what isn't good. No "great answer" or "good start". Acknowledge something only when it is specifically earned, in a few words.
- Add one piece of expert context they didn't mention: a mechanism, a trade-off, an example or a counterargument. Use only well-established knowledge. Do not invent news, figures, dates, quotes or details of the article.
- End with exactly ONE question that builds on their specific answer and goes one level deeper: why, how it works, who wins and loses, the strongest counterargument, or what it means for an employer. Never repeat a question you already asked. If they say you are repeating yourself, acknowledge it in a few words and change approach.
- Under 110 words. Conversational, plain British English. No lists, headings or emojis. Do not use dashes as punctuation.
- After about six exchanges, or once they have covered what it is, an example, how it works, their view and the counterargument, tell them to press "Wrap up & save".`;
}

const WRAP_SYSTEM = `You are a senior industry expert assessing a discussion you just had with a university student about an industry topic. Be honest and specific. The student asked for real criticism, not encouragement.

Return:
- verdict: "strong" only if they explained the idea correctly, used a concrete example, took a reasoned position and handled a counterargument. "developing" if they gave some real reasoning but have clear gaps. "weak" if answers were mostly short, unsure, off topic or wrong.
- headline: one or two sentences with your honest judgement and the main reason.
- strengths: at most 2, each quoting their actual words. Empty list if nothing was genuinely good.
- gaps: up to 4 specific things missing or weak.
- corrections: anything they got wrong or confused, with the correct version. Empty list if none.
- keyPoints: 3 or 4 things an expert would want them to remember about this topic, from well-established knowledge only.
- interviewAnswer: a 4 to 6 line interview answer built only from the student's own points. Where something is missing write [Add: ...]. Never invent facts about them.
- nextQuestion: one question to think about next time.
Plain British English. Do not use dashes as punctuation.`;

function toMessages(turns: ChatTurn[]) {
  const msgs: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: "(The student opened the discussion.)" }];
  for (const t of turns) {
    const role = t.role === "expert" ? "assistant" : "user";
    const last = msgs[msgs.length - 1];
    if (last.role === role) last.content += `\n\n${t.text}`;
    else msgs.push({ role, content: t.text || "(no answer)" });
  }
  return msgs;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const topic = parsed.data.topic as ExpertTopic;
  const turns = parsed.data.turns as ChatTurn[];

  if (parsed.data.action === "wrap") {
    const transcript = turns.map((t) => `${t.role === "expert" ? "Expert" : "Student"}: ${t.text}`).join("\n\n");
    const ai = await aiJSON(WRAP_SYSTEM, `${context(topic)}\n\nTranscript:\n${transcript}`, Summary, 1400);
    return Response.json({ summary: ai ? { ...ai, source: "ai" } : expertSummary(topic, turns) });
  }

  if (turns.at(-1)?.role !== "user") return Response.json({ error: "Last turn must be the student's" }, { status: 400 });
  const ai = await aiChat(replySystem(topic), toMessages(turns), 450);
  if (ai) return Response.json({ text: ai.replace(/\s+[—–]\s+/g, ", "), source: "ai" });
  return Response.json({ text: expertReply(topic, turns), source: "rules" });
}
