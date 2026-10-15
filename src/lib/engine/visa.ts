import type { UserProfile } from "@/lib/types";
import { addMonths, daysBetween, formatDate, todayISO } from "@/lib/utils";

/**
 * General information only — not legal advice.
 * Facts here reflect UK Home Office rules confirmed in October 2025:
 * Graduate route grants for applications made on or after 1 January 2027 are
 * 18 months for bachelor's/master's graduates (previously 2 years); PhD graduates keep 3 years.
 * Always defer to GOV.UK for the current rules.
 */

export const GRADUATE_ROUTE_CHANGE_DATE = "2027-01-01";

export const VISA_LINKS = {
  graduate: "https://www.gov.uk/graduate-visa",
  skilledWorker: "https://www.gov.uk/skilled-worker-visa",
  sponsorRegister: "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers",
  studentWork: "https://www.gov.uk/student-visa/work",
};

export interface GraduateRouteEstimate {
  /** Earliest plausible application date (after course completion) — an assumption, shown to the user */
  assumedApplicationDate: string;
  durationMonths: number;
  durationLabel: string;
  basis: string;
  estimatedExpiry: string;
}

export function estimateGraduateRoute(p: UserProfile): GraduateRouteEstimate | null {
  if (p.visa.skipped) return null;
  if (p.visa.visaType !== "student" && p.visa.visaType !== "unsure") return null;
  const applyOn = p.graduationDate; // assumption: apply around course completion
  const phd = p.degreeLevel === "phd";
  const after = applyOn >= GRADUATE_ROUTE_CHANGE_DATE;
  const months = phd ? 36 : after ? 18 : 24;
  return {
    assumedApplicationDate: applyOn,
    durationMonths: months,
    durationLabel: phd ? "3 years" : after ? "18 months" : "2 years",
    basis: phd
      ? "PhD graduates are granted 3 years."
      : after
        ? "Applications made on or after 1 January 2027 by bachelor's/master's graduates are granted 18 months."
        : "Applications made before 1 January 2027 are granted 2 years; from 1 January 2027 it is 18 months.",
    estimatedExpiry: addMonths(applyOn, months),
  };
}

export interface VisaSummary {
  relevant: boolean;
  headline: string;
  points: { label: string; text: string; kind: "fact" | "estimate" | "unknown" | "action" }[];
  urgentDeadline?: { label: string; date: string; daysLeft: number };
}

export function visaSummary(p: UserProfile, today = todayISO()): VisaSummary {
  if (p.visa.skipped) {
    return { relevant: false, headline: "You skipped visa questions — STAY works normally without them.", points: [] };
  }
  if (p.visa.needsSponsorship === "no") {
    return {
      relevant: false,
      headline: "You said you don't need employer sponsorship, so STAY won't filter by it.",
      points: [],
    };
  }

  const points: VisaSummary["points"] = [];
  let urgent: VisaSummary["urgentDeadline"];

  if (p.visa.expiryDate) {
    const d = daysBetween(today, p.visa.expiryDate);
    urgent = { label: "Current visa expires", date: p.visa.expiryDate, daysLeft: d };
    points.push({ label: "Your visa", text: `You told us your current visa expires on ${formatDate(p.visa.expiryDate)} (${d} days).`, kind: "fact" });
  }

  const est = estimateGraduateRoute(p);
  if (est) {
    points.push({
      label: "Graduate route",
      text: `If you apply after your course ends (we assumed around ${formatDate(est.assumedApplicationDate)}), the Graduate visa would typically last ${est.durationLabel}. ${est.basis} You must apply before your Student visa expires.`,
      kind: "estimate",
    });
    points.push({
      label: "Planning horizon",
      text: `On that assumption you'd have until roughly ${formatDate(est.estimatedExpiry)} to move into a sponsored role if you want to stay longer.`,
      kind: "estimate",
    });
  }
  if (p.visa.visaType === "graduate") {
    points.push({
      label: "Graduate visa",
      text: "On a Graduate visa you can work without sponsorship, but it can't be extended. Plan your switch to a sponsored route well before it ends.",
      kind: "fact",
    });
  }
  points.push({
    label: "Sponsorship",
    text: "Skilled Worker sponsorship depends on the employer holding a licence AND the specific role meeting skill and salary requirements. Being on the sponsor register does not mean a particular vacancy offers sponsorship.",
    kind: "fact",
  });
  points.push({ label: "Unknowns", text: "Salary thresholds, occupation codes and your personal circumstances all affect eligibility. STAY does not assess these.", kind: "unknown" });
  points.push({ label: "Action", text: "Ask employers about sponsorship early, and check GOV.UK or your university's international student advisers.", kind: "action" });

  return {
    relevant: true,
    headline: est
      ? `Plan around a Graduate visa window of about ${est.durationLabel}, then a sponsored role.`
      : "Factor sponsorship into which roles you prioritise.",
    points,
    urgentDeadline: urgent,
  };
}
