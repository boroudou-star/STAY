import { describe, expect, it } from "vitest";
import { extractEvents, findDate, findTimes, isCareerRelevant } from "./event-extract";

const TODAY = "2026-10-16";

describe("reading event pages", () => {
  it("reads dates in the formats UK university sites use", () => {
    expect(findDate("Wed 22 Oct", TODAY)).toBe("2026-10-22");
    expect(findDate("22nd October 2026", TODAY)).toBe("2026-10-22");
    expect(findDate("October 22", TODAY)).toBe("2026-10-22");
    expect(findDate("12 Jan", TODAY)).toBe("2027-01-12"); // next occurrence
    expect(findDate("03/11/2026", TODAY)).toBe("2026-11-03"); // day/month/year
    expect(findDate("no date here", TODAY)).toBeNull();
    expect(findTimes("13:00 - 14:00")).toEqual({ start: "13:00", end: "14:00" });
    expect(findTimes("6pm to 8pm")).toEqual({ start: "18:00", end: "20:00" });
  });

  it("prefers schema.org event data when a page has it", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Event","name":"Healthcare Consulting Insight Evening","startDate":"2026-11-04T18:00:00Z","url":"https://example.ac.uk/events/hc-insight","location":{"name":"Bush House"}},{"@type":"Event","name":"Old talk","startDate":"2026-09-01"}]}</script>`;
    const ev = extractEvents(html, "https://example.ac.uk/events", TODAY);
    expect(ev).toEqual([expect.objectContaining({ name: "Healthcare Consulting Insight Evening", date: "2026-11-04", startTime: "18:00", location: "Bush House" })]);
  });

  it("reads a students' union listing: event links with the date next to them", () => {
    const html = `
      <nav><a href="/events/">Events</a><a href="/ents/eventlist/?month=11&year=2026">November</a></nav>
      <div class="event_item"><a href="/ents/event/17501/">Pharma Society: Life at AstraZeneca</a><p class="date">Tuesday 3rd November</p><p>18:30 - 20:00</p></div>
      <div class="event_item"><a href="/ents/event/17502/">Thirsty Thursday</a><p class="date">22nd October</p></div>
      <div class="event_item"><a href="/ents/event/17503/">Find out more</a><span>No date</span></div>
      <div class="event_item"><span>Wed 18 Nov</span><a href="https://www.example-su.org/ents/event/17504/">Consulting Society case competition</a></div>
      <a href="https://othersite.com/events/123">External event 5 Nov</a>`;
    const ev = extractEvents(html, "https://www.example-su.org/ents/eventlist/societies/", TODAY);
    const names = ev.map((e) => e.name);
    expect(names).toContain("Pharma Society: Life at AstraZeneca");
    expect(names).toContain("Consulting Society case competition");
    expect(names).not.toContain("Find out more");
    expect(names.some((n) => /External/.test(n))).toBe(false);
    const az = ev.find((e) => /AstraZeneca/.test(e.name))!;
    expect(az).toMatchObject({ date: "2026-11-03", startTime: "18:30", endTime: "20:00", url: "https://www.example-su.org/ents/event/17501" });
    // Union nightlife is dropped; careers-service events are always kept
    expect(ev.filter((e) => isCareerRelevant(e.name, "union")).map((e) => e.name)).toEqual(["Pharma Society: Life at AstraZeneca", "Consulting Society case competition"]);
    expect(isCareerRelevant("Thirsty Thursday", "careers")).toBe(true);
    expect(isCareerRelevant("Networking night with alumni in finance", "union")).toBe(true);
  });

  it("never returns past events or events without a date", () => {
    const html = `<a href="/events/old-fair">Careers Fair 1 Oct</a><a href="/events/mystery">Mystery talk</a>`;
    expect(extractEvents(html, "https://uni.ac.uk/careers/events", TODAY)).toHaveLength(0);
  });
});
