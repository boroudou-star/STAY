import { z } from "zod";
import { aiAvailable, aiJSON } from "@/lib/ai";
import { universitySources, type UniLink } from "@/data/universities";
import { extractEvents, isCareerRelevant, stripTags, type RawEvent } from "@/lib/engine/event-extract";
import { fromUclListing } from "@/lib/engine/ucl-events";
import { robotsMatch, type Rule } from "@/lib/engine/robots";
import type { CareerEvent, CareerTrack, EventCategory } from "@/lib/types";

/**
 * Live campus events for a university, read automatically from its public pages:
 * careers service events and fairs, students' union events and society events (src/data/universities.ts).
 * - Checks each site's robots.txt and identifies itself honestly. If a site refuses, STAY says so and links to it.
 * - Reads schema.org event data or event links with printed dates; Claude helps only if a key is set.
 * - Never invents events. Union and society events are only kept when they're career-relevant.
 * - Cached for 6 hours per university (and at Vercel's edge), to be gentle on university sites.
 */

const TTL_MS = 6 * 60 * 60 * 1000;
const UA = "Mozilla/5.0 (compatible; STAYbot/1.0; student careers app; +https://github.com/boroudou-star/STAY)";
const MAX_BYTES = 2_000_000;

type SourceKind = "careers" | "union";
export interface SourceStatus {
  label: string;
  url: string;
  status: "ok" | "none" | "blocked" | "disallowed" | "error";
  count: number;
  detail?: string;
}

type Cache = { at: number; events: CareerEvent[]; sources: SourceStatus[] };
const g = globalThis as unknown as { __stayUniEvents?: Map<string, Cache>; __stayRobots?: Map<string, { at: number; rules: Rule[] }> };
g.__stayUniEvents ??= new Map();
g.__stayRobots ??= new Map();


/** Allow/Disallow rules that apply to us (our own group, or "*"), per the robots.txt standard (RFC 9309). */
async function robotsRules(origin: string): Promise<Rule[]> {
  const hit = g.__stayRobots!.get(origin);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
  let rules: Rule[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const groups: { agents: string[]; rules: Rule[] }[] = [];
      let cur: { agents: string[]; rules: Rule[] } | null = null;
      for (const raw of (await res.text()).split("\n")) {
        const l = raw.replace(/#.*/, "").trim();
        const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i);
        if (!m) continue;
        const [, key, val] = m;
        if (/^user-agent$/i.test(key)) {
          if (!cur || cur.rules.length) groups.push((cur = { agents: [], rules: [] }));
          cur.agents.push(val.toLowerCase());
        } else if (/^(dis)?allow$/i.test(key) && cur && val) cur.rules.push({ allow: /^allow$/i.test(key), path: val });
      }
      const ours = groups.filter((gr) => gr.agents.some((a) => a.includes("staybot")));
      rules = (ours.length ? ours : groups.filter((gr) => gr.agents.includes("*"))).flatMap((gr) => gr.rules);
    }
  } catch {
    rules = []; // no robots.txt reachable: the page fetch itself will show whether we're welcome
  }
  g.__stayRobots!.set(origin, { at: Date.now(), rules });
  return rules;
}

/** null when allowed, otherwise the robots.txt rule that disallows the page. */
async function disallowedBy(url: URL) {
  const r = robotsMatch(await robotsRules(url.origin), url.pathname + url.search);
  return r && !r.allow ? r.path : null;
}

function inferTracks(text: string): CareerTrack[] {
  const t = text.toLowerCase();
  const out: CareerTrack[] = [];
  if (/\b(ai|machine learning|artificial intelligence)\b/.test(t)) out.push("ai");
  if (/\b(data|analytics)\b/.test(t)) out.push("data");
  if (/\b(tech|software|engineer|developer|digital|coding)\b/.test(t)) out.push("software");
  if (/\bconsult/.test(t)) out.push("consulting");
  if (/\b(finance|bank|investment|trading|fintech)\b/.test(t)) out.push("finance");
  if (/\b(health|pharma|bio|life science|medic|nhs)/.test(t)) out.push("biotech");
  if (/\b(research|phd|academic)\b/.test(t)) out.push("research");
  if (/\b(marketing|media|creative|brand)\b/.test(t)) out.push("marketing");
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

async function fromAi(text: string, today: string): Promise<RawEvent[]> {
  if (!aiAvailable()) return [];
  const out = await aiJSON(
    `You extract upcoming events from the text of a public university or students' union events page.
Only include events explicitly listed with a date. Never invent events, times, venues or URLs. Use null when not stated.
Dates as YYYY-MM-DD (the year is the next occurrence on or after today's date). url: the event's own link from the text if present.
Return {"events":[{name,date,startTime,endTime,location,url,description}]}.`,
    `today: ${today}\n\nPage text:\n${text.slice(0, 14000)}`,
    AiOut,
    2500,
  );
  return out ? out.events.filter((e) => !e.url || text.includes(e.url)) : [];
}

async function readSource(link: UniLink, kind: SourceKind, uni: string, today: string): Promise<{ status: SourceStatus; events: CareerEvent[] }> {
  const status: SourceStatus = { label: link.label, url: link.url, status: "none", count: 0 };
  const url = new URL(link.url);
  try {
    const rule = await disallowedBy(url);
    if (rule) return { status: { ...status, status: "disallowed", detail: `The site's robots.txt asks automated tools not to read this page (Disallow: ${rule})` }, events: [] };
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(9000) });
    if (res.status === 401 || res.status === 403 || res.status === 429) return { status: { ...status, status: "blocked", detail: `The site refused automated access (HTTP ${res.status})` }, events: [] };
    if (!res.ok) return { status: { ...status, status: "error", detail: `HTTP ${res.status}` }, events: [] };
    const html = (await res.text()).slice(0, MAX_BYTES);
    let raw = /(^|\.)ucl\.ac\.uk$/.test(url.hostname) ? fromUclListing(html, today) : [];
    if (!raw.length) raw = extractEvents(html, res.url || link.url, today);
    if (!raw.length) raw = await fromAi(stripTags(html), today);
    const horizon = new Date(Date.now() + 150 * 86_400_000).toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const org = link.label.split(":")[0].replace(/\s*\(.*\)$/, "").trim();
    const events = raw
      .filter((r) => r.date >= today && r.date <= horizon && isCareerRelevant(r.name, kind))
      .map((r) => {
        const blob = `${r.name} ${r.description ?? ""}`;
        return {
          id: `live-${(r.url ?? `${r.name}-${r.date}`).replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 90)}`,
          name: r.name,
          organiser: org,
          university: uni,
          date: r.date,
          startTime: r.startTime ?? undefined,
          endTime: r.endTime ?? undefined,
          location: r.location ?? "See the event page",
          format: /online|virtual|zoom|teams/i.test(`${r.location ?? ""} ${r.name}`) ? "online" : "in_person",
          category: inferCategory(blob),
          description: r.description ?? `Listed on ${link.label}. Open the event page for details and booking.`,
          tracks: inferTracks(blob),
          skills: [],
          benefits: [kind === "careers" ? "Run by your careers service: meet employers or build skills" : "A society or union event linked to your field"],
          bookingUrl: r.url ?? link.url,
          sourceUrl: link.url,
          sourceName: `${org} (live)`,
          verifiedAt: now,
          isDemo: false,
          provider: "live",
        } satisfies CareerEvent;
      });
    return { status: { ...status, status: events.length ? "ok" : "none", count: events.length, detail: events.length ? undefined : raw.length ? "No career-related events listed right now" : "No dated events could be read from this page" }, events };
  } catch (err) {
    return { status: { ...status, status: "error", detail: err instanceof Error && err.name === "TimeoutError" ? "The site took too long to respond" : "Couldn't reach the site" }, events: [] };
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const src = universitySources(params.get("uni") ?? (params.get("source") === "ucl-careers" ? "UCL" : ""));
  if (!src) return Response.json({ events: [], sources: [], message: "No verified pages for this university yet" });

  const cached = g.__stayUniEvents!.get(src.name);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return Response.json({ events: cached.events, sources: cached.sources, fetchedAt: new Date(cached.at).toISOString(), cached: true }, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" } });
  }

  const today = new Date().toISOString().slice(0, 10);
  const links: [UniLink, SourceKind][] = [
    [src.careersEvents, "careers"],
    ...(src.careersFairs ? ([[src.careersFairs, "careers"]] as [UniLink, SourceKind][]) : []),
    ...(src.international ? ([[src.international, "careers"]] as [UniLink, SourceKind][]) : []),
    ...(src.unionEvents ? ([[src.unionEvents, "union"]] as [UniLink, SourceKind][]) : []),
    ...(src.societies ? ([[src.societies, "union"]] as [UniLink, SourceKind][]) : []),
  ];
  const results = await Promise.all(links.map(([l, k]) => readSource(l, k, src.name, today)));
  const seen = new Set<string>();
  const events = results
    .flatMap((r) => r.events)
    .filter((e) => {
      const key = `${e.name.toLowerCase()}|${e.date}`;
      if (seen.has(key) || seen.has(e.bookingUrl ?? "")) return false;
      seen.add(key);
      if (e.bookingUrl) seen.add(e.bookingUrl);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 40);
  const sources = results.map((r) => r.status);
  g.__stayUniEvents!.set(src.name, { at: Date.now(), events, sources });
  return Response.json({ events, sources, fetchedAt: new Date().toISOString(), cached: false }, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" } });
}
