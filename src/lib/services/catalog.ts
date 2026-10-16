import { rankEvents, DemoEventProvider } from "@/lib/engine/events";
import { listOpportunitiesSync, rankOpportunities } from "@/lib/engine/opportunities";
import { generateDrafts, mergeRoadmap } from "@/lib/engine/roadmap";
import { getDemoEvents } from "@/data/events";
import { isUCL } from "@/data/careers";
import type { Activity, CareerEvent, Opportunity, RoadmapTask, UserProfile } from "@/lib/types";
import { todayISO } from "@/lib/utils";

/**
 * Synchronous catalogue access used by the roadmap engine and pages.
 * Async/live sources (e.g. UCL Careers via /api/events/live) are merged in on the Events page.
 */
export { isUCL };

/**
 * Real users only see real events: live listings and ones they add. The fictional example events
 * are kept for the demo profile only.
 */
export function allEventsSync(manual: CareerEvent[], live: CareerEvent[] = [], today = todayISO(), opts: { isDemo?: boolean } = {}) {
  void DemoEventProvider; // provider interface lives in engine/events.ts
  const examples = opts.isDemo ? getDemoEvents(today) : [];
  return [...live, ...manual, ...examples];
}

export function buildRoadmap(
  profile: UserProfile,
  existing: RoadmapTask[],
  manualEvents: CareerEvent[],
  activity?: Activity,
  liveOpportunities: Opportunity[] = [],
  today = todayISO(),
) {
  const opportunities = rankOpportunities([...liveOpportunities, ...listOpportunitiesSync(today)], profile, today);
  const events = rankEvents(allEventsSync(manualEvents, [], today, { isDemo: profile.isDemo }), profile, today, activity);
  const drafts = generateDrafts({ profile, today, opportunities, events, activity });
  return mergeRoadmap(existing, drafts);
}
