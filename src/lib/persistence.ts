import type { StateStorage } from "zustand/middleware";

/**
 * Data-access abstraction.
 * MVP: browser localStorage (no account needed, survives refresh).
 * Later: swap `stayStorage` for a Supabase-backed StateStorage that reads/writes
 * a `user_state` row keyed by the authenticated user id — nothing else needs to change.
 */
export const localStorageAdapter: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* storage full or blocked — app keeps working in memory */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const stayStorage: StateStorage = localStorageAdapter;
export const STORAGE_KEY = "stay-state-v1";
