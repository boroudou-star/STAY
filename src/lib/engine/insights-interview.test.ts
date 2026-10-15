import { describe, expect, it } from "vitest";
import { demoProfile } from "@/data/demo-profile";
import { CASES } from "@/data/interview";
import type { FeedItem, InsightEntry } from "@/lib/types";
import { buildInsightProfile, dailyBrief, defaultAreas, parseRss, reflectHeuristic, weekPlan } from "./insights";
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
    expect(defaultAreas(alex())).toEqual(["ai", "data", "tech"]);
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

  it("guides thinking with a follow-up targeting what's missing", () => {
    const weak = reflectHeuristic("q", "It is interesting.");
    expect(weak.checks.find((c) => c.key === "view")?.met).toBe(false);
    expect(weak.followUp).toMatch(/opinion|view/i);
    const strong = reflectHeuristic(
      "q",
      "I think banks will lose share in payments because fintechs ship faster — for example, one app cut fees by 30%. This means incumbents will likely partner rather than build, which could lead to more acquisitions next year. I'm not fully convinced regulation will slow this.",
    );
    expect(strong.checks.every((c) => c.met)).toBe(true);
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
      const quoted = q.text.match(/"([^"]+)"/)?.[1] ?? q.text.match(/You list (.+?) —/)?.[1];
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
