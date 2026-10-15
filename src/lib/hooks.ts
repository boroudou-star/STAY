"use client";

import { useEffect, useMemo, useState } from "react";
import { rankEvents } from "@/lib/engine/events";
import { deterministicInsight, insightFacts } from "@/lib/engine/insight";
import { listOpportunitiesSync, rankOpportunities } from "@/lib/engine/opportunities";
import { computeHorizon, computePhases, progress, topPriorities } from "@/lib/engine/roadmap";
import { analyseSkills } from "@/lib/engine/skills";
import { allEventsSync } from "@/lib/services/catalog";
import { useStay } from "@/lib/store";
import type { CareerEvent, UserProfile } from "@/lib/types";
import { todayISO } from "@/lib/utils";

/** All derived views of the user's state, computed deterministically from the store. */
export function useDerived(liveEvents: CareerEvent[] = []) {
  const profile = useStay((s) => s.profile) as UserProfile;
  const tasks = useStay((s) => s.tasks);
  const manualEvents = useStay((s) => s.manualEvents);
  const today = todayISO();

  return useMemo(() => {
    const horizon = computeHorizon(profile, today);
    const phases = computePhases(profile, horizon);
    const opportunities = rankOpportunities(listOpportunitiesSync(today), profile, today);
    const events = rankEvents(allEventsSync(manualEvents, liveEvents, today), profile, today);
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
    };
  }, [profile, tasks, manualEvents, liveEvents, today]);
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
    status: university === "UCL" ? "loading" : "idle",
  });
  useEffect(() => {
    if (university !== "UCL") return;
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
