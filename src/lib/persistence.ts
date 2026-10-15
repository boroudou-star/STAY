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
      /* storage full or blocked, app keeps working in memory */
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

/**
 * Two separate spaces on the device: the user's own data and the fictional demo.
 * Trying the demo never touches the user's own data, and the other way round.
 */
export type Slot = "mine" | "demo";
export const STORAGE_KEY = "stay-state-v1"; // the user's own data (kept for existing users)
export const DEMO_KEY = "stay-demo-v1";
const SLOT_KEY = "stay-active-slot";

export function keyFor(slot: Slot) {
  return slot === "demo" ? DEMO_KEY : STORAGE_KEY;
}

export function activeSlot(): Slot {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(SLOT_KEY) === "demo" ? "demo" : "mine";
  } catch {
    return "mine";
  }
}

export function setActiveSlot(slot: Slot) {
  try {
    window.localStorage.setItem(SLOT_KEY, slot);
  } catch {
    /* ignore */
  }
}

/** A peek at the profile saved in a space, without loading it. */
export function slotProfile(slot: Slot): { name: string; isDemo: boolean } | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(keyFor(slot));
    const profile = raw ? (JSON.parse(raw) as { state?: { profile?: { name?: string; isDemo?: boolean } | null } }).state?.profile : null;
    return profile ? { name: profile.name ?? "", isDemo: Boolean(profile.isDemo) } : null;
  } catch {
    return null;
  }
}

/**
 * Before demo and personal data were separated, loading the demo replaced the user's data in STORAGE_KEY.
 * If that key holds the demo, move it to the demo space so the user's own space starts clean.
 */
export function migrateLegacyDemo() {
  try {
    if (typeof window === "undefined") return;
    const mine = slotProfile("mine");
    if (!mine?.isDemo) return;
    const raw = window.localStorage.getItem(STORAGE_KEY)!;
    if (!window.localStorage.getItem(DEMO_KEY)) window.localStorage.setItem(DEMO_KEY, raw);
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveSlot("demo");
  } catch {
    /* ignore */
  }
}
