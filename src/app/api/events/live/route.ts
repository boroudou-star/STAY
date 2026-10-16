import { z } from "zod";
import { aiAvailable, aiJSON } from "@/lib/ai";
import { fromUclListing } from "@/lib/engine/ucl-events";
import type { CareerEvent, CareerTrack, EventCategory } from "@/lib/types";

/**
 * PublicUCLCareersProvider (server side).
 * - Fetches the public UCL Careers events page (allowed by ucl.ac.uk/robots.txt at time of writing; re-checked at runtime).
 * - Extracts events from schema.org JSON-LD when present, otherwise with Claude (if configured) from page text.
 * - Caches for 6 hours to respect the site. Never invents events: if nothing can be parsed, returns [] and the UI links to the source.
 */

const SOURCE_URL = "https://www.ucl.ac.uk/study/careers/ucl-careers/resources-and-services/come-event/upcoming-events";
const SOURCE_PATH = "/study/careers/ucl-careers/resources-and-services/come-event/upcoming-events";
const ROBOTS_URL = "https://www.ucl.ac.uk/robots.txt";
const TTL_MS = 6 * 60 * 60 * 1000;
const UA = "STAY-career-navigator/0.1 (student hackathon project; contact via repository)";

type Cache = { at: number; events: CareerEvent[]; message?: string };
const g = globalThis as unknown as { __stayLiveEvents?: Cache; __stayRobotsOk?: { at: number; ok: boolean } };

async function robotsAllows(path: string) {
  const cached = g.__stayRobotsOk;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.ok;
  try {
    const res = await fetch(ROBOTS_URL, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
    const txt = await res.text();
    let inStar = false;
    let ok = true;
    for (const line of txt.split("\n")) {
      const l = line.trim();
      if (/^user-agent:/i.test(l)) inStar = l.split(":")[1].trim() === "*";
      else if (inStar && /^disallow:/i.test(l)) {
        const rule = l.split(":")[1].trim();
        if (rule && path.startsWith(rule)) ok = false;
      }
    }
    g.__stayRobotsOk = { at: Date.now(), ok };
    return ok;
  } catch {
    return false;
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      const abs = href.startsWith("http") ? href : href.startsWith("/") ? `https://www.ucl.ac.uk${href}` : href;
      return ` ${inner} (${abs}) `;
    })
    .replace(/<(br|\/p|\/li|\/h\d|\/div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function inferTracks(text: string): CareerTrack[] {
  const t = text.toLowerCase();
  const out: CareerTrack[] = [];
  if (/\b(ai|machine learning|artificial intelligence)\b/.test(t)) out.push("ai");
  if (/\b(data|analytics)\b/.test(t)) out.push("data");
  if (/\b(tech|software|engineer|developer|digital)\b/.test(t)) out.push("software");
  if (/\bconsult/.test(t)) out.push("consulting");
  if (/\b(finance|bank|investment)\b/.test(t)) out.push("finance");
  if (/\b(health|pharma|bio|life science)/.test(t)) out.push("biotech");
  if (/\b(research|phd|academic)\b/.test(t)) out.push("research");
  if (/\b(marketing|media|creative)\b/.test(t)) out.push("marketing");
  if (/\bengineering\b/.test(t)) out.push("engineering");
  return out.length ? out : ["ai", "software", "data", "consulting", "finance", "biotech", "research", "marketing", "engineering", "exploring", "other"];
}

function inferCategory(text: string): EventCategory {
  const t = text.toLowerCase();
  if (/fair/.test(t)) return "careers_fair";
  if (/hackathon/.test(t)) return "hackathon";
  if (/panel/.test(t)) return "panel";
  if (/network/.test(t)) return "networking";
  if (/(presentation|employer|insight|meet)/.test(t)) return "employer_talk";
  if (/(training|course|bootcamp)/.test(t)) return "skills_training";
  return "workshop";
}

type Raw = { name: string; date: string; startTime?: string | null; endTime?: string | null; location?: string | null; url?: string | null; description?: string | null };

function fromJsonLd(html: string): Raw[] {
  const out: Raw[] = [];
  const blocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const b of blocks) {
    try {
      const json = JSON.parse(b.replace(/<script[^>]*>|<\/script>/gi, ""));
      const items = (Array.isArray(json) ? json : json["@graph"] ?? [json]) as Record<string, unknown>[];
      for (const it of items) {
        if (it["@type"] !== "Event" || typeof it.name !== "string" || typeof it.startDate !== "string") continue;
        const start = it.startDate as string;
        const loc = it.location as { name?: string } | undefined;
        out.push({
          name: it.name,
          date: start.slice(0, 10),
          startTime: start.length > 10 ? start.slice(11, 16) : null,
          endTime: typeof it.endDate === "string" && it.endDate.length > 10 ? it.endDate.slice(11, 16) : null,
          location: loc?.name ?? null,
          url: typeof it.url === "string" ? it.url : null,
          description: typeof it.description === "string" ? it.description : null,
        });
      }
    } catch {
      /* ignore bad block */
    }
  }
  return out;
}

const AiOut = z.object({
  events: z
    .array(
      z.object({
        name: z.string().max(160),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
        location: z.string().max(160).nullable(),
        url: z.string().nullable(),
        description: z.string().max(400).nullable(),
      }),
    )
    .max(25),
});

async function fromAi(text: string, today: string): Promise<Raw[]> {
  if (!aiAvailable()) return [];
  const out = await aiJSON(
    `You extract upcoming events from the text of a public university careers events page.
Only include events explicitly listed with a date. Never invent events, times, venues or URLs. Use null when not stated.
Dates as YYYY-MM-DD (the year is the next occurrence on or after today's date). url: the event's own link from the text if present.
Return {"events":[{name,date,startTime,endTime,location,url,description}]}.`,
    `today: ${today}\n\nPage text:\n${text.slice(0, 14000)}`,
    AiOut,
    2500,
  );
  if (!out) return [];
  return out.events.filter((e) => !e.url || text.includes(e.url));
}

export async function GET() {
  const cached = g.__stayLiveEvents;
  if (cached && Date.now() - cached.at < (cached.events.length ? TTL_MS : 5 * 60 * 1000)) {
    return Response.json({ events: cached.events, fetchedAt: new Date(cached.at).toISOString(), cached: true, message: cached.message });
  }
  const today = new Date().toISOString().slice(0, 10);
  let message: string | undefined;
  let events: CareerEvent[] = [];
  try {
    if (!(await robotsAllows(SOURCE_PATH))) {
      message = "source not reachable or disallowed";
    } else {
      const res = await fetch(SOURCE_URL, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      let raw = fromJsonLd(html);
      if (!raw.length) raw = fromUclListing(html, today);
      if (!raw.length) raw = await fromAi(htmlToText(html), today);
      if (!raw.length) message = aiAvailable() ? "no structured events found" : "set ANTHROPIC_API_KEY to extract live listings";
      const now = new Date().toISOString();
      events = raw
        .filter((r) => r.date >= today)
        .map((r, i) => {
          const blob = `${r.name} ${r.description ?? ""}`;
          return {
            id: `ucl-live-${r.date}-${i}-${r.name.slice(0, 20).replace(/\W+/g, "-").toLowerCase()}`,
            name: r.name,
            organiser: "UCL Careers",
            university: "UCL",
            date: r.date,
            startTime: r.startTime ?? undefined,
            endTime: r.endTime ?? undefined,
            location: r.location ?? "See the event page",
            format: /online|virtual|zoom|teams/i.test(r.location ?? "") ? "online" : "in_person",
            category: inferCategory(blob),
            description: r.description ?? "See the UCL Careers listing for details.",
            tracks: inferTracks(blob),
            skills: [],
            benefits: ["Meet employers or build skills via UCL Careers"],
            bookingUrl: r.url ?? SOURCE_URL,
            sourceUrl: SOURCE_URL,
            sourceName: "UCL Careers (live)",
            verifiedAt: now,
            isDemo: false,
            provider: "ucl-careers",
          } satisfies CareerEvent;
        });
    }
  } catch (err) {
    message = err instanceof Error ? err.message : "fetch failed";
  }
  g.__stayLiveEvents = { at: Date.now(), events, message };
  return Response.json({ events, fetchedAt: new Date().toISOString(), cached: false, message });
}
