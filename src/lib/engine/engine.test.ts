import { describe, expect, it } from "vitest";
import { demoProfile } from "@/data/demo-profile";
import { getDemoEvents } from "@/data/events";
import { getDemoOpportunities } from "@/data/opportunities";
import { buildRoadmap } from "@/lib/services/catalog";
import type { Activity, UserProfile } from "@/lib/types";
import { parseAnnouncementLocally } from "./announcement";
import { coffeeChatRecommendations, outreachTemplate } from "./coffee";
import { extractSkillsFromText } from "./cv";
import { rankEvents } from "./events";
import { parseSalary, rankOpportunities, scoreOpportunity } from "./opportunities";
import { activityStats, AUTO_COMPLETE_RULES, computeHorizon, generateDrafts, mergeRoadmap } from "./roadmap";
import { analyseSkills } from "./skills";
import { estimateGraduateRoute } from "./visa";

const TODAY = "2026-10-15";
const alex = () => demoProfile("2026-10-15T09:00:00.000Z");
const graduate = (): UserProfile => ({
  ...alex(),
  id: "grad",
  studyStatus: "graduate",
  graduationDate: "2026-06-30",
  visa: { skipped: false, needsSponsorship: "yes", visaType: "graduate" },
});
const ctx = (p: UserProfile, activity?: Activity) => ({
  profile: p,
  today: TODAY,
  opportunities: rankOpportunities(getDemoOpportunities(TODAY), p, TODAY),
  events: rankEvents(getDemoEvents(TODAY), p, TODAY),
  activity,
});

describe("roadmap engine", () => {
  it("gives students and graduates different plans", () => {
    const s = generateDrafts(ctx(alex())).map((d) => d.templateId);
    const g = generateDrafts(ctx(graduate())).map((d) => d.templateId);
    expect(s).toContain("assessments-prep");
    expect(s).not.toContain("grad-rhythm");
    expect(g).toContain("grad-rhythm");
    expect(g).toContain("sponsor-check");
  });

  it("anchors a final-year student's horizon on graduation", () => {
    const h = computeHorizon(alex(), TODAY);
    expect(h.anchorLabel).toBe("graduation");
    expect(h.monthsLeft).toBeGreaterThan(7);
    expect(h.monthsLeft).toBeLessThan(10);
  });

  it("never dates tasks in the past", () => {
    for (const d of generateDrafts(ctx(alex()))) expect(d.deadline >= TODAY).toBe(true);
  });

  it("keeps completed tasks and user-edited dates when goals change", () => {
    const first = buildRoadmap(alex(), [], [], undefined, [], TODAY).tasks;
    const cv = first.find((t) => t.templateId === "cv-project-led")!;
    const gap = first.find((t) => t.templateId?.startsWith("gap-"))!;
    const edited = first.map((t) =>
      t.id === cv.id ? { ...t, deadline: "2026-12-01", deadlineEditedByUser: true } : t.id === gap.id ? { ...t, status: "completed" as const } : t,
    );
    const consultant = { ...alex(), careerGoals: ["consulting" as const] };
    const next = buildRoadmap(consultant, edited, [], undefined, [], TODAY).tasks;
    expect(next.find((t) => t.id === gap.id)?.status).toBe("completed");
    expect(next.find((t) => t.id === cv.id)?.deadline).toBe("2026-12-01");
  });

  it("does not touch custom tasks on merge", () => {
    const custom = { id: "c1", title: "Mine", description: "", deadline: "2026-11-01", priority: "low" as const, category: "custom" as const, status: "todo" as const, origin: "custom" as const, createdAt: "" };
    const res = mergeRoadmap([custom], generateDrafts(ctx(alex())));
    expect(res.tasks.find((t) => t.id === "c1")).toEqual(custom);
  });
});

describe("activity-linked recommendations", () => {
  const base: Activity = { savedOpps: [], appliedOpps: {}, contacts: {}, completedTemplateIds: [] };

  it("turns a saved role into an apply task", () => {
    const drafts = generateDrafts(ctx(alex(), { ...base, savedOpps: ["opp-11"] }));
    expect(drafts.some((d) => d.sourceOpportunityId === "opp-11" && d.title.includes("saved role"))).toBe(true);
  });

  it("adds follow-ups after progress", () => {
    const drafts = generateDrafts(ctx(alex(), { ...base, completedTemplateIds: ["cv-project-led", "project-proj-ml-deploy"] })).map((d) => d.templateId);
    expect(drafts).toContain("cv-review");
    expect(drafts).toContain("project-showcase");
  });

  it("auto-completes networking and application tasks from activity", () => {
    const a: Activity = {
      ...base,
      appliedOpps: { a: TODAY, b: TODAY, c: TODAY, d: TODAY, e: TODAY },
      contacts: { x: { status: "contacted" }, y: { status: "replied" } },
    };
    const st = activityStats(a);
    const met = AUTO_COMPLETE_RULES.filter((r) => r.met(st)).map((r) => r.templateId);
    expect(met).toEqual(expect.arrayContaining(["coffee-first-two", "grad-apply-5"]));
    expect(met).not.toContain("grad-apply-10");
  });
});

describe("opportunity scoring", () => {
  it("flags a summer internship for a 2027 graduate as likely ineligible", () => {
    const opp = getDemoOpportunities(TODAY).find((o) => o.id === "opp-04")!;
    const s = scoreOpportunity(opp, alex(), TODAY);
    expect(s.eligible).toBe(false);
    expect(s.score).toBeLessThanOrEqual(35);
  });

  it("ranks by career goal", () => {
    const ai = rankOpportunities(getDemoOpportunities(TODAY), alex(), TODAY)[0].opportunity;
    const mkt = rankOpportunities(getDemoOpportunities(TODAY), { ...alex(), careerGoals: ["marketing"] }, TODAY)[0].opportunity;
    expect(ai.tracks).toEqual(expect.arrayContaining(["ai"]));
    expect(mkt.tracks).toContain("marketing");
  });

  it("weights normalise to 1 and unknowns are not guessed", () => {
    const live = { ...getDemoOpportunities(TODAY)[0], id: "live", isDemo: false, degreeFields: [], experienceLevel: "unknown" as const, skillsRequired: [], deadline: undefined };
    const s = scoreOpportunity(live, alex(), TODAY);
    expect(s.factors.reduce((a, f) => a + f.weight, 0)).toBeCloseTo(1, 5);
    expect(s.factors.find((f) => f.key === "degree")?.status).toBe("unknown");
    expect(s.factors.find((f) => f.key === "deadline")?.detail).toMatch(/not verified/i);
  });

  it("uses the minimum-salary preference", () => {
    const opp = getDemoOpportunities(TODAY).find((o) => o.id === "opp-09")!; // £55,000 example
    const s = scoreOpportunity(opp, { ...alex(), minSalary: 60000 }, TODAY);
    expect(s.factors.find((f) => f.key === "salary")?.status).toBe("gap");
  });

  it("parses salaries", () => {
    expect(parseSalary("£38,000–£42,000 (example)")).toBe(38000);
    expect(parseSalary("£2,600/month (example)")).toBe(31200);
    expect(parseSalary(undefined)).toBeNull();
  });
});

describe("events", () => {
  it("filters past and cancelled events and surfaces skill-gap matches", () => {
    const ranked = rankEvents(getDemoEvents(TODAY), alex(), TODAY);
    const ids = ranked.map((e) => e.event.id);
    expect(ids).not.toContain("evt-past");
    expect(ids).not.toContain("evt-cancelled");
    expect(ranked[0].matchedGaps.length).toBeGreaterThan(0);
  });

  it("extracts details from a pasted announcement", () => {
    const e = parseAnnouncementLocally("🚀 AI Society presents: Intro to LLM Agents workshop! Thursday 6 Nov, 6-8pm, Roberts Building G06. Bring Python. https://example.org/x", TODAY);
    expect(e.date).toBe("2026-11-06");
    expect(e.startTime).toBe("18:00");
    expect(e.endTime).toBe("20:00");
    expect(e.location).toContain("Roberts Building");
    expect(e.category).toBe("workshop");
    expect(e.bookingUrl).toBe("https://example.org/x");
  });
});

describe("coffee chats", () => {
  it("returns exactly five LinkedIn searches, never named people", () => {
    const recs = coffeeChatRecommendations(alex());
    expect(recs).toHaveLength(5);
    for (const r of recs) {
      expect(r.recommendationType).toBe("search");
      expect(r.name).toBeUndefined();
      expect(r.searchUrl).toMatch(/^https:\/\/www\.linkedin\.com\/search\/results\/people\/\?keywords=/);
    }
    expect(recs[0].alumniUrl).toMatch(/^https:\/\/www\.linkedin\.com\/school\/university-college-london\/people\/\?keywords=/);
  });

  it("only uses provided names in outreach", () => {
    const rec = coffeeChatRecommendations(alex())[0];
    expect(outreachTemplate(alex(), rec)).toContain("[Name]");
    expect(outreachTemplate(alex(), rec, { id: "u", name: "Sam Lee", role: "Data Scientist", company: "Acme", createdAt: "" })).toMatch(/^Hi Sam/);
  });
});

describe("skills & CV", () => {
  it("only extracts skills explicitly mentioned", () => {
    const s = extractSkillsFromText("Built a React app in TypeScript, deployed with Docker. Worked on a research project.");
    expect(s).toEqual(expect.arrayContaining(["JavaScript / TypeScript", "Docker"]));
    expect(s).not.toContain("R");
    expect(s).not.toContain("PyTorch");
  });

  it("does not infer skills the user hasn't stated", () => {
    const a = analyseSkills(alex());
    expect(a.strengths.map((s) => s.canonical)).not.toContain("pytorch");
    expect(a.gaps.map((g) => g.canonical)).toContain("pytorch");
  });
});

describe("visa", () => {
  it("uses 18 months for bachelor's/master's applications from 1 Jan 2027", () => {
    expect(estimateGraduateRoute(alex())?.durationMonths).toBe(18);
    expect(estimateGraduateRoute({ ...alex(), graduationDate: "2026-09-30" })?.durationMonths).toBe(24);
    expect(estimateGraduateRoute({ ...alex(), degreeLevel: "phd" })?.durationMonths).toBe(36);
  });

  it("returns nothing when visa questions are skipped", () => {
    expect(estimateGraduateRoute({ ...alex(), visa: { ...alex().visa, skipped: true } })).toBeNull();
  });
});
