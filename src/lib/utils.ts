import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/* ---------- Dates (all ISO yyyy-mm-dd, local) ---------- */

export function todayISO(now = new Date()) {
  return toISO(now);
}

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, days: number) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addMonths(iso: string, months: number) {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

export function daysBetween(fromISO: string, toISODate: string) {
  const ms = parseISO(toISODate).getTime() - parseISO(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

export function monthsBetween(fromISO: string, toISODate: string) {
  return Math.max(0, Math.round((daysBetween(fromISO, toISODate) / 30.44) * 10) / 10);
}

export function clampISO(iso: string, min: string, max: string) {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
}

export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "Not verified";
  return parseISO(iso).toLocaleDateString("en-GB", opts);
}

export function formatMonth(iso: string) {
  return parseISO(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function relativeDays(iso: string, from = todayISO()) {
  const d = daysBetween(from, iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  if (d < 0) return `${Math.abs(d)} days ago`;
  if (d < 14) return `in ${d} days`;
  if (d < 60) return `in ${Math.round(d / 7)} weeks`;
  return `in ${Math.round(d / 30.44)} months`;
}

export function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalise(s: string) {
  return s.trim().toLowerCase();
}

export function splitList(s: string) {
  return s
    .split(/[,\n;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
