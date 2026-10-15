import { TRACK_MAP } from "@/data/careers";
import type { RoadmapTask, ScoredEvent, ScoredOpportunity, UserProfile } from "@/lib/types";
import { daysBetween, todayISO } from "@/lib/utils";
import { computeHorizon, topPriorities } from "./roadmap";
import { analyseSkills, displaySkill } from "./skills";

export interface InsightInput {
  profile: UserProfile;
  tasks: RoadmapTask[];
  opportunities: ScoredOpportunity[];
  events: ScoredEvent[];
  today?: string;
}

/** Facts passed to the AI so it can only rephrase what we know (no invented dates or roles). */
export function insightFacts({ profile: p, tasks, opportunities, events, today = todayISO() }: InsightInput) {
  const h = computeHorizon(p, today);
  const skills = analyseSkills(p);
  const urgent = topPriorities(tasks, 3, today).filter((t) => daysBetween(today, t.deadline) <= 21);
  return {
    today,
    name: p.name,
    stage: p.studyStatus,
    university: p.university,
    degree: p.degree,
    goals: p.careerGoals.map((g) => TRACK_MAP[g]?.noun),
    monthsToAnchor: h.monthsLeft,
    anchor: h.anchorLabel,
    topGaps: skills.gaps.slice(0, 3).map((g) => displaySkill(g.canonical)),
    strengths: skills.strengths.slice(0, 4).map((s) => s.label),
    completedTasks: tasks.filter((t) => t.status === "completed").length,
    totalTasks: tasks.length,
    dueSoon: urgent.map((t) => ({ title: t.title, deadline: t.deadline })),
    topOpportunity: opportunities.find((o) => o.eligible !== false)?.opportunity.title ?? null,
    topEvent: events[0]?.event.name ?? null,
    needsSponsorship: !p.visa.skipped && p.visa.needsSponsorship === "yes",
  };
}

export function deterministicInsight(input: InsightInput): string {
  const f = insightFacts(input);
  const goal = f.goals[0] ?? "your target field";
  const months = Math.round(f.monthsToAnchor);
  const gap = f.topGaps[0];
  const event = f.topEvent;
  let lead: string;
  if (f.stage === "student") {
    lead =
      months <= 12
        ? `You're about ${months} months from graduation and aiming for ${goal}. Graduate recruitment runs well before graduation day, so applications are your top priority right now.`
        : `You have about ${months} months until graduation: time to build experience for ${goal} before graduate recruitment starts.`;
  } else {
    lead = `You've graduated and are targeting ${goal}${f.anchor === "visa end" ? `, with roughly ${months} months until your visa end date` : ""}. Speed and consistency of applications matter most now.`;
  }
  const actions: string[] = [];
  if (f.dueSoon[0]) actions.push(`finishing "${f.dueSoon[0].title}"`);
  if (gap) actions.push(`closing your ${gap} gap`);
  if (event) actions.push(`attending ${event}`);
  const tail = actions.length ? ` Your highest-value moves this month: ${actions.join(", ")}.` : "";
  const visa = f.needsSponsorship ? " Ask about sponsorship early with every employer you shortlist." : "";
  return `${lead}${tail}${visa}`;
}
