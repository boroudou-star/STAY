import { roleForTrack, TRACK_MAP } from "@/data/careers";
import type { Activity, ContactStatus, Priority, RoadmapPhase, RoadmapTask, ScoredEvent, ScoredOpportunity, TaskCategory, UserProfile } from "@/lib/types";
import { addDays, addMonths, daysBetween, monthsBetween, parseISO, toISO, todayISO } from "@/lib/utils";
import { analyseSkills, displaySkill } from "./skills";
import { estimateGraduateRoute } from "./visa";

/**
 * Deterministic roadmap engine.
 * - Dates, deadlines, priorities and completion are rule-based (predictable on stage, works without AI).
 * - AI is layered on top only for explanations (see /api/ai/*).
 * - Every generated task has a stable `templateId` so regeneration preserves status.
 */

export interface RoadmapContext {
  profile: UserProfile;
  today: string;
  opportunities: ScoredOpportunity[];
  events: ScoredEvent[];
  activity?: Activity;
}

export const EMPTY_ACTIVITY: Activity = { savedOpps: [], appliedOpps: {}, contacts: {}, completedTemplateIds: [] };

const REACHED_OUT: ContactStatus[] = ["contacted", "replied", "chat_scheduled", "completed"];

/** Simple counts derived from what the user has done in STAY. */
export function activityStats(a: Activity) {
  const statuses = Object.values(a.contacts).map((c) => c.status);
  return {
    applied: Object.keys(a.appliedOpps).length,
    saved: a.savedOpps.length,
    reachedOut: statuses.filter((s) => REACHED_OUT.includes(s)).length,
    chatsDone: statuses.filter((s) => s === "completed").length,
    replied: statuses.filter((s) => s === "replied" || s === "chat_scheduled" || s === "completed").length,
    insights: a.insightEntries ?? 0,
    mocks: a.mockInterviews ?? 0,
  };
}

/**
 * Tasks that STAY can mark complete from your activity elsewhere in the app
 * (e.g. logging coffee chats or marking roles as applied).
 */
export const AUTO_COMPLETE_RULES: { templateId: string; met: (st: ReturnType<typeof activityStats>) => boolean; because: string }[] = [
  { templateId: "coffee-first-two", met: (st) => st.reachedOut >= 2, because: "you've reached out to 2 people" },
  { templateId: "coffee-three-done", met: (st) => st.chatsDone >= 3, because: "you've completed 3 coffee chats" },
  { templateId: "grad-apply-5", met: (st) => st.applied >= 5, because: "you've marked 5 roles as applied" },
  { templateId: "grad-apply-10", met: (st) => st.applied >= 10, because: "you've marked 10 roles as applied" },
  { templateId: "interviews-prep", met: (st) => st.mocks >= 3, because: "you've completed 3 mock interviews in STAY" },
  { templateId: "insight-habit", met: (st) => st.insights >= 5, because: "you've saved 5 industry reflections" },
];

export interface Horizon {
  start: string;
  end: string;
  monthsLeft: number;
  anchorLabel: string; // "graduation" | "visa end" | "target start"
  anchorDate: string;
}

export function computeHorizon(p: UserProfile, today = todayISO()): Horizon {
  if (p.studyStatus === "student") {
    const end = p.graduationDate > addMonths(today, 3) ? p.graduationDate : addMonths(today, 3);
    const capped = end > addMonths(today, 36) ? addMonths(today, 36) : end;
    return { start: today, end: capped, monthsLeft: monthsBetween(today, p.graduationDate), anchorLabel: "graduation", anchorDate: p.graduationDate };
  }
  // Graduate: plan to the earliest of visa end / target start window, min 6 months, max 18
  let visaEnd = !p.visa.skipped ? (p.visa.expiryDate ?? estimateGraduateRoute(p)?.estimatedExpiry) : undefined;
  if (!visaEnd && !p.visa.skipped && p.visa.visaType === "graduate") {
    // Estimate: Graduate visa granted around course completion (2 years before 1 Jan 2027, 18 months after; PhD 3 years)
    const months = p.degreeLevel === "phd" ? 36 : p.graduationDate >= "2027-01-01" ? 18 : 24;
    visaEnd = addMonths(p.graduationDate, months);
  }
  let anchorDate = addMonths(today, 12);
  let anchorLabel = "12-month plan";
  if (visaEnd && visaEnd > today) {
    anchorDate = visaEnd;
    anchorLabel = "visa end";
  } else if (p.targetStartDate && p.targetStartDate > today) {
    anchorDate = p.targetStartDate;
    anchorLabel = "target start";
  }
  let end = anchorDate;
  if (end < addMonths(today, 6)) end = addMonths(today, 6);
  if (end > addMonths(today, 18)) end = addMonths(today, 18);
  return { start: today, end, monthsLeft: monthsBetween(today, anchorDate), anchorLabel, anchorDate };
}

/** UK graduate-scheme recruitment typically runs Sep → Jan for roles starting the following autumn. */
function inGradSeason(today: string) {
  const m = parseISO(today).getMonth(); // 0 = Jan
  return m >= 8 || m === 0;
}

/** Typical end of the main graduate-scheme application window for a given graduation year (approximate). */
function gradSchemeWindowEnd(gradYear: number) {
  return `${gradYear - 1}-12-15`;
}

function summerInternshipWindowEnd(gradYear: number) {
  // Internships for the summer before final year typically close in winter, ~18 months before graduation
  return `${gradYear - 1}-01-15`;
}

const PHASE_COLORS = ["var(--teal)", "var(--blue)", "var(--violet)", "var(--sun)"];

export function computePhases(p: UserProfile, h: Horizon): RoadmapPhase[] {
  const total = Math.max(1, daysBetween(h.start, h.end));
  let names: [string, string][];
  if (p.studyStatus === "graduate") {
    names = [
      ["Launch", "Applications live, CV sharp, network warm"],
      ["Interview pipeline", "Assessments, interviews and skill gaps"],
      ["Offer & sponsorship", "Secure an offer that works for your visa"],
      ["Backup paths", "Alternative routes and long-term moves"],
    ];
  } else if (h.monthsLeft <= 12) {
    names = inGradSeason(h.start)
      ? [
          ["Application sprint", "Graduate recruitment is open now"],
          ["Assessments & interviews", "Online tests, interviews, assessment centres"],
          ["Secure an offer", "Close gaps, keep applying, compare offers"],
          ["Graduation & transition", "Visa planning and your start date"],
        ]
      : [
          ["Get ready", "CV, portfolio and target list"],
          ["Applications", "Graduate roles and off-cycle internships"],
          ["Interviews", "Assessments and final rounds"],
          ["Transition", "Graduation and your first role"],
        ];
  } else {
    names = [
      ["Foundation", "Skills, CV, societies and first events"],
      ["Experience", "Internships, projects and research"],
      ["Build credibility", "Measurable outcomes and alumni network"],
      ["Graduate transition", "Graduate applications and interviews"],
    ];
  }
  return names.map(([name, subtitle], i) => ({
    id: `phase-${i}`,
    name,
    subtitle,
    start: addDays(h.start, Math.round((total * i) / 4)),
    end: addDays(h.start, Math.round((total * (i + 1)) / 4) - (i === 3 ? 0 : 1)),
    color: PHASE_COLORS[i],
  }));
}

export function phaseForDate(phases: RoadmapPhase[], iso: string) {
  return phases.find((ph) => iso >= ph.start && iso <= ph.end) ?? (iso < phases[0]?.start ? phases[0] : phases[phases.length - 1]);
}

interface Draft {
  templateId: string;
  title: string;
  description: string;
  deadline: string;
  priority: Priority;
  category: TaskCategory;
  skill?: string;
  sourceOpportunityId?: string;
  sourceEventId?: string;
}

function bumpPriority(d: Draft, today: string): Draft {
  const days = daysBetween(today, d.deadline);
  if (days <= 7 && d.priority !== "low") return { ...d, priority: "urgent" };
  return d;
}

export function generateDrafts(ctx: RoadmapContext): Draft[] {
  const { profile: p, today } = ctx;
  const h = computeHorizon(p, today);
  const skills = analyseSkills(p);
  const track = TRACK_MAP[p.careerGoals[0] ?? "exploring"];
  const roleName = roleForTrack(track.id, p.preferredRoles);
  const needsSponsor = !p.visa.skipped && p.visa.needsSponsorship === "yes";
  const gradYear = parseISO(p.graduationDate).getFullYear();
  const isStudent = p.studyStatus === "student";
  const clamp = (iso: string) => (iso < today ? addDays(today, 3) : iso > h.end ? h.end : iso);
  const at = (days: number) => clamp(addDays(today, days));
  const drafts: Draft[] = [];

  // ---- Foundations (everyone) ----
  drafts.push({
    templateId: "cv-project-led",
    title: "Rewrite your CV around 2–3 strongest projects",
    description: `Make it one page and lead with outcomes (what you built, how you measured it). Tailor the top section to ${roleName} roles.`,
    deadline: at(7),
    priority: "high",
    category: "cv",
    skill: "CV writing",
  });
  drafts.push({
    templateId: "linkedin-refresh",
    title: "Refresh LinkedIn: headline, About and featured projects",
    description: `Use a headline like "${p.degree || "Student"} @ ${p.university || "university"} | ${track.label}". Pin your best GitHub/project link.`,
    deadline: at(10),
    priority: "medium",
    category: "networking",
  });
  drafts.push({
    templateId: "coffee-first-two",
    title: "Send 2 coffee-chat messages",
    description: "Use the Coffee Chats page to find people in your target roles and send short, personal notes. Aim for a 15-minute call.",
    deadline: at(14),
    priority: "high",
    category: "networking",
  });
  drafts.push({
    templateId: "coffee-three-done",
    title: "Complete 3 coffee chats and log what you learned",
    description: "Record one insight per chat (hiring timelines, skills they value, teams to target).",
    deadline: at(isStudent && h.monthsLeft > 12 ? 75 : 45),
    priority: "medium",
    category: "networking",
  });

  // ---- Skill gaps → learning tasks ----
  skills.gaps
    .filter((g) => g.importance === "core")
    .slice(0, 3)
    .forEach((g, i) => {
      drafts.push({
        templateId: `gap-${g.canonical}`,
        title: `Build ${displaySkill(g.canonical)}: ${g.learn[0].charAt(0).toLowerCase() + g.learn[0].slice(1)}`,
        description: `${g.why} Then: ${g.learn[1] ?? "apply it in a project"}.`,
        deadline: at(21 + i * 14),
        priority: i === 0 ? "high" : "medium",
        category: "skills",
        skill: displaySkill(g.canonical),
      });
    });

  // ---- Flagship project ----
  const proj = skills.projects[0];
  if (proj) {
    drafts.push({
      templateId: `project-${proj.id}`,
      title: `Project: ${proj.title}`,
      description: proj.description,
      deadline: at(isStudent ? (h.monthsLeft > 12 ? 90 : 60) : 40),
      priority: "high",
      category: "projects",
      skill: proj.skills.map(displaySkill).slice(0, 2).join(", "),
    });
  }

  // ---- Events ----
  const topEvent = ctx.events[0];
  if (topEvent) {
    drafts.push({
      templateId: `evt-${topEvent.event.id}`,
      title: `Attend: ${topEvent.event.name}`,
      description: topEvent.explanation,
      deadline: clamp(topEvent.event.date),
      priority: "medium",
      category: "events",
      sourceEventId: topEvent.event.id,
    });
  }

  // ---- Top opportunities → application tasks placed on (example) deadlines ----
  ctx.opportunities
    .filter((s) => s.eligible !== false && s.score >= 60 && s.opportunity.deadline)
    .slice(0, 2)
    .forEach((s) => {
      const o = s.opportunity;
      drafts.push({
        templateId: `opp-${o.id}`,
        title: `Apply: ${o.title} — ${o.company}`,
        description: `${s.fitSummary} Submit a few days before the closing date.`,
        deadline: clamp(addDays(o.deadline!, -2)),
        priority: daysBetween(today, o.deadline!) <= 14 ? "urgent" : "high",
        category: "applications",
        sourceOpportunityId: o.id,
      });
    });

  if (isStudent) {
    if (p.university) {
      drafts.push({
        templateId: "societies-join",
        title: `Join 2 societies linked to ${track.noun}`,
        description: `Look for: ${track.societies.join(", ")}. Society workshops and hackathons often matter as much as official careers events.`,
        deadline: at(10),
        priority: "medium",
        category: "events",
      });
    }

    if (h.monthsLeft <= 14) {
      // Final-year / master's: graduate recruitment
      const windowEnd = gradSchemeWindowEnd(gradYear);
      const seasonOpen = today <= windowEnd;
      drafts.push({
        templateId: "grad-apply-5",
        title: `Apply to 5 graduate schemes or junior ${roleName} roles`,
        description: seasonOpen
          ? "Many UK graduate schemes open in September and close between October and January — some close early or when full. Check each employer's deadline."
          : "The main autumn window has largely passed, but many employers recruit year-round and off-cycle. Focus on rolling and entry-level roles.",
        deadline: seasonOpen ? clamp(windowEnd < addDays(today, 35) ? windowEnd : addDays(today, 35)) : at(30),
        priority: "urgent",
        category: "applications",
      });
      drafts.push({
        templateId: "grad-apply-10",
        title: "Reach 10+ total applications, tracked in STAY",
        description: "Keep momentum: mark each role as applied on the Opportunities page.",
        deadline: at(75),
        priority: "high",
        category: "applications",
      });
      drafts.push({
        templateId: "assessments-prep",
        title: "Practise online assessments (coding / numerical / situational)",
        description: "Do timed practice twice a week; most graduate schemes screen with online tests.",
        deadline: at(35),
        priority: "high",
        category: "interviews",
      });
      drafts.push({
        templateId: "interviews-prep",
        title: "Run 3 mock interviews (1 technical, 2 behavioural)",
        description: "Use STAY's Interview Prep (mock interviews with feedback), your careers service or a friend. Prepare STAR stories from your projects.",
        deadline: at(60),
        priority: "high",
        category: "interviews",
      });
      drafts.push({
        templateId: "assessment-centres",
        title: "Prepare for assessment centres and final rounds",
        description: "Group exercises, presentations and case studies — practise presenting a project in 5 minutes.",
        deadline: at(110),
        priority: "medium",
        category: "interviews",
      });
      if (!p.experience.internships.trim()) {
        drafts.push({
          templateId: "alt-experience",
          title: "Add real-world experience: open source, research assistance or a competition",
          description: "No internship yet? Contribute to an open-source project, ask a lecturer about research assistance, or enter a data/AI competition.",
          deadline: at(50),
          priority: "medium",
          category: "projects",
        });
      }
      drafts.push({
        templateId: "offers-compare",
        title: needsSponsor ? "Compare offers — including sponsorship and start dates" : "Compare offers and start dates",
        description: needsSponsor
          ? "Ask each employer in writing whether the specific role can be sponsored under the Skilled Worker route, and when."
          : "Weigh growth, salary and team — use your priorities from onboarding.",
        deadline: clamp(addMonths(p.graduationDate, -2)),
        priority: "medium",
        category: needsSponsor ? "visa" : "applications",
      });
    } else {
      // Earlier-stage students: internships and building experience
      const internEnd = summerInternshipWindowEnd(gradYear);
      if (h.monthsLeft > 26) {
        drafts.push({
          templateId: "spring-insights",
          title: "Apply to 3 spring insight weeks",
          description: "First-year insight programmes usually open in autumn and close in winter. Great for early exposure.",
          deadline: at(45),
          priority: "high",
          category: "applications",
        });
      }
      drafts.push({
        templateId: "summer-internships",
        title: "Apply to 8 summer internships or research placements",
        description: "Penultimate-year internships often lead to graduate offers. Many close between October and January.",
        deadline: internEnd > today ? clamp(internEnd < addDays(today, 60) ? internEnd : addDays(today, 60)) : at(45),
        priority: "high",
        category: "applications",
      });
      drafts.push({
        templateId: "backup-research",
        title: "Backup plan: ask a lecturer about summer research",
        description: "If internships don't land, a research project, open-source work or a competition is strong alternative experience.",
        deadline: at(120),
        priority: "medium",
        category: "projects",
      });
      drafts.push({
        templateId: "portfolio-metrics",
        title: "Add measurable outcomes to your portfolio",
        description: "For each project: problem, approach, metric, result, limitations.",
        deadline: at(200),
        priority: "low",
        category: "projects",
      });
      drafts.push({
        templateId: "grad-research",
        title: "Shortlist 15 graduate programmes for next autumn",
        description: "Note opening dates — graduate recruitment starts about a year before graduation.",
        deadline: clamp(`${gradYear - 1}-08-15`),
        priority: "medium",
        category: "applications",
      });
      drafts.push({
        templateId: "grad-apply-autumn",
        title: "Apply to graduate schemes in the autumn window",
        description: "Apply early in September–November; some schemes close when full.",
        deadline: clamp(gradSchemeWindowEnd(gradYear)),
        priority: "high",
        category: "applications",
      });
    }

    // Visa milestone for students who'll need to stay
    const est = estimateGraduateRoute(p);
    if (needsSponsor && est) {
      drafts.push({
        templateId: "visa-graduate-plan",
        title: `Plan your Graduate visa application (likely ${est.durationLabel})`,
        description: `${est.basis} Apply before your Student visa expires. General information only — check GOV.UK.`,
        deadline: clamp(addDays(p.graduationDate, -30)),
        priority: "medium",
        category: "visa",
      });
    }
  } else {
    // ---- Graduates ----
    drafts.push({
      templateId: "grad-rhythm",
      title: "Set a weekly rhythm: 5 tailored applications per week",
      description: "Block two sessions a week. Track every application on the Opportunities page.",
      deadline: at(7),
      priority: "urgent",
      category: "applications",
    });
    drafts.push({
      templateId: "grad-apply-10",
      title: `Apply to 10 junior ${roleName} roles or graduate schemes`,
      description: "Mix graduate schemes (some still recruit year-round) with entry-level roles at smaller companies.",
      deadline: at(21),
      priority: "urgent",
      category: "applications",
    });
    drafts.push({
      templateId: "interviews-prep",
      title: "Run 3 mock interviews (1 technical, 2 behavioural)",
      description: "Use STAY's Interview Prep for mock interviews with feedback; many universities also support recent graduates.",
      deadline: at(30),
      priority: "high",
      category: "interviews",
    });
    drafts.push({
      templateId: "grad-assessment-centres",
      title: "Prepare for assessment centres and final rounds",
      description: "Practise presenting a project in 5 minutes, group exercises and case questions.",
      deadline: clamp(addDays(today, Math.round(daysBetween(today, h.end) * 0.35))),
      priority: "high",
      category: "interviews",
    });
    drafts.push({
      templateId: "grad-review-month3",
      title: "Review your pipeline: response rates, interviews, what to change",
      description: "If applications aren't converting, adjust your CV, target roles or company types — and ask a coffee-chat contact for feedback.",
      deadline: clamp(addDays(today, Math.round(daysBetween(today, h.end) * 0.45))),
      priority: "medium",
      category: "applications",
    });
    drafts.push({
      templateId: "grad-offer-check",
      title: needsSponsor ? "Before accepting: confirm sponsorship and start date in writing" : "Compare offers on growth, salary and team",
      description: needsSponsor
        ? "Ask the employer to confirm the specific role can be sponsored and when the Certificate of Sponsorship would be issued."
        : "Use the priorities you set during onboarding to compare.",
      deadline: clamp(addDays(today, Math.round(daysBetween(today, h.end) * 0.62))),
      priority: "medium",
      category: needsSponsor ? "visa" : "applications",
    });
    drafts.push({
      templateId: "grad-skill-refresh",
      title: "Ship a second portfolio project or certification",
      description: "Keeps your profile current while you search and gives you fresh interview stories.",
      deadline: clamp(addDays(today, Math.round(daysBetween(today, h.end) * 0.8))),
      priority: "low",
      category: "projects",
    });
    drafts.push({
      templateId: "grad-short-experience",
      title: "Add short-term experience: contract, freelance or volunteering",
      description: "Recent, relevant work strengthens applications while you search.",
      deadline: at(45),
      priority: "medium",
      category: "projects",
    });
    if (needsSponsor) {
      drafts.push({
        templateId: "sponsor-check",
        title: "Check your target employers on the register of licensed sponsors",
        description: "Being licensed doesn't mean a specific role is sponsored — confirm with the employer for each vacancy.",
        deadline: at(10),
        priority: "high",
        category: "visa",
      });
      const h2 = computeHorizon(p, today);
      if (h2.anchorLabel === "visa end") {
        drafts.push({
          templateId: "sponsored-switch",
          title: "Secure a sponsored offer with time to switch visas",
          description: "Aim to have an offer and Certificate of Sponsorship in progress well before your current visa ends.",
          deadline: clamp(addDays(h2.anchorDate, -120)),
          priority: "high",
          category: "visa",
        });
        drafts.push({
          templateId: "backup-paths",
          title: "Map backup paths if a sponsored role isn't confirmed",
          description: "e.g. further study, other eligible routes, or roles elsewhere. Speak to an adviser — STAY doesn't give legal advice.",
          deadline: clamp(addDays(h2.anchorDate, -90)),
          priority: "medium",
          category: "visa",
        });
      }
    }
  }

  // ---- Commercial awareness habit (everyone) ----
  drafts.push({
    templateId: "insight-habit",
    title: "Build commercial awareness: save 5 reflections in Industry Insights",
    description: "Answer the daily questions on news and podcasts in your area. Your notebook becomes your 'why this industry' answer.",
    deadline: at(21),
    priority: "medium",
    category: "skills",
    skill: "Commercial awareness",
  });

  // ---- Dynamic: react to what the user has done ----
  const act = ctx.activity ?? EMPTY_ACTIVITY;
  const st = activityStats(act);
  const done = new Set(act.completedTemplateIds);

  // Saved roles that haven't been applied to yet
  ctx.opportunities
    .filter((s) => act.savedOpps.includes(s.opportunity.id) && !act.appliedOpps[s.opportunity.id] && s.eligible !== false)
    .slice(0, 3)
    .forEach((s) => {
      const o = s.opportunity;
      if (drafts.some((d) => d.sourceOpportunityId === o.id)) return;
      drafts.push({
        templateId: `opp-${o.id}`,
        title: `Apply to your saved role: ${o.title} — ${o.company}`,
        description: `You saved this role. ${s.missingSkills.length ? `Address ${s.missingSkills.slice(0, 2).join(" and ")} in your cover letter or projects.` : "You match the listed skills — tailor your CV and apply."}`,
        deadline: o.deadline ? clamp(addDays(o.deadline, -2)) : at(10),
        priority: o.deadline && daysBetween(today, o.deadline) <= 14 ? "urgent" : "high",
        category: "applications",
        sourceOpportunityId: o.id,
      });
    });

  // Applications sent → prepare for what comes next
  if (st.applied >= 1) {
    drafts.push({
      templateId: "applied-followup",
      title: `Track responses for your ${st.applied} application${st.applied === 1 ? "" : "s"} and prep for online tests`,
      description: "Online assessments often arrive within 1–2 weeks of applying. Note each company's stages as you hear back.",
      deadline: at(10),
      priority: "high",
      category: "interviews",
    });
  }
  // Applied or saved somewhere specific → practise for that company
  const target = ctx.opportunities.find((s) => act.appliedOpps[s.opportunity.id]) ?? ctx.opportunities.find((s) => act.savedOpps.includes(s.opportunity.id));
  if (target) {
    drafts.push({
      templateId: "mock-company",
      title: `Practise a company mock interview for ${target.opportunity.company}`,
      description: "Interview Prep → Mock interview → Company. Includes 'Why this company?' and commercial-awareness questions.",
      deadline: at(st.applied ? 7 : 14),
      priority: st.applied ? "high" : "medium",
      category: "interviews",
    });
  }
  if (st.applied >= 3) {
    drafts.push({
      templateId: "applied-company-research",
      title: "Research the companies you applied to (products, values, recent news)",
      description: "Prepare one specific 'why this company' answer per application before interviews arrive.",
      deadline: at(14),
      priority: "medium",
      category: "interviews",
    });
  }

  // Networking progress
  if (st.reachedOut >= 1 && st.replied === 0) {
    drafts.push({
      templateId: "coffee-follow-up",
      title: "Follow up once with people who haven't replied (after 7 days)",
      description: "A short, friendly nudge is fine — then move on. Keep reaching out to new people too.",
      deadline: at(7),
      priority: "medium",
      category: "networking",
    });
  }
  if (st.replied >= 1) {
    drafts.push({
      templateId: "coffee-prep-questions",
      title: "Prepare 3 questions for your scheduled coffee chat",
      description: "Use the topics on the Coffee Chats page; send a thank-you note within 24 hours afterwards.",
      deadline: at(5),
      priority: "high",
      category: "networking",
    });
  }

  // Next useful action after completing something
  if (done.has("cv-project-led")) {
    drafts.push({
      templateId: "cv-review",
      title: "Get your new CV reviewed (careers service or a CV clinic)",
      description: "A second pair of eyes catches gaps before deadlines. Check Campus Events for CV clinics.",
      deadline: at(10),
      priority: "medium",
      category: "cv",
    });
  }
  const finishedProject = act.completedTemplateIds.find((t) => t.startsWith("project-") || t.startsWith("user-proj-"));
  if (finishedProject) {
    drafts.push({
      templateId: "project-showcase",
      title: "Showcase your finished project: README, demo link, CV bullet and LinkedIn post",
      description: "Lead with the problem, your approach, a metric and limitations — then use it as an interview story.",
      deadline: at(7),
      priority: "high",
      category: "projects",
    });
  }
  const finishedGaps = act.completedTemplateIds.filter((t) => t.startsWith("gap-") || t.startsWith("user-skill-")).length;
  if (finishedGaps >= 1) {
    drafts.push({
      templateId: "skills-prove-it",
      title: "Prove a new skill in public: a short notebook, blog post or repo",
      description: "Recruiters trust evidence. A small public artefact makes a new skill credible.",
      deadline: at(21),
      priority: "medium",
      category: "skills",
    });
  }

  // Urgency + increasing priority as the anchor approaches
  const nearAnchor = h.monthsLeft <= 6;
  return drafts.map((d) => {
    let out = bumpPriority(d, today);
    if (nearAnchor && out.category === "applications" && out.priority === "high") out = { ...out, priority: "urgent" };
    return out;
  });
}

export interface MergeResult {
  tasks: RoadmapTask[];
  added: number;
  removed: number;
  keptCompleted: number;
}

/**
 * Merge freshly generated drafts with existing tasks.
 * Completed / in-progress tasks are always preserved, user-edited dates are kept,
 * custom and user-added tasks are never touched.
 */
export function mergeRoadmap(existing: RoadmapTask[], drafts: Draft[], now = new Date().toISOString()): MergeResult {
  const byTemplate = new Map(existing.filter((t) => t.templateId).map((t) => [t.templateId!, t]));
  const userLinkedOpps = new Set(existing.filter((t) => t.origin !== "engine" && t.sourceOpportunityId).map((t) => t.sourceOpportunityId));
  const userLinkedEvents = new Set(existing.filter((t) => t.origin !== "engine" && t.sourceEventId).map((t) => t.sourceEventId));
  const draftIds = new Set(drafts.map((d) => d.templateId));
  let added = 0;
  let removed = 0;
  let keptCompleted = 0;

  const next: RoadmapTask[] = [];
  for (const d of drafts) {
    if (d.sourceOpportunityId && userLinkedOpps.has(d.sourceOpportunityId)) continue;
    if (d.sourceEventId && userLinkedEvents.has(d.sourceEventId)) continue;
    const prev = byTemplate.get(d.templateId);
    if (prev) {
      next.push({
        ...prev,
        title: d.title,
        description: d.description,
        category: d.category,
        skill: d.skill,
        priority: prev.status === "completed" ? prev.priority : d.priority,
        deadline: prev.deadlineEditedByUser || prev.status === "completed" ? prev.deadline : d.deadline,
      });
    } else {
      added++;
      next.push({
        id: `t_${d.templateId}`,
        templateId: d.templateId,
        title: d.title,
        description: d.description,
        deadline: d.deadline,
        priority: d.priority,
        category: d.category,
        skill: d.skill,
        status: "todo",
        origin: "engine",
        sourceOpportunityId: d.sourceOpportunityId,
        sourceEventId: d.sourceEventId,
        createdAt: now,
      });
    }
  }

  for (const t of existing) {
    if (t.origin !== "engine") {
      next.push(t);
      continue;
    }
    if (t.templateId && draftIds.has(t.templateId)) continue;
    if (t.status === "completed" || t.status === "in_progress") {
      if (t.status === "completed") keptCompleted++;
      next.push(t);
    } else removed++;
  }

  return { tasks: sortTasks(next), added, removed, keptCompleted };
}

export function sortTasks(tasks: RoadmapTask[]) {
  return [...tasks].sort((a, b) => a.deadline.localeCompare(b.deadline));
}

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** The next best actions: open tasks ranked by urgency, priority and date. */
export function topPriorities(tasks: RoadmapTask[], n = 3, today = todayISO()) {
  return tasks
    .filter((t) => t.status !== "completed")
    .map((t) => {
      const days = daysBetween(today, t.deadline);
      const overdue = days < 0;
      return { t, rank: (overdue ? -1 : 0) + PRIORITY_RANK[t.priority] * 2 + Math.max(0, Math.min(days, 90)) / 30 + (t.status === "in_progress" ? -0.5 : 0) };
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, n)
    .map((x) => x.t);
}

export function progress(tasks: RoadmapTask[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100);
}

export function completedThisWeek(tasks: RoadmapTask[], now = new Date()) {
  const weekAgo = toISO(new Date(now.getTime() - 7 * 86_400_000));
  return tasks.filter((t) => t.status === "completed" && t.completedAt && t.completedAt.slice(0, 10) >= weekAgo).length;
}
