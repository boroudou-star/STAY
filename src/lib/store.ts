"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoProfile } from "@/data/demo-profile";
import { activityStats, AUTO_COMPLETE_RULES } from "@/lib/engine/roadmap";
import { canonicalSkill } from "@/data/careers";
import { buildRoadmap } from "@/lib/services/catalog";
import { stayStorage, STORAGE_KEY } from "@/lib/persistence";
import type { Activity, CareerEvent, ContactTracking, FeedItem, InsightEntry, InsightPrefs, MockSession, ReadingNote, StoryEntry, Opportunity, Priority, RoadmapTask, TaskCategory, TaskStatus, UserContact, UserProfile } from "@/lib/types";
import { addDays, daysBetween, todayISO, uid } from "@/lib/utils";

export interface ChangeSummary {
  reason: string;
  added: number;
  removed: number;
  keptCompleted: number;
  at: string;
}

/** What changed as a side-effect of an action — the UI turns this into toasts. */
export interface Effects {
  autoCompleted: { title: string; because: string }[];
  addedSkill?: string;
  removedSkill?: string;
  newTasks: string[];
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
  /** Live opportunities fetched from a connector, kept so saved/applied items still resolve */
  liveOpps: Opportunity[];
  /** Skills added to the profile by completing a skill task (taskId → skill), so un-ticking can undo it */
  skillsFromTasks: Record<string, string>;
  /** Industry insights */
  insightPrefs: InsightPrefs | null;
  journal: InsightEntry[];
  readingNotes: ReadingNote[];
  /** Interview prep */
  mockSessions: MockSession[];
  stories: StoryEntry[];
  /** Company to pre-fill in Interview Prep (set from Insights / Opportunities) */
  interviewCompany: string;
  setInterviewCompany: (c: string) => void;

  setInsightPrefs: (patch: Partial<InsightPrefs>) => void;
  startReadingNote: (item: FeedItem) => string;
  updateReadingNote: (id: string, patch: Partial<Pick<ReadingNote, "sections" | "reflectedEntryId">>) => void;
  deleteReadingNote: (id: string) => void;
  addInsightEntry: (e: Omit<InsightEntry, "id" | "createdAt">) => { id: string; effects: Effects };
  updateInsightEntry: (id: string, patch: Partial<InsightEntry>) => void;
  deleteInsightEntry: (id: string) => void;
  saveMockSession: (s: MockSession) => Effects;
  deleteMockSession: (id: string) => void;
  upsertStory: (s: StoryEntry) => void;
  deleteStory: (id: string) => void;

  setProfile: (p: UserProfile, reason?: string) => ChangeSummary;
  loadDemo: () => void;
  regenerate: (reason?: string) => ChangeSummary | null;
  resetAll: () => void;
  resetProgress: () => void;

  setTaskStatus: (id: string, status: TaskStatus) => Effects;
  toggleTask: (id: string) => Effects;
  updateTask: (id: string, patch: Partial<RoadmapTask>) => void;
  addCustomTask: (t: { title: string; description?: string; deadline: string; priority: Priority; category?: TaskCategory; skill?: string }) => void;
  deleteTask: (id: string) => void;

  addOpportunityToRoadmap: (o: Opportunity) => boolean;
  addEventToRoadmap: (e: CareerEvent) => boolean;
  addSkillTaskToRoadmap: (t: { key: string; title: string; description: string; skill?: string; days: number; category?: TaskCategory }) => boolean;

  toggleSavedOpp: (id: string) => Effects;
  toggleApplied: (id: string) => Effects;
  toggleSavedEvent: (id: string) => void;
  addManualEvent: (e: CareerEvent) => void;
  removeManualEvent: (id: string) => void;

  setContact: (id: string, patch: Partial<ContactTracking>) => Effects;
  setLiveOpps: (opps: Opportunity[]) => void;
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
  liveOpps: [] as Opportunity[],
  skillsFromTasks: {} as Record<string, string>,
  insightPrefs: null as InsightPrefs | null,
  journal: [] as InsightEntry[],
  readingNotes: [] as ReadingNote[],
  mockSessions: [] as MockSession[],
  stories: [] as StoryEntry[],
  interviewCompany: "",
};

type Snapshot = Pick<StayState, "savedOpps" | "appliedOpps" | "contacts" | "tasks"> & Partial<Pick<StayState, "journal" | "mockSessions">>;

export function activityOf(s: Snapshot): Activity {
  return {
    savedOpps: s.savedOpps,
    appliedOpps: s.appliedOpps,
    contacts: s.contacts,
    completedTemplateIds: s.tasks.filter((t) => t.status === "completed" && t.templateId).map((t) => t.templateId!),
    insightEntries: s.journal?.filter((e) => !e.parentId).length ?? 0,
    mockInterviews: s.mockSessions?.filter((m) => m.completedAt).length ?? 0,
  };
}

const NO_EFFECTS: Effects = { autoCompleted: [], newTasks: [] };

/** Follow-up steps are the most meaningful "next up" — show them first. */
const FOLLOW_UPS = ["cv-review", "project-showcase", "skills-prove-it", "applied-followup", "applied-company-research", "coffee-follow-up", "coffee-prep-questions"];
function newTaskTitles(tasks: RoadmapTask[], prevIds: Set<string>) {
  return tasks
    .filter((t) => !prevIds.has(t.id))
    .sort((a, b) => Number(FOLLOW_UPS.includes(b.templateId ?? "")) - Number(FOLLOW_UPS.includes(a.templateId ?? "")))
    .map((t) => t.title);
}

export const useStay = create<StayState>()(
  persist(
    (set, get) => ({
      ...initial,

      setProfile: (p, reason = "Profile updated") => {
        const merged = buildRoadmap(p, get().tasks, get().manualEvents, activityOf(get()), get().liveOpps);
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
        const merged = buildRoadmap(p, get().tasks, get().manualEvents, activityOf(get()), get().liveOpps);
        const summary = { reason, added: merged.added, removed: merged.removed, keptCompleted: merged.keptCompleted, at: new Date().toISOString() };
        set({ tasks: merged.tasks, lastChange: summary, insight: null });
        return summary;
      },

      resetAll: () => set({ ...initial }),

      resetProgress: () =>
        set((s) => ({ tasks: s.tasks.map((t) => ({ ...t, status: "todo" as const, completedAt: undefined })), insight: null })),

      setTaskStatus: (id, status) => {
        const before = get();
        const task = before.tasks.find((t) => t.id === id);
        if (!task || task.status === status) return NO_EFFECTS;
        const effects: Effects = { autoCompleted: [], newTasks: [] };
        let profile = before.profile;
        const skillsFromTasks = { ...before.skillsFromTasks };

        // Completing a skill-building task counts as evidence for that skill (you ticked it), un-ticking undoes it.
        const isSkillTask = task.category === "skills" && task.skill && (task.templateId?.startsWith("gap-") || task.templateId?.startsWith("user-skill-"));
        if (profile && isSkillTask) {
          const skill = task.skill!;
          const has = [...profile.technicalSkills, ...profile.professionalSkills].some((x) => canonicalSkill(x) === canonicalSkill(skill));
          if (status === "completed" && !has) {
            profile = { ...profile, technicalSkills: [...profile.technicalSkills, skill] };
            skillsFromTasks[id] = skill;
            effects.addedSkill = skill;
          } else if (status !== "completed" && skillsFromTasks[id]) {
            const added = skillsFromTasks[id];
            profile = { ...profile, technicalSkills: profile.technicalSkills.filter((x) => x !== added) };
            delete skillsFromTasks[id];
            effects.removedSkill = added;
          }
        }

        const tasks = before.tasks.map((t) => (t.id === id ? { ...t, status, completedAt: status === "completed" ? new Date().toISOString() : undefined } : t));
        set({ tasks, profile, skillsFromTasks, insight: null });

        // Rebuild so follow-up actions appear (and skills-based scores update); completed work is always kept.
        if (profile) {
          const prevIds = new Set(get().tasks.map((t) => t.id));
          const merged = buildRoadmap(get().profile!, get().tasks, get().manualEvents, activityOf(get()), get().liveOpps);
          effects.newTasks = newTaskTitles(merged.tasks, prevIds);
          set({
            tasks: merged.tasks,
            lastChange: merged.added || merged.removed ? { reason: "Plan updated after progress", added: merged.added, removed: merged.removed, keptCompleted: merged.keptCompleted, at: new Date().toISOString() } : get().lastChange,
          });
        }
        return effects;
      },

      toggleTask: (id) => {
        const t = get().tasks.find((x) => x.id === id);
        if (!t) return NO_EFFECTS;
        return get().setTaskStatus(id, t.status === "completed" ? "todo" : "completed");
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
              title: `Apply: ${o.title} at ${o.company}`,
              description: o.deadline
                ? `Closing date ${o.isDemo ? "(example) " : ""}${o.deadline}. Tailor your CV to: ${o.skillsRequired.join(", ")}.`
                : `Deadline not verified. Check the listing. Tailor your CV to: ${o.skillsRequired.join(", ")}.`,
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

      toggleSavedOpp: (id) => {
        set((s) => ({ savedOpps: s.savedOpps.includes(id) ? s.savedOpps.filter((x) => x !== id) : [...s.savedOpps, id] }));
        return autoSync(get, set);
      },
      toggleApplied: (id) => {
        const next = { ...get().appliedOpps };
        if (next[id]) delete next[id];
        else next[id] = todayISO();
        set({ appliedOpps: next });
        return autoSync(get, set);
      },
      toggleSavedEvent: (id) => set((s) => ({ savedEvents: s.savedEvents.includes(id) ? s.savedEvents.filter((x) => x !== id) : [...s.savedEvents, id] })),
      addManualEvent: (e) => set((s) => ({ manualEvents: [e, ...s.manualEvents.filter((x) => x.id !== e.id)] })),
      removeManualEvent: (id) => set((s) => ({ manualEvents: s.manualEvents.filter((x) => x.id !== id) })),

      setContact: (id, patch) => {
        set((s) => ({
          contacts: {
            ...s.contacts,
            [id]: { ...(s.contacts[id] ?? { status: "want_to_contact" as const }), ...patch, updatedAt: new Date().toISOString() },
          },
        }));
        return patch.status ? autoSync(get, set) : NO_EFFECTS;
      },
      setLiveOpps: (opps) => set({ liveOpps: opps }),
      addUserContact: (c) => set((s) => ({ userContacts: [...s.userContacts, { ...c, id: uid("uc"), createdAt: new Date().toISOString() }] })),
      removeUserContact: (id) => set((s) => ({ userContacts: s.userContacts.filter((c) => c.id !== id) })),

      setInsight: (i) => set({ insight: i }),

      setInterviewCompany: (c) => set({ interviewCompany: c }),
      startReadingNote: (item) => {
        const existing = get().readingNotes.find((n) => n.item.id === item.id || (item.url && n.item.url === item.url));
        if (existing) return existing.id;
        const id = uid("note");
        const now = new Date().toISOString();
        const note: ReadingNote = {
          id,
          item: { id: item.id, title: item.title, url: item.url, source: item.source, kind: item.kind, area: item.area, company: item.company },
          sections: {},
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ readingNotes: [note, ...s.readingNotes] }));
        return id;
      },
      updateReadingNote: (id, patch) =>
        set((s) => ({
          readingNotes: s.readingNotes.map((n) =>
            n.id === id ? { ...n, ...patch, sections: { ...n.sections, ...(patch.sections ?? {}) }, updatedAt: new Date().toISOString() } : n,
          ),
        })),
      deleteReadingNote: (id) => set((s) => ({ readingNotes: s.readingNotes.filter((n) => n.id !== id) })),
      setInsightPrefs: (patch) =>
        set((s) => ({ insightPrefs: { areas: [], companies: [], planDone: [], ...(s.insightPrefs ?? {}), ...patch } })),
      addInsightEntry: (e) => {
        const id = uid("ins");
        set((s) => ({ journal: [{ ...e, id, createdAt: new Date().toISOString() }, ...s.journal] }));
        return { id, effects: autoSync(get, set) };
      },
      updateInsightEntry: (id, patch) => set((s) => ({ journal: s.journal.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteInsightEntry: (id) => set((s) => ({ journal: s.journal.filter((e) => e.id !== id && e.parentId !== id) })),
      saveMockSession: (m) => {
        set((s) => ({ mockSessions: [m, ...s.mockSessions.filter((x) => x.id !== m.id)] }));
        return m.completedAt ? autoSync(get, set) : NO_EFFECTS;
      },
      deleteMockSession: (id) => set((s) => ({ mockSessions: s.mockSessions.filter((m) => m.id !== id) })),
      upsertStory: (st) => set((s) => ({ stories: [st, ...s.stories.filter((x) => x.id !== st.id)] })),
      deleteStory: (id) => set((s) => ({ stories: s.stories.filter((x) => x.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => stayStorage),
      version: 1,
    },
  ),
);

/**
 * Linked progress: activity elsewhere in the app (coffee chats, applications) completes matching
 * roadmap tasks, then the roadmap is rebuilt so the next useful actions appear.
 */
function autoSync(get: () => StayState, set: (p: Partial<StayState>) => void): Effects {
  const s = get();
  if (!s.profile) return NO_EFFECTS;
  const st = activityStats(activityOf(s));
  const autoCompleted: Effects["autoCompleted"] = [];
  let tasks = s.tasks.map((t) => {
    const rule = AUTO_COMPLETE_RULES.find((r) => r.templateId === t.templateId);
    if (rule && t.status !== "completed" && rule.met(st)) {
      autoCompleted.push({ title: t.title, because: rule.because });
      return { ...t, status: "completed" as const, completedAt: new Date().toISOString() };
    }
    return t;
  });
  const prevIds = new Set(tasks.map((t) => t.id));
  const merged = buildRoadmap(s.profile, tasks, s.manualEvents, activityOf({ ...s, tasks }), s.liveOpps);
  tasks = merged.tasks;
  set({ tasks, insight: null });
  return { autoCompleted, newTasks: newTaskTitles(tasks, prevIds) };
}

/** True once persisted state has loaded in the browser (avoids SSR/hydration mismatches). */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useStay.persist.onFinishHydration(cb),
    () => useStay.persist.hasHydrated(),
    () => false,
  );
}
