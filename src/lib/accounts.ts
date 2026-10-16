/**
 * Accounts on this device.
 * Each account has its own saved plan, so several people (or one person with several plans) can share a browser.
 * Passwords are never stored: only a salted PBKDF2-SHA256 hash.
 * Everything lives in this browser's storage. Moving to real cloud accounts means replacing this file and
 * `stayStorage` in persistence.ts with a hosted auth + database; the rest of the app only uses the functions below.
 */

export interface Account {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
  lastSignInAt?: string;
}

/** What the UI may see about an account (never the hash). */
export type AccountInfo = Pick<Account, "id" | "name" | "email" | "createdAt" | "lastSignInAt">;

export const ACCOUNTS_KEY = "stay-accounts-v1";
export const SESSION_KEY = "stay-session-v1";
export const AUTH_EVENT = "stay-auth-change";
const ITERATIONS = 210_000;
export const MIN_PASSWORD = 8;

export const accountKey = (id: string) => `stay-acct-${id}`;
export const normaliseEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normaliseEmail(e));

export class AuthError extends Error {
  constructor(
    message: string,
    public field?: "name" | "email" | "password" | "confirm" | "current",
  ) {
    super(message);
  }
}

function read<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new AuthError("This browser isn't letting STAY save anything (private mode or storage blocked), so accounts can't be used here.");
  }
}

function notify() {
  try {
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    /* not in a browser */
  }
}

function allAccounts(): Account[] {
  const list = read<Account[]>(ACCOUNTS_KEY);
  return Array.isArray(list) ? list.filter((a) => a && typeof a.id === "string" && typeof a.email === "string") : [];
}

const info = (a: Account): AccountInfo => ({ id: a.id, name: a.name, email: a.email, createdAt: a.createdAt, lastSignInAt: a.lastSignInAt });

export function listAccounts(): AccountInfo[] {
  return allAccounts()
    .map(info)
    .sort((a, b) => (b.lastSignInAt ?? b.createdAt).localeCompare(a.lastSignInAt ?? a.createdAt));
}

export function currentAccountId(): string | null {
  const id = read<string>(SESSION_KEY);
  return id && allAccounts().some((a) => a.id === id) ? id : null;
}

export function currentAccount(): AccountInfo | null {
  const id = currentAccountId();
  const a = id ? allAccounts().find((x) => x.id === id) : null;
  return a ? info(a) : null;
}

function setSession(id: string | null) {
  write(SESSION_KEY, id);
  notify();
}

/* ---------- password hashing ---------- */

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hashPassword(password: string, salt: Uint8Array, iterations: number) {
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtle) throw new AuthError("Accounts need a secure (https) connection in a modern browser.");
  const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return toB64(bits);
}

function sameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  if (!/[A-Za-z]/.test(password) || !/[^A-Za-z]/.test(password)) return "Mix letters with at least one number or symbol";
  return null;
}

/* ---------- actions ---------- */

export async function createAccount(input: { name: string; email: string; password: string; confirm: string }): Promise<AccountInfo> {
  const name = input.name.trim();
  const email = normaliseEmail(input.email);
  if (!name) throw new AuthError("Add your name", "name");
  if (!validEmail(email)) throw new AuthError("Enter a valid email address", "email");
  const accounts = allAccounts();
  if (accounts.some((a) => a.email === email)) throw new AuthError("There's already an account with this email on this device. Sign in instead.", "email");
  const weak = passwordProblem(input.password);
  if (weak) throw new AuthError(weak, "password");
  if (input.password !== input.confirm) throw new AuthError("The passwords don't match", "confirm");

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const now = new Date().toISOString();
  const account: Account = {
    id: crypto.randomUUID ? crypto.randomUUID() : toB64(crypto.getRandomValues(new Uint8Array(12))).replace(/[^a-z0-9]/gi, ""),
    name,
    email,
    salt: toB64(salt),
    hash: await hashPassword(input.password, salt, ITERATIONS),
    iterations: ITERATIONS,
    createdAt: now,
    lastSignInAt: now,
  };
  write(ACCOUNTS_KEY, [...accounts, account]);
  setSession(account.id);
  return info(account);
}

export async function signIn(emailInput: string, password: string): Promise<AccountInfo> {
  const email = normaliseEmail(emailInput);
  if (!validEmail(email)) throw new AuthError("Enter the email you signed up with", "email");
  if (!password) throw new AuthError("Enter your password", "password");
  const accounts = allAccounts();
  const a = accounts.find((x) => x.email === email);
  // Hash even when there's no such account, so both failures take the same time
  const hash = await hashPassword(password, a ? fromB64(a.salt) : new Uint8Array(16), a?.iterations ?? ITERATIONS);
  if (!a || !sameHash(hash, a.hash)) throw new AuthError("That email and password don't match an account on this device", "password");
  const now = new Date().toISOString();
  write(
    ACCOUNTS_KEY,
    accounts.map((x) => (x.id === a.id ? { ...x, lastSignInAt: now } : x)),
  );
  setSession(a.id);
  return info({ ...a, lastSignInAt: now });
}

export function signOutSession() {
  setSession(null);
}

export async function changePassword(current: string, next: string, confirm: string) {
  const id = currentAccountId();
  const accounts = allAccounts();
  const a = accounts.find((x) => x.id === id);
  if (!a) throw new AuthError("You're not signed in");
  const check = await hashPassword(current, fromB64(a.salt), a.iterations);
  if (!sameHash(check, a.hash)) throw new AuthError("Your current password isn't right", "current");
  const weak = passwordProblem(next);
  if (weak) throw new AuthError(weak, "password");
  if (next !== confirm) throw new AuthError("The new passwords don't match", "confirm");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(next, salt, ITERATIONS);
  write(
    ACCOUNTS_KEY,
    accounts.map((x) => (x.id === a.id ? { ...x, salt: toB64(salt), hash, iterations: ITERATIONS } : x)),
  );
  notify();
}

/** Removes the signed-in account and all of its data from this device. */
export function deleteCurrentAccount() {
  const id = currentAccountId();
  if (!id) return;
  write(
    ACCOUNTS_KEY,
    allAccounts().filter((a) => a.id !== id),
  );
  try {
    window.localStorage.removeItem(accountKey(id));
    window.localStorage.removeItem(`stay-onboarding-draft-v2:${id}`);
  } catch {
    /* ignore */
  }
  setSession(null);
}
