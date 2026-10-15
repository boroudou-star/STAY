"use client";

import { BookOpen, ChevronDown, Code2, Dumbbell, ExternalLink, GraduationCap, Hammer, PlayCircle, Search } from "lucide-react";
import { useState } from "react";
import { KIND_LABEL, resourcesFor, type ResourceKind } from "@/data/resources";
import { cn } from "@/lib/utils";
import { Badge } from "./ui";

const KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  course: GraduationCap,
  programme: GraduationCap,
  practice: Dumbbell,
  video: PlayCircle,
  github: Code2,
  docs: BookOpen,
  project: Hammer,
};

const KIND_TONE: Record<ResourceKind, string> = {
  course: "bg-blue-soft text-blue",
  programme: "bg-violet-soft text-violet",
  practice: "bg-teal-soft text-teal",
  video: "bg-sun-soft text-[#c2502f]",
  github: "bg-paper-2 text-ink",
  docs: "bg-paper-2 text-ink-2",
  project: "bg-lime/50 text-ink",
};

/** Courses, videos, GitHub repos and a one-day project for a skill. */
export function ResourceList({ skill, compact, onAddProject }: { skill: string; compact?: boolean; onAddProject?: (title: string, description: string) => void }) {
  const { resources, project, searches } = resourcesFor(skill);
  const [showProject, setShowProject] = useState(false);
  const list = compact ? resources.slice(0, 3) : resources;

  return (
    <div className="space-y-2">
      {list.map((r) => {
        const Icon = KIND_ICON[r.kind];
        return (
          <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-xl border border-line bg-white p-2.5 transition-colors hover:border-ink/25">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", KIND_TONE[r.kind])}>
              <Icon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold leading-snug group-hover:underline">{r.title}</span>
                <ExternalLink size={12} className="mt-1 shrink-0 text-muted" />
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                <span>{KIND_LABEL[r.kind]}</span>·<span>{r.provider}</span>
                {r.time && <span>· {r.time}</span>}
                {r.free && <Badge tone="teal" className="px-1.5 py-0 text-[10px]">Free</Badge>}
              </span>
            </span>
          </a>
        );
      })}

      {project && (
        <div className="rounded-xl border border-lime bg-lime/15">
          <button onClick={() => setShowProject(!showProject)} className="flex w-full items-center gap-3 p-2.5 text-left">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime/60 text-ink">
              <Hammer size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">Build it in a day: {project.title}</span>
              <span className="text-[11.5px] text-muted">One-day project brief from STAY</span>
            </span>
            <ChevronDown size={15} className={cn("shrink-0 text-muted transition-transform", showProject && "rotate-180")} />
          </button>
          {showProject && (
            <div className="border-t border-lime px-3 pb-3 pt-2 text-[13px]">
              <ol className="list-inside list-decimal space-y-1 text-ink-2">
                {project.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {project.link && (
                <a href={project.link.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-blue hover:underline">
                  {project.link.label} <ExternalLink size={11} />
                </a>
              )}
              {project.cvLine && (
                <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-[12.5px]">
                  <b>CV line once done:</b> {project.cvLine}
                </p>
              )}
              {onAddProject && (
                <button onClick={() => onAddProject(project.title, project.steps.join(" "))} className="mt-2 text-[12.5px] font-semibold text-ink underline underline-offset-2">
                  Add this project to my roadmap
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11.5px] text-muted">
        <Search size={11} /> More:
        {searches.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line bg-white px-2 py-0.5 font-medium text-ink-2 hover:border-ink/30">
            {s.provider}
          </a>
        ))}
      </div>
    </div>
  );
}
