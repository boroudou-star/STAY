"use client";

import { ArrowRight, CalendarDays, Coffee, Compass, Map, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Badge, buttonClass } from "@/components/ui";
import { toast } from "sonner";
import { signOut, switchSlot, useAccount, useMyProfile } from "@/lib/store";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Map,
    title: "A roadmap that knows recruitment season",
    body: "Month-by-month plan built around when UK applications actually open and close, not just your graduation day.",
    tone: "bg-teal-soft text-teal",
    span: "md:col-span-2",
  },
  { icon: Compass, title: "Opportunities with honest scores", body: "Requirement alignment you can read, line by line. No fake 'chance of getting hired'.", tone: "bg-blue-soft text-blue", span: "" },
  {
    icon: CalendarDays,
    title: "Campus events you'd otherwise miss",
    body: "That PyTorch workshop from a society? It closes a skill gap. STAY tells you why it matters.",
    tone: "bg-violet-soft text-violet",
    span: "",
  },
  { icon: Coffee, title: "5 coffee chats, ready to send", body: "Targeted alumni searches and editable outreach drafts. You hit send, never us.", tone: "bg-sun-soft text-[#c2502f]", span: "" },
  {
    icon: ShieldCheck,
    title: "Visa-aware, never visa-guessing",
    body: "Plans around Graduate route timelines and sponsorship, clearly labelled as general info, with links to GOV.UK.",
    tone: "bg-lime/50 text-ink",
    span: "",
  },
];

export default function Landing() {
  const router = useRouter();
  const mine = useMyProfile();
  const account = useAccount();
  const firstName = (mine?.name || account?.name)?.split(" ")[0];

  const tryDemo = async () => {
    await switchSlot("demo");
    router.push("/dashboard");
  };
  const continueMine = async () => {
    const has = await switchSlot("mine");
    router.push(has ? "/dashboard" : "/onboarding");
  };
  const logOut = async () => {
    await signOut();
    toast("You've logged out", { description: "Your plan is saved. Sign in any time to pick it up." });
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-transparent bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            <button onClick={tryDemo} className={buttonClass("ghost", "md", "hidden sm:inline-flex")}>
              Try demo
            </button>
            {account ? (
              <>
                <button onClick={logOut} className={buttonClass("ghost", "md")}>
                  Log out
                </button>
                <button onClick={continueMine} className={buttonClass("primary", "md")}>
                  My plan
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className={buttonClass("ghost", "md")}>
                  Sign in
                </Link>
                <Link href="/signup" className={buttonClass("primary", "md")}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="map-paper relative">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20">
          <div className="animate-fade-up">
            <Badge tone="lime" className="mb-5 px-3 py-1 text-[12px]">
              <Zap size={12} /> Built for international students in the UK
            </Badge>
            <h1 className="font-display text-[44px] font-bold leading-[0.98] tracking-tight text-ink sm:text-[64px]">
              Your future,{" "}
              <span className="relative inline-block">
                <span className="relative z-10">mapped out.</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-4 -rotate-1 rounded bg-lime sm:bottom-2 sm:h-5" />
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-2">
              Most job boards show you what&apos;s open today. STAY shows you what to do <em className="font-semibold not-italic text-ink">today</em> to land the role you
              want tomorrow: roadmap, opportunities, campus events and coffee chats in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {account ? (
                <button onClick={continueMine} className={buttonClass("primary", "lg")}>
                  {mine ? `Continue${firstName ? ` as ${firstName}` : " my plan"}` : "Build my plan"} <ArrowRight size={18} />
                </button>
              ) : (
                <Link href="/signup" className={buttonClass("primary", "lg")}>
                  Create my account <ArrowRight size={18} />
                </Link>
              )}
              <button onClick={tryDemo} className={buttonClass("secondary", "lg")}>
                Try the demo
              </button>
            </div>
            <p className="mt-4 text-[13px] text-muted">
              {account === null && (
                <>
                  Already have an account?{" "}
                  <Link href="/signin" className="font-semibold text-ink underline underline-offset-2">
                    Sign in
                  </Link>
                  {" · "}
                </>
              )}
              {account && <>Signed in as {account.email} · </>}
              Free · About 5 minutes · Saved in your browser · The demo needs no account
            </p>
          </div>

          <HeroCard />
        </div>
      </section>

      {/* Problem → promise */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Sep → Jan", "when many UK graduate schemes recruit, often 9+ months before you graduate."],
            ["18 months", "Graduate visa window for applications made from 1 Jan 2027 (bachelor's & master's)."],
            ["1 plan", "that connects skills, applications, events and people."],
          ].map(([big, small], i) => (
            <div key={big} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="font-display text-5xl font-bold tracking-tight text-ink">{big}</div>
              <p className="mt-2 max-w-xs text-[15px] text-ink-2">{small}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[12px] text-muted">
          Graduate route figure: UK Home Office rules confirmed Oct 2025; PhD graduates keep 3 years. General information only.{" "}
          <a className="underline" href="https://www.gov.uk/graduate-visa" target="_blank" rel="noopener noreferrer">
            Check GOV.UK
          </a>
          .
        </p>
      </section>

      {/* Bento features */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Everything between &ldquo;I&apos;m interested in AI&rdquo; and an offer.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={cn("group rounded-3xl border border-line bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]", f.span)}>
              <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:rotate-[-6deg] group-hover:scale-110", f.tone)}>
                <f.icon size={20} />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{f.body}</p>
            </div>
          ))}
          <div className="flex flex-col justify-between rounded-3xl bg-ink p-6 text-white shadow-[var(--shadow-lift)] md:col-span-1">
            <Sparkles className="text-lime" />
            <div>
              <h3 className="mt-6 font-display text-xl font-semibold">See it with a real-feeling profile</h3>
              <p className="mt-2 text-[14px] text-white/70">Alex, final-year CS at UCL, interested in AI, needs sponsorship eventually. (Fictional.)</p>
              <button onClick={tryDemo} className={buttonClass("lime", "md", "mt-5")}>
                Load Alex&apos;s demo <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3">
          {[
            ["01", "Tell us where you are", "Studying or graduated, your goals, skills and (optionally) visa situation."],
            ["02", "Get your map", "A personalised timeline with this week's three moves, scored opportunities and events."],
            ["03", "Move and adapt", "Tick things off, change direction. STAY rebuilds the plan and keeps your progress."],
          ].map(([n, t, b]) => (
            <div key={n}>
              <div className="font-display text-sm font-bold text-teal">{n}</div>
              <h3 className="mt-2 font-display text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-[14.5px] text-ink-2">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-[12.5px] leading-relaxed text-muted">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="max-w-xl">
            STAY is a hackathon MVP. Example listings and events are clearly labelled as demo data and are not real vacancies. Visa content is general information, not
            legal advice. STAY never sends messages on your behalf.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HeroCard() {
  const stations = [
    { x: 6, label: "CV glow-up", c: "var(--teal)", done: true },
    { x: 22, label: "PyTorch workshop", c: "var(--teal)", done: true },
    { x: 40, label: "5 grad applications", c: "var(--blue)" },
    { x: 60, label: "Mock interviews", c: "var(--violet)" },
    { x: 80, label: "Offer + sponsorship", c: "var(--sun)" },
  ];
  return (
    <div className="relative animate-fade-up [animation-delay:120ms]">
      <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-lime/40 blur-3xl" />
      <div className="absolute -bottom-8 -left-6 h-40 w-40 rounded-full bg-blue/20 blur-3xl" />
      <div className="relative rotate-[1.5deg] rounded-[28px] border border-line bg-card p-5 shadow-[var(--shadow-lift)] transition-transform duration-500 hover:rotate-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-widest text-muted">Alex&apos;s roadmap</div>
            <div className="font-display text-xl font-semibold">Final year · AI & data</div>
          </div>
          <Badge tone="sun">
            <span className="h-1.5 w-1.5 rounded-full bg-sun" /> Grad season open
          </Badge>
        </div>
        <div className="relative mb-16 mt-12 h-3">
          <div className="absolute inset-y-0 left-0 w-[34%] rounded-full bg-teal" />
          <div className="absolute inset-y-0 left-[35%] w-[24%] rounded-full bg-blue" />
          <div className="absolute inset-y-0 left-[60%] w-[19%] rounded-full bg-violet" />
          <div className="absolute inset-y-0 left-[80%] w-[20%] rounded-full bg-sun" />
          {stations.map((s, i) => (
            <div key={s.label} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%` }}>
              <div className="h-4 w-4 rounded-full border-[3px]" style={{ borderColor: s.done ? "var(--ink)" : s.c, background: s.done ? "var(--ink)" : "white" }} />
              <div
                className={cn("absolute left-1/2 w-24 -translate-x-1/2 text-center text-[10.5px] font-medium leading-tight text-ink-2", i % 2 ? "top-6" : "-top-9")}
              >
                {s.label}
              </div>
            </div>
          ))}
          <div className="absolute left-[30%] top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-5 w-5 rounded-full border-[3px] border-white bg-sun animate-pulse-dot" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["38%", "complete"],
            ["3", "moves this week"],
            ["5", "coffee chats"],
          ].map(([a, b]) => (
            <div key={b} className="rounded-2xl bg-paper p-3">
              <div className="font-display text-2xl font-bold">{a}</div>
              <div className="text-[11.5px] text-muted">{b}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-12 left-6 -rotate-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-[var(--shadow-lift)]">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-teal">This week</div>
        <div className="text-[13.5px] font-medium">☕ Message 2 UCL alumni in ML</div>
      </div>
    </div>
  );
}
