/**
 * Reads upcoming events from the HTML of a public events page, without AI.
 * 1. schema.org Event data (JSON-LD), when the page provides it.
 * 2. Otherwise, links that look like event pages, with a date printed in or next to the link.
 * Never invents anything: an event is only kept when the page shows its name, a link and a date.
 */

export interface RawEvent {
  name: string;
  date: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  url?: string | null;
  description?: string | null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DAY_FIRST = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\.?(?:,?\\s+(20\\d{2}))?\\b`, "i");
const MONTH_FIRST = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`, "i");
const NUMERIC = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/;
const ISO = /\b(20\d{2})-(\d{2})-(\d{2})\b/;
const TIME_RANGE = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/i;
const TIME_ONE = /\b(\d{1,2})(?:[:.](\d{2}))\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i;

export function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&rsquo;|&lsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)));
}

export function stripTags(h: string) {
  return decodeEntities(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The next occurrence of day/month on or after (today minus a few days), unless the year is printed. */
function resolveDate(day: number, monthIdx: number, year: number | null, today: string): string | null {
  if (monthIdx < 0 || day < 1 || day > 31) return null;
  if (year) return `${year}-${pad(monthIdx + 1)}-${pad(day)}`;
  const ty = Number(today.slice(0, 4));
  const candidate = `${ty}-${pad(monthIdx + 1)}-${pad(day)}`;
  // Listings rarely show events more than a couple of months old; anything well before today is next year
  const monthsBack = (Number(today.slice(5, 7)) - (monthIdx + 1) + 12) % 12;
  return candidate >= today || monthsBack <= 1 ? candidate : `${ty + 1}-${pad(monthIdx + 1)}-${pad(day)}`;
}

export function findDate(text: string, today: string): string | null {
  const iso = text.match(ISO);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d1 = text.match(DAY_FIRST);
  const d2 = text.match(MONTH_FIRST);
  const pick = d1 && d2 ? ((d1.index ?? 0) <= (d2.index ?? 0) ? "d1" : "d2") : d1 ? "d1" : d2 ? "d2" : null;
  if (pick === "d1" && d1) return resolveDate(Number(d1[1]), MONTHS.indexOf(d1[2].slice(0, 3).toLowerCase()), d1[3] ? Number(d1[3]) : null, today);
  if (pick === "d2" && d2) return resolveDate(Number(d2[2]), MONTHS.indexOf(d2[1].slice(0, 3).toLowerCase()), d2[3] ? Number(d2[3]) : null, today);
  const num = text.match(NUMERIC);
  if (num) return resolveDate(Number(num[1]), Number(num[2]) - 1, Number(num[3]), today); // UK format: day/month/year
  return null;
}

function to24(h: number, m: number, ap?: string) {
  let hh = h;
  if (ap?.toLowerCase() === "pm" && hh < 12) hh += 12;
  if (ap?.toLowerCase() === "am" && hh === 12) hh = 0;
  return hh <= 23 && m <= 59 ? `${pad(hh)}:${pad(m)}` : null;
}

export function findTimes(text: string): { start: string | null; end: string | null } {
  const r = text.match(TIME_RANGE);
  if (r && (r[2] || r[3] || r[5] || r[6])) {
    const ap2 = r[6] ?? r[3];
    return { start: to24(Number(r[1]), Number(r[2] ?? 0), r[3] ?? ap2), end: to24(Number(r[4]), Number(r[5] ?? 0), ap2) };
  }
  const one = text.match(TIME_ONE);
  if (one) return one[4] ? { start: to24(Number(one[4]), 0, one[5]), end: null } : { start: to24(Number(one[1]), Number(one[2]), one[3]), end: null };
  return { start: null, end: null };
}

export function fromJsonLd(html: string): RawEvent[] {
  const out: RawEvent[] = [];
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const visit = (it: unknown) => {
    if (!it || typeof it !== "object") return;
    if (Array.isArray(it)) return it.forEach(visit);
    const o = it as Record<string, unknown>;
    if (Array.isArray(o["@graph"])) (o["@graph"] as unknown[]).forEach(visit);
    if (Array.isArray(o.itemListElement)) (o.itemListElement as unknown[]).forEach((x) => visit((x as Record<string, unknown>)?.item ?? x));
    const type = o["@type"];
    const isEvent = typeof type === "string" ? /Event$/.test(type) : Array.isArray(type) && type.some((t) => /Event$/.test(String(t)));
    if (!isEvent || typeof o.name !== "string" || typeof o.startDate !== "string") return;
    const start = o.startDate as string;
    const loc = o.location as { name?: string } | string | undefined;
    out.push({
      name: decodeEntities(o.name).trim(),
      date: start.slice(0, 10),
      startTime: /T\d{2}:\d{2}/.test(start) ? start.slice(11, 16) : null,
      endTime: typeof o.endDate === "string" && /T\d{2}:\d{2}/.test(o.endDate) ? o.endDate.slice(11, 16) : null,
      location: typeof loc === "string" ? loc : (loc?.name ?? null),
      url: typeof o.url === "string" ? o.url : null,
      description: typeof o.description === "string" ? stripTags(o.description).slice(0, 300) : null,
    });
  };
  for (const b of blocks) {
    try {
      visit(JSON.parse(b.replace(/<script[^>]*>|<\/script>/gi, "")));
    } catch {
      /* ignore malformed block */
    }
  }
  return out;
}

const GENERIC_TEXT = /^(more( info(rmation)?)?|read more|find out more|learn more|book( now| here| your place)?|register( now)?|view( event| details)?|details|tickets?|sign up|see more|info|here|click here|buy tickets?)$/i;
const EVENT_PATH = /\/(events?|ents|whats-?on|calendar|programme|activities\/event)\/./i;
const LISTING_PATH = /\/(eventlist|events?\/?$|whats-?on\/?$|category|tag|page\/\d+|search)(\/|\?|$)|[?&](month|page|cat|category|type)=/i;

function sameSite(a: URL, b: URL) {
  const root = (h: string) => h.replace(/^www\./, "").split(".").slice(-3).join(".");
  return a.hostname === b.hostname || root(a.hostname) === root(b.hostname) || a.hostname.endsWith(b.hostname.replace(/^www\./, "")) || b.hostname.endsWith(a.hostname.replace(/^www\./, ""));
}

/**
 * Whole event cards are often one big link (title, date, venue). Prefer the heading or "title" element
 * inside it, so the venue and address don't end up in the event name.
 */
function titleOf(inner: string) {
  const heading = inner.match(/<(h[1-6]|strong|b)\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2] ?? inner.match(/<[a-z0-9]+\b[^>]*class=["'][^"']*(?:title|name|heading)[^"']*["'][^>]*>([\s\S]*?)<\/[a-z0-9]+>/i)?.[1];
  const t = stripTags(heading ?? inner);
  return t.length >= 4 ? t : stripTags(inner);
}

/** Event links with a date printed in the link or in the card around it. */
export function fromEventLinks(html: string, pageUrl: string, today: string): RawEvent[] {
  const base = new URL(pageUrl);
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<header[\s\S]*?<\/header>/gi, (m) => " ".repeat(m.length));
  const anchors = [...body.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: m[1], inner: m[2], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  const byUrl = new Map<string, { name: string; date: string | null; ctx: string }>();
  anchors.forEach((a, i) => {
    let url: URL;
    try {
      url = new URL(decodeEntities(a.href), base);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || !sameSite(url, base)) return;
    const path = url.pathname + url.search;
    if (!EVENT_PATH.test(path) || LISTING_PATH.test(path) || url.href.replace(/\/$/, "") === pageUrl.replace(/\/$/, "")) return;
    const text = titleOf(a.inner);
    const prevEnd = i > 0 ? anchors[i - 1].end : Math.max(0, a.start - 400);
    const nextStart = i < anchors.length - 1 ? anchors[i + 1].start : a.end + 400;
    const card = stripTags(body.slice(Math.max(prevEnd, a.start - 500), Math.min(nextStart, a.end + 500)));
    const date = findDate(stripTags(a.inner), today) ?? findDate(stripTags(body.slice(a.end, Math.min(nextStart, a.end + 500))), today) ?? findDate(stripTags(body.slice(Math.max(prevEnd, a.start - 500), a.start)), today);
    const key = url.href.replace(/\/$/, "");
    const prev = byUrl.get(key);
    const good = text.length >= 4 && text.length <= 160 && !GENERIC_TEXT.test(text);
    if (!prev) byUrl.set(key, { name: good ? text : "", date, ctx: card });
    else {
      if (good && (!prev.name || prev.name.length < text.length)) prev.name = text;
      if (!prev.date && date) prev.date = date;
    }
  });
  const out: RawEvent[] = [];
  for (const [url, v] of byUrl) {
    if (!v.name || !v.date) continue;
    // Remove a printed date/time from the title ("Wed 22 Oct Careers Fair 13:00")
    const name = v.name
      .replace(DAY_FIRST, "")
      .replace(MONTH_FIRST, "")
      .replace(TIME_RANGE, "")
      .replace(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b,?/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,:|\-–]+|[\s,:|\-–]+$/g, "")
      .trim();
    if (name.length < 4) continue;
    const t = findTimes(v.ctx);
    out.push({ name, date: v.date, startTime: t.start, endTime: t.end, url, location: null, description: null });
  }
  return out;
}

export function extractEvents(html: string, pageUrl: string, today: string): RawEvent[] {
  const ld = fromJsonLd(html).filter((e) => e.date >= today);
  if (ld.length) return ld;
  return fromEventLinks(html, pageUrl, today).filter((e) => e.date >= today);
}

/* ------------------------------------------------------------------ */
/* Is it worth a careers-focused student's time?                       */
/* ------------------------------------------------------------------ */

const CAREER =
  /\b(careers?|employ(er|ers|ability|ment)|careers fair|jobs fair|internships?|placements?|graduate|insight|networking|panel|talk|speakers?|lecture|seminar|symposium|conference|summit|hackathon|case (study|competition|workshop)|cv|interviews?|recruit\w*|industry|alumni|mentor\w*|start-?ups?|entrepreneur\w*|pitch|consult\w*|invest\w*|banking|trading|fintech|coding|data science|data|ai|machine learning|pharma\w*|biotech|healthcare|health tech|medtech|law firm|policy|research|sustainab\w*|climate|marketing|leadership|economics|finance|tech|engineering)\b/i;
const NIGHTLIFE =
  /\b(night|party|social|club ?night|karaoke|quiz|bingo|pub|crawl|rave|ball|gig|dj|cocktail|drag|trip|tour|sport|fitness|yoga|football|rugby|netball|hockey|padel|tennis|climbing|hike|swim|run club|games|movie|film|bake|coffee morning|craft|novices)\b/i;

/** Careers-service events are always kept; union and society events only when they're career-relevant. */
export function isCareerRelevant(name: string, sourceKind: "careers" | "union") {
  if (sourceKind === "careers") return true;
  if (!CAREER.test(name)) return false;
  return !NIGHTLIFE.test(name) || /\b(networking|careers?|employers?|industry|insight|alumni)\b/i.test(name);
}
