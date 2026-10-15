import { describe, expect, it } from "vitest";
import { getDemoEvents } from "@/data/events";
import { getDemoOpportunities } from "@/data/opportunities";
import { blankProfile, profileGaps, tailoringNotes, withDefaults } from "@/lib/profile";
import { allEventsSync, buildRoadmap } from "@/lib/services/catalog";
import type { Opportunity, UserProfile } from "@/lib/types";
import { coffeeChatRecommendations } from "./coffee";
import { deterministicInsight } from "./insight";
import { effectivePrefs } from "./insights";
import { isTargetCompany, rankOpportunities, scoreOpportunity } from "./opportunities";
import { generateDrafts } from "./roadmap";
import { rankEvents } from "./events";
import { daysBetween } from "@/lib/utils";

const TODAY = "2026-10-15";

/** A real-looking new user from a different university, built the way onboarding builds one. */
const priya = (patch: Partial<UserProfile> = {}): UserProfile =>
  withDefaults({
    ...blankProfile(new Date("2026-10-15T09:00:00Z")),
    name: "Priya",
    university: "University of Manchester",
    subjectArea: "Economics",
    degree: "BSc Economics",
    currentStudyYear: 3,
    graduationDate: "2027-06-30",
    careerGoals: ["consulting", "finance"],
    preferredRoles: ["Business Analyst"],
    technicalSkills: ["Excel"],
    professionalSkills: ["Presenting"],
    locationPreferences: ["Manchester", "London"],
    ...patch,
  });

const ctx = (p: UserProfile) => ({
  profile: p,
  today: TODAY,
  opportunities: rankOpportunities(getDemoOpportunities(TODAY), p, TODAY),
  events: rankEvents(allEventsSync([], [], TODAY, p.university), p, TODAY),
});
const draft = (p: UserProfile, id: string) => generateDrafts(ctx(p)).find((d) => d.templateId === id);

describe("personalised roadmap", () => {
  it("paces deadlines to the hours a week the user has", () => {
    const light = draft(priya({ weeklyHours: 2 }), "coffee-three-done")!;
    const heavy = draft(priya({ weeklyHours: 15 }), "coffee-three-done")!;
    expect(daysBetween(TODAY, light.deadline)).toBeGreaterThan(daysBetween(TODAY, heavy.deadline) + 20);
  });

  it("ticks off what the user already has, and builds on it", () => {
    const p = priya({ startingPoint: { cvReady: true, linkedinReady: true, inSocieties: false, reachedOut: false, applicationsSent: 6, interviewsDone: 2 } });
    const { tasks } = buildRoadmap(p, [], [], { savedOpps: [], appliedOpps: {}, contacts: {}, completedTemplateIds: [], externalApplications: 6 }, [], TODAY);
    const status = (id: string) => tasks.find((t) => t.templateId === id)?.status;
    expect(status("cv-project-led")).toBe("completed");
    expect(status("linkedin-refresh")).toBe("completed");
    expect(status("grad-apply-5")).toBe("completed");
    expect(status("societies-join")).toBe("todo");
    expect(tasks.some((t) => t.templateId === "cv-tailor")).toBe(true);
    expect(tasks.find((t) => t.templateId === "interviews-prep")?.description).toMatch(/2 real interviews/);
  });

  it("moves the user's hardest areas up and says why", () => {
    const base = draft(priya(), "interviews-prep")!;
    const hard = draft(priya({ challenges: ["interviews"] }), "interviews-prep")!;
    expect(hard.description).toMatch(/because you said interviews is hard/);
    expect(hard.deadline < base.deadline).toBe(true);
    expect(draft(priya({ challenges: ["direction"] }), "explore-paths")).toBeTruthy();
    expect(draft(priya({ challenges: ["time"] }), "weekly-slot")).toBeTruthy();
  });

  it("uses target companies across the plan", () => {
    const p = priya({ targetCompanies: ["Deloitte", "PwC"], visa: { skipped: false, needsSponsorship: "yes", visaType: "student" } });
    expect(draft(p, "target-research")?.title).toContain("Deloitte and PwC");
    expect(draft(p, "mock-company")?.title).toContain("Deloitte");
    expect(draft(p, "sponsor-check")?.title).toContain("Deloitte");
    expect(coffeeChatRecommendations(p)[1].title).toContain("Deloitte");
    expect(effectivePrefs(p, null).companies).toEqual(["Deloitte", "PwC"]);
    expect(deterministicInsight({ profile: p, tasks: [], opportunities: [], events: [], today: TODAY })).toContain("Deloitte");
  });

  it("boosts roles at target companies without penalising others", () => {
    const o = getDemoOpportunities(TODAY)[0] as Opportunity;
    const without = scoreOpportunity(o, priya(), TODAY);
    const withTarget = scoreOpportunity(o, priya({ targetCompanies: [o.company] }), TODAY);
    expect(withTarget.score).toBeGreaterThanOrEqual(without.score);
    expect(withTarget.fitSummary).toContain("target list");
    expect(isTargetCompany("Google DeepMind", ["google"])).toBe(true);
    expect(isTargetCompany("Monzo", ["Revolut"])).toBe(false);
  });
});

describe("any university", () => {
  it("doesn't show UCL example events to students elsewhere", () => {
    expect(allEventsSync([], [], TODAY, "University of Manchester")).toHaveLength(0);
    expect(allEventsSync([], [], TODAY, "University College London").length).toBe(getDemoEvents(TODAY).length);
    const { tasks } = buildRoadmap(priya(), [], [], undefined, [], TODAY);
    expect(tasks.some((t) => /UCL/.test(t.title))).toBe(false);
  });
});

describe("profile completeness", () => {
  it("asks for the answers that would make STAY more specific", () => {
    const gaps = profileGaps(priya()).map((g) => g.id);
    expect(gaps).toEqual(expect.arrayContaining(["companies", "cv", "challenges"]));
    const full = priya({
      targetCompanies: ["Deloitte"],
      challenges: ["networking"],
      goalStatement: "Get a consulting offer",
      preferredRoles: ["Business Analyst"],
      visa: { skipped: false, needsSponsorship: "no", visaType: "none" },
      experience: { ...priya().experience, projects: "Case competition", cvText: "CV text" },
    });
    expect(profileGaps(full)).toHaveLength(0);
    expect(tailoringNotes(full).join(" ")).toMatch(/Deloitte/);
  });
});
