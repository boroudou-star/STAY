import { canonicalSkill, DEFAULT_GUIDE, PROJECT_IDEAS, SKILL_ALIASES, SKILL_GUIDES, TRACK_MAP, type ProjectIdea } from "@/data/careers";
import type { CareerTrack, UserProfile } from "@/lib/types";

export interface UserSkill {
  canonical: string;
  label: string;
  evidence: "stated" | "experience";
  level?: "basic";
}

const BASIC = /\b(basic|beginner|intro(ductory)?)\b/i;

/**
 * Skills the user has given evidence for: stated skills, plus skills named
 * explicitly in their own experience / CV text. Nothing is inferred beyond that.
 */
export function userSkills(profile: UserProfile): UserSkill[] {
  const out = new Map<string, UserSkill>();
  for (const raw of [...profile.technicalSkills, ...profile.professionalSkills]) {
    const label = raw.trim();
    if (!label) continue;
    const canonical = canonicalSkill(label.replace(BASIC, "").trim());
    out.set(canonical, { canonical, label, evidence: "stated", level: BASIC.test(label) ? "basic" : undefined });
  }
  const text = Object.values(profile.experience).join(" \n ").toLowerCase();
  if (text.trim()) {
    for (const [canon, aliases] of Object.entries(SKILL_ALIASES)) {
      if (out.has(canon)) continue;
      const hit = aliases.find((a) => a.length > 2 && new RegExp(`\\b${escapeRe(a)}\\b`, "i").test(text));
      if (hit) out.set(canon, { canonical: canon, label: displaySkill(canon), evidence: "experience" });
    }
  }
  return [...out.values()];
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

export function displaySkill(canon: string) {
  const special: Record<string, string> = {
    sql: "SQL",
    pytorch: "PyTorch",
    git: "Git",
    r: "R",
    "javascript / typescript": "JavaScript / TypeScript",
    "data structures & algorithms": "Data structures & algorithms",
  };
  if (special[canon]) return special[canon];
  return canon.charAt(0).toUpperCase() + canon.slice(1);
}

export function hasSkill(skills: UserSkill[], required: string) {
  const c = canonicalSkill(required);
  return skills.some((s) => s.canonical === c);
}

export interface SkillGap {
  skill: string; // display label
  canonical: string;
  importance: "core" | "nice";
  tracks: CareerTrack[];
  why: string;
  learn: string[];
}

export interface SkillsAnalysis {
  targetRole: string;
  strengths: UserSkill[];
  basicStrengths: UserSkill[];
  gaps: SkillGap[];
  projects: ProjectIdea[];
  coverage: number; // 0..1 of core skills covered
}

export function analyseSkills(profile: UserProfile): SkillsAnalysis {
  const tracks = (profile.careerGoals.length ? profile.careerGoals : ["exploring"]) as CareerTrack[];
  const skills = userSkills(profile);
  const required = new Map<string, { label: string; tracks: CareerTrack[]; core: boolean }>();
  tracks.forEach((t, i) => {
    const info = TRACK_MAP[t];
    if (!info) return;
    info.coreSkills.forEach((s, j) => {
      const c = canonicalSkill(s);
      const existing = required.get(c);
      const core = i === 0 || j < 4;
      if (existing) {
        existing.tracks.push(t);
        existing.core = existing.core || core;
      } else required.set(c, { label: s, tracks: [t], core });
    });
  });

  const strengths = skills.filter((s) => required.has(s.canonical) || s.evidence === "stated");
  const gaps: SkillGap[] = [];
  for (const [canonical, r] of required) {
    if (skills.some((s) => s.canonical === canonical)) continue;
    const guide = SKILL_GUIDES[canonical] ?? DEFAULT_GUIDE;
    gaps.push({ skill: r.label, canonical, importance: r.core ? "core" : "nice", tracks: r.tracks, why: guide.why, learn: guide.learn });
  }
  gaps.sort((a, b) => (a.importance === b.importance ? b.tracks.length - a.tracks.length : a.importance === "core" ? -1 : 1));

  const gapSet = new Set(gaps.map((g) => g.canonical));
  const projects = PROJECT_IDEAS.filter((p) => p.tracks.some((t) => tracks.includes(t)))
    .map((p) => ({ p, hits: p.skills.filter((s) => gapSet.has(canonicalSkill(s))).length }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map((x) => x.p);

  const coreReq = [...required.entries()].filter(([, r]) => r.core);
  const covered = coreReq.filter(([c]) => skills.some((s) => s.canonical === c)).length;

  return {
    targetRole: TRACK_MAP[tracks[0]]?.primaryRole ?? "Graduate role",
    strengths,
    basicStrengths: skills.filter((s) => s.level === "basic"),
    gaps,
    projects,
    coverage: coreReq.length ? covered / coreReq.length : 0,
  };
}
