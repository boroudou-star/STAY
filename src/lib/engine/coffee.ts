import { roleForTrack, TRACK_MAP } from "@/data/careers";
import type { CareerTrack, NetworkingRecommendation, UserContact, UserProfile } from "@/lib/types";

/**
 * Coffee Chats — Approach B (targeted LinkedIn searches) by default.
 * We never invent real people. Searches open LinkedIn's public people-search URL;
 * the user finds and contacts real professionals themselves.
 * Approach A (verified contacts) is supported via user-provided contacts.
 */

export function linkedInPeopleSearch(keywords: string) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}&origin=GLOBAL_SEARCH_HEADER`;
}

function uniTerm(p: UserProfile) {
  const u = p.university?.trim();
  if (!u || u.toLowerCase() === "other") return "";
  return u;
}

function subjectTerm(p: UserProfile) {
  return (p.subjectArea || p.degree.replace(/^(bsc|ba|msc|ma|meng|beng|phd|mres)\s+/i, "") || "").trim();
}

export function coffeeChatRecommendations(p: UserProfile): NetworkingRecommendation[] {
  const goals = (p.careerGoals.length ? p.careerGoals : ["exploring"]) as CareerTrack[];
  const primary = TRACK_MAP[goals[0]];
  const secondary = TRACK_MAP[goals[1] ?? goals[0]];
  const uni = uniTerm(p);
  const subject = subjectTerm(p);
  const city = p.locationPreferences.find((l) => !/remote/i.test(l)) ?? "London";
  const role1 = roleForTrack(primary.id, p.preferredRoles);
  const role2 = secondary.searchTitles[0] !== role1.toLowerCase() ? secondary.searchTitles[0] : secondary.searchTitles[1] ?? primary.searchTitles[1];
  const companyType = p.companyTypes.find((c) => c !== "Any") ?? "Startups / scale-ups";
  const companyWord = /startup/i.test(companyType) ? "startup" : /big tech/i.test(companyType) ? "big tech" : companyType.toLowerCase();

  const recs: NetworkingRecommendation[] = [
    {
      id: "cc-alumni-role",
      recommendationType: "search",
      title: uni ? `${uni} alumni working as ${role1}` : `Graduates from your subject working as ${role1}`,
      role: role1,
      universityConnection: uni ? `Fellow ${uni} graduate` : undefined,
      searchUrl: linkedInPeopleSearch(`${uni} ${role1} ${city}`.trim()),
      relevanceExplanation: `Alumni are the most likely to reply, and they know exactly how ${uni || "your university"} students get into ${role1.toLowerCase()} roles.`,
      conversationTopics: ["How did you get your first role after graduating?", "Which modules or projects mattered most?", "What do you wish you'd done in final year?"],
      isDemo: false,
    },
    {
      id: "cc-subject-transition",
      recommendationType: "search",
      title: `${subject || "Your-degree"} graduates now in ${secondary.noun}`,
      role: role2,
      searchUrl: linkedInPeopleSearch(`${subject} ${role2}`.trim()),
      relevanceExplanation: `People who started with a ${subject || "similar"} background and moved into ${secondary.noun} can show you a realistic path from where you are now.`,
      conversationTopics: ["How did you make the transition?", "Which skills did you have to learn on the job?", "How do you explain your background to recruiters?"],
      isDemo: false,
    },
    {
      id: "cc-early-career",
      recommendationType: "search",
      title: `Early-career ${primary.roles[0]}s in ${city}`,
      role: `Graduate / junior ${primary.roles[0]}`,
      searchUrl: linkedInPeopleSearch(`graduate ${primary.roles[0]} ${city}`),
      relevanceExplanation: "Someone 1–3 years ahead of you remembers the recruitment process in detail and knows what interviews look like right now.",
      conversationTopics: ["What were the interview stages like?", "What does a normal week look like?", "How did you prepare for online assessments?"],
      isDemo: false,
    },
    {
      id: "cc-company-type",
      recommendationType: "search",
      title: `${primary.roles[1] ?? primary.roles[0]}s at ${companyWord} companies`,
      role: primary.roles[1] ?? primary.roles[0],
      searchUrl: linkedInPeopleSearch(`${primary.roles[1] ?? primary.roles[0]} ${companyWord} ${city}`),
      relevanceExplanation: `You said you're interested in ${companyType.toLowerCase()}. Hearing how they hire helps you decide where to focus applications.`,
      conversationTopics: ["How does hiring differ at your company?", "What makes a junior candidate stand out?", "Are there teams likely to hire graduates soon?"],
      isDemo: false,
    },
    {
      id: "cc-international",
      recommendationType: "search",
      title:
        !p.visa.skipped && p.visa.needsSponsorship === "yes"
          ? `International ${uni || "UK"} graduates now working in ${primary.noun}`
          : `${uni || "UK"} alumni in ${primary.noun} recruiting or leadership`,
      role: !p.visa.skipped && p.visa.needsSponsorship === "yes" ? primary.roles[0] : "Team lead / hiring manager",
      universityConnection: uni ? `${uni} alumni` : undefined,
      searchUrl:
        !p.visa.skipped && p.visa.needsSponsorship === "yes"
          ? linkedInPeopleSearch(`${uni} international ${primary.searchTitles[0]} ${city}`.trim())
          : linkedInPeopleSearch(`${uni} ${primary.searchTitles[0]} lead`.trim()),
      relevanceExplanation:
        !p.visa.skipped && p.visa.needsSponsorship === "yes"
          ? "Graduates who've navigated the move from student to working in the UK can share practical tips on timelines and which employers they spoke to."
          : "A more senior contact can tell you what hiring managers look for and may know about upcoming roles.",
      conversationTopics:
        !p.visa.skipped && p.visa.needsSponsorship === "yes"
          ? ["How did you approach employers about sponsorship?", "What timeline worked for you?", "Any advice for your first year in the UK workforce?"]
          : ["What do you look for in graduate hires?", "Which skills are underrated?", "How should I follow up after applying?"],
      isDemo: false,
    },
  ];
  return recs.slice(0, 5);
}

/** Deterministic outreach draft. Uses only user-provided or verified details. */
export function outreachTemplate(p: UserProfile, rec: NetworkingRecommendation | null, contact?: UserContact): string {
  const first = p.name ? p.name.split(" ")[0] : "";
  const uni = uniTerm(p);
  const goal = TRACK_MAP[p.careerGoals[0] ?? "exploring"]?.noun ?? "this field";
  const who = contact?.name ? contact.name.split(" ")[0] : "[Name]";
  const stage = p.studyStatus === "student" ? `${uni ? `${uni} ` : ""}student` : `recent ${uni ? `${uni} ` : ""}graduate`;
  const hook = contact?.background
    ? `I was interested in your background — ${contact.background.trim().replace(/\.$/, "")}.`
    : contact?.role
      ? `I'd love to hear about your work as ${/^[aeiou]/i.test(contact.role) ? "an" : "a"} ${contact.role}${contact.company ? ` at ${contact.company}` : ""}.`
      : rec
        ? `I'd love to hear how you got into your role as ${/^[aeiou]/i.test(rec.role) ? "an" : "a"} ${rec.role}.`
        : "I'd love to hear about your career path.";
  const sameUni = (rec?.universityConnection || contact) && uni ? ` As a fellow ${uni} person, ` : " ";
  return `Hi ${who}, I'm a ${stage} interested in ${goal}. ${hook}${sameUni}I'd be grateful for a brief 15-minute chat if you ever have time — no worries at all if not. Thank you!${first ? `\n\n${first}` : ""}`
    .replace(/\s+,/g, ",")
    .replace(/ {2,}/g, " ");
}

export const CONTACT_STATUS_LABEL = {
  want_to_contact: "Want to contact",
  message_drafted: "Message drafted",
  contacted: "Contacted",
  replied: "Replied",
  chat_scheduled: "Chat scheduled",
  completed: "Completed",
} as const;
