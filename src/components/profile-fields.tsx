"use client";

import { Check, FileText, GraduationCap, Loader2, Plus, School, ShieldCheck, Upload, Wand2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CHALLENGES, COMPANY_SUGGESTIONS, COMPANY_TYPES, INDUSTRY_SUGGESTIONS, PRO_SKILL_SUGGESTIONS, ROLE_TYPES, TRACK_MAP, TRACKS, UK_CITIES, UNIVERSITIES } from "@/data/careers";
import { Button, buttonClass, Chip, Input, Label, Select, Textarea } from "@/components/ui";
import { CV_ACCEPT, CvFileError, readCvFile } from "@/lib/cv-file";
import { extractSkillsFromText } from "@/lib/engine/cv";
import { estimateGraduateRoute } from "@/lib/engine/visa";
import { EMPTY_START, monthToDate, paceLabel, withDefaults } from "@/lib/profile";
import type { Experience, StartingPoint, UserProfile } from "@/lib/types";
import { cn, formatDate, todayISO } from "@/lib/utils";

/**
 * Profile questions, shared by onboarding and the Profile page so everything asked can be changed later.
 * Each section takes the profile and an `update(patch)` function.
 */
export type Update = (patch: Partial<UserProfile>) => void;
interface SectionProps {
  p: UserProfile;
  update: Update;
}

const uniq = (xs: string[]) => xs.filter((x, i) => xs.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** Type and press Enter (or comma) to add; tap a suggestion to add it; × to remove. */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  max = 15,
  label,
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
  label: string;
  id?: string;
}) {
  const [text, setText] = useState("");
  const has = (x: string) => value.some((v) => v.toLowerCase() === x.toLowerCase());
  const add = (raw: string) => {
    const parts = raw
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(uniq([...value, ...parts]).slice(0, max));
    setText("");
  };
  const open = suggestions.filter((s) => !has(s)).slice(0, 8);
  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-white px-2 py-1.5 focus-within:border-ink/40 focus-within:ring-2 focus-within:ring-ink/5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[12.5px] font-medium text-white">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="rounded-full p-0.5 hover:bg-white/20" aria-label={`Remove ${v}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(text)}
          placeholder={value.length ? "Add another…" : placeholder}
          aria-label={label}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-[14px] outline-none placeholder:text-muted"
        />
      </div>
      {open.length > 0 && value.length < max && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {open.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-paper px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-ink/40 hover:text-ink"
            >
              <Plus size={11} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, help, htmlFor, children, className }: { label: string; hint?: string; help?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {help && <p className="mt-1.5 text-[12px] text-muted">{help}</p>}
    </div>
  );
}

function ChipGroup<T extends string>({ options, value, onChange, max }: { options: readonly (readonly [T, string])[] | { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; max?: number }) {
  const list = (options as unknown[]).map((o) => (Array.isArray(o) ? { id: o[0] as T, label: o[1] as string } : (o as { id: T; label: string })));
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((o) => {
        const on = value.includes(o.id);
        return (
          <Chip
            key={o.id}
            active={on}
            onClick={() => {
              if (on) onChange(value.filter((x) => x !== o.id));
              else if (!max || value.length < max) onChange([...value, o.id]);
              else toast(`Pick up to ${max}`);
            }}
          >
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}

function BigOption({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
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

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export function AboutFields({ p, update }: SectionProps) {
  const id = useId();
  return (
    <div className="space-y-6">
      <Field label="What should we call you?" hint="(optional)" htmlFor={`${id}-name`}>
        <Input id={`${id}-name`} placeholder="First name" value={p.name} onChange={(e) => update({ name: e.target.value })} autoComplete="given-name" />
      </Field>
      <div>
        <Label>Where are you right now?</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <BigOption
            active={p.studyStatus === "student"}
            onClick={() => update({ studyStatus: "student" })}
            icon={<School />}
            title="I'm currently studying"
            body="Build skills and experience, and land a role before you finish."
          />
          <BigOption
            active={p.studyStatus === "graduate"}
            onClick={() => {
              const patch: Partial<UserProfile> = { studyStatus: "graduate" };
              if (p.graduationDate > todayISO()) patch.graduationDate = `${new Date().getFullYear()}-06-30`;
              update(patch);
            }}
            icon={<GraduationCap />}
            title="I've graduated"
            body="Focus on applications, interviews and timing around your visa."
          />
        </div>
      </div>
      <Field
        label="In one sentence, what would make the next 12 months a success?"
        hint="(optional)"
        htmlFor={`${id}-goal`}
        help="Your words, shown on your dashboard to keep the plan pointed at what matters to you."
      >
        <Textarea
          id={`${id}-goal`}
          className="min-h-16"
          maxLength={200}
          placeholder="e.g. Land a graduate data role in London at a company that can sponsor my visa"
          value={p.goalStatement ?? ""}
          onChange={(e) => update({ goalStatement: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function EducationFields({ p, update }: SectionProps) {
  const id = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="University" htmlFor={`${id}-uni`} className="sm:col-span-2" help="Start typing to pick from the list, or enter any university.">
        <Input id={`${id}-uni`} list={`${id}-unis`} placeholder="e.g. University of Manchester" value={p.university} onChange={(e) => update({ university: e.target.value })} />
        <datalist id={`${id}-unis`}>
          {UNIVERSITIES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </Field>
      <Field label="Degree level" htmlFor={`${id}-level`}>
        <Select id={`${id}-level`} value={p.degreeLevel} onChange={(e) => update({ degreeLevel: e.target.value as UserProfile["degreeLevel"] })}>
          <option value="bachelors">Bachelor&apos;s</option>
          <option value="masters">Master&apos;s</option>
          <option value="phd">PhD / doctorate</option>
        </Select>
      </Field>
      <Field label="Subject" htmlFor={`${id}-subject`}>
        <Input id={`${id}-subject`} placeholder="e.g. Economics" value={p.subjectArea} onChange={(e) => update({ subjectArea: e.target.value })} />
      </Field>
      <Field label="Degree title" hint="(optional)" htmlFor={`${id}-degree`}>
        <Input id={`${id}-degree`} placeholder="e.g. BSc Economics" value={p.degree} onChange={(e) => update({ degree: e.target.value })} />
      </Field>
      {p.studyStatus === "student" && (
        <Field label="Current year of study" htmlFor={`${id}-year`}>
          <Select id={`${id}-year`} value={p.currentStudyYear ?? 1} onChange={(e) => update({ currentStudyYear: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={p.studyStatus === "student" ? "Expected graduation" : "Graduation date"} htmlFor={`${id}-grad`}>
        <Input id={`${id}-grad`} type="month" value={p.graduationDate.slice(0, 7)} onChange={(e) => e.target.value && update({ graduationDate: monthToDate(e.target.value) })} />
      </Field>
      <Field label="Academic interests" hint="(optional)" htmlFor={`${id}-interests`} className="sm:col-span-2">
        <Input id={`${id}-interests`} placeholder="e.g. behavioural economics, NLP, climate policy" value={p.academicInterests} onChange={(e) => update({ academicInterests: e.target.value })} />
      </Field>
    </div>
  );
}

export function GoalsFields({ p, update }: SectionProps) {
  const id = useId();
  const tracks = p.careerGoals.length ? p.careerGoals : [];
  const roleSuggestions = uniq(tracks.flatMap((t) => TRACK_MAP[t].roles));
  const companySuggestions = uniq(tracks.flatMap((t) => COMPANY_SUGGESTIONS[t] ?? []));
  return (
    <div className="space-y-6">
      <div>
        <Label>Which careers interest you?</Label>
        <p className="-mt-1 mb-2 text-[13px] text-muted">Pick as many as you like. The first one is your main goal.</p>
        <div className="flex flex-wrap gap-2">
          {TRACKS.map((t) => {
            const idx = p.careerGoals.indexOf(t.id);
            return (
              <Chip key={t.id} active={idx >= 0} onClick={() => update({ careerGoals: idx >= 0 ? p.careerGoals.filter((g) => g !== t.id) : [...p.careerGoals, t.id] })}>
                <span>{t.emoji}</span> {t.label}
                {idx === 0 && <span className="ml-1 rounded-full bg-lime px-1.5 text-[10px] font-bold text-ink">MAIN</span>}
              </Chip>
            );
          })}
        </div>
      </div>
      <Field label="Roles you'd like" htmlFor={`${id}-roles`} help="Used in your tasks, searches and outreach messages.">
        <TagInput id={`${id}-roles`} label="Roles you'd like" value={p.preferredRoles} onChange={(v) => update({ preferredRoles: v })} suggestions={roleSuggestions} placeholder="e.g. Data Analyst" max={6} />
      </Field>
      <Field label="Target companies" hint="(optional, up to 6)" htmlFor={`${id}-companies`} help="Their roles get a boost, and STAY adds research, coffee chats, insights and interview prep for them.">
        <TagInput id={`${id}-companies`} label="Target companies" value={p.targetCompanies ?? []} onChange={(v) => update({ targetCompanies: v })} suggestions={companySuggestions} placeholder="e.g. Monzo, Deloitte, NHS" max={6} />
      </Field>
      <Field label="Industries" hint="(optional)" htmlFor={`${id}-industries`}>
        <TagInput id={`${id}-industries`} label="Industries" value={p.preferredIndustries} onChange={(v) => update({ preferredIndustries: v })} suggestions={INDUSTRY_SUGGESTIONS} placeholder="e.g. Fintech" max={6} />
      </Field>
    </div>
  );
}

const EXPERIENCE_FIELDS: [keyof Experience, string, string][] = [
  ["internships", "Internships or placements", "Company, role, dates and one thing you achieved"],
  ["partTime", "Part-time work", "e.g. Barista at Pret, 2024 to now: trained 3 new staff"],
  ["projects", "Projects (university or personal)", "What you built or researched, and what it showed"],
  ["research", "Research", "Dissertation, lab work, research assistant roles"],
  ["societyRoles", "Society or committee roles", "e.g. Treasurer, Finance Society: ran a £4k budget"],
  ["volunteering", "Volunteering", "Where, what you did"],
  ["certifications", "Courses and certifications", "e.g. Google Data Analytics certificate"],
];

export function SkillsFields({ p, update, compact }: SectionProps & { compact?: boolean }) {
  const id = useId();
  const [extracting, setExtracting] = useState(false);
  const [showText, setShowText] = useState(false);
  const techSuggestions = uniq((p.careerGoals.length ? p.careerGoals : (["exploring"] as const)).flatMap((t) => TRACK_MAP[t].coreSkills));
  const setExp = (patch: Partial<Experience>) => update({ experience: { ...p.experience, ...patch } });

  /** Adds skills explicitly mentioned in the CV text. Runs on this device only. */
  const pullSkills = (text: string, base: Partial<UserProfile> = {}) => {
    const found = extractSkillsFromText(text);
    const merged = uniq([...p.technicalSkills, ...found]).slice(0, 25);
    update({ ...base, technicalSkills: merged });
    return merged.length - p.technicalSkills.length;
  };

  const extract = () => {
    if (!p.experience.cvText.trim()) return toast.error("Upload or paste your CV first");
    const added = pullSkills(p.experience.cvText);
    toast.success(added ? `Added ${added} skill${added === 1 ? "" : "s"} found in your CV` : "No new skills found. Add them above");
  };

  const upload = async (file: File) => {
    setExtracting(true);
    try {
      const text = await readCvFile(file);
      const added = pullSkills(text, { experience: { ...p.experience, cvText: text, cvFileName: file.name } });
      toast.success(`Read ${file.name}`, { description: added ? `Added ${added} skill${added === 1 ? "" : "s"} it mentions. Check them above.` : "Check the text below and add any skills it missed." });
    } catch (e) {
      toast.error(e instanceof CvFileError ? e.message : "We couldn't read that file. Try a PDF or .docx, or paste the text instead.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="Technical skills" htmlFor={`${id}-tech`} help="Only what you can actually show. Tap the suggestions for your field or type your own.">
        <TagInput id={`${id}-tech`} label="Technical skills" value={p.technicalSkills} onChange={(v) => update({ technicalSkills: v })} suggestions={techSuggestions} placeholder="e.g. Python, Excel, SQL" max={25} />
      </Field>
      <Field label="Professional skills" htmlFor={`${id}-pro`}>
        <TagInput id={`${id}-pro`} label="Professional skills" value={p.professionalSkills} onChange={(v) => update({ professionalSkills: v })} suggestions={PRO_SKILL_SUGGESTIONS} placeholder="e.g. Presenting" max={12} />
      </Field>
      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        {EXPERIENCE_FIELDS.map(([k, label, ph]) => (
          <Field key={k} label={label} hint="(optional)" htmlFor={`${id}-${k}`}>
            <Textarea id={`${id}-${k}`} className="min-h-20" placeholder={ph} value={p.experience[k]} onChange={(e) => setExp({ [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      <div
        className="rounded-3xl border border-dashed border-line bg-paper p-5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
      >
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <FileText size={18} /> Your CV <span className="text-[13px] font-normal text-muted">(optional, recommended)</span>
        </div>
        <p className="mb-3 text-[12.5px] text-muted">Upload a PDF or Word (.docx) file, or drag it here. It&apos;s read on this device and never uploaded. Interview Prep uses it to ask about your own experience.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className={cn(buttonClass("primary", "sm"), "cursor-pointer", extracting && "pointer-events-none opacity-60")}>
            {extracting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {p.experience.cvText ? "Upload a new CV" : "Upload CV"}
            <input
              type="file"
              accept={CV_ACCEPT}
              className="sr-only"
              aria-label="Upload CV file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </label>
          {p.experience.cvFileName && p.experience.cvText && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-3 py-1 text-[12.5px] font-medium text-teal">
              <Check size={13} /> {p.experience.cvFileName}
            </span>
          )}
          <button type="button" onClick={() => setShowText(!showText)} className="text-[12.5px] font-semibold text-blue hover:underline">
            {showText ? "Hide text" : p.experience.cvText ? "Check or edit the text" : "Paste text instead"}
          </button>
        </div>
        {showText && (
          <>
            <Textarea
              id={`${id}-cv`}
              aria-label="CV text"
              placeholder="Copy everything from your CV document and paste it here…"
              value={p.experience.cvText}
              onChange={(e) => setExp({ cvText: e.target.value, cvFileName: e.target.value ? p.experience.cvFileName : undefined })}
              className="mt-3 min-h-40 bg-white"
            />
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={extract}>
              <Wand2 size={14} /> Pull skills from this text
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const READY: [keyof StartingPoint, string, string][] = [
  ["cvReady", "My CV is up to date", "One page, recent, with my projects or work on it"],
  ["linkedinReady", "My LinkedIn is set up", "Photo, headline and experience filled in"],
  ["inSocieties", "I'm active in a relevant society", "Member or committee of a society linked to my goals"],
  ["reachedOut", "I've messaged people in my field", "At least a couple of people for advice or a chat"],
];

export function StartingPointFields({ p: raw, update }: SectionProps) {
  const id = useId();
  const p = withDefaults(raw);
  const sp = p.startingPoint!;
  const setSp = (patch: Partial<StartingPoint>) => update({ startingPoint: { ...EMPTY_START, ...sp, ...patch } });
  return (
    <div className="space-y-7">
      <div>
        <Label>What do you already have in place?</Label>
        <p className="-mt-1 mb-3 text-[13px] text-muted">Tick what&apos;s true. STAY marks those steps as done instead of asking you to repeat them.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {READY.map(([k, title, body]) => {
            const on = Boolean(sp[k]);
            return (
              <button
                type="button"
                key={k}
                aria-pressed={on}
                onClick={() => setSp({ [k]: !on })}
                className={cn("flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors", on ? "border-teal bg-teal-soft/60" : "border-line bg-paper hover:border-ink/25")}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", on ? "border-teal bg-teal text-white" : "border-line bg-white")}>{on && <Check size={13} />}</span>
                <span>
                  <span className="block text-[14px] font-semibold">{title}</span>
                  <span className="block text-[12.5px] text-muted">{body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Applications sent so far" hint="(this season)" htmlFor={`${id}-apps`}>
          <Input id={`${id}-apps`} type="number" min={0} max={300} inputMode="numeric" value={sp.applicationsSent} onChange={(e) => setSp({ applicationsSent: Math.max(0, Math.min(300, Number(e.target.value) || 0)) })} />
        </Field>
        <Field label="Interviews done so far" hint="(any employer)" htmlFor={`${id}-ints`}>
          <Input id={`${id}-ints`} type="number" min={0} max={100} inputMode="numeric" value={sp.interviewsDone} onChange={(e) => setSp({ interviewsDone: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
        </Field>
      </div>
      <div>
        <Label>What feels hardest right now?</Label>
        <p className="-mt-1 mb-3 text-[13px] text-muted">Pick up to 3. Those parts of your plan move up and come sooner.</p>
        <ChipGroup options={CHALLENGES.map((c) => ({ id: c.id, label: c.label }))} value={p.challenges!} onChange={(v) => update({ challenges: v })} max={3} />
      </div>
      <div>
        <Label htmlFor={`${id}-hours`}>How many hours a week can you give to this?</Label>
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-paper px-4 py-3">
          <input
            id={`${id}-hours`}
            type="range"
            min={1}
            max={20}
            value={p.weeklyHours}
            onChange={(e) => update({ weeklyHours: Number(e.target.value) })}
            className="w-full accent-[var(--teal)]"
          />
          <span className="w-20 shrink-0 text-right font-display text-lg font-semibold">{p.weeklyHours}h</span>
        </div>
        <p className="mt-1.5 text-[12.5px] text-muted">{paceLabel(p.weeklyHours)}. Deadlines are spaced to fit.</p>
      </div>
    </div>
  );
}

const PRIORITY_LABELS = [
  ["growth", "Career growth"],
  ["workLife", "Work-life balance"],
  ["technical", "Interesting, technical work"],
  ["security", "Job security"],
] as const;

export function PreferenceFields({ p, update }: SectionProps) {
  const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  return (
    <div className="space-y-5">
      <div>
        <Label>Where would you like to work?</Label>
        <div className="flex flex-wrap gap-2">
          {UK_CITIES.map((c) => (
            <Chip key={c} active={p.locationPreferences.includes(c)} onClick={() => update({ locationPreferences: toggle(p.locationPreferences, c) })}>
              {c}
            </Chip>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-[var(--teal)]" checked={p.willingToRelocate} onChange={(e) => update({ willingToRelocate: e.target.checked })} />
          I&apos;m open to relocating within the UK
        </label>
      </div>
      <div>
        <Label>Company types</Label>
        <div className="flex flex-wrap gap-2">
          {COMPANY_TYPES.map((c) => (
            <Chip key={c} active={p.companyTypes.includes(c)} onClick={() => update({ companyTypes: toggle(p.companyTypes, c) })}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <Label>What are you looking for?</Label>
        <div className="flex flex-wrap gap-2">
          {ROLE_TYPES.map((c) => (
            <Chip key={c} active={p.roleTypes.includes(c)} onClick={() => update({ roleTypes: toggle(p.roleTypes, c) })}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <Label>How much does each of these matter to you?</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRIORITY_LABELS.map(([k, label]) => (
            <div key={k} className="rounded-2xl border border-line bg-paper px-4 py-3">
              <div className="flex items-center justify-between text-[13px] font-medium">
                <span>{label}</span>
                <span className="text-muted">{["", "Not much", "A little", "Some", "A lot", "Most"][p.priorities[k]]}</span>
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
      </div>
    </div>
  );
}

export function GraduateStartField({ p, update }: SectionProps) {
  const id = useId();
  if (p.studyStatus !== "graduate") return null;
  return (
    <Field label="When would you like to start work?" htmlFor={`${id}-start`} className="max-w-xs">
      <Input id={`${id}-start`} type="date" value={p.targetStartDate ?? ""} onChange={(e) => update({ targetStartDate: e.target.value || undefined })} />
    </Field>
  );
}

export function VisaFields({ p, update }: SectionProps) {
  const id = useId();
  const est = estimateGraduateRoute({ ...p, visa: { ...p.visa, skipped: false } });
  const setVisa = (patch: Partial<UserProfile["visa"]>) => update({ visa: { ...p.visa, skipped: false, ...patch } });
  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-blue-soft p-4 text-[13.5px] text-ink-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue" />
        <span>Optional and private. Not every international student needs sponsorship. This only changes how roles are flagged and which visa milestones appear. General information, not legal advice. We never ask for passport details.</span>
      </div>
      <label className="mb-5 flex items-center gap-2 text-[14px]">
        <input type="checkbox" className="h-4 w-4 accent-[var(--teal)]" checked={p.visa.skipped} onChange={(e) => update({ visa: { ...p.visa, skipped: e.target.checked } })} />
        I&apos;d rather not use visa information
      </label>
      {!p.visa.skipped && (
        <>
          <Label>Will you need employer visa sponsorship to work in the UK long term?</Label>
          <div className="mb-5">
            <ChipGroup
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["unsure", "Not sure"],
              ] as const}
              value={[p.visa.needsSponsorship]}
              onChange={(v) => v.length && setVisa({ needsSponsorship: v[v.length - 1] })}
            />
          </div>
          <Label>Current visa</Label>
          <div className="mb-5">
            <ChipGroup
              options={[
                ["student", "Student visa"],
                ["graduate", "Graduate visa"],
                ["skilled_worker", "Skilled Worker"],
                ["other", "Another visa"],
                ["none", "None / not applicable"],
                ["unsure", "Not sure"],
              ] as const}
              value={[p.visa.visaType]}
              onChange={(v) => v.length && setVisa({ visaType: v[v.length - 1] })}
            />
          </div>
          <Field label="When does your current visa expire?" hint="(optional)" htmlFor={`${id}-exp`} className="max-w-xs">
            <Input id={`${id}-exp`} type="date" value={p.visa.expiryDate ?? ""} onChange={(e) => setVisa({ expiryDate: e.target.value || undefined })} />
          </Field>
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
        </>
      )}
    </div>
  );
}
