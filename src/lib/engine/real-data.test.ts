import { describe, expect, it } from "vitest";
import { demoProfile } from "@/data/demo-profile";
import { getRealProgrammes } from "@/data/programmes";
import { UNIVERSITY_SOURCES, universitySources } from "@/data/universities";
import { buildRoadmap } from "@/lib/services/catalog";
import type { UserProfile } from "@/lib/types";
import { rankOpportunities, scoreOpportunity, stageFit } from "./opportunities";
import { fromUclListing } from "./ucl-events";

const TODAY = "2026-10-16";
const base = (): UserProfile => ({ ...demoProfile("2026-10-16T09:00:00.000Z"), isDemo: false });
const student = (grad: string, patch: Partial<UserProfile> = {}): UserProfile => ({ ...base(), studyStatus: "student", graduationDate: grad, ...patch });

describe("real programmes", () => {
  const all = getRealProgrammes();

  it("are real: official https pages, no invented deadlines or salaries", () => {
    expect(all.length).toBeGreaterThan(50);
    const aggregators = /brightnetwork|targetjobs|ratemyplacement|builtin|indeed|glassdoor|gradcracker/;
    for (const o of all) {
      expect(o.isDemo).toBe(false);
      expect(o.sourceUrl).toMatch(/^https?:\/\//);
      expect(o.sourceUrl).not.toMatch(aggregators);
      expect(o.deadline).toBeUndefined();
      expect(o.salary).toBeUndefined();
      expect(o.stage).toBeTruthy();
    }
    expect(new Set(all.map((o) => o.id)).size).toBe(all.length);
  });

  it("covers biotech, pharma and healthcare consulting with real employers", () => {
    const bio = all.filter((o) => o.tracks.includes("biotech")).map((o) => o.company);
    expect(bio).toEqual(expect.arrayContaining(["AstraZeneca", "GSK", "Pfizer UK", "Roche", "MSD", "L.E.K. Consulting", "ClearView Healthcare Partners", "ZS", "NHS England"]));
    for (const t of ["ai", "software", "data", "consulting", "finance", "marketing", "engineering", "research", "exploring"] as const) {
      expect(all.filter((o) => o.tracks.includes(t)).length, t).toBeGreaterThanOrEqual(3);
    }
  });

  it("ranks healthcare consulting and pharma first for a biotech + consulting student", () => {
    const p = student("2027-06-30", { careerGoals: ["biotech", "consulting"], subjectArea: "Biomedical Science", degree: "BSc Biomedical Science", visa: { skipped: false, needsSponsorship: "no", visaType: "none" } });
    const top = rankOpportunities(all, p, TODAY).filter((s) => s.eligible !== false).slice(0, 8);
    expect(top.every((s) => s.opportunity.tracks.some((t) => t === "biotech" || t === "consulting"))).toBe(true);
    expect(top.some((s) => s.opportunity.tracks.includes("biotech") && s.opportunity.tracks.includes("consulting"))).toBe(true);
  });

  it("matches programmes to the student's stage", () => {
    // October 2026: applications are for summer 2027 internships and September 2027 graduate starts
    expect(stageFit("penultimate", student("2028-06-30"), TODAY).fit).toBe(true);
    expect(stageFit("penultimate", student("2027-06-30"), TODAY).fit).toBe(false);
    expect(stageFit("final_or_graduate", student("2027-06-30"), TODAY).fit).toBe(true);
    expect(stageFit("first_year", student("2029-06-30"), TODAY).fit).toBe(true);
    expect(stageFit("first_year", student("2027-06-30"), TODAY).fit).toBe(false);
    expect(stageFit("phd", student("2028-06-30", { degreeLevel: "phd" }), TODAY).fit).toBe(true);
    const spring = all.find((o) => o.type === "spring_insight")!;
    expect(scoreOpportunity(spring, student("2027-06-30"), TODAY).eligible).toBe(false);
  });

  it("quotes the employer's own visa position", () => {
    const p = student("2027-06-30", { visa: { skipped: false, needsSponsorship: "yes", visaType: "student" } });
    const kpmg = all.find((o) => o.id === "real-kpmg-vacation")!;
    const visa = scoreOpportunity(kpmg, p, TODAY).factors.find((f) => f.key === "visa")!;
    expect(visa.status).toBe("gap");
    expect(visa.detail).toMatch(/unable to offer sponsorship/);
    const nhs = all.find((o) => o.id === "real-nhs-gmts")!;
    expect(scoreOpportunity(nhs, p, TODAY).factors.find((f) => f.key === "visa")!.detail).toMatch(/entire duration/);
  });

  it("adds application tasks without inventing deadlines", () => {
    const p = student("2027-06-30", { careerGoals: ["consulting"], visa: { skipped: false, needsSponsorship: "no", visaType: "none" } });
    const { tasks } = buildRoadmap(p, [], [], undefined, [], TODAY);
    const apply = tasks.filter((t) => t.sourceOpportunityId?.startsWith("real-"));
    expect(apply.length).toBeGreaterThan(0);
    expect(apply[0].title).toMatch(/^Check dates and apply/);
    expect(apply[0].description).toMatch(/not their deadline/);
  });
});

describe("university sources", () => {
  it("finds universities by name or alias", () => {
    expect(universitySources("UCL")?.unionEvents?.url).toContain("studentsunionucl.org");
    expect(universitySources("university college london")?.name).toBe("UCL");
    expect(universitySources("KCL")?.name).toBe("King's College London");
    expect(universitySources("University of Manchester")?.careersEvents.url).toContain("manchester.ac.uk");
    expect(universitySources("Hogwarts")).toBeUndefined();
  });

  it("links only to the university's or union's own sites", () => {
    for (const u of UNIVERSITY_SOURCES) {
      for (const l of [u.careersEvents, u.careersFairs, u.bookingPlatform, u.unionEvents, u.societies].filter(Boolean)) {
        expect(l!.url, u.name).toMatch(/^https?:\/\//);
        expect(l!.url, u.name).not.toMatch(/google\.|facebook|instagram|eventbrite/);
      }
    }
  });

  it("tailors roadmap tasks to the student's own careers service and union", () => {
    const p = student("2027-06-30", { university: "UCL" });
    const { tasks } = buildRoadmap(p, [], [], undefined, [], TODAY);
    expect(tasks.find((t) => t.templateId === "uni-careers-events")?.title).toContain("UCL Careers");
    expect(tasks.find((t) => t.templateId === "societies-join")?.description).toContain("Students' Union UCL");
  });
});

describe("UCL live events parser", () => {
  const listing = `
    <div class="event"><span>12 Oct, 13:00 - 14:00</span><h3><a href="/study/events/2026/oct/sector-insights-sustainability">Sector Insights: sustainability careers</a></h3></div>
    <div class="event"><span>12 Oct, 16:00 – 19:00</span><h3><a href="https://www.ucl.ac.uk/study/events/2026/oct/banking-finance-fair">Banking &amp; Finance Fair</a></h3></div>
    <a class="card" href="/study/events/2026/nov/improve-your-cv"><p>3 Nov</p><p>10:00 - 11:00</p><h3>Career Essentials: Improve your CV</h3></a>
    <div><span>1 Oct</span><a href="/study/events/2026/oct/past-event">Old event</a></div>
    <a href="/study/events/2026/oct/no-date-here">Nothing nearby</a>`;

  it("reads titles, dates, times and links from the listing, and skips past or undated events", () => {
    const ev = fromUclListing(listing, TODAY.replace("16", "10"));
    expect(ev.map((e) => e.name)).toEqual(["Sector Insights: sustainability careers", "Banking & Finance Fair", "Career Essentials: Improve your CV"]);
    expect(ev[0]).toMatchObject({ date: "2026-10-12", startTime: "13:00", endTime: "14:00", url: "https://www.ucl.ac.uk/study/events/2026/oct/sector-insights-sustainability" });
    expect(ev[1].startTime).toBe("16:00");
    expect(ev[2]).toMatchObject({ date: "2026-11-03", startTime: "10:00" });
  });

  it("handles listings that print the date after the title", () => {
    const after = `<h2>Upcoming</h2><a href="/study/events/2026/oct/a">Event A</a><p>20 Oct, 09:00 - 10:00</p><a href="/study/events/2026/oct/b">Event B</a><p>21 Oct</p>`;
    expect(fromUclListing(after, TODAY).map((e) => [e.name, e.date, e.startTime])).toEqual([
      ["Event A", "2026-10-20", "09:00"],
      ["Event B", "2026-10-21", null],
    ]);
  });
});
