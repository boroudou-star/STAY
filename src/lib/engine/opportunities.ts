import { canonicalSkill, TRACK_MAP } from "@/data/careers";
import { universitySources } from "@/data/universities";
import { getRealProgrammes, STAGE_NOTE, TYPICAL_WINDOW } from "@/data/programmes";
import type { MatchFactor, Opportunity, ProgrammeStage, ScoredOpportunity, UserProfile } from "@/lib/types";
import { daysBetween, todayISO } from "@/lib/utils";
import { displaySkill, userSkills } from "./skills";

/* ------------------------------------------------------------------ */
/* Retrieval: provider interface so real connectors can be added later */
/* ------------------------------------------------------------------ */

export interface OpportunityProvider {
  id: string;
  label: string;
  isLive: boolean;
  list(today: string): Promise<Opportunity[]> | Opportunity[];
}

/** Real UK programmes from employers' official careers pages (src/data/programmes.ts). */
export const RealProgrammeProvider: OpportunityProvider = {
  id: "programmes",
  label: "Real UK programmes",
  isLive: false,
  list: () => getRealProgrammes(),
};

// Live vacancies (Adzuna) are merged in separately when API keys are set.
export const OPPORTUNITY_PROVIDERS: OpportunityProvider[] = [RealProgrammeProvider];

/**
 * Whether a programme's usual audience matches the user. Programmes recruit about a year ahead:
 * from August, applications are for programmes that run or start the following year.
 */
export function stageFit(stage: ProgrammeStage, p: UserProfile, today = todayISO()): { fit: boolean | "unknown"; detail: string } {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const cycle = m >= 8 ? y + 1 : y;
  const grad = Number(p.graduationDate.slice(0, 4));
  const student = p.studyStatus === "student";
  const note = STAGE_NOTE[stage];
  const yes = (why: string) => ({ fit: true as const, detail: `${note}. ${why}` });
  const no = (why: string) => ({ fit: false as const, detail: `${note}. ${why}` });
  const maybe = (why: string) => ({ fit: "unknown" as const, detail: `${note}. ${why}` });
  switch (stage) {
    case "first_year":
      return student && grad >= cycle + 2 ? yes(`You graduate in ${grad}, so you're early enough.`) : no(`You graduate in ${grad}, so this is probably too early-stage for you.`);
    case "penultimate":
      if (student && grad === cycle + 1) return yes(`You graduate in ${grad}, so ${cycle}'s programme fits.`);
      if (student && p.degreeLevel === "masters" && grad === cycle) return maybe("Some programmes accept master's students; check the eligibility.");
      return no(student && grad > cycle + 1 ? `You graduate in ${grad}; aim for this in ${grad - 2}.` : `You graduate in ${grad}, so look at graduate schemes instead.`);
    case "placement_year":
      return student && grad >= cycle + 2 ? yes("Your course leaves room for a placement year.") : maybe("Only possible if your degree includes or allows a placement year.");
    case "final_or_graduate":
      if (student && grad <= cycle) return yes(`You graduate in ${grad}, so this is the right time to apply.`);
      if (!student && grad >= y - 3) return yes(`You graduated in ${grad}.`);
      if (student) return no(`You graduate in ${grad}; apply in the autumn of ${grad - 1}.`);
      return maybe("Some schemes limit how long ago you graduated; check the page.");
    case "phd":
      return p.degreeLevel === "phd" ? yes("You're doing a PhD.") : no("Your profile isn't a PhD.");
    default:
      return student ? yes("You're a current student.") : maybe("Check whether graduates can apply.");
  }
}

export function listOpportunitiesSync(today = todayISO()): Opportunity[] {
  return OPPORTUNITY_PROVIDERS.flatMap((p) => {
    const r = p.list(today);
    return Array.isArray(r) ? r : [];
  });
}

/* ------------------------------------------------------------------ */
/* Scoring: transparent, deterministic requirement alignment           */
/* ------------------------------------------------------------------ */

export const OPPORTUNITY_TYPE_LABEL: Record<Opportunity["type"], string> = {
  placement_year: "Placement year",
  summer_internship: "Summer internship",
  off_cycle_internship: "Off-cycle internship",
  spring_insight: "Spring insight",
  research_placement: "Research placement",
  industrial_project: "Industrial placement",
  graduate_scheme: "Graduate scheme",
  entry_level: "Entry-level job",
};

const WEIGHTS = {
  role: 0.24,
  skills: 0.26,
  degree: 0.1,
  experience: 0.1,
  location: 0.1,
  graduation: 0.1,
  visa: 0.06,
  deadline: 0.04,
};

/** Onboarding role-type labels → opportunity types */
export const ROLE_TYPE_MAP: Record<string, Opportunity["type"][]> = {
  "Graduate scheme": ["graduate_scheme"],
  "Summer internship": ["summer_internship"],
  "Spring insight": ["spring_insight"],
  "Off-cycle internship": ["off_cycle_internship"],
  "Research placement": ["research_placement", "placement_year"],
  "Entry-level job": ["entry_level"],
  "Part-time / project": ["industrial_project"],
  "Placement year": ["placement_year"],
};

/** First £ figure in a salary string, per year. Monthly figures are annualised. */
export function parseSalary(s?: string): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/£\s?(\d+(?:\.\d+)?)(k)?/i);
  if (!m) return null;
  let n = Number(m[1]) * (m[2] ? 1000 : 1);
  if (/month/i.test(s)) n *= 12;
  return Math.round(n);
}

function ym(iso: string) {
  return iso.slice(0, 7);
}

function degreeMatches(o: Opportunity, p: UserProfile) {
  const fields = o.degreeFields.map((f) => f.toLowerCase());
  if (!fields.length) return { score: 0.6, detail: "Degree requirements not verified", unknown: true };
  if (fields.includes("any")) return { score: 1, detail: "Open to any degree" };
  const deg = `${p.degree} ${p.subjectArea}`.toLowerCase();
  if (fields.some((f) => f !== "any stem" && deg.includes(f.replace(/s$/, "")))) return { score: 1, detail: `Asks for ${o.degreeFields.join(", ")}, which matches your degree` };
  const stem = /(computer|math|physics|engineer|science|statistic|biolog|chemi|data|bioinf|econom)/.test(deg);
  if (fields.includes("any stem") && stem) return { score: 0.85, detail: "Open to STEM degrees, and yours qualifies" };
  return { score: 0.35, detail: `Prefers ${o.degreeFields.join(", ")}` };
}

export function scoreOpportunity(o: Opportunity, p: UserProfile, today = todayISO()): ScoredOpportunity {
  const factors: MatchFactor[] = [];
  const skills = userSkills(p);

  // Role interest
  const trackHits = o.tracks.filter((t) => p.careerGoals.includes(t));
  const primaryHit = p.careerGoals[0] && o.tracks.includes(p.careerGoals[0]);
  const roleScore = trackHits.length === 0 ? 0.1 : primaryHit ? 1 : 0.75;
  factors.push({
    key: "role",
    label: "Role interest",
    weight: WEIGHTS.role,
    score: roleScore,
    status: roleScore >= 0.75 ? "good" : "gap",
    detail: trackHits.length ? `Matches your interest in ${trackHits.map((t) => TRACK_MAP[t].label).join(", ")}` : "Outside your selected career areas",
  });

  // Skills
  const matched: string[] = [];
  const missing: string[] = [];
  for (const s of o.skillsRequired) {
    const c = canonicalSkill(s);
    if (skills.some((u) => u.canonical === c)) matched.push(s);
    else missing.push(s);
  }
  const fromDesc = o.skillsSource === "description";
  const skillScore = o.skillsRequired.length ? matched.length / o.skillsRequired.length : 0.6;
  factors.push({
    key: "skills",
    label: fromDesc ? "Skills mentioned in listing" : o.skillsSource === "typical" ? "Typical skills for this role" : "Required skills",
    weight: WEIGHTS.skills,
    score: skillScore,
    status: !o.skillsRequired.length ? "unknown" : skillScore >= 0.75 ? "good" : skillScore >= 0.4 ? "partial" : "gap",
    detail: o.skillsRequired.length
      ? `You've shown ${matched.length} of ${o.skillsRequired.length} ${fromDesc ? "skills mentioned in the listing" : o.skillsSource === "typical" ? "skills typically asked for in this kind of role" : "listed skills"}${missing.length ? `, missing ${missing.join(", ")}` : ""}`
      : "No specific skills found in the listing, not verified",
  });

  // Degree
  const deg = degreeMatches(o, p);
  factors.push({ key: "degree", label: "Degree relevance", weight: WEIGHTS.degree, score: deg.score, status: "unknown" in deg ? "unknown" : deg.score >= 0.8 ? "good" : "partial", detail: deg.detail });

  // Experience
  const hasExp = Boolean(p.experience.internships.trim() || p.experience.partTime.trim() || p.experience.research.trim());
  const hasProjects = Boolean(p.experience.projects.trim());
  let expScore = 1;
  let expDetail = "No prior experience required";
  if (o.experienceLevel === "some") {
    expScore = hasExp ? 1 : hasProjects ? 0.6 : 0.3;
    expDetail = hasExp ? "Asks for some experience, and you have relevant experience" : hasProjects ? "Asks for some experience, and your projects partly cover this" : "Asks for some experience you haven't listed yet";
  } else if (o.experienceLevel === "unknown") {
    expScore = 0.6;
    expDetail = "Experience requirements not verified";
  } else if (o.experienceLevel === "1yr+") {
    expScore = hasExp ? 0.5 : 0.15;
    expDetail = "Asks for 1+ year of experience";
  }
  factors.push({ key: "experience", label: "Experience level", weight: WEIGHTS.experience, score: expScore, status: o.experienceLevel === "unknown" ? "unknown" : expScore >= 0.8 ? "good" : expScore >= 0.5 ? "partial" : "gap", detail: expDetail });

  // Location
  const prefs = p.locationPreferences.map((l) => l.toLowerCase());
  const loc = o.location.toLowerCase();
  const locMatch = prefs.length === 0 || prefs.some((l) => loc.includes(l.replace(" (uk)", ""))) || loc.includes("remote");
  const locScore = locMatch ? 1 : p.willingToRelocate ? 0.6 : 0.2;
  factors.push({
    key: "location",
    label: "Location",
    weight: WEIGHTS.location,
    score: locScore,
    status: locScore >= 0.8 ? "good" : locScore >= 0.5 ? "partial" : "gap",
    detail: locMatch ? `${o.location} fits your preferences` : p.willingToRelocate ? `${o.location}, but you're open to relocating` : `${o.location} isn't in your preferred locations`,
  });

  // Graduation eligibility
  const grad = ym(p.graduationDate);
  let eligible: boolean | "unknown" = "unknown";
  let gradScore = 0.6;
  let gradDetail = `Eligibility: ${o.eligibility.note}`;
  if (o.eligibility.gradFrom || o.eligibility.gradTo) {
    const okFrom = !o.eligibility.gradFrom || grad >= o.eligibility.gradFrom;
    const okTo = !o.eligibility.gradTo || grad <= o.eligibility.gradTo;
    eligible = okFrom && okTo;
    gradScore = eligible ? 1 : 0;
    gradDetail = eligible
      ? `Your graduation (${grad}) fits: ${o.eligibility.note}`
      : `Likely not eligible: ${o.eligibility.note}; you graduate ${grad}`;
  } else if (o.stage) {
    const sf = stageFit(o.stage, p, today);
    eligible = sf.fit;
    gradScore = sf.fit === true ? 1 : sf.fit === false ? 0 : 0.6;
    gradDetail = sf.detail;
  }
  factors.push({
    key: "graduation",
    label: o.stage ? "Stage fit" : "Graduation eligibility",
    weight: WEIGHTS.graduation,
    score: gradScore,
    status: eligible === true ? "good" : eligible === false ? "blocker" : "unknown",
    detail: gradDetail,
  });
  if (o.stage && o.campusPages && Object.keys(o.campusPages).some((u) => sameUni(u, p.university))) {
    factors.push({ key: "campus", label: "Recruits at your university", weight: 0.04, score: 1, status: "good", detail: `${o.company} has a page for ${p.university} students` });
  }

  // Visa / sponsorship
  const needs = !p.visa.skipped && p.visa.needsSponsorship === "yes";
  let visaScore = 1;
  let visaStatus: MatchFactor["status"] = "good";
  let visaDetail = "No sponsorship constraint on your profile";
  if (needs) {
    if (o.sponsorshipStatus === "offered") {
      visaDetail = "Listing states sponsorship is available (check it applies to this role and your situation)";
    } else if (o.sponsorshipStatus === "not_offered") {
      visaScore = 0.25;
      visaStatus = "gap";
      visaDetail = "Listing says no sponsorship. Work may still be possible on a Graduate visa, but not long term";
    } else {
      visaScore = 0.55;
      visaStatus = "unknown";
      visaDetail = "Sponsorship not verified. Ask the employer directly";
    }
  }
  // The employer's own words beat our generic line
  if (o.visaNote && !p.visa.skipped && p.visa.needsSponsorship !== "no") visaDetail = o.visaNote;
  factors.push({ key: "visa", label: "Visa / sponsorship", weight: WEIGHTS.visa, score: visaScore, status: visaStatus, detail: visaDetail });

  // Deadline
  let dlScore = 0.7;
  let dlStatus: MatchFactor["status"] = "unknown";
  let dlDetail = o.stage ? `${TYPICAL_WINDOW[o.type]}. Check the official page for this year's dates.` : "Deadline not verified";
  if (o.deadline) {
    const d = daysBetween(today, o.deadline);
    if (d < 0) {
      dlScore = 0;
      dlStatus = "blocker";
      dlDetail = "Deadline has passed";
    } else {
      dlScore = 1;
      dlStatus = d <= 14 ? "partial" : "good";
      dlDetail = d <= 14 ? `Closes in ${d} days, act soon` : `Closes in ${d} days`;
    }
  }
  factors.push({ key: "deadline", label: "Application deadline", weight: WEIGHTS.deadline, score: dlScore, status: dlStatus, detail: dlDetail });

  // ---- Preferences (only scored when the user stated them) ----
  const wantedTypes = p.roleTypes.flatMap((r) => ROLE_TYPE_MAP[r] ?? []);
  if (wantedTypes.length) {
    const hit = wantedTypes.includes(o.type);
    factors.push({
      key: "roleType",
      label: "Role type preference",
      weight: 0.06,
      score: hit ? 1 : 0.35,
      status: hit ? "good" : "partial",
      detail: hit ? `${OPPORTUNITY_TYPE_LABEL[o.type]} is one of the role types you want` : `You didn't select ${OPPORTUNITY_TYPE_LABEL[o.type].toLowerCase()}s`,
    });
  }
  const wantedCompanies = p.companyTypes.filter((c) => c !== "Any");
  if (wantedCompanies.length) {
    const known = Boolean(o.companyType);
    const hit = known && wantedCompanies.includes(o.companyType!);
    factors.push({
      key: "companyType",
      label: "Company type",
      weight: 0.04,
      score: !known ? 0.6 : hit ? 1 : 0.4,
      status: !known ? "unknown" : hit ? "good" : "partial",
      detail: !known ? "Company type not verified" : hit ? `${o.companyType}, matches your preference` : `${o.companyType}, not one of your preferred company types`,
    });
  }
  // Target companies: a boost when it matches, never a penalty when it doesn't
  const target = isTargetCompany(o.company, p.targetCompanies);
  if (target) {
    factors.push({ key: "target", label: "Target company", weight: 0.08, score: 1, status: "good", detail: `${o.company} is one of your target companies` });
  }

  // Priorities nudge the weights (1–5 sliders from onboarding); weights are then normalised.
  const mult: Record<string, number> = {
    skills: 0.8 + p.priorities.technical * 0.08,
    role: 0.8 + p.priorities.technical * 0.04 + p.priorities.growth * 0.04,
    roleType: 0.7 + p.priorities.security * 0.1,
    companyType: 0.7 + p.priorities.workLife * 0.06 + p.priorities.growth * 0.04,
  };
  for (const f of factors) f.weight *= mult[f.key] ?? 1;
  const totalW = factors.reduce((a, f) => a + f.weight, 0);
  for (const f of factors) f.weight = f.weight / totalW;

  let score = factors.reduce((a, f) => a + f.score * f.weight, 0) * 100;
  if (eligible === false) score = Math.min(score, 35);
  if (dlStatus === "blocker") score = Math.min(score, 20);
  score = Math.round(score);

  const fitBits: string[] = [];
  if (target) fitBits.push(`${o.company} is on your target list`);
  if (trackHits.length) fitBits.push(`fits your ${TRACK_MAP[trackHits[0]].noun} goal`);
  if (matched.length) fitBits.push(`you already show ${matched.slice(0, 3).join(", ")}`);
  const toBuild = [...new Set(missing.map((m) => displaySkill(canonicalSkill(m))))].slice(0, 2);
  if (toBuild.length) fitBits.push(`building ${toBuild.join(" and ")} would strengthen it`);
  const fitSummary =
    eligible === false
      ? `Probably not for you right now: ${o.eligibility.note.toLowerCase()}.`
      : fitBits.length
        ? capitalise(fitBits.join("; ")) + "."
        : "Limited overlap with your current profile.";

  return { opportunity: o, score, factors, missingSkills: missing, matchedSkills: matched, eligible, fitSummary };
}

function sameUni(a: string, b: string) {
  return universitySources(a)?.name === universitySources(b)?.name && Boolean(universitySources(b));
}

/** "Google" matches "Google DeepMind" and the other way round. Case-insensitive. */
export function isTargetCompany(company: string, targets: string[] = []) {
  const c = company.toLowerCase().trim();
  if (!c) return false;
  return targets.some((t) => {
    const x = t.toLowerCase().trim();
    return x.length > 1 && (c === x || c.startsWith(`${x} `) || x.startsWith(`${c} `) || c.includes(x));
  });
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function rankOpportunities(list: Opportunity[], p: UserProfile, today = todayISO()) {
  return list
    .map((o) => scoreOpportunity(o, p, today))
    .filter((s) => !(s.opportunity.deadline && s.opportunity.deadline < today))
    .sort((a, b) => b.score - a.score);
}
