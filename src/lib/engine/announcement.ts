import { extractSkillsFromText } from "./cv";
import type { CareerEvent, CareerTrack, EventCategory } from "@/lib/types";
import { parseISO, toISO } from "@/lib/utils";

export type ExtractedEvent = Partial<Pick<CareerEvent, "name" | "organiser" | "date" | "startTime" | "endTime" | "location" | "format" | "category" | "bookingUrl">> & {
  tracks?: CareerTrack[];
  skills?: string[];
  benefits?: string[];
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function nextOccurrence(day: number, monthIdx: number, today: string) {
  const t = parseISO(today);
  let d = new Date(t.getFullYear(), monthIdx, day);
  if (toISO(d) < today) d = new Date(t.getFullYear() + 1, monthIdx, day);
  return toISO(d);
}

function to24(h: number, m: number, ampm?: string) {
  let hh = h;
  if (ampm) {
    const a = ampm.toLowerCase();
    if (a === "pm" && hh < 12) hh += 12;
    if (a === "am" && hh === 12) hh = 0;
  }
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Rule-based extraction used when no AI key is configured (and to pre-fill AI output).
 * Only returns fields it actually finds in the text.
 */
export function parseAnnouncementLocally(text: string, today: string): ExtractedEvent {
  const out: ExtractedEvent = {};
  const clean = text.replace(/\r/g, "");
  const lower = clean.toLowerCase();

  // Name: first non-empty line, stripped of emojis/hashtags
  const firstLine = clean
    .split("\n")
    .map((l) => l.replace(/[\p{Extended_Pictographic}️]/gu, "").replace(/#\w+/g, "").trim())
    .find((l) => l.length > 3);
  if (firstLine) {
    const m = firstLine.match(/present[s]?:?\s*(.+?)(?:[!.]|$)/i);
    out.name = (m ? m[1] : firstLine.split(/[.!]/)[0]).trim().slice(0, 90);
  }

  // Organiser: "X Society" / "XSoc"
  const org = clean.match(/([A-Z][\w&'’ -]{1,40}?(?:Society|Soc|Club|Network|Careers))\b/);
  if (org) out.organiser = org[1].trim();

  // Date: "6 Nov", "6th November", "Nov 6", "06/11"
  let m = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/);
  if (m) out.date = nextOccurrence(Number(m[1]), MONTHS.indexOf(m[2]), today);
  if (!out.date) {
    m = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (m) out.date = nextOccurrence(Number(m[2]), MONTHS.indexOf(m[1]), today);
  }
  if (!out.date) {
    m = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m) out.date = nextOccurrence(Number(m[1]), Number(m[2]) - 1, today);
  }

  // Time: "6-8pm", "18:00–20:00", "6pm"
  const range = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ?? lower.match(/\b(\d{1,2}):(\d{2})\s*()[-–]\s*(\d{1,2}):(\d{2})()/);
  if (range) {
    const endAmPm = range[6] || undefined;
    out.startTime = to24(Number(range[1]), Number(range[2] ?? 0), range[3] || endAmPm);
    out.endTime = to24(Number(range[4]), Number(range[5] ?? 0), endAmPm);
  } else {
    const single = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    if (single) out.startTime = to24(Number(single[1]), Number(single[2] ?? 0), single[3]);
  }

  // Location
  const loc =
    clean.match(/(?:location|venue|where)\s*[:\-]\s*(.+)/i) ??
    clean.match(/📍\s*(.+)/) ??
    clean.match(/\b((?:[A-Z][\w']+\s){0,4}(?:Building|Theatre|Hall|Room|Lab|Library|Centre|Center)(?:\s+[A-Z]?\d[\w.]*)?)/);
  if (loc) out.location = loc[1].split(/[.,\n]/)[0].trim().slice(0, 80);
  if (/\b(online|zoom|teams|virtual)\b/.test(lower)) {
    out.format = /\b(hybrid)\b/.test(lower) ? "hybrid" : "online";
    if (!out.location) out.location = "Online";
  }

  // Category
  const cats: [EventCategory, RegExp][] = [
    ["hackathon", /hackathon|hack day|game jam/],
    ["careers_fair", /careers? fair|recruitment fair/],
    ["employer_talk", /employer|presentation|insight evening|meet the firm|recruiter/],
    ["networking", /networking|social|mixer/],
    ["panel", /panel|fireside|q&a/],
    ["skills_training", /bootcamp|training|course|masterclass/],
    ["workshop", /workshop|session|tutorial|intro to/],
  ];
  out.category = cats.find(([, re]) => re.test(lower))?.[0];

  // Skills & tracks
  out.skills = extractSkillsFromText(clean);
  const tracks: CareerTrack[] = [];
  if (/\b(ai|ml|machine learning|llm|neural|deep learning)\b/.test(lower)) tracks.push("ai");
  if (/\b(data|analytics|sql|statistics)\b/.test(lower)) tracks.push("data");
  if (/\b(software|coding|developer|web|engineering|hack)\b/.test(lower)) tracks.push("software");
  if (/\b(consult|case)\b/.test(lower)) tracks.push("consulting");
  if (/\b(finance|bank|trading|fintech|quant)\b/.test(lower)) tracks.push("finance");
  if (/\b(bio|pharma|life science)\b/.test(lower)) tracks.push("biotech");
  if (/\b(marketing|brand|growth)\b/.test(lower)) tracks.push("marketing");
  if (tracks.length) out.tracks = tracks;

  const url = clean.match(/https?:\/\/\S+/);
  if (url) out.bookingUrl = url[0].replace(/[).,]+$/, "");
  return out;
}
