"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoProfile } from "@/data/demo-profile";
import { buildRoadmap } from "@/lib/services/catalog";
import { stayStorage, STORAGE_KEY } from "@/lib/persistence";
import type { CareerEvent, ContactTracking, Opportunity, Priority, RoadmapTask, TaskCategory, TaskStatus, UserContact, UserProfile } from "@/lib/types";
import { addDays, daysBetween, todayISO, uid } from "@/lib/utils";

export interface ChangeSummary {
  reason: string;
  added: number;
  removed: number;
  keptCompleted: number;
  at: string;
}

export interface InsightCache {
  text: string;
  source: "ai" | "rules";
  key: string;
  at: string;
}

interface StayState {
  profile: UserProfile | null;
  tasks: RoadmapTask[];
  savedOpps: string[];
  appliedOpps: Record<string, string>;
  savedEvents: string[];
  manualEvents: CareerEvent[];
  contacts: Record<string, ContactTracking>;
  userContacts: UserContact[];
  insight: InsightCache | null;
  lastChange: ChangeSummary | null;

  setProfile: (p: UserProfile, reason?: string) => ChangeSummary;
  loadDemo: () => void;
  regenerate: (reason?: string) => ChangeSummary | null;
  resetAll: () => void;
  resetProgress: () => void;

  setTaskStatus: (id: string, status: TaskStatus) => void;
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<RoadmapTask>) => void;
  addCustomTask: (t: { title: string; description?: string; deadline: string; priority: Priority; category?: TaskCategory; skill?: string }) => void;
  deleteTask: (id: string) => void;

  addOpportunityToRoadmap: (o: Opportunity) => boolean;
  addEventToRoadmap: (e: CareerEvent) => boolean;
  addSkillTaskToRoadmap: (t: { key: string; title: string; description: string; skill?: string; days: number; category?: TaskCategory }) => boolean;

  toggleSavedOpp: (id: string) => void;
  toggleApplied: (id: string) => void;
  toggleSavedEvent: (id: string) => void;
  addManualEvent: (e: CareerEvent) => void;
  removeManualEvent: (id: string) => void;

  setContact: (id: string, patch: Partial<ContactTracking>) => void;
  addUserContact: (c: Omit<UserContact, "id" | "createdAt">) => void;
  removeUserContact: (id: string) => void;

  setInsight: (i: InsightCache | null) => void;
}

const initial = {
  profile: null,
  tasks: [] as RoadmapTask[],
  savedOpps: [] as string[],
  appliedOpps: {} as Record<string, string>,
  savedEvents: [] as string[],
  manualEvents: [] as CareerEvent[],
  contacts: {} as Record<string, ContactTracking>,
  userContacts: [] as UserContact[],
  insight: null,
  lastChange: null,
};

export const useStay = create<StayState>()(
  persist(
    (set, get) => ({
      ...initial,

      setProfile: (p, reason = "Profile updated") => {
        const merged = buildRoadmap(p, get().tasks, get().manualEvents);
        const summary = { reason, added: merged.added, removed: merged.removed, keptCompleted: merged.keptCompleted, at: new Date().toISOString() };
        set({ profile: { ...p, updatedAt: new Date().toISOString() }, tasks: merged.tasks, lastChange: summary, insight: null });
        return summary;
      },

      loadDemo: () => {
        const p = demoProfile();
        const merged = buildRoadmap(p, [], []);
        // Pre-complete two foundation tasks so the demo shows real progress
        const tasks = merged.tasks.map((t) =>
          t.templateId === "linkedin-refresh" || t.templateId === "societies-join"
            ? { ...t, status: "completed" as const, completedAt: new Date().toISOString() }
            : t,
        );
        set({ ...initial, profile: p, tasks, lastChange: null });
      },

      regenerate: (reason = "Recommendations refreshed") => {
        const p = get().profile;
        if (!p) return null;
        const merged = buildRoadmap(p, get().tasks, get().manualEvents);
        const summary = { reason, added: merged.added, removed: merged.removed, keptCompleted: merged.keptCompleted, at: new Date().toISOString() };
        set({ tasks: merged.tasks, lastChange: summary, insight: null });
        return summary;
      },

      resetAll: () => set({ ...initial }),

      resetProgress: () =>
        set((s) => ({ tasks: s.tasks.map((t) => ({ ...t, status: "todo" as const, completedAt: undefined })), insight: null })),

      setTaskStatus: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status, completedAt: status === "completed" ? new Date().toISOString() : undefined } : t)),
          insight: null,
        })),

      toggleTask: (id) => {
        const t = get().tasks.find((x) => x.id === id);
        if (!t) return;
        get().setTaskStatus(id, t.status === "completed" ? "todo" : "completed");
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, deadlineEditedByUser: patch.deadline ? true : t.deadlineEditedByUser } : t)),
        })),

      addCustomTask: (t) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id: uid("t"),
              title: t.title,
              description: t.description ?? "",
              deadline: t.deadline,
              priority: t.priority,
              category: t.category ?? "custom",
              skill: t.skill,
              status: "todo",
              origin: "custom",
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addOpportunityToRoadmap: (o) => {
        const existing = get().tasks.find((t) => t.sourceOpportunityId === o.id && t.origin !== "engine");
        if (existing) return false;
        const today = todayISO();
        const deadline = o.deadline ? (daysBetween(today, o.deadline) > 3 ? addDays(o.deadline, -2) : o.deadline) : addDays(today, 14);
        set((s) => ({
          tasks: [
            ...s.tasks.filter((t) => !(t.origin === "engine" && t.sourceOpportunityId === o.id && t.status === "todo")),
            {
              id: uid("t"),
              title: `Apply: ${o.title} — ${o.company}`,
              description: o.deadline
                ? `Closing date ${o.isDemo ? "(example) " : ""}${o.deadline}. Tailor your CV to: ${o.skillsRequired.join(", ")}.`
                : `Deadline not verified — check the listing. Tailor your CV to: ${o.skillsRequired.join(", ")}.`,
              deadline,
              priority: o.deadline && daysBetween(today, o.deadline) <= 14 ? "urgent" : "high",
              category: "applications",
              status: "todo",
              origin: "opportunity",
              sourceOpportunityId: o.id,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return true;
      },

      addEventToRoadmap: (e) => {
        const existing = get().tasks.find((t) => t.sourceEventId === e.id && t.origin !== "engine");
        if (existing) return false;
        set((s) => ({
          tasks: [
            ...s.tasks.filter((t) => !(t.origin === "engine" && t.sourceEventId === e.id && t.status === "todo")),
            {
              id: uid("t"),
              title: `Attend: ${e.name}`,
              description: `${e.organiser} · ${e.location}${e.startTime ? ` · ${e.startTime}` : ""}. ${e.benefits[0] ?? ""}`.trim(),
              deadline: e.date,
              priority: "medium",
              category: "events",
              skill: e.skills[0],
              status: "todo",
              origin: "event",
              sourceEventId: e.id,
              createdAt: new Date().toISOString(),
            },
          ],
          savedEvents: s.savedEvents.includes(e.id) ? s.savedEvents : [...s.savedEvents, e.id],
        }));
        return true;
      },

      addSkillTaskToRoadmap: ({ key, title, description, skill, days, category = "projects" }) => {
        if (get().tasks.some((t) => t.templateId === `user-${key}`)) return false;
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id: uid("t"),
              templateId: `user-${key}`,
              title,
              description,
              deadline: addDays(todayISO(), days),
              priority: "high",
              category,
              skill,
              status: "todo",
              origin: "skill",
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return true;
      },

      toggleSavedOpp: (id) => set((s) => ({ savedOpps: s.savedOpps.includes(id) ? s.savedOpps.filter((x) => x !== id) : [...s.savedOpps, id] })),
      toggleApplied: (id) =>
        set((s) => {
          const next = { ...s.appliedOpps };
          if (next[id]) delete next[id];
          else next[id] = todayISO();
          return { appliedOpps: next };
        }),
      toggleSavedEvent: (id) => set((s) => ({ savedEvents: s.savedEvents.includes(id) ? s.savedEvents.filter((x) => x !== id) : [...s.savedEvents, id] })),
      addManualEvent: (e) => set((s) => ({ manualEvents: [e, ...s.manualEvents.filter((x) => x.id !== e.id)] })),
      removeManualEvent: (id) => set((s) => ({ manualEvents: s.manualEvents.filter((x) => x.id !== id) })),

      setContact: (id, patch) =>
        set((s) => ({
          contacts: {
            ...s.contacts,
            [id]: { status: "want_to_contact", ...s.contacts[id], ...patch, updatedAt: new Date().toISOString() },
          },
        })),
      addUserContact: (c) => set((s) => ({ userContacts: [...s.userContacts, { ...c, id: uid("uc"), createdAt: new Date().toISOString() }] })),
      removeUserContact: (id) => set((s) => ({ userContacts: s.userContacts.filter((c) => c.id !== id) })),

      setInsight: (i) => set({ insight: i }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => stayStorage),
      version: 1,
    },
  ),
);

/** True once persisted state has loaded in the browser (avoids SSR/hydration mismatches). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useStay.persist.onFinishHydration(() => setHydrated(true));
    if (useStay.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
