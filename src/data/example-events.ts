import { TRACK_MAP } from "@/data/careers";
import { universitySources, uniSearch } from "@/data/universities";
import type { CareerEvent, CareerTrack, EventCategory, UserProfile } from "@/lib/types";
import { addDays } from "@/lib/utils";

/**
 * Example events for university pages STAY can't read automatically (blocked, or built with JavaScript).
 * They show the kinds of events that page usually lists, tailored to the student's goals and skill gaps,
 * so the Events page is never empty. They are never presented as real: each is marked as an example,
 * has no booking link, and points to the real page to find the actual dates.
 */

export type SourceKind = "careers" | "union";

export interface UnreadableSource {
  kind: SourceKind;
  label: string;
  url: string;
}

const SOCIETY: Record<CareerTrack, string> = {
  ai: "AI Society",
  software: "Tech Society",
  data: "Data Science Society",
  consulting: "Consulting Society",
  finance: "Finance Society",
  biotech: "Life Sciences Society",
  research: "Research Society",
  marketing: "Marketing Society",
  engineering: "Engineering Society",
  exploring: "Entrepreneurship Society",
  other: "Careers Society",
};

/** The hands-on event a society in this field typically runs. */
const SOCIETY_FLAGSHIP: Record<
  CareerTrack,
  {
    name: string;
    category: EventCategory;
    skills: string[];
    description: string;
    benefits: string[];
  }
> = {
  ai: {
    name: "AI Hackathon",
    category: "hackathon",
    skills: ["Python", "Machine learning", "Deployment", "Teamwork"],
    description: "Teams of 3–4 build an AI prototype over a day, with mentors from sponsoring companies.",
    benefits: ["A shipped project for your CV", "Meet sponsor engineers"],
  },
  software: {
    name: "24-hour Hackathon",
    category: "hackathon",
    skills: ["Software testing", "Git", "Teamwork"],
    description: "Build and demo a working app in a day. Sponsors run challenges and judge.",
    benefits: ["A shipped project for your CV", "Meet sponsor engineers"],
  },
  data: {
    name: "Datathon: real dataset challenge",
    category: "hackathon",
    skills: ["SQL", "Pandas", "Data visualisation"],
    description: "Analyse a real public dataset in teams and present your findings to a panel.",
    benefits: ["Portfolio analysis", "Presentation practice"],
  },
  consulting: {
    name: "Case Competition",
    category: "workshop",
    skills: ["Case interviews", "Problem solving", "Presentation"],
    description: "Teams crack a business case and present a recommendation to consultants, who give feedback.",
    benefits: ["Case practice under time pressure", "Feedback from consultants"],
  },
  finance: {
    name: "Stock Pitch Competition",
    category: "workshop",
    skills: ["Financial modelling", "Commercial awareness", "Presentation"],
    description: "Pitch a buy or sell idea with a simple valuation to a panel from the industry.",
    benefits: ["Interview-ready market story", "Feedback from practitioners"],
  },
  biotech: {
    name: "From Lab to Industry: Pharma & Biotech Careers Panel",
    category: "panel",
    skills: ["Commercial awareness", "Scientific writing"],
    description: "Scientists and alumni in pharma, biotech and healthcare consulting describe their routes in and what they look for.",
    benefits: ["Understand industry roles", "Find coffee-chat contacts"],
  },
  research: {
    name: "Research Poster Showcase",
    category: "panel",
    skills: ["Presentation", "Scientific writing"],
    description: "Students and PhD researchers present projects; supervisors mention research assistant openings.",
    benefits: ["Find research openings", "Meet supervisors"],
  },
  marketing: {
    name: "Brand Strategy Challenge",
    category: "workshop",
    skills: ["Creativity", "Copywriting", "Presentation"],
    description: "Teams create a campaign for a real brief and pitch it to marketers.",
    benefits: ["A campaign for your portfolio", "Meet marketing professionals"],
  },
  engineering: {
    name: "Design & Build Challenge",
    category: "hackathon",
    skills: ["CAD", "Project management", "Teamwork"],
    description: "Design, build and test a small device against a brief, judged by engineers from industry.",
    benefits: ["A project for your CV", "Meet graduate engineers"],
  },
  exploring: {
    name: "Startup & Careers Taster Night",
    category: "networking",
    skills: ["Communication", "Networking"],
    description: "Short talks from founders and graduates in different sectors, then informal networking.",
    benefits: ["Try out several fields in one evening", "Meet people to follow up with"],
  },
  other: {
    name: "Skills & Careers Workshop",
    category: "workshop",
    skills: ["Communication", "Teamwork"],
    description: "Practical session on applications, interviews and making contacts in your field.",
    benefits: ["Application practice", "Meet peers"],
  },
};

/** Shorter name for event titles, e.g. "University of Manchester" stays, "Imperial College London" → "Imperial". */
function shortUni(uni: string) {
  return uni.replace(/^Imperial College London$/, "Imperial").replace(/^London School of Economics.*$/, "LSE");
}

/** Which of the university's pages STAY couldn't read, from the live check's results. */
export function unreadableSources(
  university: string,
  sources: { url: string; status: string; detail?: string }[],
  status: "idle" | "loading" | "ok" | "unavailable",
): UnreadableSource[] {
  const src = universitySources(university);
  const uni = src?.name ?? (university.trim() || "your university");
  if (!src) {
    // No verified pages for this university: examples point to a search for the real ones
    return [
      {
        kind: "careers",
        label: `${uni} careers service events`,
        url: uniSearch(`${uni} careers service events`),
      },
      {
        kind: "union",
        label: `${uni} students' union and society events`,
        url: uniSearch(`${uni} students union events societies`),
      },
    ];
  }
  if (status === "loading" || status === "idle") return [];
  const unread = (url: string) => {
    const s = sources.find((x) => x.url === url);
    if (!s) return true; // the check never reached it
    return s.status === "blocked" || s.status === "disallowed" || s.status === "error" || (s.status === "none" && /could(n't| not)? be read/i.test(s.detail ?? ""));
  };
  const out: UnreadableSource[] = [];
  const careers = [src.careersEvents, src.careersFairs].filter(Boolean) as {
    label: string;
    url: string;
  }[];
  const careersUnread = careers.filter((l) => unread(l.url));
  if (careersUnread.length === careers.length) out.push({ kind: "careers", ...careers[0] });
  const union = [src.unionEvents, src.societies].filter(Boolean) as {
    label: string;
    url: string;
  }[];
  if (union.length && union.every((l) => unread(l.url))) out.push({ kind: "union", ...union[0] });
  return out;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Example events for each unreadable page, tailored to the student.
 * Dates are spread over the next four weeks, relative to today, so they always look current.
 */
export function exampleEventsFor(profile: UserProfile, unreadable: UnreadableSource[], today: string, gaps: string[] = []): CareerEvent[] {
  if (!unreadable.length) return [];
  const src = universitySources(profile.university);
  const uni = src?.name ?? (profile.university.trim() || "your university");
  const short = shortUni(uni);
  const goals = (profile.careerGoals.length ? profile.careerGoals : (["exploring"] as CareerTrack[])).slice(0, 2);
  const main = goals[0];
  const track = TRACK_MAP[main];
  const role = profile.preferredRoles?.[0] || track.primaryRole;
  const needsVisaHelp = !profile.visa.skipped && profile.visa.needsSponsorship !== "no";
  const gap = gaps[0];
  const gap2 = gaps[1];
  const broad = main === "exploring" || main === "other";
  const all: CareerTrack[] = ["ai", "software", "data", "consulting", "finance", "biotech", "research", "marketing", "engineering", "exploring", "other"];

  const events: CareerEvent[] = [];
  const add = (source: UnreadableSource, e: Omit<CareerEvent, "id" | "university" | "date" | "isDemo" | "provider" | "sourceName" | "sourceUrl"> & { inDays: number }) => {
    const { inDays, ...rest } = e;
    events.push({
      ...rest,
      id: `example-${slug(uni)}-${source.kind}-${slug(e.name)}`,
      university: uni,
      date: addDays(today, inDays),
      isDemo: true,
      provider: "example",
      sourceName: `Example of what ${source.label.split(":")[0]} lists`,
      sourceUrl: source.url,
    });
  };

  for (const s of unreadable) {
    if (s.kind === "careers") {
      const org = `${short} Careers (example)`;
      add(s, {
        name: broad ? "Graduate Careers Fair" : `${track.label} Careers Fair`,
        organiser: org,
        inDays: 9,
        startTime: "12:00",
        endTime: "16:00",
        location: `${short} main campus`,
        format: "in_person",
        category: "careers_fair",
        description: `Graduate recruiters from ${track.noun} employers meet students. Bring a one-page CV and two questions for each employer you want to talk to.`,
        tracks: goals,
        skills: ["Communication", "Commercial awareness"],
        benefits: ["Meet recruiters", "Learn graduate scheme timelines", ...(needsVisaHelp ? ["Ask about sponsorship directly"] : [])],
      });
      add(s, {
        name: `Employer Insight: Life as a ${role}`,
        organiser: org,
        inDays: 5,
        startTime: "17:30",
        endTime: "18:30",
        location: "Online",
        format: "online",
        category: "employer_talk",
        description: `Recent graduates in ${role} roles describe their first year, the application process and what they wish they had known.`,
        tracks: goals,
        skills: ["Commercial awareness"],
        benefits: ["Understand the interview process", "Q&A with recent graduates"],
      });
      add(s, {
        name: broad ? "Applications & Interviews Masterclass" : `Applications & Interviews for ${track.label}`,
        organiser: org,
        inDays: 12,
        startTime: "13:00",
        endTime: "14:00",
        location: `${short} careers centre`,
        format: "in_person",
        category: "workshop",
        description: `How ${track.noun} employers assess applications: CVs, online tests and interviews, with practice questions.`,
        tracks: goals,
        skills: [gap2 ?? track.coreSkills[0], "CV writing"],
        benefits: ["Sharper applications before deadlines"],
      });
      add(s, {
        name: "Alumni Networking Evening",
        organiser: org,
        inDays: 19,
        startTime: "18:00",
        endTime: "20:00",
        location: `${short} main campus`,
        format: "in_person",
        category: "networking",
        description: `${uni} alumni from ${track.noun} and other sectors talk about their routes in, then informal networking.`,
        tracks: all,
        skills: ["Networking", "Communication"],
        benefits: ["Find coffee-chat contacts", "Low-pressure networking"],
      });
      if (needsVisaHelp)
        add(s, {
          name: "International Students: Working in the UK After Graduation",
          organiser: org,
          inDays: 7,
          startTime: "16:00",
          endTime: "17:00",
          location: "Hybrid: on campus and online",
          format: "hybrid",
          category: "panel",
          description: "The Graduate route, sponsored roles and how to talk to employers about sponsorship. General information only.",
          tracks: all,
          skills: ["Visa planning"],
          benefits: ["Understand the Graduate and Skilled Worker routes", "Ask questions to advisers"],
        });
    } else {
      const soc = SOCIETY[main];
      const flag = SOCIETY_FLAGSHIP[main];
      const org = `${short} ${soc} (example)`;
      add(s, {
        ...flag,
        organiser: org,
        inDays: 16,
        startTime: flag.category === "hackathon" ? "10:00" : "18:00",
        endTime: flag.category === "hackathon" ? undefined : "20:00",
        location: "Students' union building",
        format: "in_person",
        tracks: goals,
      });
      if (gap)
        add(s, {
          name: `${gap} for Beginners: Hands-on Workshop`,
          organiser: org,
          inDays: 6,
          startTime: "18:00",
          endTime: "19:30",
          location: "Teaching room on campus",
          format: "in_person",
          category: "skills_training",
          description: `A practical introduction to ${gap}, run by students for students. Bring a laptop if it's a technical skill.`,
          tracks: goals,
          skills: [gap],
          benefits: [`Close your ${gap} gap`, "Learn alongside peers"],
        });
      add(s, {
        name: broad ? `${soc} Speaker Night` : `${soc} Speaker Night: Careers in ${track.label}`,
        organiser: org,
        inDays: 10,
        startTime: "18:30",
        endTime: "20:00",
        location: "Students' union building",
        format: "in_person",
        category: "employer_talk",
        description: `A professional working in ${track.noun} talks about their job, followed by Q&A and drinks.`,
        tracks: goals,
        skills: ["Commercial awareness", "Networking"],
        benefits: ["Hear from someone in the job", "Find coffee-chat contacts"],
      });
      if (goals[1]) {
        const t2 = TRACK_MAP[goals[1]];
        const f2 = SOCIETY_FLAGSHIP[goals[1]];
        add(s, {
          ...f2,
          name: `${SOCIETY[goals[1]]}: ${f2.name}`,
          organiser: `${short} ${SOCIETY[goals[1]]} (example)`,
          inDays: 23,
          startTime: "18:00",
          endTime: "20:00",
          location: "Students' union building",
          format: "in_person",
          tracks: [goals[1]],
          description: `${f2.description} Useful if you're also considering ${t2.noun}.`,
        });
      }
    }
  }
  return events;
}
