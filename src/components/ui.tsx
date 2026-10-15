"use client";

import { X } from "lucide-react";
import Link from "next/link";
import React, { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */

type Variant = "primary" | "secondary" | "ghost" | "teal" | "danger" | "lime";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90 shadow-[var(--shadow-soft)]",
  secondary: "bg-card text-ink border border-line hover:border-ink/25 hover:bg-paper",
  ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
  teal: "bg-teal text-white hover:bg-teal/90 shadow-[var(--shadow-soft)]",
  danger: "bg-card text-red-600 border border-red-200 hover:bg-red-50",
  lime: "bg-lime text-ink hover:brightness-95 shadow-[var(--shadow-soft)]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-2xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/50 whitespace-nowrap",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ---------------- Card ---------------- */

export function Card({ className, children, interactive }: { className?: string; children: ReactNode; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line bg-card shadow-[var(--shadow-soft)]",
        interactive && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- Badges & chips ---------------- */

type Tone = "neutral" | "teal" | "blue" | "sun" | "violet" | "lime" | "ink" | "red";
const tones: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2 border-line",
  teal: "bg-teal-soft text-teal border-teal/15",
  blue: "bg-blue-soft text-blue border-blue/15",
  sun: "bg-sun-soft text-[#c2502f] border-sun/20",
  violet: "bg-violet-soft text-violet border-violet/15",
  lime: "bg-lime/50 text-ink border-lime",
  ink: "bg-ink text-white border-ink",
  red: "bg-red-50 text-red-600 border-red-200",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5", tones[tone], className)}>{children}</span>;
}

export function DemoBadge({ className, label = "Demo data" }: { className?: string; label?: string }) {
  return (
    <span
      title="Illustrative example, not a real, verified listing"
      className={cn("inline-flex items-center gap-1 rounded-full border border-dashed border-ink/25 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted", className)}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-muted/60" />
      {label}
    </span>
  );
}

export function LiveBadge({ className, label = "Live source" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-teal/25 bg-teal-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
      {label}
    </span>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-all",
        active ? "border-ink bg-ink text-white shadow-[var(--shadow-soft)]" : "border-line bg-card text-ink-2 hover:border-ink/30 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Progress ---------------- */

export function ProgressBar({ value, className, tone = "teal" }: { value: number; className?: string; tone?: "teal" | "blue" | "sun" | "lime" }) {
  const color = { teal: "bg-teal", blue: "bg-blue", sun: "bg-sun", lime: "bg-lime" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-paper-2", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all duration-700 ease-out", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 112, stroke = 10, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--paper-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.max(0, Math.min(100, value))) / 100}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.2,.7,.2,1)" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--teal)" />
            <stop offset="100%" stopColor="var(--blue)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{label ?? <span className="font-display text-2xl font-semibold">{value}%</span>}</div>
    </div>
  );
}

/* ---------------- Form fields ---------------- */

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink">
      {children}
      {hint && <span className="ml-1.5 font-normal text-muted">{hint}</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[14px] text-ink placeholder:text-muted/70 transition focus:border-blue/50 focus:outline-none focus:ring-4 focus:ring-blue/10";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7390%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10", className)} {...props}>
      {children}
    </select>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Close dialog" />
      <div className={cn("relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-6 shadow-[var(--shadow-lift)] animate-fade-up sm:rounded-3xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="-mr-2 -mt-1 rounded-lg p-2 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- States ---------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-paper-2", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-card/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-2 text-ink-2">{icon}</div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-up">
        {eyebrow && <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-teal">{eyebrow}</div>}
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="scrollbar-none inline-flex max-w-full overflow-x-auto rounded-2xl border border-line bg-paper-2 p-1" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "whitespace-nowrap rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all",
            value === it.value ? "bg-card text-ink shadow-[var(--shadow-soft)]" : "text-muted hover:text-ink",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (e: React.MouseEvent<HTMLButtonElement>) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200",
        checked ? "scale-100 border-teal bg-teal text-white" : "border-ink/20 bg-white hover:border-teal",
      )}
    >
      <svg viewBox="0 0 24 24" className={cn("h-4 w-4 transition-all", checked ? "opacity-100" : "opacity-0")} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5 10 17 19 7.5" />
      </svg>
    </button>
  );
}
