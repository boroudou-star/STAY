"use client";

import { Flag } from "lucide-react";
import type { RoadmapPhase, RoadmapTask } from "@/lib/types";
import { cn, daysBetween, formatDate, formatMonth } from "@/lib/utils";

/**
 * "Tube map" roadmap: phases are coloured lines, tasks are stations,
 * today is a pulsing "you are here" dot. A nod to London — and to the tagline.
 */
export function TubeMap({
  phases,
  tasks,
  start,
  end,
  anchorLabel,
  compact,
  onSelectPhase,
  activePhase,
}: {
  phases: RoadmapPhase[];
  tasks: RoadmapTask[];
  start: string;
  end: string;
  anchorLabel: string;
  compact?: boolean;
  onSelectPhase?: (id: string | null) => void;
  activePhase?: string | null;
}) {
  const total = Math.max(1, daysBetween(start, end));
  const pos = (iso: string) => Math.max(0, Math.min(100, (daysBetween(start, iso) / total) * 100));

  // Months ticks
  const ticks: string[] = [];
  const s = new Date(start);
  const cursor = new Date(s.getFullYear(), s.getMonth() + 1, 1);
  while (cursor.toISOString().slice(0, 10) < end) {
    ticks.push(cursor.toISOString().slice(0, 10));
    cursor.setMonth(cursor.getMonth() + (total > 400 ? 3 : total > 200 ? 2 : 1));
  }

  return (
    <div className="scrollbar-none -mx-2 overflow-x-auto px-2">
      <div className={cn("relative", compact ? "min-w-[560px] pb-10 pt-8" : "min-w-[720px] pb-14 pt-12")}>
        {/* month ticks */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
          {ticks.map((t) => (
            <div key={t} className="absolute top-0 h-full" style={{ left: `${pos(t)}%` }}>
              <div className="h-full border-l border-dashed border-line" />
              <span className="absolute -top-0.5 left-1 whitespace-nowrap text-[10.5px] font-medium text-muted">{formatMonth(t)}</span>
            </div>
          ))}
        </div>

        {/* line segments */}
        <div className="relative h-3">
          {phases.map((ph) => {
            const left = pos(ph.start);
            const width = Math.max(1, pos(ph.end) - left);
            const dim = activePhase && activePhase !== ph.id;
            return (
              <button
                key={ph.id}
                type="button"
                onClick={() => onSelectPhase?.(activePhase === ph.id ? null : ph.id)}
                className={cn("absolute top-0 h-3 rounded-full transition-opacity", dim && "opacity-30", onSelectPhase && "cursor-pointer hover:brightness-110")}
                style={{ left: `${left}%`, width: `calc(${width}% - 3px)`, background: ph.color }}
                aria-label={`${ph.name}: ${formatDate(ph.start)} to ${formatDate(ph.end)}`}
              />
            );
          })}

          {/* task stations */}
          {tasks.map((t) => {
            const done = t.status === "completed";
            const ph = phases.find((p) => t.deadline >= p.start && t.deadline <= p.end) ?? phases[phases.length - 1];
            return (
              <div
                key={t.id}
                title={`${t.title} — ${formatDate(t.deadline)}`}
                className={cn(
                  "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] transition-transform hover:scale-150",
                  done ? "bg-white" : "bg-white",
                )}
                style={{ left: `${pos(t.deadline)}%`, borderColor: done ? "var(--ink)" : ph?.color ?? "var(--ink)", background: done ? "var(--ink)" : "white" }}
              />
            );
          })}

          {/* you are here */}
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: "0%" }}>
            <div className="h-5 w-5 rounded-full border-[3px] border-white bg-sun animate-pulse-dot shadow" />
            <div className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-semibold text-white">You are here</div>
          </div>

          {/* anchor flag */}
          <div className="absolute top-1/2 -translate-y-1/2" style={{ left: "100%" }}>
            <div className="-translate-x-1/2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-ink text-lime shadow">
                <Flag size={13} />
              </div>
            </div>
            <div className="absolute right-0 top-8 whitespace-nowrap text-right text-[10.5px] font-semibold text-ink">
              {anchorLabel === "graduation" ? "Graduation" : anchorLabel === "visa end" ? "Visa end" : anchorLabel === "target start" ? "Target start" : "Plan end"}
              <div className="font-normal text-muted">{formatDate(end, { month: "short", year: "numeric" })}</div>
            </div>
          </div>
        </div>

        {/* phase labels */}
        {!compact && (
          <div className="relative mt-10 h-12">
            {phases.map((ph) => (
              <button
                key={ph.id}
                type="button"
                onClick={() => onSelectPhase?.(activePhase === ph.id ? null : ph.id)}
                className={cn("absolute top-0 pr-3 text-left transition-opacity", activePhase && activePhase !== ph.id && "opacity-40")}
                style={{ left: `${pos(ph.start)}%`, width: `${pos(ph.end) - pos(ph.start)}%` }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ph.color }} />
                  <span className="truncate text-[12.5px] font-semibold text-ink">{ph.name}</span>
                </div>
                <div className="truncate pl-3.5 text-[11px] text-muted">{ph.subtitle}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
