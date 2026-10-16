"use client";

import { ArrowLeftRight, CalendarDays, Compass, Coffee, GraduationCap, LayoutDashboard, LogIn, LogOut, Map, Menu, Mic, Newspaper, ShieldCheck, Sparkles, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { progress } from "@/lib/engine/roadmap";
import { toast } from "sonner";
import { signOut, switchSlot, useAccount, useMyProfile, useStay } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { DemoBadge, ProgressBar } from "./ui";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "My Roadmap", icon: Map },
  { href: "/opportunities", label: "Opportunities", icon: Compass },
  { href: "/events", label: "Campus Events", icon: CalendarDays },
  { href: "/coffee-chats", label: "Coffee Chats", icon: Coffee },
  { href: "/insights", label: "Industry Insights", icon: Newspaper },
  { href: "/interview", label: "Interview Prep", icon: Mic },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/visa", label: "Visa & Work", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: User },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
              active ? "bg-ink text-white shadow-[var(--shadow-soft)]" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
            )}
          >
            <Icon size={18} className={cn("transition-transform group-hover:scale-110", active ? "text-lime" : "text-muted group-hover:text-ink")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const profile = useStay((s) => s.profile);
  const tasks = useStay((s) => s.tasks);
  const pct = progress(tasks);
  return (
    <div className="space-y-2">
      {profile && (
        <div className="rounded-2xl border border-line bg-paper p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-blue font-display text-sm font-bold text-white">
              {(profile.name || "You").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{profile.name || "You"}</div>
              <div className="flex items-center gap-1 truncate text-[12px] text-muted">
                <GraduationCap size={12} /> {profile.university || "University"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
            <span>Roadmap</span>
            <span className="font-semibold text-ink">{pct}%</span>
          </div>
          <ProgressBar value={pct} className="mt-1.5 h-1.5" />
          {profile.isDemo && <DemoBadge className="mt-3" label="Demo profile" />}
        </div>
      )}
      <AccountControls onNavigate={onNavigate} />
    </div>
  );
}

/** Who is signed in, with log out and switch account. */
function AccountControls({ onNavigate }: { onNavigate?: () => void }) {
  const account = useAccount();
  const router = useRouter();
  if (account === undefined) return null;
  const small = "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-ink/25 hover:text-ink";

  if (!account)
    return (
      <div className="rounded-2xl border border-dashed border-line px-3 py-2.5">
        <div className="text-[12px] text-muted">Not signed in</div>
        <div className="mt-2 flex gap-1.5">
          <Link href="/signin" onClick={onNavigate} className={small}>
            <LogIn size={14} /> Sign in
          </Link>
          <Link href="/signup" onClick={onNavigate} className={cn(small, "border-ink bg-ink text-white hover:text-white")}>
            Sign up
          </Link>
        </div>
      </div>
    );

  const logOut = async (then: "/" | "/signin") => {
    onNavigate?.();
    await signOut();
    if (then === "/") toast("You've logged out", { description: "Your plan is saved. Sign in any time to pick it up." });
    router.push(then);
  };

  return (
    <div className="rounded-2xl border border-line px-3 py-2.5">
      <div className="truncate text-[12px] text-muted" title={account.email}>
        Signed in as <span className="font-semibold text-ink">{account.email}</span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button onClick={() => logOut("/signin")} className={small}>
          <ArrowLeftRight size={14} /> Switch
        </button>
        <button onClick={() => logOut("/")} className={small}>
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

/** Shown while exploring the demo, so nobody mistakes Alex's plan for their own. */
function DemoBanner() {
  const isDemo = useStay((s) => Boolean(s.profile?.isDemo));
  const mine = useMyProfile();
  const account = useAccount();
  const router = useRouter();
  if (!isDemo) return null;
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-violet/20 bg-violet-soft px-4 py-3 text-[13.5px] sm:flex-row sm:items-center sm:justify-between">
      <span className="text-ink">
        <b>You&apos;re exploring the demo.</b> Alex is fictional. Anything you change here stays in the demo and never touches {mine ? "your own plan" : "a plan of your own"}.
      </span>
      {mine ? (
        <button
          onClick={async () => {
            await switchSlot("mine");
            router.push("/dashboard");
          }}
          className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-ink/90"
        >
          Back to my plan{mine.name ? ` (${mine.name.split(" ")[0]})` : ""}
        </button>
      ) : (
        <Link href={account ? "/onboarding" : "/signup"} className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-center text-[13px] font-semibold text-white hover:bg-ink/90">
          {account ? "Build my own plan" : "Create my account"}
        </Link>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between gap-4 overflow-y-auto border-r border-line bg-card/70 px-4 py-5 backdrop-blur lg:flex">
        <div>
          <Link href="/" className="mb-7 block px-2">
            <Logo />
          </Link>
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-paper-2" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col justify-between gap-4 overflow-y-auto bg-card p-4 shadow-[var(--shadow-lift)] animate-fade-up">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <Logo />
                <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-paper-2" aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-24 pt-20 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">
          <DemoBanner />
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <MobileTab key={href} href={href} label={label.replace("My ", "").replace("Campus ", "")} icon={<Icon size={20} />} />
        ))}
      </nav>
    </div>
  );
}

function MobileTab({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium", active ? "text-ink" : "text-muted")}>
      <span className={cn("rounded-full px-3 py-0.5 transition-colors", active && "bg-lime/60")}>{icon}</span>
      {label}
    </Link>
  );
}
