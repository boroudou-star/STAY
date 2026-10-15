import { CHALLENGES, TRACK_MAP } from "@/data/careers";
import type { Challenge, StartingPoint, UserProfile } from "@/lib/types";
import { uid } from "@/lib/utils";

export const EMPTY_START: StartingPoint = { cvReady: false, linkedinReady: false, inSocieties: false, reachedOut: false, applicationsSent: 0, interviewsDone: 0 };
export const DEFAULT_HOURS = 5;

/** A new, empty profile for onboarding. */
export function blankProfile(now = new Date()): UserProfile {
  const iso = now.toISOString();
  const y = now.getFullYear();
  return {
    id: uid("user"),
    name: "",
    university: "",
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
    experience: { internships: "", partTime: "", projects: "", research: "", societyRoles: "", volunteering: "", certifications: "", cvText: "" },
    locationPreferences: ["London"],
    willingToRelocate: false,
    companyTypes: [],
    roleTypes: [],
    priorities: { salary: 3, growth: 4, workLife: 3, technical: 4, security: 3 },
    visa: { skipped: false, needsSponsorship: "unsure", visaType: "unsure" },
    targetCompanies: [],
    weeklyHours: DEFAULT_HOURS,
    challenges: [],
    startingPoint: { ...EMPTY_START },
    goalStatement: "",
    isDemo: false,
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Fills in answers that older saved profiles don't have yet. */
export function withDefaults(p: UserProfile): UserProfile {
  return {
    ...p,
    targetCompanies: p.targetCompanies ?? [],
    weeklyHours: p.weeklyHours ?? DEFAULT_HOURS,
    challenges: p.challenges ?? [],
    startingPoint: { ...EMPTY_START, ...(p.startingPoint ?? {}) },
    goalStatement: p.goalStatement ?? "",
  };
}

/** "2026-06" → "2026-06-30" (28th for February). */
export function monthToDate(month: string) {
  return `${month}-${month.endsWith("-02") ? "28" : "30"}`;
}

export function challengeLabel(c: Challenge) {
  return CHALLENGES.find((x) => x.id === c)?.short ?? c;
}

/** Deadlines stretch or tighten with the time someone actually has. */
export function paceFactor(hours = DEFAULT_HOURS) {
  if (hours <= 2) return 1.6;
  if (hours <= 4) return 1.25;
  if (hours <= 7) return 1;
  if (hours <= 12) return 0.8;
  return 0.65;
}

export function paceLabel(hours = DEFAULT_HOURS) {
  if (hours <= 2) return "A light plan: fewer, well-spaced tasks";
  if (hours <= 4) return "A steady plan with breathing room";
  if (hours <= 7) return "A standard pace";
  if (hours <= 12) return "A faster plan with tighter deadlines";
  return "An intensive plan";
}

export interface ProfileGap {
  id: string;
  title: string;
  why: string;
  section: string; // anchor on the profile page
}

/** Missing answers that would make STAY noticeably more specific, most useful first. */
export function profileGaps(raw: UserProfile): ProfileGap[] {
  const p = withDefaults(raw);
  const gaps: ProfileGap[] = [];
  if (!p.targetCompanies!.length) gaps.push({ id: "companies", title: "Add your target companies", why: "Boosts their roles, adds research tasks and coffee-chat searches for them.", section: "goals" });
  if (!p.technicalSkills.length && !p.professionalSkills.length) gaps.push({ id: "skills", title: "Add your skills", why: "Skill gaps, role scores and learning tasks are based on them.", section: "skills" });
  if (!p.experience.cvText.trim()) gaps.push({ id: "cv", title: "Paste your CV", why: "Interview Prep asks questions about your own CV, and STAY can pull out skills.", section: "skills" });
  if (!p.experience.projects.trim() && !p.experience.internships.trim()) gaps.push({ id: "experience", title: "Describe a project or role", why: "Used for interview stories and to judge experience requirements.", section: "skills" });
  if (!p.preferredRoles.length) gaps.push({ id: "roles", title: "Name the roles you want", why: "Tasks, searches and messages use your exact role titles.", section: "goals" });
  if (!p.challenges!.length) gaps.push({ id: "challenges", title: "Tell STAY what feels hardest", why: "Those parts of your plan move up.", section: "start" });
  if (!p.visa.skipped && p.visa.needsSponsorship === "unsure") gaps.push({ id: "visa", title: "Answer the sponsorship question", why: "Changes how roles are flagged and adds visa milestones if needed.", section: "visa" });
  if (!p.goalStatement!.trim()) gaps.push({ id: "goal", title: "Write your one-line goal", why: "Keeps your dashboard focused on what success means to you.", section: "about" });
  return gaps;
}

/** How much of the useful profile is filled in, 0 to 100. */
export function profileCompleteness(p: UserProfile) {
  const total = 8;
  return Math.round(((total - profileGaps(p).length) / total) * 100);
}

/** Plain-English explanation of how the user's answers shaped their plan. */
export function tailoringNotes(raw: UserProfile): string[] {
  const p = withDefaults(raw);
  const sp = p.startingPoint!;
  const notes: string[] = [];
  const track = TRACK_MAP[p.careerGoals[0] ?? "exploring"];
  notes.push(`Built around ${track.noun}${p.preferredRoles[0] ? `, aiming for ${p.preferredRoles.slice(0, 2).join(" or ")} roles` : ""}, ${p.studyStatus === "student" ? "timed to UK recruitment seasons before you graduate" : "timed to your start date"}.`);
  notes.push(`${paceLabel(p.weeklyHours)} for about ${p.weeklyHours} hour${p.weeklyHours === 1 ? "" : "s"} a week.`);
  const done = [sp.cvReady && "your CV", sp.linkedinReady && "LinkedIn", sp.inSocieties && "societies", sp.reachedOut && "first outreach"].filter(Boolean) as string[];
  if (done.length) notes.push(`Already ticked off: ${joinList(done)}, because you said ${done.length === 1 ? "it's" : "they're"} done.`);
  if (sp.applicationsSent) notes.push(`Your ${sp.applicationsSent} application${sp.applicationsSent === 1 ? "" : "s"} so far count towards your application goals.`);
  if (p.challenges!.length) notes.push(`Moved up because you find them hardest: ${joinList(p.challenges!.map(challengeLabel))}.`);
  if (p.targetCompanies!.length) notes.push(`${joinList(p.targetCompanies!.slice(0, 3))} ${p.targetCompanies!.length === 1 ? "is" : "are"} boosted in opportunities and used for research, coffee chats, insights and interview prep.`);
  if (!p.visa.skipped && p.visa.needsSponsorship === "yes") notes.push("Sponsorship is checked on every role, with visa milestones in your plan.");
  return notes;
}

export function joinList(xs: string[]) {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
