import { AREA_MAP, INSIGHT_AREAS, TRACK_TO_AREAS, WEEK_PLAN, type Primer } from "@/data/insights";
import type { ExpertTopic, FeedItem, InsightAreaId, InsightEntry, InsightPrefs, UserProfile } from "@/lib/types";
import { addDays, daysBetween, todayISO } from "@/lib/utils";
import { seededIndex, tokens, topTerms, wordCount } from "./text";

/* ------------------------------------------------------------------ */
/* Areas & preferences                                                 */
/* ------------------------------------------------------------------ */

export function defaultAreas(p: UserProfile): InsightAreaId[] {
  const out: InsightAreaId[] = [];
  for (const g of p.careerGoals) for (const a of TRACK_TO_AREAS[g] ?? []) if (!out.includes(a)) out.push(a);
  return out.length ? out.slice(0, 3) : ["tech"];
}

export function effectivePrefs(p: UserProfile, prefs?: InsightPrefs | null): InsightPrefs {
  return {
    areas: prefs?.areas?.length ? prefs.areas : defaultAreas(p),
    companies: prefs?.companies ?? [],
    planStart: prefs?.planStart,
    planDone: prefs?.planDone ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Live feed parsing (server), headlines + links only, never article text */
/* ------------------------------------------------------------------ */

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

export interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  source?: string;
}

export function parseRss(xml: string, max = 10): RssItem[] {
  const items: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < max) {
    const block = m[1];
    const get = (tag: string) => {
      const r = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return r ? decode(r[1]) : undefined;
    };
    let title = get("title");
    const link = get("link");
    const source = get("source");
    if (!title || !link || !/^https?:\/\//.test(link)) continue;
    // Google News appends " - Source" to titles; strip it when we have the source separately
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    items.push({ title, link, pubDate: get("pubDate"), source });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Daily brief                                                         */
/* ------------------------------------------------------------------ */

export interface BriefQuestion {
  id: string;
  text: string;
  area?: InsightAreaId;
  company?: string;
  item?: FeedItem;
  /** What the expert discussion is about */
  topic: ExpertTopic;
}

const itemRef = (i: FeedItem) => ({ title: i.title, url: i.url, source: i.source, kind: i.kind });

/** Topic for a discussion about a news story or podcast. */
export function feedTopic(item: FeedItem, companies: string[], notes?: Record<string, string>): ExpertTopic {
  const company = item.company ?? companies.find((co) => item.title.toLowerCase().includes(co.toLowerCase()));
  if (item.kind === "podcast")
    return { kind: "podcast", question: `After listening to "${item.title}": what's one idea you agreed or disagreed with, and why?`, area: item.area, item: itemRef(item), notes };
  return { kind: "news", question: newsQuestion(item, companies), area: item.area, company, item: itemRef(item), notes };
}

export interface DailyBrief {
  date: string;
  primer: { area: InsightAreaId; primer: Primer };
  news: FeedItem[];
  podcasts: FeedItem[];
  questions: BriefQuestion[];
}

export function newsQuestion(item: FeedItem, companies: string[]): string {
  const c = companies.find((co) => item.title.toLowerCase().includes(co.toLowerCase())) ?? item.company;
  if (c) return `"${item.title}": what does this mean for ${c}, and how would you bring it up in an interview there?`;
  return `"${item.title}": what happened, why does it matter, and what do you think happens next?`;
}

export function companyQuestion(company: string, dayIdx: number) {
  const qs = [
    `How does ${company} make money, and who are its main customers?`,
    `Who are ${company}'s main competitors, and what makes ${company} different?`,
    `What's one risk ${company} faces in the next few years, and how should it respond?`,
    `What would you want to work on at ${company} in your first year, and why?`,
    `If you were ${company}'s CEO, what's the first thing you'd change?`,
  ];
  return qs[dayIdx % qs.length];
}

export function dailyBrief(prefs: InsightPrefs, live: FeedItem[], date = todayISO()): DailyBrief {
  const areas = prefs.areas.length ? prefs.areas : (["tech"] as InsightAreaId[]);
  const day = seededIndex(date, 997);
  const area = areas[day % areas.length];
  const primers = AREA_MAP[area].primers;
  const primer = primers[seededIndex(`${date}-${area}`, primers.length)];

  // Interleave live news by area/company so the brief stays balanced
  const news = live.filter((i) => i.kind === "news");
  const buckets = new Map<string, FeedItem[]>();
  for (const n of news) {
    const k = n.company ?? n.area ?? "other";
    buckets.set(k, [...(buckets.get(k) ?? []), n]);
  }
  const mixed: FeedItem[] = [];
  for (let i = 0; mixed.length < 8 && i < 10; i++) for (const b of buckets.values()) if (b[i] && mixed.length < 8) mixed.push(b[i]);

  const podcasts = live.filter((i) => i.kind === "podcast").slice(0, 4);

  const primerQ = primer.questions[day % primer.questions.length];
  const questions: BriefQuestion[] = [
    { id: `q-${date}-primer`, text: primerQ, area, topic: { kind: "primer", question: primerQ, area, primer: { title: primer.title, body: primer.body } } },
  ];
  if (mixed[0]) {
    const topic = feedTopic(mixed[0], prefs.companies);
    questions.push({ id: `q-${date}-news`, text: topic.question, area: mixed[0].area, company: topic.company, item: mixed[0], topic });
  }
  if (prefs.companies.length) {
    const c = prefs.companies[day % prefs.companies.length];
    const text = companyQuestion(c, day);
    questions.push({ id: `q-${date}-co`, text, company: c, topic: { kind: "company", question: text, company: c, area } });
  }
  if (questions.length < 3) {
    const other = AREA_MAP[areas[(day + 1) % areas.length]];
    const concept = other.keyConcepts[day % other.keyConcepts.length];
    const text = `Explain "${concept}" (${other.label}) as if to a friend, and say why it matters to employers.`;
    questions.push({ id: `q-${date}-concept`, text, area: other.id, topic: { kind: "concept", question: text, area: other.id, concept } });
  }
  return { date, primer: { area, primer }, news: mixed, podcasts, questions };
}

/* ------------------------------------------------------------------ */
/* 7-day plan                                                          */
/* ------------------------------------------------------------------ */

export interface PlanDay {
  index: number;
  date: string;
  theme: string;
  task: string;
  question: string;
  done: boolean;
  isToday: boolean;
}

export function weekPlan(prefs: InsightPrefs, today = todayISO()): PlanDay[] {
  const start = prefs.planStart ?? today;
  const area = AREA_MAP[prefs.areas[0] ?? "tech"].label;
  const company = prefs.companies[0] ?? "a company you'd like to join";
  return WEEK_PLAN.map((d, i) => {
    const fill = (s: string) => s.replaceAll("{area}", area.toLowerCase()).replaceAll("{company}", company);
    const date = addDays(start, i);
    return { index: i, date, theme: d.theme, task: fill(d.task), question: fill(d.question), done: prefs.planDone.includes(i), isToday: date === today };
  });
}

/* ------------------------------------------------------------------ */
/* How strong a notebook entry is (for "strongest" talking points)     */
/* ------------------------------------------------------------------ */

export function entryStrength(e: InsightEntry) {
  if (e.summary) return { strong: 4, developing: 2, weak: 0 }[e.summary.verdict] + Math.min(1, wordCount(e.answer) / 150);
  const a = e.answer.toLowerCase();
  let s = 0;
  if (/\b(i think|i believe|in my view|i'd argue|i expect|i disagree|i agree)\b/.test(a)) s++;
  if (/\b(because|which means|therefore|as a result|due to)\b/.test(a)) s++;
  if (/\d|\bfor example\b|\bsuch as\b/.test(a)) s++;
  return s + Math.min(1, wordCount(e.answer) / 150);
}

export function tagsFor(text: string, area?: InsightAreaId, company?: string) {
  const tags = new Set<string>();
  if (area) tags.add(AREA_MAP[area].label);
  if (company) tags.add(company);
  const lower = text.toLowerCase();
  for (const a of INSIGHT_AREAS) for (const k of a.keyConcepts) {
    const core = k.toLowerCase().split(/[ (&,]/)[0];
    if (core.length > 3 && lower.includes(core)) tags.add(k);
  }
  return [...tags].slice(0, 6);
}

/* ------------------------------------------------------------------ */
/* Insight profile, built only from the user's own words              */
/* ------------------------------------------------------------------ */

export interface InsightProfile {
  totalEntries: number;
  totalWords: number;
  streakDays: number;
  byArea: { area: InsightAreaId; label: string; count: number }[];
  byCompany: { company: string; count: number; latest?: InsightEntry }[];
  themes: { term: string; count: number }[];
  strongest: InsightEntry[];
  readiness: number; // 0..100 commercial-awareness readiness
}

export function streak(entries: InsightEntry[], today = todayISO()) {
  const days = new Set(entries.map((e) => e.date));
  let n = 0;
  let d = today;
  if (!days.has(d)) d = addDays(d, -1); // today not done yet doesn't break the streak
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function buildInsightProfile(entries: InsightEntry[], today = todayISO()): InsightProfile {
  const byAreaMap = new Map<InsightAreaId, number>();
  const byCompanyMap = new Map<string, InsightEntry[]>();
  for (const e of entries) {
    if (e.area) byAreaMap.set(e.area, (byAreaMap.get(e.area) ?? 0) + 1);
    if (e.company) byCompanyMap.set(e.company, [...(byCompanyMap.get(e.company) ?? []), e]);
  }
  const companyWords = [...byCompanyMap.keys()].flatMap((c) => tokens(c));
  const themes = topTerms(
    entries.map((e) => e.answer),
    10,
    companyWords,
  );
  const scored = entries
    .filter((e) => !e.summary || e.summary.verdict !== "weak")
    .map((e) => ({ e, s: entryStrength(e) }))
    .sort((a, b) => b.s - a.s);
  const recentDays = new Set(entries.filter((e) => daysBetween(e.date, today) <= 14).map((e) => e.date)).size;
  const readiness = Math.min(100, Math.round(Math.min(entries.length, 15) * 4 + recentDays * 2 + Math.min(byCompanyMap.size, 3) * 5 + Math.min(byAreaMap.size, 3) * 3));
  return {
    totalEntries: entries.length,
    totalWords: entries.reduce((a, e) => a + wordCount(e.answer), 0),
    streakDays: streak(entries, today),
    byArea: [...byAreaMap.entries()].map(([area, count]) => ({ area, label: AREA_MAP[area]?.label ?? area, count })).sort((a, b) => b.count - a.count),
    byCompany: [...byCompanyMap.entries()]
      .map(([company, list]) => ({ company, count: list.length, latest: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] }))
      .sort((a, b) => b.count - a.count),
    themes,
    strongest: scored.slice(0, 3).map((x) => x.e),
    readiness,
  };
}

/** Plain-text export the user can paste into notes or use before interviews. Only their own words. */
export function exportNotebook(entries: InsightEntry[]) {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => `${e.date}${e.company ? ` · ${e.company}` : ""}${e.area ? ` · ${AREA_MAP[e.area]?.label}` : ""}\nQ: ${e.question}\nA: ${e.answer}${e.item?.url ? `\nSource: ${e.item.source}, ${e.item.url}` : ""}`)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Reading notes                                                       */
/* ------------------------------------------------------------------ */

export interface NoteSection {
  key: string;
  label: string;
  placeholder: string;
  rows: number;
}

export function noteSections(kind: FeedItem["kind"]): NoteSection[] {
  if (kind === "podcast") {
    return [
      { key: "episode", label: "Episode and guest", placeholder: "Which episode? Who was speaking, and what's their role?", rows: 2 },
      { key: "ideas", label: "Key ideas", placeholder: "The 2 or 3 main points, in your own words.", rows: 4 },
      { key: "facts", label: "Facts, numbers and names", placeholder: "Anything specific worth remembering: figures, companies, examples.", rows: 3 },
      { key: "questions", label: "Questions I still have", placeholder: "What didn't make sense, or what would you ask the guest?", rows: 2 },
      { key: "take", label: "My take", placeholder: "Do you agree? What would you add or challenge?", rows: 3 },
    ];
  }
  return [
    { key: "summary", label: "Summary in my words", placeholder: "What is this story about? 2 or 3 sentences, no copying.", rows: 3 },
    { key: "facts", label: "Key facts and numbers", placeholder: "Figures, dates and details worth remembering.", rows: 3 },
    { key: "players", label: "Who is involved", placeholder: "Companies, people, regulators, customers. Who gains, who loses?", rows: 3 },
    { key: "questions", label: "Questions I still have", placeholder: "What would you need to know to have a strong opinion?", rows: 2 },
    { key: "take", label: "My take", placeholder: "What do you think happens next, and why?", rows: 3 },
  ];
}

export function readingTips(kind: FeedItem["kind"]) {
  return kind === "podcast"
    ? ["Pause after each section and write one line.", "Note who is speaking: a founder and a regulator see things differently.", "Write down one claim you'd challenge."]
    : ["Read the headline and first paragraph, then write the summary before reading on.", "Look for numbers: money, growth, people affected.", "Ask who benefits, who loses, and what happens next."];
}

export function noteWordCount(sections: Record<string, string>) {
  return Object.values(sections).reduce((a, t) => a + wordCount(t ?? ""), 0);
}
