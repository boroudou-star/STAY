import { z } from "zod";
import { aiJSON } from "@/lib/ai";

const Body = z.object({ text: z.string().min(1).max(6000), today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

const Track = z.enum(["ai", "software", "data", "consulting", "finance", "biotech", "research", "marketing", "engineering", "exploring", "other"]);
const Out = z.object({
  name: z.string().max(120).nullable(),
  organiser: z.string().max(120).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  location: z.string().max(140).nullable(),
  format: z.enum(["in_person", "online", "hybrid"]).nullable(),
  category: z.enum(["careers_fair", "employer_talk", "workshop", "hackathon", "networking", "skills_training", "panel"]).nullable(),
  bookingUrl: z.string().url().nullable(),
  tracks: z.array(Track).max(6),
  skills: z.array(z.string().max(40)).max(8),
  benefits: z.array(z.string().max(80)).max(4),
});

const SYSTEM = `Extract structured details of ONE event from a university society announcement.
Rules:
- Only use information present in the text. If a field is not stated, use null (or [] for arrays). Never guess a venue, time or URL.
- Resolve relative/partial dates to YYYY-MM-DD using the provided "today"; choose the next upcoming occurrence. If no date is stated, use null.
- Times in 24h HH:MM.
- tracks: career areas the event is relevant to. skills: skills it helps build. benefits: short phrases on what attendees gain (based on the text).
JSON keys: name, organiser, date, startTime, endTime, location, format, category, bookingUrl, tracks, skills, benefits.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { text, today } = parsed.data;
  const event = await aiJSON(SYSTEM, `today: ${today}\n\nAnnouncement:\n${text}`, Out, 700);
  if (!event) return Response.json({ event: null, source: "rules" });
  // Guardrail: drop any URL that isn't literally in the text
  if (event.bookingUrl && !text.includes(event.bookingUrl)) event.bookingUrl = null;
  return Response.json({ event, source: "ai" });
}
