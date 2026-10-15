"use client";

import { BookOpen, Building2, CalendarCheck, Copy, ExternalLink, Flame, Headphones, Loader2, Mic, Newspaper, Plus, RotateCcw, Search, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AREA_MAP, INSIGHT_AREAS } from "@/data/insights";
import { ReflectBox } from "@/components/reflect-box";
import { Badge, Button, Card, Chip, EmptyState, Input, LiveBadge, Modal, PageHeader, ProgressRing, Tabs } from "@/components/ui";
import { buildInsightProfile, dailyBrief, effectivePrefs, exportNotebook, newsQuestion, weekPlan } from "@/lib/engine/insights";
import { useInsightFeed } from "@/lib/hooks";
import { useStay } from "@/lib/store";
import type { FeedItem, InsightAreaId, InsightEntry } from "@/lib/types";
import { cn, formatDate, relativeDays, todayISO } from "@/lib/utils";

type View = "today" | "plan" | "notebook" | "profile";

export default function InsightsPage() {
  const profile = useStay((s) => s.profile)!;
  const storedPrefs = useStay((s) => s.insightPrefs);
  const journal = useStay((s) => s.journal);
  const prefs = effectivePrefs(profile, storedPrefs);
  const feed = useInsightFeed(prefs.areas, prefs.companies);
  const today = todayISO();
  const brief = useMemo(() => dailyBrief(prefs, feed.items, today), [prefs, feed.items, today]);
  const ip = useMemo(() => buildInsightProfile(journal, today), [journal, today]);
  const [view, setView] = useState<View>("today");
  const [reflectOn, setReflectOn] = useState<{ question: string; area?: InsightAreaId; company?: string; item?: FeedItem } | null>(null);
  const answeredToday = new Set(journal.filter((e) => e.date === today).map((e) => e.question));

  return (
    <div>
      <PageHeader
        eyebrow="Industry insights"
        title="Your daily industry brief"
        description="News, podcasts and explainers for the areas and companies you care about — plus questions that turn reading into your own point of view. Everything you write builds your insight profile."
        actions={
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2 text-[13px] shadow-[var(--shadow-soft)]">
            <Flame size={16} className={cn(ip.streakDays ? "text-sun" : "text-muted")} />
            <b>{ip.streakDays}</b> day streak · <b>{ip.totalEntries}</b> reflections
          </div>
        }
      />

      <FollowingBar areas={prefs.areas} companies={prefs.companies} />

      <div className="mb-5 mt-5">
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: "today", label: "Today" },
            { value: "plan", label: "7-day plan" },
            { value: "notebook", label: `Notebook (${journal.length})` },
            { value: "profile", label: "Insight profile" },
          ]}
        />
      </div>

      {view === "today" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card className="p-5 sm:p-6">
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-violet">Questions for {formatDate(today, { weekday: "long", day: "numeric", month: "short" })}</div>
              <h2 className="mb-4 font-display text-xl font-semibold">Think it through</h2>
              <div className="space-y-6">
                {brief.questions.map((q, i) => (
                  <div key={q.id} className={cn(i > 0 && "border-t border-line pt-5")}>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {q.area && <Badge tone="violet">{AREA_MAP[q.area].emoji} {AREA_MAP[q.area].label}</Badge>}
                      {q.company && <Badge tone="blue"><Building2 size={10} /> {q.company}</Badge>}
                      {q.item && <Badge>from today&apos;s news</Badge>}
                      {answeredToday.has(q.text) && <Badge tone="teal">✓ answered</Badge>}
                    </div>
                    <p className="mb-3 text-[15px] font-medium leading-snug">{q.text}</p>
                    {q.item?.url && (
                      <a href={q.item.url} target="_blank" rel="noopener noreferrer" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-blue hover:underline">
                        Read the story first ({q.item.source}) <ExternalLink size={11} />
                      </a>
                    )}
                    <ReflectBox key={q.id} question={q.text} area={q.area} company={q.company} item={q.item} compact />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                  <Newspaper size={19} className="text-blue" /> News for you
                </h2>
                {feed.status === "ok" && <LiveBadge label="Live · last 7 days" />}
              </div>
              {feed.status === "loading" ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-paper-2" />
                  ))}
                </div>
              ) : brief.news.length ? (
                <div className="divide-y divide-line/70">
                  {brief.news.map((n) => (
                    <div key={n.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[14.5px] font-medium leading-snug hover:underline">
                          {n.title}
                        </a>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                          <span>{n.source}</span>
                          {n.publishedAt && <span>· {relativeDays(n.publishedAt.slice(0, 10))}</span>}
                          {n.company ? <Badge tone="blue">{n.company}</Badge> : n.area ? <Badge>{AREA_MAP[n.area].label}</Badge> : null}
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setReflectOn({ question: newsQuestion(n, prefs.companies), area: n.area, company: n.company, item: n })}>
                        Reflect
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-paper p-4 text-[13.5px] text-ink-2">
                  Live news isn&apos;t available right now. Search the latest coverage directly:
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[...prefs.areas.map((a) => AREA_MAP[a].newsQueries[0]), ...prefs.companies].map((q) => (
                      <a key={q} href={`https://news.google.com/search?q=${encodeURIComponent(q)}&hl=en-GB&gl=GB&ceid=GB:en`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-[12.5px] font-medium hover:border-ink/30">
                        {q} <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-5">
              <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-teal">
                <BookOpen size={13} /> Today&apos;s primer · {AREA_MAP[brief.primer.area].label}
              </div>
              <h3 className="font-display text-lg font-semibold leading-snug">{brief.primer.primer.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{brief.primer.primer.body}</p>
              <p className="mt-2 text-[11px] text-muted">STAY explainer — general background, not news.</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setReflectOn({ question: brief.primer.primer.questions[1] ?? brief.primer.primer.questions[0], area: brief.primer.area })}>
                Reflect on this
              </Button>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <Headphones size={18} className="text-sun" /> Listen
              </h3>
              {feed.status === "loading" ? (
                <div className="h-24 animate-pulse rounded-2xl bg-paper-2" />
              ) : brief.podcasts.length ? (
                <div className="space-y-2">
                  {brief.podcasts.map((p) => (
                    <div key={p.id} className="rounded-2xl bg-paper p-3">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium hover:underline">
                        {p.title}
                      </a>
                      <div className="text-[12px] text-muted">
                        {p.source}
                        {p.area ? ` · ${AREA_MAP[p.area].label}` : ""}
                      </div>
                      <button className="mt-1 text-[12px] font-semibold text-blue hover:underline" onClick={() => setReflectOn({ question: `After listening to an episode of "${p.title}": what's one idea you agreed or disagreed with, and why?`, area: p.area, item: p })}>
                        Reflect after listening →
                      </button>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted">Shows found via Apple Podcasts search.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {prefs.areas.map((a) => (
                    <a key={a} href={`https://podcasts.apple.com/gb/search?term=${encodeURIComponent(AREA_MAP[a].podcastTerm)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-2xl bg-paper p-3 text-[13.5px] font-medium hover:bg-paper-2">
                      Podcasts: {AREA_MAP[a].label} <ExternalLink size={13} />
                    </a>
                  ))}
                </div>
              )}
            </Card>

            <Card className="bg-ink p-5 text-white">
              <div className="text-[12px] font-semibold uppercase tracking-widest text-lime">Why this matters</div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/80">
                &ldquo;Why this industry?&rdquo; and &ldquo;Tell me about something you&apos;ve read recently&rdquo; come up in many graduate interviews. Your notebook becomes your answer bank — and feeds Interview Prep.
              </p>
              <Link href="/interview" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-lime hover:underline">
                <Mic size={14} /> Practise with it
              </Link>
            </Card>
          </div>
        </div>
      )}

      {view === "plan" && <PlanView onAnswer={(question, area) => setReflectOn({ question, area })} />}
      {view === "notebook" && <NotebookView entries={journal} />}
      {view === "profile" && <ProfileView entries={journal} />}

      <Modal open={Boolean(reflectOn)} onClose={() => setReflectOn(null)} title="Reflect" wide>
        {reflectOn && (
          <>
            <p className="mb-3 text-[15px] font-medium leading-snug">{reflectOn.question}</p>
            {reflectOn.item?.url && (
              <a href={reflectOn.item.url} target="_blank" rel="noopener noreferrer" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-blue hover:underline">
                Open source ({reflectOn.item.source}) <ExternalLink size={11} />
              </a>
            )}
            <ReflectBox question={reflectOn.question} area={reflectOn.area} company={reflectOn.company} item={reflectOn.item} />
          </>
        )}
      </Modal>
    </div>
  );
}

function FollowingBar({ areas, companies }: { areas: InsightAreaId[]; companies: string[] }) {
  const setInsightPrefs = useStay((s) => s.setInsightPrefs);
  const [company, setCompany] = useState("");
  const toggleArea = (a: InsightAreaId) => {
    const next = areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a].slice(-4);
    if (!next.length) return toast.error("Follow at least one area");
    setInsightPrefs({ areas: next });
  };
  const addCompany = () => {
    const c = company.trim();
    if (!c) return;
    if (companies.some((x) => x.toLowerCase() === c.toLowerCase())) return setCompany("");
    setInsightPrefs({ areas, companies: [...companies, c].slice(-4) });
    setCompany("");
    toast.success(`Following ${c}`, { description: "News and questions about them will appear in your brief." });
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-muted">Areas you follow (up to 4)</div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {INSIGHT_AREAS.map((a) => (
          <Chip key={a.id} active={areas.includes(a.id)} onClick={() => toggleArea(a.id)}>
            {a.emoji} {a.label}
          </Chip>
        ))}
      </div>
      <div className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-widest text-muted">Target companies (up to 4)</div>
      <div className="flex flex-wrap items-center gap-2">
        {companies.map((c) => (
          <span key={c} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-blue/20 bg-blue-soft pl-3.5 pr-2 text-[13px] font-medium text-blue">
            <Building2 size={13} /> {c}
            <button onClick={() => setInsightPrefs({ areas, companies: companies.filter((x) => x !== c) })} className="rounded-full p-0.5 hover:bg-white/60" aria-label={`Stop following ${c}`}>
              <X size={13} />
            </button>
          </span>
        ))}
        <form
          className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none"
          onSubmit={(e) => {
            e.preventDefault();
            addCompany();
          }}
        >
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google DeepMind, Monzo, McKinsey" className="h-9 w-full min-w-0 rounded-full text-[13px] sm:w-64" />
          <Button size="sm" variant="secondary" type="submit">
            <Plus size={14} /> Follow
          </Button>
        </form>
      </div>
    </Card>
  );
}

function PlanView({ onAnswer }: { onAnswer: (q: string, area?: InsightAreaId) => void }) {
  const profile = useStay((s) => s.profile)!;
  const stored = useStay((s) => s.insightPrefs);
  const setInsightPrefs = useStay((s) => s.setInsightPrefs);
  const addSkillTask = useStay((s) => s.addSkillTaskToRoadmap);
  const prefs = effectivePrefs(profile, stored);
  const days = weekPlan(prefs);
  const done = days.filter((d) => d.done).length;
  const toggle = (i: number) => {
    const set = new Set(prefs.planDone);
    if (set.has(i)) set.delete(i);
    else set.add(i);
    setInsightPrefs({ areas: prefs.areas, companies: prefs.companies, planStart: prefs.planStart ?? todayISO(), planDone: [...set] });
  };
  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-[14px] text-ink-2">
          A week to go from &ldquo;interested in {AREA_MAP[prefs.areas[0]].label.toLowerCase()}&rdquo; to having a real point of view. <b>{done}/7</b> done.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const ok = addSkillTask({ key: "insight-plan", title: `Complete the 7-day ${AREA_MAP[prefs.areas[0]].label} insight plan`, description: "Industry Insights → 7-day plan. One short task and question a day.", skill: "Commercial awareness", days: 7, category: "skills" });
              toast[ok ? "success" : "info"](ok ? "Added to your roadmap" : "Already in your roadmap");
            }}
          >
            <CalendarCheck size={14} /> Add to roadmap
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setInsightPrefs({ areas: prefs.areas, companies: prefs.companies, planStart: todayISO(), planDone: [] })}>
            <RotateCcw size={14} /> Restart from today
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => (
          <Card key={d.index} className={cn("flex flex-col p-5", d.isToday && "ring-2 ring-lime", d.done && "opacity-70")}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-widest text-violet">Day {d.index + 1} · {formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</span>
              {d.isToday && <Badge tone="lime">Today</Badge>}
            </div>
            <h3 className="mt-1 font-display text-lg font-semibold">{d.theme}</h3>
            <p className="mt-1 text-[13.5px] text-ink-2">{d.task}</p>
            <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[13px] font-medium">💭 {d.question}</p>
            <div className="mt-auto flex gap-2 pt-4">
              <Button size="sm" onClick={() => onAnswer(d.question, prefs.areas[0])}>
                Answer
              </Button>
              <Button size="sm" variant={d.done ? "secondary" : "ghost"} onClick={() => toggle(d.index)}>
                {d.done ? "✓ Done" : "Mark done"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotebookView({ entries }: { entries: InsightEntry[] }) {
  const deleteInsightEntry = useStay((s) => s.deleteInsightEntry);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const roots = entries.filter((e) => !e.parentId);
  const childrenOf = (id: string) => entries.filter((e) => e.parentId === id);
  const labels = Array.from(new Set(roots.flatMap((e) => [e.company, e.area ? AREA_MAP[e.area].label : undefined]).filter(Boolean))) as string[];
  const list = roots.filter(
    (e) =>
      (!filter || e.company === filter || (e.area && AREA_MAP[e.area].label === filter)) &&
      (!q.trim() || `${e.question} ${e.answer} ${childrenOf(e.id).map((c) => c.answer).join(" ")}`.toLowerCase().includes(q.toLowerCase())),
  );

  if (!entries.length) return <EmptyState icon={<BookOpen />} title="Your notebook is empty" body="Answer a question on the Today tab — every reflection is saved here, organised by area and company." />;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your thinking" className="pl-10" />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(exportNotebook(entries)).catch(() => undefined);
            toast.success("Notebook copied as text");
          }}
        >
          <Copy size={14} /> Copy all as text
        </Button>
      </div>
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        <Chip active={!filter} onClick={() => setFilter(null)}>
          All
        </Chip>
        {labels.map((l) => (
          <Chip key={l} active={filter === l} onClick={() => setFilter(filter === l ? null : l)}>
            {l}
          </Chip>
        ))}
      </div>
      <div className="space-y-3">
        {list.map((e) => (
          <Card key={e.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                <span>{formatDate(e.date)}</span>
                {e.area && <Badge tone="violet">{AREA_MAP[e.area].label}</Badge>}
                {e.company && <Badge tone="blue">{e.company}</Badge>}
                {e.tags.filter((t) => t !== e.company && (!e.area || t !== AREA_MAP[e.area].label)).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <button onClick={() => deleteInsightEntry(e.id)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete entry">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="mt-2 text-[14px] font-semibold leading-snug">{e.question}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{e.answer}</p>
            {e.item?.url && (
              <a href={e.item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-blue hover:underline">
                {e.item.source}: {e.item.title.slice(0, 80)}
                {e.item.title.length > 80 ? "…" : ""} <ExternalLink size={10} />
              </a>
            )}
            {e.feedback && <p className="mt-3 rounded-xl bg-teal-soft/50 px-3 py-2 text-[12.5px] text-ink-2">💡 {e.feedback}</p>}
            {childrenOf(e.id).map((c) => (
              <div key={c.id} className="mt-3 border-l-2 border-violet/40 pl-3">
                <p className="text-[13px] font-semibold">↳ {c.question}</p>
                <p className="text-[13.5px] text-ink-2">{c.answer}</p>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

interface Synthesis {
  pointOfView: string;
  themes: string[];
  gaps: string[];
  talkingPoints: string[];
  source: "ai" | "rules";
}

function ProfileView({ entries }: { entries: InsightEntry[] }) {
  const profile = useStay((s) => s.profile)!;
  const storedPrefs = useStay((s) => s.insightPrefs);
  const prefs = effectivePrefs(profile, storedPrefs);
  const setInterviewCompany = useStay((s) => s.setInterviewCompany);
  const ip = buildInsightProfile(entries);
  const [syn, setSyn] = useState<Synthesis | null>(null);
  const [loading, setLoading] = useState(false);

  const synthesize = async () => {
    setLoading(true);
    let out: Synthesis | null = null;
    try {
      const res = await fetch("/api/ai/insight-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: entries.slice(0, 60).map((e) => ({ question: e.question, answer: e.answer, area: e.area, company: e.company })), goal: profile.careerGoals[0] }),
      });
      const d = await res.json();
      if (d.source === "ai") out = d;
    } catch {
      /* fall back */
    }
    if (!out) {
      out = {
        pointOfView: "Here's your thinking, organised from your own notes (AI summarising is off). Re-read these before interviews and turn each into a 30-second answer.",
        themes: ip.themes.slice(0, 5).map((t) => `${t.term} (${t.count} mentions)`),
        gaps: [
          ...prefs.areas.filter((a) => !ip.byArea.some((b) => b.area === a)).map((a) => `You follow ${AREA_MAP[a].label} but haven't reflected on it yet`),
          ...prefs.companies.filter((c) => !ip.byCompany.some((b) => b.company === c)).map((c) => `No notes on ${c} yet — try its daily question`),
        ].slice(0, 3),
        talkingPoints: ip.strongest.map((e) => `${e.question} — ${e.answer.slice(0, 180)}${e.answer.length > 180 ? "…" : ""}`),
        source: "rules",
      };
    }
    setSyn(out);
    setLoading(false);
  };

  if (!entries.length) return <EmptyState icon={<Sparkles />} title="Your insight profile builds as you reflect" body="Answer a few daily questions and STAY will organise your views by area and company, find your recurring themes and turn them into interview talking points." />;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-5 lg:col-span-1">
          <ProgressRing
            value={ip.readiness}
            size={84}
            stroke={8}
            label={
              <>
                <span className="font-display text-lg font-bold">{ip.readiness}%</span>
              </>
            }
          />
          <div className="text-[13px] text-ink-2">
            <b className="text-ink">Commercial awareness</b>
            <br />
            readiness
          </div>
        </Card>
        {[
          ["Reflections", ip.totalEntries],
          ["Words of your own thinking", ip.totalWords],
          ["Day streak", ip.streakDays],
        ].map(([l, v]) => (
          <Card key={l as string} className="p-5">
            <div className="font-display text-3xl font-bold">{v}</div>
            <div className="text-[12.5px] text-muted">{l}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your point of view</h2>
            <Button size="sm" onClick={synthesize} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {syn ? "Refresh" : "Organise my thinking"}
            </Button>
          </div>
          {syn ? (
            <div className="mt-4 space-y-4">
              <p className="text-[14.5px] leading-relaxed text-ink-2">{syn.pointOfView}</p>
              {syn.themes.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-muted">Themes you return to</div>
                  <div className="flex flex-wrap gap-1.5">
                    {syn.themes.map((t) => (
                      <Badge key={t} tone="violet">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {syn.talkingPoints.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-muted">Interview talking points</div>
                  <ul className="space-y-1.5 text-[13.5px]">
                    {syn.talkingPoints.map((t) => (
                      <li key={t} className="rounded-xl bg-paper px-3 py-2">
                        🎯 {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {syn.gaps.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-widest text-muted">Explore next</div>
                  <ul className="list-inside list-disc text-[13.5px] text-ink-2">
                    {syn.gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-muted">{syn.source === "ai" ? "Summarised by AI from your own entries only." : "Compiled from your own entries."}</p>
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-ink-2">Turn your notes into a short point of view, recurring themes and interview talking points — using only what you&apos;ve written.</p>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 font-display text-lg font-semibold">By area</h3>
            <div className="space-y-2">
              {ip.byArea.map((a) => (
                <div key={a.area}>
                  <div className="flex justify-between text-[13px]">
                    <span>
                      {AREA_MAP[a.area].emoji} {a.label}
                    </span>
                    <span className="text-muted">{a.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-violet" style={{ width: `${(a.count / Math.max(...ip.byArea.map((x) => x.count))) * 100}%` }} />
                  </div>
                </div>
              ))}
              {!ip.byArea.length && <p className="text-[13px] text-muted">No area-tagged reflections yet.</p>}
            </div>
            {ip.themes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {ip.themes.map((t) => (
                  <Badge key={t.term}>{t.term}</Badge>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-display text-lg font-semibold">Company dossiers</h3>
            {ip.byCompany.length ? (
              <div className="space-y-3">
                {ip.byCompany.map((c) => (
                  <div key={c.company} className="rounded-2xl bg-paper p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{c.company}</span>
                      <span className="text-[12px] text-muted">{c.count} notes</span>
                    </div>
                    {c.latest && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-2">{c.latest.answer}</p>}
                    <Link href="/interview" onClick={() => setInterviewCompany(c.company)} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue hover:underline">
                      <Mic size={12} /> Prep interview for {c.company}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Follow a company above and answer its daily question to start a dossier.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
