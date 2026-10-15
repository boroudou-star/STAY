"use client";

import confetti from "canvas-confetti";
import { BookOpen, CalendarDays, Link2 } from "lucide-react";
import Link from "next/link";
import { canonicalSkill } from "@/data/careers";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useStay } from "@/lib/store";
import { showEffects } from "./effects-toast";
import type { Priority, RoadmapTask, TaskCategory } from "@/lib/types";
import { cn, daysBetween, formatDate, relativeDays, todayISO } from "@/lib/utils";
import { Badge, Checkbox } from "./ui";

export const PRIORITY_TONE: Record<Priority, "red" | "sun" | "blue" | "neutral"> = { urgent: "red", high: "sun", medium: "blue", low: "neutral" };
export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  applications: "Applications",
  skills: "Skills",
  projects: "Projects",
  networking: "Networking",
  events: "Events",
  cv: "CV",
  interviews: "Interviews",
  visa: "Visa",
  custom: "Planning",
};
export const CATEGORY_EMOJI: Record<TaskCategory, string> = {
  applications: "📮",
  skills: "🧠",
  projects: "🛠️",
  networking: "☕",
  events: "🎟️",
  cv: "📄",
  interviews: "🎤",
  visa: "🛂",
  custom: "📌",
};

export function celebrate(x = 0.5, y = 0.6) {
  try {
    confetti({ particleCount: 70, spread: 70, startVelocity: 32, origin: { x, y }, colors: ["#c6f36d", "#0f9d8a", "#5b7cfa", "#ff7a59"], scalar: 0.9 });
  } catch {
    /* no canvas */
  }
}

export function TaskRow({ task, actions, compact }: { task: RoadmapTask; actions?: ReactNode; compact?: boolean }) {
  const toggleTask = useStay((s) => s.toggleTask);
  const done = task.status === "completed";
  const days = daysBetween(todayISO(), task.deadline);
  const overdue = !done && days < 0;

  const onToggle = (e?: { clientX: number; clientY: number }) => {
    const effects = toggleTask(task.id);
    if (!done) {
      celebrate(e ? e.clientX / window.innerWidth : 0.5, e ? e.clientY / window.innerHeight : 0.6);
      toast.success("Nice, progress updated", { description: task.title });
    }
    showEffects(effects);
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-line hover:bg-paper",
        done && "opacity-60",
      )}
    >
      <div className="pt-0.5">
        <Checkbox checked={done} onChange={(e) => onToggle(e)} label={`Mark "${task.title}" ${done ? "not done" : "done"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[14.5px] font-medium leading-snug text-ink", done && "line-through decoration-ink/30")}>
          <span className="mr-1.5">{CATEGORY_EMOJI[task.category]}</span>
          {task.title}
        </div>
        {!compact && task.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{task.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", overdue ? "text-red-600" : "text-ink-2")}>
            <CalendarDays size={12} />
            {formatDate(task.deadline, { day: "numeric", month: "short" })} · {overdue ? `overdue ${Math.abs(days)}d` : relativeDays(task.deadline)}
          </span>
          {!done && <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>}
          {task.status === "in_progress" && <Badge tone="violet">in progress</Badge>}
          {task.skill && !compact && <Badge tone="teal">{task.skill}</Badge>}
          {task.skill && (task.category === "skills" || task.category === "projects") && !compact && (
            <Link href={`/skills#skill-${canonicalSkill(task.skill.split(",")[0]).replace(/[^a-z0-9]+/g, "-")}`} className="inline-flex items-center gap-1 rounded-full border border-blue/20 bg-blue-soft px-2 py-0.5 text-[11.5px] font-medium text-blue hover:border-blue/40">
              <BookOpen size={10} /> Resources
            </Link>
          )}
          {(task.sourceEventId || task.sourceOpportunityId) && !compact && (
            <Badge>
              <Link2 size={10} /> {task.sourceEventId ? "linked event" : "linked opportunity"}
            </Badge>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
