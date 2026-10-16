"use client";

import { useEffect, useMemo, useState } from "react";
import { rankEvents } from "@/lib/engine/events";
import { deterministicInsight, insightFacts } from "@/lib/engine/insight";
import { listOpportunitiesSync, rankOpportunities } from "@/lib/engine/opportunities";
import { computeHorizon, computePhases, progress, topPriorities } from "@/lib/engine/roadmap";
import { analyseSkills } from "@/lib/engine/skills";
import { allEventsSync, isUCL } from "@/lib/services/catalog";
import { activityOf, useStay } from "@/lib/store";
import type { CareerEvent, UserProfile } from "@/lib/types";
import { todayISO } from "@/lib/utils";

/** All derived views of the user's state, computed deterministically from the store. */
export function useDerived(liveEvents: CareerEvent[] = []) {
  const profile = useStay((s) => s.profile) as UserProfile;
  const tasks = useStay((s) => s.tasks);
  const manualEvents = useStay((s) => s.manualEvents);
  const liveOpps = useStay((s) => s.liveOpps);
  const savedOpps = useStay((s) => s.savedOpps);
  const appliedOpps = useStay((s) => s.appliedOpps);
  const contacts = useStay((s) => s.contacts);
  const today = todayISO();

  return useMemo(() => {
    const horizon = computeHorizon(profile, today);
    const phases = computePhases(profile, horizon);
    const activity = activityOf({ savedOpps, appliedOpps, contacts, tasks, profile });
    const opportunities = rankOpportunities([...liveOpps, ...listOpportunitiesSync(today)], profile, today);
    const events = rankEvents(allEventsSync(manualEvents, liveEvents, today, { isDemo: profile.isDemo }), profile, today, activity);
    const skills = analyseSkills(profile);
    return {
      profile,
      tasks,
      today,
      horizon,
      phases,
      opportunities,
      events,
      skills,
      progress: progress(tasks),
      priorities: topPriorities(tasks, 3, today),
      activity,
    };
  }, [profile, tasks, manualEvents, liveEvents, liveOpps, savedOpps, appliedOpps, contacts, today]);
}

/** AI insight with deterministic fallback; cached in the store per input facts. */
export function useInsight(d: ReturnType<typeof useDerived>) {
  const insight = useStay((s) => s.insight);
  const setInsight = useStay((s) => s.setInsight);
  const facts = useMemo(
    () => insightFacts({ profile: d.profile, tasks: d.tasks, opportunities: d.opportunities, events: d.events, today: d.today }),
    [d.profile, d.tasks, d.opportunities, d.events, d.today],
  );
  const key = JSON.stringify(facts);
  const fallback = useMemo(
    () => deterministicInsight({ profile: d.profile, tasks: d.tasks, opportunities: d.opportunities, events: d.events, today: d.today }),
    [d.profile, d.tasks, d.opportunities, d.events, d.today],
  );
  useEffect(() => {
    if (insight?.key === key) return;
    let cancelled = false;
    fetch("/api/ai/insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts, fallback }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { text?: string; source?: "ai" | "rules" } | null) => {
        if (cancelled) return;
        setInsight({ text: data?.text || fallback, source: data?.source ?? "rules", key, at: new Date().toISOString() });
      })
      .catch(() => !cancelled && setInsight({ text: fallback, source: "rules", key, at: new Date().toISOString() }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = insight?.key === key ? insight : null;
  return { text: current?.text ?? fallback, source: current?.source ?? "rules", loading: !current };
}

/** Live events from public sources (server-cached). Empty array if unavailable. */
export function useLiveEvents(university: string) {
  const [state, setState] = useState<{ events: CareerEvent[]; status: "idle" | "loading" | "ok" | "unavailable"; fetchedAt?: string; message?: string }>({
    events: [],
    status: isUCL(university) ? "loading" : "idle",
  });
  useEffect(() => {
    if (!isUCL(university)) return;
    let cancelled = false;
    fetch("/api/events/live?source=ucl-careers")
      .then((r) => r.json())
      .then((data: { events?: CareerEvent[]; fetchedAt?: string; message?: string }) => {
        if (cancelled) return;
        setState({ events: data.events ?? [], status: data.events?.length ? "ok" : "unavailable", fetchedAt: data.fetchedAt, message: data.message });
      })
      .catch(() => !cancelled && setState({ events: [], status: "unavailable", message: "Couldn't reach the live source" }));
    return () => {
      cancelled = true;
    };
  }, [university]);
  return state;
}

/** Live roles from the jobs connector (Adzuna). Stores results so saved/applied roles keep resolving. */
export function useLiveOpportunities(track: string, where: string) {
  const setLiveOpps = useStay((s) => s.setLiveOpps);
  const [state, setState] = useState<{ status: "loading" | "ok" | "off" | "error"; count: number; message?: string }>({ status: "loading", count: 0 });
  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({ track, where });
    fetch(`/api/opportunities/live?${q}`)
      .then((r) => r.json())
      .then((data: { configured?: boolean; opportunities?: import("@/lib/types").Opportunity[]; message?: string }) => {
        if (cancelled) return;
        if (!data.configured) return setState({ status: "off", count: 0 });
        const opps = data.opportunities ?? [];
        if (opps.length) setLiveOpps(opps);
        setState({ status: opps.length ? "ok" : "error", count: opps.length, message: data.message });
      })
      .catch(() => !cancelled && setState({ status: "error", count: 0, message: "Couldn't reach the jobs API" }));
    return () => {
      cancelled = true;
    };
  }, [track, where, setLiveOpps]);
  return state;
}

/** Live news + podcasts for the user's areas and target companies (server-cached). */
export function useInsightFeed(areas: string[], companies: string[]) {
  const key = `${areas.join(",")}|${companies.join(",")}`;
  const [state, setState] = useState<{ key: string; items: import("@/lib/types").FeedItem[]; status: "loading" | "ok" | "unavailable"; fetchedAt?: string }>({
    key: "",
    items: [],
    status: "loading",
  });
  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({ areas: areas.join(","), companies: companies.join(",") });
    fetch(`/api/insights/feed?${q}`)
      .then((r) => r.json())
      .then((d: { items?: import("@/lib/types").FeedItem[]; fetchedAt?: string }) => {
        if (cancelled) return;
        setState({ key, items: d.items ?? [], status: d.items?.length ? "ok" : "unavailable", fetchedAt: d.fetchedAt });
      })
      .catch(() => !cancelled && setState({ key, items: [], status: "unavailable" }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { ...state, items: [], status: "loading" as const };
}
