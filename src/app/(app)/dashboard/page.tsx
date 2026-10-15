"use client";

import { ArrowRight, CalendarDays, Coffee, Compass, Flame, Map, Mic, Newspaper, RefreshCw, ShieldCheck, Sparkles, Target, Trophy, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TRACK_MAP } from "@/data/careers";
import { TaskRow } from "@/components/task-row";
import { TubeMap } from "@/components/tube-map";
import { Badge, Button, Card, DemoBadge, ProgressRing } from "@/components/ui";
import { coffeeChatRecommendations } from "@/lib/engine/coffee";
import { completedThisWeek } from "@/lib/engine/roadmap";
import { visaSummary } from "@/lib/engine/visa";
import { useDerived, useInsight } from "@/lib/hooks";
import { useStay } from "@/lib/store";
import { cn, daysBetween, formatDate } from "@/lib/utils";

export default function Dashboard() {
  const d = useDerived();
  const insight = useInsight(d);
  const contacts = useStay((s) => s.contacts);
  const savedOpps = useStay((s) => s.savedOpps);
  const lastChange = useStay((s) => s.lastChange);
  const journalCount = useStay((s) => s.journal.length);
  const mockCount = useStay((s) => s.mockSessions.filter((m) => m.completedAt).length);
  const regenerate = useStay((s) => s.regenerate);
  const { profile: p, horizon, phases, tasks } = d;
  const goal = TRACK_MAP[p.careerGoals[0] ?? "exploring"];
  const firstName = p.name ? p.name.split(" ")[0] : "";
  const months = Math.round(horizon.monthsLeft);
  const visa = visaSummary(p, d.today);
  const recs = coffeeChatRecommendations(p);
  const contacted = recs.filter((r) => contacts[r.id] && contacts[r.id].status !== "want_to_contact" && contacts[r.id].status !== "message_drafted").length;
  const weekDone = completedThisWeek(tasks);
  const nextDeadline = tasks.filter((t) => t.status !== "completed" && t.category === "applications").sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  const doneCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-5">
      {lastChange && daysBetween(lastChange.at.slice(0, 10), d.today) <= 1 && (lastChange.added > 0 || lastChange.removed > 0) && (
        <div className="flex animate-fade-up items-center justify-between gap-3 rounded-2xl border border-teal/20 bg-teal-soft px-4 py-3 text-[13.5px]">
          <span className="flex items-center gap-2 text-ink">
            <Sparkles size={16} className="text-teal" />
            <span>
              <b>STAY adapted your plan.</b> {lastChange.added} new task{lastChange.added === 1 ? "" : "s"}, {lastChange.removed} no longer relevant removed
              {lastChange.keptCompleted ? `, ${lastChange.keptCompleted} completed kept` : ""}. your completed work is preserved.
            </span>
          </span>
          <button onClick={() => useStay.setState({ lastChange: null })} className="rounded-lg p-1 text-muted hover:bg-white" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Row 1 */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 sm:p-7 lg:col-span-2">
          <div className="map-paper absolute inset-0 opacity-60" />
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-lime/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="ink">{p.studyStatus === "student" ? `${p.currentStudyYear ? `Year ${p.currentStudyYear} · ` : ""}Student` : "Graduate"}</Badge>
                <Badge tone="teal">
                  {goal.emoji} {goal.label}
                </Badge>
                {p.isDemo && <DemoBadge label="Demo profile" />}
              </div>
              <h1 className="mt-4 font-display text-[34px] font-bold leading-[1.02] tracking-tight sm:text-[42px]">
                {firstName ? `Hey ${firstName} 👋` : "Hey there 👋"}
                <br />
                <span className="text-ink-2">Your future starts here.</span>
              </h1>
              <p className="mt-3 text-[14.5px] text-ink-2">
                {p.degree || p.subjectArea} · {p.university || "University"}
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="font-display text-5xl font-bold tracking-tight">{months}</div>
                <div className="text-[12.5px] font-medium text-muted">
                  month{months === 1 ? "" : "s"} to {horizon.anchorLabel === "graduation" ? "graduation" : horizon.anchorLabel}
                </div>
                <div className="text-[11.5px] text-muted">{formatDate(horizon.anchorDate, { month: "short", year: "numeric" })}</div>
              </div>
              <ProgressRing
                value={d.progress}
                label={
                  <>
                    <span className="font-display text-2xl font-bold">{d.progress}%</span>
                    <span className="text-[10.5px] text-muted">
                      {doneCount}/{tasks.length} done
                    </span>
                  </>
                }
              />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          {visa.relevant ? (
            <>
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-blue">
                <ShieldCheck size={14} /> Visa & work
              </div>
              <p className="mt-3 font-display text-lg font-semibold leading-snug">{visa.headline}</p>
              {visa.urgentDeadline && (
                <p className="mt-2 text-[13px] text-ink-2">
                  {visa.urgentDeadline.label}: <b>{formatDate(visa.urgentDeadline.date)}</b> ({visa.urgentDeadline.daysLeft} days)
                </p>
              )}
              <Link href="/visa" className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-semibold text-blue hover:underline">
                What this means for you <ArrowRight size={14} />
              </Link>
            </>
          ) : nextDeadline ? (
            <>
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-sun">
                <Target size={14} /> Next application deadline
              </div>
              <p className="mt-3 font-display text-lg font-semibold leading-snug">{nextDeadline.title}</p>
              <p className="mt-1 text-[13px] text-muted">{formatDate(nextDeadline.deadline)}</p>
              <Link href="/roadmap" className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-semibold text-blue hover:underline">
                Open roadmap <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">No upcoming deadlines yet.</p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-paper p-3">
              <div className="flex items-center gap-1 font-display text-2xl font-bold">
                <Flame size={18} className="text-sun" /> {weekDone}
              </div>
              <div className="text-[11.5px] text-muted">done this week</div>
            </div>
            <div className="rounded-2xl bg-paper p-3">
              <div className="font-display text-2xl font-bold">{savedOpps.length}</div>
              <div className="text-[11.5px] text-muted">saved roles</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[var(--shadow-lift)] sm:p-7 lg:col-span-2">
          <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-blue/30 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-lime">
                <Sparkles size={14} /> Your biggest priority
              </div>
              <span className="text-[11px] text-white/50">{insight.source === "ai" ? "AI-written from your data" : "Rule-based insight"}</span>
            </div>
            {insight.loading ? (
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-white/10" />
              </div>
            ) : (
              <p className="mt-4 text-[15.5px] leading-relaxed text-white/90">{insight.text}</p>
            )}
            <Button
              variant="lime"
              size="sm"
              className="mt-5"
              onClick={() => {
                const s = regenerate("Recommendations refreshed");
                toast.success("Recommendations refreshed", { description: s ? `${s.added} new · completed tasks kept` : undefined });
              }}
            >
              <RefreshCw size={14} /> Refresh recommendations
            </Button>
          </div>
        </div>

        <Card className="p-5 sm:p-6 lg:col-span-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-widest text-teal">This week</div>
              <h2 className="font-display text-xl font-semibold">Your 3 best moves</h2>
            </div>
            <Link href="/roadmap" className="text-[13px] font-semibold text-blue hover:underline">
              All tasks →
            </Link>
          </div>
          {d.priorities.length ? (
            <div className="space-y-1">
              {d.priorities.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-lime/30 p-4 text-[14px]">
              <Trophy className="text-ink" /> Everything&apos;s done. Refresh recommendations for your next moves.
            </div>
          )}
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-5 sm:p-6">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-widest text-violet">Your map</div>
            <h2 className="font-display text-xl font-semibold">Next {Math.max(1, Math.round(daysBetween(horizon.start, horizon.end) / 30.44))} months</h2>
          </div>
          <Link href="/roadmap" className="text-[13px] font-semibold text-blue hover:underline">
            Open roadmap →
          </Link>
        </div>
        <TubeMap phases={phases} tasks={tasks} start={horizon.start} end={horizon.end} anchorLabel={horizon.anchorLabel} />
      </Card>

      {/* Quick access */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: "/roadmap", icon: Map, label: "My Roadmap", stat: `${tasks.length - doneCount} open`, tone: "bg-violet-soft text-violet" },
          { href: "/opportunities", icon: Compass, label: "Opportunities", stat: `Top match ${d.opportunities[0]?.score ?? 0}%`, tone: "bg-blue-soft text-blue" },
          { href: "/events", icon: CalendarDays, label: "Campus Events", stat: `${d.events.filter((e) => e.score >= 50).length} for you`, tone: "bg-teal-soft text-teal" },
          { href: "/coffee-chats", icon: Coffee, label: "Coffee Chats", stat: `${contacted}/5 reached out`, tone: "bg-sun-soft text-[#c2502f]" },
          { href: "/insights", icon: Newspaper, label: "Industry Insights", stat: `${journalCount} reflections`, tone: "bg-blue-soft text-blue" },
          { href: "/interview", icon: Mic, label: "Interview Prep", stat: `${mockCount} mock interviews`, tone: "bg-violet-soft text-violet" },
          { href: "/skills", icon: Sparkles, label: "Skills", stat: `${Math.round(d.skills.coverage * 100)}% core covered`, tone: "bg-lime/50 text-ink" },
          { href: "/roadmap#progress", icon: Trophy, label: "My Progress", stat: `${d.progress}% complete`, tone: "bg-paper-2 text-ink" },
        ].map((q) => (
          <Link key={q.label} href={q.href} className="group rounded-3xl border border-line bg-card p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
            <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl transition-transform group-hover:scale-110", q.tone)}>
              <q.icon size={18} />
            </div>
            <div className="text-[14px] font-semibold">{q.label}</div>
            <div className="text-[12px] text-muted">{q.stat}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
