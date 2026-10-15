"use client";

import { ArrowRight, CheckCircle2, Hammer, Plus, Target, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TRACK_MAP } from "@/data/careers";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressRing } from "@/components/ui";
import { displaySkill } from "@/lib/engine/skills";
import { useDerived } from "@/lib/hooks";
import { useStay } from "@/lib/store";

export default function SkillsPage() {
  const d = useDerived();
  const { skills, profile: p } = d;
  const tasks = useStay((s) => s.tasks);
  const addSkillTask = useStay((s) => s.addSkillTaskToRoadmap);
  const gapEvents = d.events.filter((e) => e.matchedGaps.length > 0).slice(0, 3);
  const inRoadmap = (key: string, canonical?: string) =>
    tasks.some((t) => t.templateId === `user-${key}` || (canonical && t.templateId === `gap-${canonical}`) || (key.startsWith("project-") && t.templateId === key));
  const core = skills.gaps.filter((g) => g.importance === "core");
  const nice = skills.gaps.filter((g) => g.importance === "nice");

  return (
    <div>
      <PageHeader
        eyebrow="Skills analysis"
        title={`Ready for ${skills.targetRole}?`}
        description={`Compared with skills commonly asked for in ${p.careerGoals.map((g) => TRACK_MAP[g].noun).join(", ")} roles. Based only on skills you've told us about or mentioned in your experience — nothing inferred.`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex items-center gap-5 p-6">
          <ProgressRing
            value={Math.round(skills.coverage * 100)}
            label={
              <>
                <span className="font-display text-2xl font-bold">{Math.round(skills.coverage * 100)}%</span>
                <span className="text-[10.5px] text-muted">core skills</span>
              </>
            }
          />
          <div>
            <div className="font-display text-lg font-semibold">
              {core.length} core gap{core.length === 1 ? "" : "s"}
            </div>
            <p className="text-[13px] text-ink-2">Close the top 2–3 and your opportunity scores rise automatically.</p>
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-teal">
            <CheckCircle2 size={14} /> Your strengths
          </div>
          {skills.strengths.length ? (
            <div className="flex flex-wrap gap-2">
              {skills.strengths.map((s) => (
                <Badge key={s.canonical} tone="teal" className="px-3 py-1 text-[13px]">
                  {s.label}
                  {s.evidence === "experience" && <span className="text-[10px] opacity-70">· from your experience</span>}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted">
              No skills listed yet.{" "}
              <Link href="/profile" className="font-semibold text-blue underline">
                Add skills in your profile
              </Link>
            </p>
          )}
          {skills.basicStrengths.length > 0 && (
            <p className="mt-3 text-[12.5px] text-muted">
              You described {skills.basicStrengths.map((s) => s.label.toLowerCase()).join(" and ")} as basic — deepening these is a quick win for assessments.
            </p>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-xl font-semibold">
        <Target size={20} className="text-sun" /> Skills to develop
      </h2>
      {skills.gaps.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[...core, ...nice].map((g) => {
            const added = inRoadmap(`skill-${g.canonical}`, g.canonical);
            return (
              <Card key={g.canonical} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{displaySkill(g.canonical)}</h3>
                      <Badge tone={g.importance === "core" ? "sun" : "neutral"}>{g.importance === "core" ? "Core" : "Nice to have"}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-ink-2">{g.why}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={added ? "secondary" : "primary"}
                    disabled={added}
                    onClick={() => {
                      addSkillTask({
                        key: `skill-${g.canonical}`,
                        title: `Build ${displaySkill(g.canonical)}: ${g.learn[0].charAt(0).toLowerCase() + g.learn[0].slice(1)}`,
                        description: `${g.why} Then: ${g.learn[1] ?? "apply it in a project"}.`,
                        skill: displaySkill(g.canonical),
                        days: 21,
                        category: "skills",
                      });
                      toast.success("Added to your roadmap");
                    }}
                  >
                    {added ? <CheckCircle2 size={14} /> : <Plus size={14} />} {added ? "In roadmap" : "Roadmap"}
                  </Button>
                </div>
                <ul className="mt-3 space-y-1 text-[13px]">
                  {g.learn.map((l) => (
                    <li key={l} className="flex gap-2">
                      <span className="text-teal">→</span> {l}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-[11.5px] text-muted">Needed for: {g.tracks.map((t) => TRACK_MAP[t].label).join(", ")}</div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No gaps against the core skills list" body="Great — focus on depth: projects with measurable results and interview practice." />
      )}

      <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-xl font-semibold">
        <Hammer size={20} className="text-violet" /> Projects that prove it
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {skills.projects.map((pr) => {
          const added = inRoadmap(pr.id) || tasks.some((t) => t.templateId === `project-${pr.id}`);
          return (
            <Card key={pr.id} interactive className="flex flex-col p-5">
              <h3 className="font-display text-[17px] font-semibold leading-snug">{pr.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{pr.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pr.skills.map((s) => (
                  <Badge key={s} tone={skills.gaps.some((g) => g.canonical === s) ? "sun" : "neutral"}>
                    {displaySkill(s)}
                  </Badge>
                ))}
              </div>
              <Button
                size="sm"
                className="mt-auto self-start"
                style={{ marginTop: 16 }}
                variant={added ? "secondary" : "primary"}
                disabled={added}
                onClick={() => {
                  addSkillTask({ key: pr.id, title: `Project: ${pr.title}`, description: pr.description, skill: pr.skills.map(displaySkill).slice(0, 2).join(", "), days: 45, category: "projects" });
                  toast.success("Project added to your roadmap");
                }}
              >
                {added ? <CheckCircle2 size={14} /> : <Plus size={14} />} {added ? "In roadmap" : "Add to roadmap"}
              </Button>
            </Card>
          );
        })}
      </div>

      {gapEvents.length > 0 && (
        <Card className="mt-8 p-6">
          <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Zap size={18} className="text-sun" /> Events that close your gaps
          </div>
          <div className="space-y-2">
            {gapEvents.map((e) => (
              <div key={e.event.id} className="flex flex-col justify-between gap-1 rounded-2xl bg-paper px-4 py-3 sm:flex-row sm:items-center">
                <div>
                  <div className="text-[14px] font-medium">{e.event.name}</div>
                  <div className="text-[12.5px] text-muted">Builds {e.matchedGaps.join(", ")}</div>
                </div>
                <Link href="/events" className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue hover:underline">
                  View <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
