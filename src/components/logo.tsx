import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="10" fill="var(--ink)" />
      <path d="M8 22c4 0 4-12 8-12s4 8 8 8" stroke="var(--lime)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="8" cy="22" r="2.6" fill="white" />
      <circle cx="24" cy="18" r="3.2" fill="var(--sun)" stroke="white" strokeWidth="1.4" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-[22px] font-bold tracking-tight text-ink">STAY</span>
    </span>
  );
}
