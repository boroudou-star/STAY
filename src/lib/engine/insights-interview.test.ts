import { describe, expect, it } from "vitest";
import { demoProfile } from "@/data/demo-profile";
import { CASES } from "@/data/interview";
import type { FeedItem, InsightEntry } from "@/lib/types";
import { buildInsightProfile, dailyBrief, defaultAreas, parseRss, weekPlan } from "./insights";
import { checkCaseStage, cvQuestions, overall, pickMockQuestions, questionSet, scoreAnswer } from "./interview";
import { activityStats, AUTO_COMPLETE_RULES } from "./roadmap";

const TODAY = "2026-10-15";
const alex = () => demoProfile("2026-10-15T09:00:00.000Z");

describe("insights", () => {
  it("parses Google News style RSS without copying article text", () => {
    const xml = `<rss><channel>
      <item><title><![CDATA[Big AI deal announced - The Example Times]]></title><link>https://news.example.com/a</link><pubDate>Wed, 14 Oct 2026 08:00:00 GMT</pubDate><description>long body that should be ignored</description><source url="https://example.com">The Example Times</source></item>
      <item><title>No link item</title></item>
      <item><title>Second &amp; story</title><link>https://news.example.com/b</link></item>
    </channel></rss>`;
    const items = parseRss(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: "Big AI deal announced", link: "https://news.example.com/a", source: "The Example Times" });
    expect(JSON.stringify(items)).not.toContain("long body");
    expect(items[1].title).toBe("Second & story");
  });

  it("maps career goals to insight areas", () => {
    // Main goal first, then the industries the user named (Alex named "Technology"), then other goals
    expect(defaultAreas(alex())).toEqual(["ai", "tech", "data"]);
    expect(defaultAreas({ ...alex(), careerGoals: ["consulting"], preferredIndustries: ["Healthcare"] })).toEqual(["consulting", "healthcare"]);
  });

  it("builds a stable daily brief with a company question", () => {
    const prefs = { areas: defaultAreas(alex()), companies: ["Monzo"], planDone: [] };
    const news: FeedItem[] = [{ id: "n1", kind: "news", title: "Monzo launches something", source: "Example", url: "https://x.test", company: "Monzo", isLive: true }];
    const a = dailyBrief(prefs, news, TODAY);
    const b = dailyBrief(prefs, news, TODAY);
    expect(a).toEqual(b);
    expect(a.questions.some((q) => q.company === "Monzo")).toBe(true);
    expect(a.questions.some((q) => q.item?.id === "n1")).toBe(true);
  });

  it("works with no live feed (offline)", () => {
    const brief = dailyBrief({ areas: ["consulting"], companies: [], planDone: [] }, [], TODAY);
    expect(brief.news).toHaveLength(0);
    expect(brief.questions.length).toBeGreaterThanOrEqual(2);
    expect(brief.primer.primer.body.length).toBeGreaterThan(50);
  });

  it("builds an insight profile from the user's own entries", () => {
    const e = (date: string, company?: string): InsightEntry => ({
      id: date + (company ?? ""),
      date,
      area: "ai",
      company,
      question: "q",
      answer: "I think inference costs and evaluation matter because inference costs drive margins.",
      tags: [],
      createdAt: `${date}T10:00:00Z`,
    });
    const ip = buildInsightProfile([e("2026-10-15", "Monzo"), e("2026-10-14"), e("2026-10-13")], TODAY);
    expect(ip.streakDays).toBe(3);
    expect(ip.byCompany[0].company).toBe("Monzo");
    expect(ip.themes.map((t) => t.term)).toContain("inference");
  });

  it("fills the 7-day plan with the user's company", () => {
    const plan = weekPlan({ areas: ["consulting"], companies: ["Accenture"], planDone: [1], planStart: TODAY }, TODAY);
    expect(plan).toHaveLength(7);
    expect(plan[5].task).toContain("Accenture");
    expect(plan[1].done).toBe(true);
    expect(plan[0].isToday).toBe(true);
  });
});

describe("interview prep", () => {
  it("adds company questions, including one tied to a real headline", () => {
    const news: FeedItem[] = [{ id: "n", kind: "news", title: "Acme opens London hub", source: "Example", url: "https://x.test", isLive: true }];
    const set = questionSet(alex(), { company: "Acme", companyNews: news });
    expect(set.company.length).toBeGreaterThanOrEqual(5);
    expect(set.company.every((q) => q.text.includes("Acme"))).toBe(true);
    expect(set.company.some((q) => q.text.includes("Acme opens London hub"))).toBe(true);
  });

  it("builds CV questions only from what the user wrote", () => {
    const qs = cvQuestions(alex());
    const userText = Object.values(alex().experience).join(" ") + alex().technicalSkills.join(" ");
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      const quoted = q.text.match(/"([^"]+)"/)?.[1] ?? q.text.match(/You list (.+?)\. Tell/)?.[1];
      expect(quoted && userText.includes(quoted)).toBe(true);
    }
  });

  it("scores a structured STAR answer above a vague one", () => {
    const q = questionSet(alex()).behavioural[0];
    const vague = scoreAnswer(q, "We worked well together as a team and it was good.");
    const star = scoreAnswer(
      q,
      "During my second year, our group of four had to build a recommender system in three weeks. My role was to lead the data pipeline because we were behind schedule. I split the work into daily goals, I built the cleaning scripts and I organised two short stand-ups a week so blockers surfaced early. As a result we delivered on time, improved accuracy by 12% over the baseline and got the highest mark in the cohort. I learned to make progress visible early.",
    );
    expect(overall(star.scores)).toBeGreaterThan(overall(vague.scores));
    expect(vague.followUp).toBeTruthy();
  });

  it("marks technical answers against model points", () => {
    const tech = questionSet(alex(), { track: "finance" }).technical.find((q) => q.id === "t-f-dcf")!;
    const good = scoreAnswer(tech, "Project free cash flows for five years, discount them at the WACC, add a terminal value using perpetuity growth or an exit multiple, sum to enterprise value and adjust for debt and cash to get equity value.");
    const bad = scoreAnswer(tech, "It values a company.");
    expect(good.scores.structure).toBeGreaterThan(bad.scores.structure);
  });

  it("composes mock interviews of the requested length", () => {
    const set = questionSet(alex(), { company: "Acme" });
    expect(pickMockQuestions(set, "mixed", 4, 1)).toHaveLength(4);
    expect(pickMockQuestions(set, "company", 3, 1).some((q) => q.text.includes("Acme"))).toBe(true);
    expect(pickMockQuestions(set, "cv", 3, 1).every((q) => q.kind === "cv")).toBe(true);
  });

  it("checks case answers against what a strong answer covers", () => {
    const stage = CASES[0].stages[2];
    const r = checkCaseStage(stage, "Bean cost rose by £0.15 per cup, about 50%, the biggest change. Total cost per cup is up about £0.20 with price flat, so across 10m cups profit is roughly £2m lower per year — bean cost explains most of the decline.");
    expect(r.pct).toBeGreaterThanOrEqual(75);
  });

  it("links practice to the roadmap", () => {
    const st = activityStats({ savedOpps: [], appliedOpps: {}, contacts: {}, completedTemplateIds: [], insightEntries: 5, mockInterviews: 3 });
    const met = AUTO_COMPLETE_RULES.filter((r) => r.met(st)).map((r) => r.templateId);
    expect(met).toEqual(expect.arrayContaining(["interviews-prep", "insight-habit"]));
  });
});

describe("daily questions", () => {
  it("gives every daily question a topic for the expert discussion", async () => {
    const { dailyBrief: brief, noteSections } = await import("./insights");
    const b = brief({ areas: ["consulting"], companies: ["Accenture"], planDone: [] }, [{ id: "n", kind: "news", title: "Accenture wins deal", source: "X", url: "https://x.test", isLive: true }], TODAY);
    expect(b.questions.map((q) => q.topic.kind)).toEqual(["primer", "news", "company"]);
    expect(b.questions[1].topic.company).toBe("Accenture");
    for (const q of b.questions) expect(q.topic.question).toBe(q.text);
    const offline = brief({ areas: ["ai", "tech"], companies: [], planDone: [] }, [], TODAY);
    const concept = offline.questions.find((q) => q.topic.kind === "concept");
    expect(concept?.topic.concept).toBeTruthy();
    expect(noteSections("news").map((s) => s.key)).toContain("take");
  });
});

describe("strict recruiter feedback", () => {
  const weak = "We worked on a group project and I helped with the data stuff. I'm a team player and passionate about tech. It went well and we learned a lot of things etc.";

  it("gives a no hire verdict and quotes the candidate's own words", () => {
    const q = questionSet(alex(), { track: "consulting" }).behavioural[0];
    const f = scoreAnswer(q, weak, { track: "consulting" });
    expect(f.verdict).toBe("no_hire");
    expect(f.field).toBe("consulting");
    const quotes = (f.notes ?? []).map((n) => n.quote).filter(Boolean) as string[];
    expect(quotes.length).toBeGreaterThan(1);
    for (const qt of quotes) expect(weak).toContain(qt);
    expect(f.notes?.some((n) => /result/i.test(n.issue))).toBe(true);
  });

  it("judges against the hiring bar of the chosen field", () => {
    const q = questionSet(alex(), { track: "ai" }).behavioural[3];
    const answer = "During my final year project I built a model to classify support tickets. I compared it against a keyword baseline and used a held-out test set; it reached 0.82 F1 vs 0.61 for the baseline. I deployed it as an API for 40 users. One limitation was bias towards long tickets, so I added error analysis by length. As a result triage time fell by 30%.";
    const ai = scoreAnswer(q, answer, { track: "ai" });
    const consulting = scoreAnswer(q, answer, { track: "consulting" });
    expect(ai.lens?.filter((l) => l.met).length).toBeGreaterThanOrEqual(4);
    expect(ai.lens?.map((l) => l.criterion)).not.toEqual(consulting.lens?.map((l) => l.criterion));
  });

  it("caps company answers that never mention the company", () => {
    const q = questionSet(alex(), { company: "Monzo" }).company[0];
    const f = scoreAnswer(q, "I have always admired fintech companies because they move quickly and I led a fintech society project where I built a budgeting app used by 200 students, which taught me how much users care about simple design and fast support.", { company: "Monzo" });
    expect(["borderline", "no_hire"]).toContain(f.verdict);
    expect(f.notes?.some((n) => n.issue.includes("Monzo"))).toBe(true);
  });

  it("does not use dashes in its feedback text", () => {
    const q = questionSet(alex()).behavioural[0];
    const f = scoreAnswer(q, weak);
    expect(JSON.stringify([f.headline, f.notes, f.rewrite])).not.toContain("—");
  });
});

describe("opportunities and resources", () => {
  it("explains each demo skill in the context of that specific role", async () => {
    const { getDemoOpportunities } = await import("@/data/opportunities");
    for (const o of getDemoOpportunities(TODAY)) {
      for (const k of o.skillsRequired) expect(o.skillContext?.[k], `${o.id} ${k}`).toBeTruthy();
      expect(o.responsibilities?.length).toBeGreaterThan(0);
    }
  });

  it("links real learning resources and a one-day project for common gaps", async () => {
    const { resourcesFor } = await import("@/data/resources");
    for (const s of ["PyTorch", "SQL", "Deployment", "Software testing", "Model evaluation", "Statistics", "Excel"]) {
      const r = resourcesFor(s);
      expect(r.resources.length, s).toBeGreaterThanOrEqual(2);
      for (const x of r.resources) expect(x.url).toMatch(/^https:\/\//);
      expect(r.searches.map((x) => x.provider)).toEqual(["Coursera", "YouTube", "GitHub"]);
    }
    expect(resourcesFor("PyTorch").project?.steps.length).toBeGreaterThan(2);
  });
});
