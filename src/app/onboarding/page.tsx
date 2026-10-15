"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, Pencil, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CHALLENGES, TRACK_MAP } from "@/data/careers";
import { Logo } from "@/components/logo";
import {
  AboutFields,
  EducationFields,
  GoalsFields,
  GraduateStartField,
  PreferenceFields,
  SkillsFields,
  StartingPointFields,
  VisaFields,
} from "@/components/profile-fields";
import { TubeMap } from "@/components/tube-map";
import { Button, ProgressBar, Skeleton } from "@/components/ui";
import { computeHorizon, computePhases } from "@/lib/engine/roadmap";
import { blankProfile, tailoringNotes, withDefaults } from "@/lib/profile";
import { switchSlot, useHydrated, useMyProfile, useStay } from "@/lib/store";
import type { UserProfile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const DRAFT_KEY = "stay-onboarding-draft-v2";

const STEPS = [
  { key: "about", label: "You", title: "Let's build your plan", subtitle: "About 5 minutes. Skip anything marked optional, and change any answer later on your Profile page." },
  { key: "education", label: "Studies", title: "Your studies", subtitle: "Your graduation date sets the timing of your whole plan, around UK recruitment seasons." },
  { key: "goals", label: "Goals", title: "What are you aiming for?", subtitle: "The more specific you are, the more specific your plan, searches and messages get." },
  { key: "skills", label: "Experience", title: "Your skills and experience", subtitle: "Only what you've actually done. STAY never invents experience, and blanks are fine." },
  { key: "start", label: "Starting point", title: "Where are you starting from?", subtitle: "So your plan picks up where you are, not from zero." },
  { key: "prefs", label: "Preferences", title: "What matters to you in a role?", subtitle: "These shape how roles are ranked. Nothing here hides a role from you." },
  { key: "visa", label: "Visa", title: "Visa and work rights", subtitle: "Optional. Helps STAY flag sponsorship and plan around your visa dates." },
  { key: "review", label: "Review", title: "Check your answers", subtitle: "Here's what STAY will build from them. Tap Edit to change anything." },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface Draft {
  step: number;
  p: UserProfile;
}

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d?.p ? { step: Math.min(Math.max(0, d.step ?? 0), STEPS.length - 1), p: withDefaults({ ...blankProfile(), ...d.p }) } : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export default function OnboardingPage() {
  const hydrated = useHydrated();
  if (!hydrated)
    return (
      <div className="map-paper min-h-screen px-5 py-20">
        <Skeleton className="mx-auto h-[520px] max-w-3xl rounded-[28px]" />
      </div>
    );
  return <Onboarding />;
}

function Onboarding() {
  const router = useRouter();
  const mine = useMyProfile();
  const [restored] = useState(loadDraft);
  const [step, setStep] = useState(restored?.step ?? 0);
  const [p, setP] = useState<UserProfile>(() => restored?.p ?? blankProfile());
  const [generating, setGenerating] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const update = (patch: Partial<UserProfile>) => setP((prev) => ({ ...prev, ...patch }));
  const current = STEPS[step];

  // Save progress as they go, so a refresh or a closed tab doesn't lose answers
  useEffect(() => {
    if (generating) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, p }));
    } catch {
      /* storage blocked */
    }
  }, [step, p, generating]);

  const problem = (key: StepKey): string | null => {
    if (key === "education" && !p.university.trim()) return "Add your university";
    if (key === "education" && !p.subjectArea.trim() && !p.degree.trim()) return "Add your subject";
    if (key === "goals" && !p.careerGoals.length) return "Pick at least one career";
    return null;
  };
  const blocker = problem(current.key);

  const go = (i: number) => {
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => {
    if (blocker) return;
    if (current.key === "review") {
      setGenerating(true);
      return;
    }
    go(Math.min(step + 1, STEPS.length - 1));
  };

  useEffect(() => {
    if (!generating) return;
    const lines = setInterval(() => setLineIdx((i) => Math.min(i + 1, 3)), 600);
    const done = setTimeout(async () => {
      await switchSlot("mine");
      const s = useStay.getState();
      s.resetAll();
      const profile = withDefaults({ ...p, name: p.name.trim(), updatedAt: new Date().toISOString() });
      s.setProfile(profile, "Plan created");
      s.setInterviewCompany(profile.targetCompanies?.[0] ?? "");
      useStay.setState({ lastChange: { reason: "Plan created", added: 0, removed: 0, keptCompleted: 0, at: new Date().toISOString() } });
      clearDraft();
      router.push("/dashboard");
    }, 2600);
    return () => {
      clearInterval(lines);
      clearTimeout(done);
    };
  }, [generating, p, router]);

  if (generating) return <Generating name={p.name} lineIdx={lineIdx} />;

  return (
    <div className="map-paper min-h-screen">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Link href="/">
          <Logo />
        </Link>
        <span className="text-[13px] font-medium text-muted">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20">
        <ProgressBar value={((step + 1) / STEPS.length) * 100} className="mb-2 h-1.5" />
        <div className="scrollbar-none mb-6 flex gap-3 overflow-x-auto text-[12px] font-medium text-muted">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => i < step && go(i)}
              disabled={i >= step}
              className={cn("whitespace-nowrap", i === step && "text-ink", i < step && "text-teal hover:underline")}
            >
              {i < step ? "✓ " : ""}
              {s.label}
            </button>
          ))}
        </div>

        {step === 0 && restored && (
          <div className="mb-4 rounded-2xl border border-teal/20 bg-teal-soft px-4 py-3 text-[13.5px]">
            Welcome back. We kept your answers so far.{" "}
            <button
              className="font-semibold underline underline-offset-2"
              onClick={() => {
                clearDraft();
                setP(blankProfile());
              }}
            >
              Start fresh instead
            </button>
          </div>
        )}
        {step === 0 && mine && (
          <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-sun/30 bg-sun-soft px-4 py-3 text-[13.5px] sm:flex-row sm:items-center sm:justify-between">
            <span>
              You already have a plan{mine.name ? ` for ${mine.name.split(" ")[0]}` : ""} on this device. Finishing this will replace it. To change answers instead, use your Profile page.
            </span>
            <button
              className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold text-white"
              onClick={async () => {
                await switchSlot("mine");
                router.push("/profile");
              }}
            >
              Edit my profile
            </button>
          </div>
        )}

        <div key={step} className="animate-fade-up rounded-[28px] border border-line bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">{current.title}</h1>
          <p className="mt-2 text-[15px] text-ink-2">{current.subtitle}</p>
          <div className="mt-6">
            {current.key === "about" && <AboutFields p={p} update={update} />}
            {current.key === "education" && (
              <div className="space-y-5">
                <EducationFields p={p} update={update} />
                <GraduateStartField p={p} update={update} />
              </div>
            )}
            {current.key === "goals" && <GoalsFields p={p} update={update} />}
            {current.key === "skills" && <SkillsFields p={p} update={update} />}
            {current.key === "start" && <StartingPointFields p={p} update={update} />}
            {current.key === "prefs" && <PreferenceFields p={p} update={update} />}
            {current.key === "visa" && <VisaFields p={p} update={update} />}
            {current.key === "review" && <Review p={p} go={go} />}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>
              <ArrowLeft size={16} /> Back
            </Button>
            <div className="flex items-center gap-3">
              {blocker && <span className="hidden text-[13px] text-muted sm:inline">{blocker}</span>}
              <Button onClick={next} disabled={Boolean(blocker)} size="lg">
                {current.key === "review" ? (
                  <>
                    Build my plan <Wand2 size={16} />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
          {blocker && <p className="mt-2 text-right text-[13px] text-muted sm:hidden">{blocker}</p>}
        </div>

        {step === 0 && (
          <p className="mt-6 text-center text-[13px] text-muted">
            Just looking?{" "}
            <button
              className="font-semibold text-ink underline underline-offset-2"
              onClick={async () => {
                await switchSlot("demo");
                router.push("/dashboard");
              }}
            >
              Explore the demo
            </button>{" "}
            first. It&apos;s kept separate, so your answers here are safe.
          </p>
        )}
      </div>
    </div>
  );
}

function Generating({ name, lineIdx }: { name: string; lineIdx: number }) {
  const lines = ["Reading your goals and starting point…", "Finding your skill gaps…", "Ranking roles and events for you…", "Pacing your roadmap to your week…"];
  return (
    <div className="map-paper flex min-h-screen items-center justify-center px-5">
      <div className="flex flex-col items-center rounded-[28px] border border-line bg-card px-8 py-12 text-center shadow-[var(--shadow-lift)]">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-lime/40" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-ink text-lime">
            <Sparkles />
          </div>
        </div>
        <h2 className="font-display text-2xl font-semibold">Mapping out {name.trim() ? `${name.trim().split(" ")[0]}'s` : "your"} future…</h2>
        <ul className="mt-6 space-y-2 text-left text-[15px]">
          {lines.map((l, i) => (
            <li key={l} className={cn("flex items-center gap-2 transition-opacity", i > lineIdx ? "opacity-30" : "opacity-100")}>
              {i < lineIdx ? <Check size={16} className="text-teal" /> : i === lineIdx ? <Loader2 size={16} className="animate-spin text-blue" /> : <span className="w-4" />}
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Review({ p, go }: { p: UserProfile; go: (i: number) => void }) {
  const q = withDefaults(p);
  const sp = q.startingPoint!;
  const h = computeHorizon(q);
  const phases = computePhases(q, h);
  const idx = (k: StepKey) => STEPS.findIndex((s) => s.key === k);
  const list = (xs: string[], none = "Not added") => (xs.length ? xs.join(", ") : <span className="text-muted">{none}</span>);
  const ready = [sp.cvReady && "CV", sp.linkedinReady && "LinkedIn", sp.inSocieties && "societies", sp.reachedOut && "outreach"].filter(Boolean) as string[];
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-ink p-5 text-white">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-lime">
          <Sparkles size={13} /> How STAY will tailor your plan
        </div>
        <ul className="space-y-1.5 text-[14px] text-white/85">
          {tailoringNotes(q).map((n) => (
            <li key={n} className="flex gap-2">
              <Check size={15} className="mt-0.5 shrink-0 text-lime" /> {n}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewCard title="You" onEdit={() => go(idx("about"))}>
          {q.name || <span className="text-muted">No name</span>} · {q.studyStatus === "student" ? "Studying" : "Graduated"}
          {q.goalStatement?.trim() && <div className="mt-1 italic text-ink-2">&ldquo;{q.goalStatement.trim()}&rdquo;</div>}
        </ReviewCard>
        <ReviewCard title="Studies" onEdit={() => go(idx("education"))}>
          {[q.degree || q.subjectArea, q.university].filter(Boolean).join(" · ")}
          <div className="text-ink-2">
            {q.studyStatus === "student" ? `Year ${q.currentStudyYear}, graduating` : "Graduated"} {formatDate(q.graduationDate, { month: "long", year: "numeric" })}
          </div>
        </ReviewCard>
        <ReviewCard title="Goals" onEdit={() => go(idx("goals"))}>
          {q.careerGoals.map((g) => TRACK_MAP[g].label).join(", ")}
          <div className="text-ink-2">Roles: {list(q.preferredRoles)}</div>
          <div className="text-ink-2">Target companies: {list(q.targetCompanies!)}</div>
        </ReviewCard>
        <ReviewCard title="Skills and experience" onEdit={() => go(idx("skills"))}>
          {list([...q.technicalSkills, ...q.professionalSkills].slice(0, 8), "No skills added")}
          <div className="text-ink-2">{q.experience.cvText.trim() ? "CV added" : "No CV pasted"}</div>
        </ReviewCard>
        <ReviewCard title="Starting point" onEdit={() => go(idx("start"))}>
          {ready.length ? `Done: ${ready.join(", ")}` : "Starting fresh"} · {sp.applicationsSent} applications
          <div className="text-ink-2">
            {q.weeklyHours} h/week · Hardest: {q.challenges!.length ? q.challenges!.map((c) => CHALLENGES.find((x) => x.id === c)?.short).join(", ") : "not set"}
          </div>
        </ReviewCard>
        <ReviewCard title="Preferences and visa" onEdit={() => go(idx("prefs"))}>
          {list(q.locationPreferences, "Anywhere")}
          {q.roleTypes.length > 0 && <div className="text-ink-2">{q.roleTypes.join(", ")}</div>}
          <div className="text-ink-2">
            {q.visa.skipped ? "Visa info not used" : q.visa.needsSponsorship === "yes" ? "Needs sponsorship" : q.visa.needsSponsorship === "no" ? "No sponsorship needed" : "Sponsorship: not sure"}
          </div>
        </ReviewCard>
      </div>

      <div className="rounded-3xl border border-line bg-paper p-4">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-muted">Your timeline</div>
        <TubeMap phases={phases} tasks={[]} start={h.start} end={h.end} anchorLabel={h.anchorLabel} />
      </div>
    </div>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 text-[13.5px]">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</span>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue hover:underline">
          <Pencil size={12} /> Edit
        </button>
      </div>
      <div className="font-medium">{children}</div>
    </div>
  );
}
