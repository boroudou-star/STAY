/** Raw event as read from a listing page. */
export type RawEvent = { name: string; date: string; startTime?: string | null; endTime?: string | null; location?: string | null; url?: string | null; description?: string | null };
type Raw = RawEvent;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * UCL's upcoming events page lists each event as a link to /study/events/<year>/<mon>/<slug>,
 * with the day ("12 Oct") and time ("13:00 - 14:00") just before it. Only events with a day we can read are kept.
 */
export function fromUclListing(html: string, today: string): Raw[] {
  const re = /<a\b[^>]*href="((?:https:\/\/www\.ucl\.ac\.uk)?\/study\/events\/(\d{4})\/([a-z]{3})\/[a-z0-9-]+\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
  const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
  const anchors = [...html.matchAll(re)].map((m) => ({ m, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  const timeRe = /(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})/;
  const dayRe = (mon: string) => new RegExp(`\\b(\\d{1,2})\\s+${mon}[a-z]*\\b`, "i");
  // Text between consecutive event links belongs either to the next event (dates printed before titles)
  // or to the previous one (dates after titles). Decide once for the page from the text before the first link.
  const firstMon = anchors[0]?.m[3] ?? "jan";
  const datesBefore = anchors.length > 0 && dayRe(firstMon).test(strip(html.slice(Math.max(0, anchors[0].start - 300), anchors[0].start)));
  const out: Raw[] = [];
  const seen = new Set<string>();
  anchors.forEach(({ m, start, end }, i) => {
    const [, href, year, mon] = m;
    const url = href.startsWith("http") ? href : `https://www.ucl.ac.uk${href}`;
    const inner = strip(m[4]);
    if (!inner || inner.length < 4 || seen.has(url)) return;
    const monthIdx = MONTHS.indexOf(mon.toLowerCase());
    if (monthIdx < 0) return;
    const region = datesBefore
      ? strip(html.slice(i > 0 ? anchors[i - 1].end : Math.max(0, start - 300), start))
      : strip(html.slice(end, i < anchors.length - 1 ? anchors[i + 1].start : end + 300));
    const ctx = dayRe(mon).test(inner) ? inner : region;
    const day = ctx.match(dayRe(mon));
    if (!day) return;
    const date = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(Number(day[1])).padStart(2, "0")}`;
    if (date < today) return;
    const t = ctx.match(timeRe);
    const name = inner.replace(dayRe(mon), "").replace(timeRe, "").replace(/^[\s,:|-]+|[\s,:|-]+$/g, "").trim() || inner;
    seen.add(url);
    out.push({ name, date, startTime: t ? t[1].padStart(5, "0") : null, endTime: t ? t[2].padStart(5, "0") : null, location: null, url, description: null });
  });
  return out.slice(0, 30);
}
