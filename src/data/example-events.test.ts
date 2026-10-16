import { describe, expect, it } from "vitest";
import { demoProfile } from "./demo-profile";
import { exampleEventsFor, unreadableSources } from "./example-events";
import { universitySources } from "./universities";

const TODAY = "2026-10-16";

describe("example events for pages STAY can't read", () => {
  const ucl = universitySources("UCL")!;

  it("only fills in for pages that couldn't be read", () => {
    const blocked = [ucl.careersEvents, ucl.careersFairs!, ucl.unionEvents!, ucl.societies!].map((l) => ({ url: l.url, status: "blocked" }));
    expect(unreadableSources("UCL", blocked, "unavailable").map((s) => s.kind)).toEqual(["careers", "union"]);

    // Careers page read fine, union page rendered with JavaScript (nothing could be read)
    const mixed = [
      { url: ucl.careersEvents.url, status: "ok" },
      { url: ucl.careersFairs!.url, status: "none", detail: "No career-related events listed right now" },
      { url: ucl.unionEvents!.url, status: "none", detail: "No dated events could be read from this page" },
      { url: ucl.societies!.url, status: "disallowed" },
    ];
    expect(unreadableSources("UCL", mixed, "ok").map((s) => s.kind)).toEqual(["union"]);
    expect(unreadableSources("UCL", [], "loading")).toEqual([]);
  });

  it("uses a search link when STAY has no verified pages for the university", () => {
    const s = unreadableSources("University of Nowhere", [], "idle");
    expect(s.map((x) => x.kind)).toEqual(["careers", "union"]);
    expect(s[0].url).toMatch(/google\./);
  });

  it("tailors the examples to the student's goals, gaps and visa needs, and marks them as examples", () => {
    const p = { ...demoProfile(), isDemo: false, university: "UCL", careerGoals: ["biotech" as const, "consulting" as const], preferredRoles: ["Research Associate"] };
    const src = [
      { kind: "careers" as const, label: "UCL Careers: upcoming events", url: ucl.careersEvents.url },
      { kind: "union" as const, label: "Students' Union UCL: what's on", url: ucl.unionEvents!.url },
    ];
    const ev = exampleEventsFor(p, src, TODAY, ["R", "Statistics"]);
    const names = ev.map((e) => e.name);
    expect(names).toContain("Biotechnology / pharma Careers Fair");
    expect(names).toContain("Employer Insight: Life as a Research Associate");
    expect(names).toContain("R for Beginners: Hands-on Workshop");
    expect(names.some((n) => /Working in the UK/.test(n))).toBe(p.visa.needsSponsorship !== "no");
    expect(names).toContain("Consulting Society: Case Competition");
    expect(ev.every((e) => e.isDemo && e.provider === "example" && !e.bookingUrl && e.organiser.endsWith("(example)"))).toBe(true);
    expect(ev.every((e) => e.date > TODAY)).toBe(true);
    expect(new Set(ev.map((e) => e.id)).size).toBe(ev.length);
    expect(ev.find((e) => e.category === "careers_fair")!.sourceUrl).toBe(ucl.careersEvents.url);

    const noVisa = exampleEventsFor({ ...p, visa: { ...p.visa, needsSponsorship: "no" } }, src, TODAY);
    expect(noVisa.some((e) => /Working in the UK/.test(e.name))).toBe(false);
  });
});
