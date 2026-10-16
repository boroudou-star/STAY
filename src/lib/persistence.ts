import { accountKey, currentAccountId } from "@/lib/accounts";
import type { StateStorage } from "zustand/middleware";

/**
 * Data-access abstraction.
 * MVP: browser localStorage, one space per account on this device (see accounts.ts).
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
 * Separate spaces on the device: each account's own data, and the fictional demo.
 * "mine" is the signed-in account's space. Trying the demo never touches anyone's own data.
 */
export type Slot = "mine" | "demo";
/** Where a plan was kept before accounts existed. Offered to the first account created on this device. */
export const STORAGE_KEY = "stay-state-v1";
export const DEMO_KEY = "stay-demo-v1";
/** Used while nobody is signed in: holds nothing worth keeping. */
export const SIGNED_OUT_KEY = "stay-signed-out-v1";
const SLOT_KEY = "stay-active-slot";

export function keyFor(slot: Slot) {
  if (slot === "demo") return DEMO_KEY;
  const id = currentAccountId();
  return id ? accountKey(id) : SIGNED_OUT_KEY;
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

function profileAt(key: string): { name: string; isDemo: boolean } | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    const profile = raw ? (JSON.parse(raw) as { state?: { profile?: { name?: string; isDemo?: boolean } | null } }).state?.profile : null;
    return profile ? { name: profile.name ?? "", isDemo: Boolean(profile.isDemo) } : null;
  } catch {
    return null;
  }
}

/** A peek at the profile saved in a space, without loading it. */
export function slotProfile(slot: Slot) {
  return profileAt(keyFor(slot));
}

/** A plan made before accounts existed, still waiting to be attached to an account. */
export function legacyProfile() {
  const p = profileAt(STORAGE_KEY);
  return p && !p.isDemo ? p : null;
}

/** Moves the pre-accounts plan into an account's space. */
export function claimLegacyData(accountId: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    window.localStorage.setItem(accountKey(accountId), raw);
    window.localStorage.removeItem(STORAGE_KEY);
    const draft = window.localStorage.getItem("stay-onboarding-draft-v2");
    if (draft) {
      window.localStorage.setItem(`stay-onboarding-draft-v2:${accountId}`, draft);
      window.localStorage.removeItem("stay-onboarding-draft-v2");
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Before demo and personal data were separated, loading the demo replaced the user's data in STORAGE_KEY.
 * If that key holds the demo, move it to the demo space.
 */
export function migrateLegacyDemo() {
  try {
    if (typeof window === "undefined") return;
    if (!profileAt(STORAGE_KEY)?.isDemo) return;
    const raw = window.localStorage.getItem(STORAGE_KEY)!;
    if (!window.localStorage.getItem(DEMO_KEY)) window.localStorage.setItem(DEMO_KEY, raw);
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveSlot("demo");
  } catch {
    /* ignore */
  }
}
