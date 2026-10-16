import { beforeEach, describe, expect, it } from "vitest";

// A minimal browser: localStorage + window events (crypto.subtle comes from Node)
const store = new Map<string, string>();
const localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};
Object.assign(globalThis, { window: Object.assign(new EventTarget(), { localStorage }) });

const acc = await import("./accounts");
const persistence = await import("./persistence");

const alex = { name: "Alex Chen", email: " Alex@Example.com ", password: "correct-horse1", confirm: "correct-horse1" };

describe("accounts on this device", () => {
  beforeEach(() => store.clear());

  it("creates an account, signs in and stores no plain-text password", async () => {
    const a = await acc.createAccount(alex);
    expect(a.email).toBe("alex@example.com");
    expect(acc.currentAccountId()).toBe(a.id);
    expect(store.get(acc.ACCOUNTS_KEY)).not.toContain("correct-horse1");
    expect(a).not.toHaveProperty("hash");

    acc.signOutSession();
    expect(acc.currentAccountId()).toBeNull();
    await expect(acc.signIn("alex@example.com", "wrong-pass1")).rejects.toThrow(/don't match/);
    const back = await acc.signIn("ALEX@example.com", "correct-horse1");
    expect(back.id).toBe(a.id);
  });

  it("rejects duplicates, weak passwords and mismatched confirmation", async () => {
    await acc.createAccount(alex);
    acc.signOutSession();
    await expect(acc.createAccount(alex)).rejects.toMatchObject({ field: "email" });
    await expect(acc.createAccount({ ...alex, email: "b@x.com", password: "short", confirm: "short" })).rejects.toMatchObject({ field: "password" });
    await expect(acc.createAccount({ ...alex, email: "b@x.com", password: "lettersonly", confirm: "lettersonly" })).rejects.toMatchObject({ field: "password" });
    await expect(acc.createAccount({ ...alex, email: "b@x.com", confirm: "different1" })).rejects.toMatchObject({ field: "confirm" });
    await expect(acc.createAccount({ ...alex, email: "not-an-email" })).rejects.toMatchObject({ field: "email" });
  });

  it("keeps each account's plan in its own space, and signed out sees none", async () => {
    const a = await acc.createAccount(alex);
    expect(persistence.keyFor("mine")).toBe(acc.accountKey(a.id));
    acc.signOutSession();
    const b = await acc.createAccount({ ...alex, name: "Bea", email: "bea@example.com" });
    expect(persistence.keyFor("mine")).toBe(acc.accountKey(b.id));
    expect(persistence.keyFor("demo")).toBe(persistence.DEMO_KEY);
    acc.signOutSession();
    expect(persistence.keyFor("mine")).toBe(persistence.SIGNED_OUT_KEY);
    expect(acc.listAccounts().map((x) => x.name).sort()).toEqual(["Alex Chen", "Bea"]);
  });

  it("changes the password and deletes the account with its data", async () => {
    const a = await acc.createAccount(alex);
    await expect(acc.changePassword("nope-nope1", "new-pass-22", "new-pass-22")).rejects.toMatchObject({ field: "current" });
    await acc.changePassword("correct-horse1", "new-pass-22", "new-pass-22");
    acc.signOutSession();
    await expect(acc.signIn(alex.email, "correct-horse1")).rejects.toThrow();
    await acc.signIn(alex.email, "new-pass-22");

    store.set(acc.accountKey(a.id), JSON.stringify({ state: { profile: { name: "Alex" } } }));
    acc.deleteCurrentAccount();
    expect(store.has(acc.accountKey(a.id))).toBe(false);
    expect(acc.listAccounts()).toHaveLength(0);
    expect(acc.currentAccountId()).toBeNull();
  });

  it("moves a plan made before accounts existed into a new account", async () => {
    store.set(persistence.STORAGE_KEY, JSON.stringify({ state: { profile: { name: "Old Me", isDemo: false } } }));
    expect(persistence.legacyProfile()).toEqual({ name: "Old Me", isDemo: false });
    const a = await acc.createAccount(alex);
    expect(persistence.claimLegacyData(a.id)).toBe(true);
    expect(persistence.legacyProfile()).toBeNull();
    expect(persistence.slotProfile("mine")?.name).toBe("Old Me");
  });
});
