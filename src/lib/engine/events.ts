import { canonicalSkill, TRACK_MAP } from "@/data/careers";
import { getDemoEvents } from "@/data/events";
import type { Activity, CareerEvent, EventCategory, ScoredEvent, UserProfile } from "@/lib/types";
import { daysBetween, todayISO } from "@/lib/utils";
import { analyseSkills } from "./skills";

/* ------------------------------------------------------------------ */
/* Event sources                                                       */
/* ------------------------------------------------------------------ */

export interface EventSourceProvider {
  id: string;
  label: string;
  isLive: boolean;
  /** True when the provider needs authorised access that isn't configured yet */
  requiresAuthorisation?: boolean;
  fetchEvents(ctx: { university: string; today: string }): Promise<CareerEvent[]>;
}

export const DemoEventProvider: EventSourceProvider = {
  id: "demo",
  label: "STAY demo events",
  isLive: false,
  async fetchEvents({ today }) {
    return getDemoEvents(today);
  },
};

/** Fetches public UCL Careers listings through our server route (cached, robots-respecting). */
export const PublicUCLCareersProvider: EventSourceProvider = {
  id: "ucl-careers",
  label: "UCL Careers (public listings)",
  isLive: true,
  async fetchEvents({ university }) {
    if (university !== "UCL") return [];
    try {
      const res = await fetch("/api/events/live?source=ucl-careers");
      if (!res.ok) return [];
      const data = (await res.json()) as { events?: CareerEvent[] };
      return data.events ?? [];
    } catch {
      return [];
    }
  },
};

/**
 * Students' Union UCL renders listings dynamically, so for the MVP we link to the
 * live "What's on" page rather than scraping it. Replace with a feed import when available.
 */
export const StudentsUnionProvider: EventSourceProvider = {
  id: "su-ucl",
  label: "Students' Union UCL",
  isLive: true,
  async fetchEvents() {
    return [];
  },
};

/** User-submitted events (pasted announcements / URLs). Stored in the client store. */
export function makeManualEventProvider(getEvents: () => CareerEvent[]): EventSourceProvider {
  return {
    id: "manual",
    label: "Added by you",
    isLive: false,
    async fetchEvents() {
      return getEvents();
    },
  };
}

/** Future integration: requires authorised Instagram Graph API access for each society account. */
export const InstagramProvider: EventSourceProvider = {
  id: "instagram",
  label: "Society Instagram (future)",
  isLive: false,
  requiresAuthorisation: true,
  async fetchEvents() {
    return [];
  },
};

/* ------------------------------------------------------------------ */
/* Filtering + scoring                                                 */
/* ------------------------------------------------------------------ */

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  careers_fair: "Careers fair",
  employer_talk: "Employer talk",
  workshop: "Workshop",
  hackathon: "Hackathon",
  networking: "Networking",
  skills_training: "Skills training",
  panel: "Panel",
};

export function isUpcoming(e: CareerEvent, today = todayISO()) {
  return !e.isCancelled && e.date >= today;
}

export function scoreEvent(e: CareerEvent, p: UserProfile, gapCanon: Set<string>, today = todayISO(), lowNetworking = false): ScoredEvent {
  const reasons: string[] = [];
  let score = 0;

  const trackHits = e.tracks.filter((t) => p.careerGoals.includes(t));
  const universal = e.tracks.length >= 8;
  if (trackHits.length && !universal) {
    score += 40 * (p.careerGoals[0] && e.tracks.includes(p.careerGoals[0]) ? 1 : 0.75);
    reasons.push(`relevant to ${TRACK_MAP[trackHits[0]].noun}`);
  } else if (universal) {
    score += 22;
  }

  const matchedGaps = e.skills.filter((s) => gapCanon.has(canonicalSkill(s)));
  if (matchedGaps.length) {
    score += Math.min(30, 18 * matchedGaps.length);
    reasons.push(`helps close your ${matchedGaps.join(" & ")} gap`);
  }

  if (e.category === "careers_fair" || e.category === "employer_talk" || e.category === "networking") {
    score += 8;
    reasons.push("puts you in front of employers");
  }
  if (e.tracks.length >= 8 && /international|visa|working in the uk/i.test(e.name) && !p.visa.skipped && p.visa.needsSponsorship !== "no") {
    score += 20;
    reasons.push("covers post-study work options");
  }
  if (lowNetworking && (e.category === "networking" || e.category === "careers_fair" || e.category === "panel")) {
    score += 10;
    reasons.push("a low-pressure way to start building contacts");
  }
  if (p.university && e.university && p.university.toLowerCase() === e.university.toLowerCase()) score += 6;

  const days = daysBetween(today, e.date);
  score += days <= 7 ? 8 : days <= 14 ? 5 : 2;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const goal = p.careerGoals[0] ? TRACK_MAP[p.careerGoals[0]].noun : "your career goals";
  const explanation =
    reasons.length > 0
      ? `Recommended because it's ${reasons.slice(0, 2).join(" and ")}.${e.benefits.length ? ` Good for: ${e.benefits.slice(0, 2).join(" · ")}.` : ""}`
      : `General event, limited direct link to ${goal}.`;

  return { event: e, score, reasons, explanation, matchedGaps };
}

export function rankEvents(events: CareerEvent[], p: UserProfile, today = todayISO(), activity?: Activity): ScoredEvent[] {
  const gaps = new Set(analyseSkills(p).gaps.map((g) => g.canonical));
  const reachedOut = activity ? Object.values(activity.contacts).filter((c) => c.status !== "want_to_contact" && c.status !== "message_drafted").length : 0;
  const lowNetworking = Boolean(activity) && reachedOut < 2;
  return events
    .filter((e) => isUpcoming(e, today))
    .map((e) => scoreEvent(e, p, gaps, today, lowNetworking))
    .sort((a, b) => b.score - a.score || a.event.date.localeCompare(b.event.date));
}
