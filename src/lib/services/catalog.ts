import { rankEvents, DemoEventProvider } from "@/lib/engine/events";
import { listOpportunitiesSync, rankOpportunities } from "@/lib/engine/opportunities";
import { generateDrafts, mergeRoadmap } from "@/lib/engine/roadmap";
import { getDemoEvents } from "@/data/events";
import type { CareerEvent, RoadmapTask, UserProfile } from "@/lib/types";
import { todayISO } from "@/lib/utils";

/**
 * Synchronous catalogue access used by the roadmap engine and pages.
 * Async/live sources (e.g. UCL Careers via /api/events/live) are merged in on the Events page.
 */
export function allEventsSync(manual: CareerEvent[], live: CareerEvent[] = [], today = todayISO()) {
  void DemoEventProvider; // provider interface lives in engine/events.ts
  return [...live, ...manual, ...getDemoEvents(today)];
}

export function buildRoadmap(profile: UserProfile, existing: RoadmapTask[], manualEvents: CareerEvent[], today = todayISO()) {
  const opportunities = rankOpportunities(listOpportunitiesSync(today), profile, today);
  const events = rankEvents(allEventsSync(manualEvents, [], today), profile, today);
  const drafts = generateDrafts({ profile, today, opportunities, events });
  return mergeRoadmap(existing, drafts);
}
