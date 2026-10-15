"use client";

import { ArrowLeft, ArrowRight, Check, FileText, GraduationCap, Loader2, School, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { COMPANY_TYPES, ROLE_TYPES, TRACK_MAP, TRACKS, UK_CITIES, UNIVERSITIES } from "@/data/careers";
import { Logo } from "@/components/logo";
import { TubeMap } from "@/components/tube-map";
import { Button, Chip, Input, Label, ProgressBar, Select, Textarea } from "@/components/ui";
import { computeHorizon, computePhases } from "@/lib/engine/roadmap";
import { estimateGraduateRoute } from "@/lib/engine/visa";
import { extractSkillsFromText } from "@/lib/engine/cv";
import { useStay } from "@/lib/store";
import type { Experience, UserProfile } from "@/lib/types";
import { cn, formatDate, splitList, todayISO, uid } from "@/lib/utils";

const STEPS = ["Stage", "Education", "Goals", "Experience", "Preferences", "Timeline", "Visa", "Generate"];

const EMPTY_EXPERIENCE: Experience = {
  internships: "",
  partTime: "",
  projects: "",
  research: "",
  societyRoles: "",
  volunteering: "",
  certifications: "",
  cvText: "",
};

function blankProfile(): UserProfile {
  const now = new Date().toISOString();
  const y = new Date().getFullYear();
  return {
    id: uid("user"),
    name: "",
    university: "UCL",
    degree: "",
    degreeLevel: "bachelors",
    subjectArea: "",
    academicInterests: "",
    studyStatus: "student",
    currentStudyYear: 2,
    graduationDate: `${y + 1}-06-30`,
    careerGoals: [],
    preferredRoles: [],
    preferredIndustries: [],
    technicalSkills: [],
    professionalSkills: [],
    experience: { ...EMPTY_EXPERIENCE },
    locationPreferences: ["London"],
    willingToRelocate: false,
    companyTypes: [],
    roleTypes: [],
    priorities: { salary: 3, growth: 4, workLife: 3, technical: 4, security: 3 },
    visa: { skipped: false, needsSponsorship: "unsure", visaType: "unsure" },
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  };
}

const LOADING_LINES = ["Analysing your career goals…", "Identifying relevant experience gaps…", "Finding opportunities and events…", "Building your personalised roadmap…"];

export default function Onboarding() {
  const router = useRouter();
  const setProfile = useStay((s) => s.setProfile);
  const resetAll = useStay((s) => s.resetAll);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<UserProfile>(blankProfile);
  const [techText, setTechText] = useState("");
  const [proText, setProText] = useState("");
  const [rolesText, setRolesText] = useState("");
  const [industriesText, setIndustriesText] = useState("");
  const [gradMonth, setGradMonth] = useState(p.graduationDate.slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);

  const update = (patch: Partial<UserProfile>) => setP((prev) => ({ ...prev, ...patch }));
  const updateExp = (patch: Partial<Experience>) => setP((prev) => ({ ...prev, experience: { ...prev.experience, ...patch } }));

  // Keep derived list fields in sync
  const finalProfile = useMemo<UserProfile>(
    () => ({
      ...p,
      graduationDate: `${gradMonth}-${p.studyStatus === "student" ? "30" : "30"}`.replace(/-02-30$/, "-02-28"),
      technicalSkills: splitList(techText),
      professionalSkills: splitList(proText),
      preferredRoles: splitList(rolesText),
      preferredIndustries: splitList(industriesText),
    }),
    [p, gradMonth, techText, proText, rolesText, industriesText],
  );

  const canNext = (() => {
    if (step === 1) return Boolean(p.university && (p.degree || p.subjectArea) && gradMonth);
    if (step === 2) return p.careerGoals.length > 0;
    return true;
  })();

  useEffect(() => {
    if (!generating) return;
    const id = setInterval(() => setLineIdx((i) => Math.min(i + 1, LOADING_LINES.length - 1)), 750);
    const done = setTimeout(() => {
      resetAll();
      setProfile({ ...finalProfile, updatedAt: new Date().toISOString() }, "Roadmap generated");
      router.push("/dashboard");
    }, 3200);
    return () => {
      clearInterval(id);
      clearTimeout(done);
    };
  }, [generating, finalProfile, router, setProfile, resetAll]);

  const next = () => {
    if (step === STEPS.length - 2) {
      setStep(step + 1);
      setGenerating(true);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="map-paper min-h-screen">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Link href="/">
          <Logo />
        </Link>
        <span className="text-[13px] font-medium text-muted">
          Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20">
        <ProgressBar value={((step + 1) / STEPS.length) * 100} className="mb-2 h-1.5" />
        <div className="scrollbar-none mb-6 flex gap-3 overflow-x-auto text-[12px] font-medium text-muted">
          {STEPS.map((s, i) => (
            <span key={s} className={cn("whitespace-nowrap", i === step && "text-ink", i < step && "text-teal")}>
              {i < step ? "✓ " : ""}
              {s}
            </span>
          ))}
        </div>

        <div key={step} className="animate-fade-up rounded-[28px] border border-line bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
          {step === 0 && (
            <StepWrap title="Where are you in your career journey?" subtitle="Students and graduates get different timelines and priorities.">
              <div className="mb-6">
                <Label htmlFor="name" hint="(optional)">
                  What should we call you?
                </Label>
                <Input id="name" placeholder="First name" value={p.name} onChange={(e) => update({ name: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <BigOption
                  active={p.studyStatus === "student"}
                  onClick={() => update({ studyStatus: "student" })}
                  icon={<School />}
                  title="I'm currently studying"
                  body="Build skills and experience, and land a graduate role before you finish."
                />
                <BigOption
                  active={p.studyStatus === "graduate"}
                  onClick={() => {
                    update({ studyStatus: "graduate" });
                    if (gradMonth > todayISO().slice(0, 7)) setGradMonth(`${new Date().getFullYear()}-06`);
                  }}
                  icon={<GraduationCap />}
                  title="I've graduated"
                  body="Focus on applications, interviews and timing around your visa."
                />
              </div>
            </StepWrap>
          )}

          {step === 1 && (
            <StepWrap title="Your education" subtitle="Your university decides which campus events and societies we prioritise.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>University</Label>
                  <Select
                    value={UNIVERSITIES.includes(p.university) ? p.university : "Other"}
                    onChange={(e) => update({ university: e.target.value === "Other" ? "" : e.target.value })}
                  >
                    {UNIVERSITIES.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </Select>
                  {!UNIVERSITIES.includes(p.university) && (
                    <Input className="mt-2" placeholder="Your university" value={p.university} onChange={(e) => update({ university: e.target.value })} />
                  )}
                </div>
                <div>
                  <Label>Degree level</Label>
                  <Select value={p.degreeLevel} onChange={(e) => update({ degreeLevel: e.target.value as UserProfile["degreeLevel"] })}>
                    <option value="bachelors">Bachelor&apos;s</option>
                    <option value="masters">Master&apos;s</option>
                    <option value="phd">PhD / doctorate</option>
                  </Select>
                </div>
                <div>
                  <Label>Degree title</Label>
                  <Input placeholder="e.g. BSc Computer Science" value={p.degree} onChange={(e) => update({ degree: e.target.value })} />
                </div>
                <div>
                  <Label>Subject area</Label>
                  <Input placeholder="e.g. Computer Science" value={p.subjectArea} onChange={(e) => update({ subjectArea: e.target.value })} />
                </div>
                {p.studyStatus === "student" && (
                  <div>
                    <Label>Current year of study</Label>
                    <Select value={p.currentStudyYear ?? 1} onChange={(e) => update({ currentStudyYear: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div>
                  <Label>{p.studyStatus === "student" ? "Expected graduation" : "Graduation date"}</Label>
                  <Input type="month" value={gradMonth} onChange={(e) => setGradMonth(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label hint="(optional)">Academic interests</Label>
                  <Input placeholder="e.g. NLP, computational biology" value={p.academicInterests} onChange={(e) => update({ academicInterests: e.target.value })} />
                </div>
              </div>
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap title="What kind of career are you interested in?" subtitle="Pick as many as you like. The first one you pick is treated as your main goal.">
              <div className="flex flex-wrap gap-2">
                {TRACKS.map((t) => {
                  const idx = p.careerGoals.indexOf(t.id);
                  return (
                    <Chip
                      key={t.id}
                      active={idx >= 0}
                      onClick={() => update({ careerGoals: idx >= 0 ? p.careerGoals.filter((g) => g !== t.id) : [...p.careerGoals, t.id] })}
                    >
                      <span>{t.emoji}</span> {t.label}
                      {idx === 0 && <span className="ml-1 rounded-full bg-lime px-1.5 text-[10px] font-bold text-ink">MAIN</span>}
                    </Chip>
                  );
                })}
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label hint="(comma-separated)">Preferred roles</Label>
                  <Input
                    placeholder={p.careerGoals[0] ? TRACK_MAP[p.careerGoals[0]].roles.slice(0, 2).join(", ") : "e.g. Data Scientist"}
                    value={rolesText}
                    onChange={(e) => setRolesText(e.target.value)}
                  />
                </div>
                <div>
                  <Label hint="(comma-separated)">Industries</Label>
                  <Input placeholder="e.g. AI, healthtech, fintech" value={industriesText} onChange={(e) => setIndustriesText(e.target.value)} />
                </div>
              </div>
            </StepWrap>
          )}

          {step === 3 && (
            <ExperienceStep
              exp={p.experience}
              updateExp={updateExp}
              techText={techText}
              setTechText={setTechText}
              proText={proText}
              setProText={setProText}
            />
          )}

          {step === 4 && (
            <StepWrap title="Career preferences" subtitle="These shape how we rank opportunities. Nothing is a hard filter.">
              <Label>Preferred UK cities</Label>
              <div className="mb-5 flex flex-wrap gap-2">
                {UK_CITIES.map((c) => (
                  <Chip
                    key={c}
                    active={p.locationPreferences.includes(c)}
                    onClick={() => update({ locationPreferences: p.locationPreferences.includes(c) ? p.locationPreferences.filter((x) => x !== c) : [...p.locationPreferences, c] })}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
              <label className="mb-5 flex items-center gap-2 text-[14px]">
                <input type="checkbox" className="h-4 w-4 accent-[var(--teal)]" checked={p.willingToRelocate} onChange={(e) => update({ willingToRelocate: e.target.checked })} />
                I&apos;m willing to relocate within the UK
              </label>
              <Label>Company types</Label>
              <div className="mb-5 flex flex-wrap gap-2">
                {COMPANY_TYPES.map((c) => (
                  <Chip key={c} active={p.companyTypes.includes(c)} onClick={() => update({ companyTypes: p.companyTypes.includes(c) ? p.companyTypes.filter((x) => x !== c) : [...p.companyTypes, c] })}>
                    {c}
                  </Chip>
                ))}
              </div>
              <Label>Role types</Label>
              <div className="mb-5 flex flex-wrap gap-2">
                {ROLE_TYPES.map((c) => (
                  <Chip key={c} active={p.roleTypes.includes(c)} onClick={() => update({ roleTypes: p.roleTypes.includes(c) ? p.roleTypes.filter((x) => x !== c) : [...p.roleTypes, c] })}>
                    {c}
                  </Chip>
                ))}
              </div>
              <div className="mb-6 max-w-xs">
                <Label hint="(optional, £ per year)">Minimum salary</Label>
                <Input type="number" min={0} step={1000} placeholder="e.g. 30000" value={p.minSalary ?? ""} onChange={(e) => update({ minSalary: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <Label>What matters most to you?</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["salary", "Salary"],
                    ["growth", "Career growth"],
                    ["workLife", "Work-life balance"],
                    ["technical", "Technical interest"],
                    ["security", "Job security"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k} className="rounded-2xl border border-line bg-paper px-4 py-3">
                    <div className="flex items-center justify-between text-[13px] font-medium">
                      <span>{label}</span>
                      <span className="text-muted">{p.priorities[k]}/5</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={p.priorities[k]}
                      onChange={(e) => update({ priorities: { ...p.priorities, [k]: Number(e.target.value) } })}
                      className="mt-2 w-full accent-[var(--teal)]"
                      aria-label={label}
                    />
                  </div>
                ))}
              </div>
            </StepWrap>
          )}

          {step === 5 && <TimelineStep p={finalProfile} update={update} />}

          {step === 6 && <VisaStep p={finalProfile} update={update} onSkip={() => { update({ visa: { ...p.visa, skipped: true } }); next(); }} />}

          {step === 7 && (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-lime/40" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-ink text-lime">
                  <Sparkles />
                </div>
              </div>
              <h2 className="font-display text-2xl font-semibold">Mapping out your future…</h2>
              <ul className="mt-6 space-y-2 text-left text-[15px]">
                {LOADING_LINES.map((l, i) => (
                  <li key={l} className={cn("flex items-center gap-2 transition-opacity", i > lineIdx ? "opacity-30" : "opacity-100")}>
                    {i < lineIdx ? <Check size={16} className="text-teal" /> : i === lineIdx ? <Loader2 size={16} className="animate-spin text-blue" /> : <span className="w-4" />}
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step < 7 && (
            <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
              <Button variant="ghost" onClick={back} disabled={step === 0}>
                <ArrowLeft size={16} /> Back
              </Button>
              <Button onClick={next} disabled={!canNext} size="lg">
                {step === STEPS.length - 2 ? (
                  <>
                    Generate my roadmap <Wand2 size={16} />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        {step === 0 && (
          <p className="mt-6 text-center text-[13px] text-muted">
            Just looking?{" "}
            <button
              className="font-semibold text-ink underline underline-offset-2"
              onClick={() => {
                useStay.getState().loadDemo();
                toast.success("Loaded Alex's demo profile");
                router.push("/dashboard");
              }}
            >
              Load the demo profile instead
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function StepWrap({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] text-ink-2">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function BigOption({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-3xl border-2 p-5 text-left transition-all",
        active ? "border-ink bg-ink text-white shadow-[var(--shadow-lift)]" : "border-line bg-paper hover:-translate-y-0.5 hover:border-ink/30",
      )}
    >
      <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-2xl", active ? "bg-lime text-ink" : "bg-card text-ink-2")}>{icon}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      <div className={cn("mt-1 text-[14px]", active ? "text-white/70" : "text-muted")}>{body}</div>
    </button>
  );
}

function ExperienceStep({
  exp,
  updateExp,
  techText,
  setTechText,
  proText,
  setProText,
}: {
  exp: Experience;
  updateExp: (p: Partial<Experience>) => void;
  techText: string;
  setTechText: (s: string) => void;
  proText: string;
  setProText: (s: string) => void;
}) {
  const [extracting, setExtracting] = useState(false);
  const fields: [keyof Experience, string, string][] = [
    ["internships", "Previous internships", "Company, role, dates. Leave blank if none"],
    ["partTime", "Part-time work", "e.g. Barista, tutoring"],
    ["projects", "Personal / university projects", "What you built and what it did"],
    ["research", "Research experience", "Lab work, dissertation, RA roles"],
    ["societyRoles", "Society or committee roles", "e.g. Events officer, Tech Society"],
    ["volunteering", "Volunteering", ""],
    ["certifications", "Certifications", "e.g. AWS Cloud Practitioner"],
  ];

  const extract = async () => {
    if (!exp.cvText.trim()) return toast.error("Paste your CV text first");
    setExtracting(true);
    const local = extractSkillsFromText(exp.cvText);
    let skills = local;
    try {
      const res = await fetch("/api/ai/cv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cvText: exp.cvText }) });
      if (res.ok) {
        const data = (await res.json()) as { skills?: string[]; source?: string };
        if (data.skills?.length) skills = Array.from(new Set([...local, ...data.skills]));
      }
    } catch {
      /* fall back to local extraction */
    }
    const existing = splitList(techText);
    const merged = Array.from(new Set([...existing, ...skills]));
    setTechText(merged.join(", "));
    setExtracting(false);
    toast.success(skills.length ? `Found ${skills.length} skills mentioned in your CV` : "No recognised skills found. Add them manually");
  };

  return (
    <StepWrap title="Your experience so far" subtitle="Only what you've actually done. STAY never invents experience. Leave anything blank.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label hint="(comma-separated)">Technical skills</Label>
          <Input placeholder="e.g. Python, basic SQL, Git" value={techText} onChange={(e) => setTechText(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label hint="(comma-separated)">Professional skills</Label>
          <Input placeholder="e.g. Communication, teamwork, presenting" value={proText} onChange={(e) => setProText(e.target.value)} />
        </div>
        {fields.map(([k, label, ph]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Textarea className="min-h-20" placeholder={ph} value={exp[k]} onChange={(e) => updateExp({ [k]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-3xl border border-dashed border-line bg-paper p-5">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <FileText size={18} /> Paste your CV <span className="text-[13px] font-normal text-muted">(optional)</span>
        </div>
        <Textarea placeholder="Paste the text of your CV here…" value={exp.cvText} onChange={(e) => updateExp({ cvText: e.target.value })} className="min-h-28 bg-white" />
        <Button variant="secondary" size="sm" className="mt-3" onClick={extract} disabled={extracting}>
          {extracting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Pull skills from my CV
        </Button>
        <p className="mt-2 text-[12px] text-muted">We only add skills that are explicitly mentioned in your text.</p>
      </div>
    </StepWrap>
  );
}

function TimelineStep({ p, update }: { p: UserProfile; update: (patch: Partial<UserProfile>) => void }) {
  const h = computeHorizon(p);
  const phases = computePhases(p, h);
  return (
    <StepWrap
      title={p.studyStatus === "student" ? "Your timeline" : "When do you want to start?"}
      subtitle={
        p.studyStatus === "student"
          ? `You have about ${Math.round(h.monthsLeft)} months until graduation (${formatDate(p.graduationDate, { month: "long", year: "numeric" })}).`
          : "We'll build a time-sensitive plan around your start date and any visa deadline."
      }
    >
      {p.studyStatus === "graduate" && (
        <div className="mb-6 max-w-xs">
          <Label>Intended start date</Label>
          <Input type="date" value={p.targetStartDate ?? ""} onChange={(e) => update({ targetStartDate: e.target.value || undefined })} />
        </div>
      )}
      <div className="rounded-3xl border border-line bg-paper p-4">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-muted">Preview</div>
        <TubeMap phases={phases} tasks={[]} start={h.start} end={h.end} anchorLabel={h.anchorLabel} />
      </div>
      <p className="mt-4 text-[13px] text-muted">Phases adapt to recruitment season: in the UK, many graduate schemes open in September and close between October and January.</p>
    </StepWrap>
  );
}

function VisaStep({ p, update, onSkip }: { p: UserProfile; update: (patch: Partial<UserProfile>) => void; onSkip: () => void }) {
  const est = estimateGraduateRoute({ ...p, visa: { ...p.visa, skipped: false } });
  const setVisa = (patch: Partial<UserProfile["visa"]>) => update({ visa: { ...p.visa, skipped: false, ...patch } });
  return (
    <StepWrap title="Visa considerations" subtitle="Optional and private. We never ask for passport numbers or documents.">
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-blue-soft p-4 text-[13.5px] text-ink-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue" />
        <span>Not every international student needs sponsorship. This only changes how we flag sponsorship information and timelines. General information, not legal advice.</span>
      </div>
      <Label>Do you need employer visa sponsorship to work in the UK long-term?</Label>
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["yes", "Yes"],
            ["no", "No"],
            ["unsure", "Not sure"],
          ] as const
        ).map(([v, l]) => (
          <Chip key={v} active={p.visa.needsSponsorship === v} onClick={() => setVisa({ needsSponsorship: v })}>
            {l}
          </Chip>
        ))}
      </div>
      <Label>Current visa</Label>
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["student", "Student visa"],
            ["graduate", "Graduate visa"],
            ["skilled_worker", "Skilled Worker"],
            ["other", "Another visa"],
            ["none", "None / not applicable"],
            ["unsure", "Not sure"],
          ] as const
        ).map(([v, l]) => (
          <Chip key={v} active={p.visa.visaType === v} onClick={() => setVisa({ visaType: v })}>
            {l}
          </Chip>
        ))}
      </div>
      <div className="max-w-xs">
        <Label hint="(optional)">When does your current visa expire?</Label>
        <Input type="date" value={p.visa.expiryDate ?? ""} onChange={(e) => setVisa({ expiryDate: e.target.value || undefined })} />
      </div>
      {est && p.visa.needsSponsorship !== "no" && (
        <div className="mt-5 rounded-2xl border border-line bg-paper p-4 text-[13.5px]">
          <div className="font-semibold">Heads-up for planning</div>
          <p className="mt-1 text-ink-2">
            {est.basis} If you applied around {formatDate(est.assumedApplicationDate, { month: "long", year: "numeric" })}, that would be about {est.durationLabel}.{" "}
            <a href="https://www.gov.uk/graduate-visa" target="_blank" rel="noopener noreferrer" className="font-medium text-blue underline">
              GOV.UK guidance
            </a>
          </p>
        </div>
      )}
      <button onClick={onSkip} className="mt-6 text-[13px] font-medium text-muted underline underline-offset-2 hover:text-ink">
        Skip visa questions
      </button>
    </StepWrap>
  );
}

