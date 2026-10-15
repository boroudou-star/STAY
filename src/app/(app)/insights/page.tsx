"use client";

import { BookOpen, Building2, CalendarCheck, Copy, ExternalLink, Flame, GraduationCap, Headphones, Loader2, Mic, Newspaper, NotebookPen, Plus, RotateCcw, Search, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AREA_MAP, INSIGHT_AREAS } from "@/data/insights";
import { chatKeyFor, ExpertChat, SummaryCard, TranscriptToggle } from "@/components/insights/expert-chat";
import { NotesPanel } from "@/components/insights/notes-panel";
import { Badge, Button, Card, Chip, Drawer, EmptyState, Input, LiveBadge, PageHeader, ProgressRing, Tabs } from "@/components/ui";
import { buildInsightProfile, dailyBrief, effectivePrefs, exportNotebook, feedTopic, noteWordCount, weekPlan, type BriefQuestion } from "@/lib/engine/insights";
import { expertNoun } from "@/lib/engine/expert";
import { useInsightFeed } from "@/lib/hooks";
import { useStay } from "@/lib/store";
import type { ExpertTopic, FeedItem, InsightAreaId, InsightEntry, ReadingNote } from "@/lib/types";
import { cn, formatDate, relativeDays, todayISO } from "@/lib/utils";

type View = "today" | "plan" | "notebook" | "notes" | "profile";
type Panel = { kind: "notes"; noteId: string } | { kind: "chat"; topic: ExpertTopic; chatKey: string; item?: FeedItem } | null;

export default function InsightsPage() {
  const profile = useStay((s) => s.profile)!;
  const storedPrefs = useStay((s) => s.insightPrefs);
  const journal = useStay((s) => s.journal);
  const readingNotes = useStay((s) => s.readingNotes);
  const startReadingNote = useStay((s) => s.startReadingNote);
  const prefs = effectivePrefs(profile, storedPrefs);
  const feed = useInsightFeed(prefs.areas, prefs.companies);
  const today = todayISO();
  const brief = useMemo(() => dailyBrief(prefs, feed.items, today), [prefs, feed.items, today]);
  const ip = useMemo(() => buildInsightProfile(journal, today), [journal, today]);
  const [view, setView] = useState<View>("today");
  const [panel, setPanel] = useState<Panel>(null);
  const closePanel = useCallback(() => setPanel(null), []);
  /** Opens the story in a new tab and the notes panel here. STAY stays on this page. */
  const openWithNotes = (item: FeedItem) => {
    const noteId = startReadingNote(item);
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
    setPanel({ kind: "notes", noteId });
  };
  const discuss = (topic: ExpertTopic, item?: FeedItem) => setPanel({ kind: "chat", topic, chatKey: chatKeyFor(topic), item });
  const answeredToday = new Set(journal.filter((e) => e.date === today).map((e) => e.question));

  return (
    <div>
      <PageHeader
        eyebrow="Industry insights"
        title="Your daily industry brief"
        description="News, podcasts and explainers for the areas and companies you care about, plus questions that turn reading into your own point of view. Everything you write builds your insight profile."
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
            { value: "notes", label: `Reading notes (${readingNotes.length})` },
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
                      <button onClick={() => openWithNotes(q.item!)} className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue-soft px-3 py-1 text-[12.5px] font-semibold text-blue hover:border-blue/40">
                        <NotebookPen size={13} /> Read the story and take notes ({q.item.source})
                      </button>
                    )}
                    <QuestionDiscussion q={q} />
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
                        <button onClick={() => openWithNotes(n)} className="text-left text-[14.5px] font-medium leading-snug hover:underline">
                          {n.title}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                          <span>{n.source}</span>
                          {n.publishedAt && <span>· {relativeDays(n.publishedAt.slice(0, 10))}</span>}
                          {n.company ? <Badge tone="blue">{n.company}</Badge> : n.area ? <Badge>{AREA_MAP[n.area].label}</Badge> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                        <Button size="sm" onClick={() => openWithNotes(n)}>
                          <NotebookPen size={13} /> Read & note
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => discuss(feedTopic(n, prefs.companies), n)}
                        >
                          <GraduationCap size={13} /> Discuss
                        </Button>
                      </div>
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
              <p className="mt-2 text-[11px] text-muted">STAY explainer: general background, not news.</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  const pr = brief.primer.primer;
                  const q = pr.questions[1] ?? pr.questions[0];
                  discuss({ kind: "primer", question: q, area: brief.primer.area, primer: { title: pr.title, body: pr.body } });
                }}
              >
                <GraduationCap size={14} /> Discuss with an expert
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
                      <button onClick={() => openWithNotes(p)} className="text-left text-[14px] font-medium hover:underline">
                        {p.title}
                      </button>
                      <div className="text-[12px] text-muted">
                        {p.source}
                        {p.area ? ` · ${AREA_MAP[p.area].label}` : ""}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-3">
                        <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue hover:underline" onClick={() => openWithNotes(p)}>
                          <NotebookPen size={12} /> Listen & take notes
                        </button>
                        <button
                          className="text-[12px] font-semibold text-ink-2 hover:underline"
                          onClick={() => discuss(feedTopic(p, prefs.companies), p)}
                        >
                          Discuss after listening
                        </button>
                      </div>
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
                &ldquo;Why this industry?&rdquo; and &ldquo;Tell me about something you&apos;ve read recently&rdquo; come up in many graduate interviews. Your notebook becomes your answer bank, and feeds Interview Prep.
              </p>
              <Link href="/interview" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-lime hover:underline">
                <Mic size={14} /> Practise with it
              </Link>
            </Card>
          </div>
        </div>
      )}

      {view === "plan" && (
        <PlanView onAnswer={(question, area) => discuss({ kind: "plan", question, area, company: prefs.companies.find((c) => question.includes(c)) })} />
      )}
      {view === "notebook" && <NotebookView entries={journal} />}
      {view === "notes" && <ReadingNotesView notes={readingNotes} onOpen={(noteId) => setPanel({ kind: "notes", noteId })} />}
      {view === "profile" && <ProfileView entries={journal} />}

      <Drawer open={Boolean(panel)} onClose={closePanel} label={panel?.kind === "notes" ? "Reading notes" : "Discussion"}>
        {panel?.kind === "notes" && <NotesPanel noteId={panel.noteId} companies={prefs.companies} onClose={closePanel} />}
        {panel?.kind === "chat" && (
          <div className="p-5 sm:p-6">
            <div className="mb-1 pr-10 text-[12px] font-semibold uppercase tracking-widest text-violet">Discuss with an expert</div>
            <p className="mb-3 pr-6 text-[15px] font-medium leading-snug">{panel.topic.question}</p>
            {panel.item?.url && (
              <button
                onClick={() => openWithNotes(panel.item!)}
                className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue-soft px-3 py-1 text-[12.5px] font-semibold text-blue"
              >
                <NotebookPen size={13} /> {panel.item.kind === "podcast" ? "Listen first and take notes" : "Read it first and take notes"}
              </button>
            )}
            <ExpertChat topic={panel.topic} chatKey={panel.chatKey} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

/** A daily question with its expert discussion, collapsed until the student starts it. */
function QuestionDiscussion({ q }: { q: BriefQuestion }) {
  const key = chatKeyFor(q.topic);
  const hasDraft = useStay((s) => Boolean(s.insightChats?.[key]));
  const [open, setOpen] = useState(false);
  if (!open && !hasDraft)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <GraduationCap size={14} /> Discuss with the {expertNoun(q.topic)}
      </Button>
    );
  return <ExpertChat topic={q.topic} chatKey={key} />;
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

  if (!entries.length) return <EmptyState icon={<BookOpen />} title="Your notebook is empty" body="Answer a question on the Today tab. Every reflection is saved here, organised by area and company." />;

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
            {e.summary && e.transcript ? (
              <div className="mt-3 space-y-2">
                <SummaryCard summary={e.summary} compact />
                <TranscriptToggle turns={e.transcript} title={expertNoun(e)} />
              </div>
            ) : e.steps?.length ? (
              <div className="mt-2 space-y-1.5">
                {e.steps.map((st) => (
                  <div key={st.prompt} className="text-[13.5px] leading-relaxed">
                    <span className="text-muted">{st.prompt}</span>
                    <span className="block text-ink">{st.answer}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{e.answer}</p>
            )}
            {e.item?.url && (
              <a href={e.item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-blue hover:underline">
                {e.item.source}: {e.item.title.slice(0, 80)}
                {e.item.title.length > 80 ? "…" : ""} <ExternalLink size={10} />
              </a>
            )}
            {e.feedback && !e.summary && <p className="mt-3 rounded-xl bg-teal-soft/50 px-3 py-2 text-[12.5px] text-ink-2">💡 {e.feedback}</p>}
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
          ...prefs.companies.filter((c) => !ip.byCompany.some((b) => b.company === c)).map((c) => `No notes on ${c} yet. Try its daily question`),
        ].slice(0, 3),
        talkingPoints: ip.strongest.map((e) => `${e.question} ${e.answer.slice(0, 180)}${e.answer.length > 180 ? "…" : ""}`),
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
            <p className="mt-3 text-[14px] text-ink-2">Turn your notes into a short point of view, recurring themes and interview talking points, using only what you&apos;ve written.</p>
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

function ReadingNotesView({ notes, onOpen }: { notes: ReadingNote[]; onOpen: (noteId: string) => void }) {
  const deleteReadingNote = useStay((s) => s.deleteReadingNote);
  if (!notes.length)
    return (
      <EmptyState
        icon={<NotebookPen />}
        title="No reading notes yet"
        body="Click any news story or podcast in your brief. It opens in a new tab, and your notes open in a panel here so you can write as you read."
      />
    );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {notes.map((n) => {
        const preview = Object.values(n.sections).find((t) => t?.trim());
        return (
          <Card key={n.id} interactive className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                {n.item.kind === "podcast" ? <Headphones size={12} /> : <Newspaper size={12} />}
                <span>{n.item.source}</span>
                <span>· {formatDate(n.updatedAt.slice(0, 10))}</span>
                {n.reflectedEntryId && <Badge tone="teal">Discussed</Badge>}
              </div>
              <button onClick={() => deleteReadingNote(n.id)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete notes">
                <Trash2 size={14} />
              </button>
            </div>
            <button onClick={() => onOpen(n.id)} className="mt-1.5 text-left font-display text-[16px] font-semibold leading-snug hover:underline">
              {n.item.title}
            </button>
            <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{preview ?? "No notes yet."}</p>
            <div className="mt-auto flex items-center justify-between pt-3 text-[12px] text-muted">
              <span>{noteWordCount(n.sections)} words</span>
              <button onClick={() => onOpen(n.id)} className="font-semibold text-blue hover:underline">
                Open notes
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
