import { z } from "zod";
import { AREA_MAP } from "@/data/insights";
import { parseRss } from "@/lib/engine/insights";
import type { FeedItem, InsightAreaId } from "@/lib/types";

/**
 * Live industry feed (server side, cached).
 * - News: Google News RSS search (UK edition) — headlines, source names and links only; no article text is copied.
 * - Podcasts: Apple's public iTunes Search API — show names and links.
 * If a source can't be reached, it's simply omitted; nothing is invented.
 */

const AREAS = ["ai", "tech", "data", "consulting", "investment-banking", "finance-markets", "healthcare", "biotech", "marketing", "energy", "public-sector"] as const;
const Query = z.object({
  areas: z.string().max(200).optional(),
  companies: z.string().max(300).optional(),
});

const TTL = 60 * 60 * 1000;
type Entry = { at: number; items: FeedItem[] };
const g = globalThis as unknown as { __stayFeed?: Map<string, Entry> };
g.__stayFeed ??= new Map();

async function cached(key: string, fn: () => Promise<FeedItem[]>) {
  const hit = g.__stayFeed!.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.items;
  const items = await fn();
  if (items.length) g.__stayFeed!.set(key, { at: Date.now(), items });
  return items;
}

async function news(query: string, tag: { area?: InsightAreaId; company?: string }): Promise<FeedItem[]> {
  return cached(`news:${query}`, async () => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:7d`)}&hl=en-GB&gl=GB&ceid=GB:en`;
    const res = await fetch(url, { headers: { "User-Agent": "STAY-career-navigator/0.1" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    return parseRss(await res.text(), 5).map((r, i) => ({
      id: `news-${query.replace(/\W+/g, "-").toLowerCase()}-${i}`,
      kind: "news" as const,
      title: r.title,
      source: r.source ?? "News",
      url: r.link,
      publishedAt: r.pubDate ? new Date(r.pubDate).toISOString() : undefined,
      ...tag,
      isLive: true,
    }));
  }).catch(() => []);
}

const Podcast = z.object({
  collectionId: z.number(),
  collectionName: z.string(),
  artistName: z.string().optional(),
  collectionViewUrl: z.string().url(),
  releaseDate: z.string().optional(),
});

async function podcasts(area: InsightAreaId): Promise<FeedItem[]> {
  const term = AREA_MAP[area].podcastTerm;
  return cached(`pod:${term}`, async () => {
    const url = `https://itunes.apple.com/search?media=podcast&country=GB&limit=3&term=${encodeURIComponent(term)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: unknown[] };
    return (data.results ?? [])
      .map((r) => Podcast.safeParse(r))
      .filter((r) => r.success)
      .map((r) => r.data!)
      .map((p) => ({
        id: `pod-${p.collectionId}`,
        kind: "podcast" as const,
        title: p.collectionName,
        source: p.artistName ?? "Podcast",
        url: p.collectionViewUrl,
        publishedAt: p.releaseDate,
        area,
        isLive: true,
      }));
  }).catch(() => []);
}

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });
  const areas = (parsed.data.areas ?? "")
    .split(",")
    .filter((a): a is (typeof AREAS)[number] => (AREAS as readonly string[]).includes(a))
    .slice(0, 4);
  const companies = (parsed.data.companies ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 4);

  const jobs: Promise<FeedItem[]>[] = [];
  for (const a of areas) jobs.push(news(AREA_MAP[a].newsQueries[0], { area: a }), podcasts(a));
  for (const c of companies) jobs.push(news(`"${c}"`, { company: c }));
  const results = await Promise.all(jobs);
  const items = results.flat();
  const seen = new Set<string>();
  const unique = items.filter((i) => (seen.has(i.title) ? false : (seen.add(i.title), true)));
  return Response.json({
    items: unique,
    fetchedAt: new Date().toISOString(),
    status: { news: unique.some((i) => i.kind === "news"), podcasts: unique.some((i) => i.kind === "podcast") },
  });
}
