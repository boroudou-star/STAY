/**
 * Shared data models for STAY.
 * Both teammates should agree on changes here first — everything else builds on it.
 */

export type StudyStatus = "student" | "graduate";

export type CareerTrack =
  | "ai"
  | "software"
  | "data"
  | "consulting"
  | "finance"
  | "biotech"
  | "research"
  | "marketing"
  | "engineering"
  | "exploring"
  | "other";

export type VisaType = "student" | "graduate" | "skilled_worker" | "other" | "unsure" | "none";

export type DegreeLevel = "bachelors" | "masters" | "phd";

export interface Priorities {
  salary: number; // 1-5
  growth: number;
  workLife: number;
  technical: number;
  security: number;
}

export interface Experience {
  internships: string;
  partTime: string;
  projects: string;
  research: string;
  societyRoles: string;
  volunteering: string;
  certifications: string;
  cvText: string;
  /** Name of the uploaded CV file, if it came from a file */
  cvFileName?: string;
}

/** What the user finds hardest right now. Moves the matching parts of the plan up. */
export type Challenge = "experience" | "direction" | "networking" | "applications" | "interviews" | "visa" | "skills" | "time";

/** Where the user already is, so STAY doesn't ask them to do things they've done. */
export interface StartingPoint {
  cvReady: boolean;
  linkedinReady: boolean;
  inSocieties: boolean;
  reachedOut: boolean;
  applicationsSent: number;
  interviewsDone: number;
}

export interface UserProfile {
  id: string;
  name: string;
  university: string; // "UCL" | other free text
  degree: string;
  degreeLevel: DegreeLevel;
  subjectArea: string;
  academicInterests: string;
  studyStatus: StudyStatus;
  currentStudyYear?: number;
  graduationDate: string; // ISO yyyy-mm-dd (expected or actual)
  targetStartDate?: string; // graduates
  careerGoals: CareerTrack[];
  preferredRoles: string[];
  preferredIndustries: string[];
  technicalSkills: string[];
  professionalSkills: string[];
  experience: Experience;
  locationPreferences: string[];
  willingToRelocate: boolean;
  companyTypes: string[]; // "startup" | "big tech" | ...
  roleTypes: string[]; // "graduate scheme" | "internship" | ...
  /** No longer asked; kept so older saves still load */
  minSalary?: number;
  priorities: Priorities;
  visa: {
    skipped: boolean;
    needsSponsorship: "yes" | "no" | "unsure";
    visaType: VisaType;
    expiryDate?: string;
  };
  /** Companies the user would most like to work for */
  targetCompanies?: string[];
  /** Hours a week they can give to career prep; paces deadlines */
  weeklyHours?: number;
  challenges?: Challenge[];
  startingPoint?: StartingPoint;
  /** In their words: what would make the next year a success */
  goalStatement?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "completed";
export type Priority = "urgent" | "high" | "medium" | "low";
export type TaskCategory =
  | "applications"
  | "skills"
  | "projects"
  | "networking"
  | "events"
  | "cv"
  | "interviews"
  | "visa"
  | "custom";

export type TaskOrigin = "engine" | "opportunity" | "event" | "skill" | "custom";

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date
  priority: Priority;
  category: TaskCategory;
  skill?: string;
  status: TaskStatus;
  origin: TaskOrigin;
  templateId?: string;
  sourceOpportunityId?: string;
  sourceEventId?: string;
  deadlineEditedByUser?: boolean;
  completedAt?: string;
  createdAt: string;
}

export type OpportunityType =
  | "summer_internship"
  | "off_cycle_internship"
  | "spring_insight"
  | "research_placement"
  | "industrial_project"
  | "graduate_scheme"
  | "entry_level"
  | "placement_year";

/** Who a programme is usually aimed at, used for stage fit (not a hard rule). */
export type ProgrammeStage = "first_year" | "penultimate" | "placement_year" | "final_or_graduate" | "any_student" | "phd";

export type SponsorshipStatus = "offered" | "not_offered" | "not_verified";

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  companyBlurb?: string;
  location: string;
  type: OpportunityType;
  tracks: CareerTrack[];
  skillsRequired: string[];
  niceToHave?: string[];
  degreeFields: string[]; // e.g. ["computer science", "mathematics", "any stem"]
  eligibility: {
    /** Graduation must fall within this window (inclusive), ISO yyyy-mm */
    gradFrom?: string;
    gradTo?: string;
    note: string;
  };
  experienceLevel: "none" | "some" | "1yr+" | "unknown";
  salary?: string; // only when verified
  deadline?: string; // only when verified
  sponsorshipStatus: SponsorshipStatus;
  companyType?: CompanyType;
  sourceUrl?: string;
  sourceName: string;
  verifiedAt?: string;
  isDemo: boolean;
  /** "Skills mentioned in listing" when extracted from a live description rather than a structured spec */
  skillsSource?: "structured" | "description" | "typical";
  /** What each skill is used for in THIS role (keyed by skill name) */
  skillContext?: Record<string, string>;
  /** What you'd actually do in the role */
  responsibilities?: string[];
  /** Real programmes: who it's usually for */
  stage?: ProgrammeStage;
  /** Real programmes: what the employer's own pages say about visas, quoted or closely paraphrased */
  visaNote?: string;
  visaSource?: string;
  /** Real programmes: anything else verified from the official page (dates, eligibility) */
  verifiedNote?: string;
  /** Employer pages specific to a university, keyed by university name */
  campusPages?: Record<string, string>;
}

export type CompanyType = "Big tech" | "Startups / scale-ups" | "Consultancies" | "Banks & finance" | "Public sector / NHS" | "Research labs";

/** What the user has done in STAY — feeds dynamic recommendations. */
export interface Activity {
  savedOpps: string[];
  appliedOpps: Record<string, string>;
  contacts: Record<string, { status: ContactStatus }>;
  completedTemplateIds: string[];
  /** Applications the user sent before or outside STAY (from their starting point) */
  externalApplications?: number;
  /** Industry reflections saved */
  insightEntries?: number;
  /** Completed mock interviews */
  mockInterviews?: number;
}

export type EventCategory =
  | "careers_fair"
  | "employer_talk"
  | "workshop"
  | "hackathon"
  | "networking"
  | "skills_training"
  | "panel";

export interface CareerEvent {
  id: string;
  name: string;
  organiser: string;
  university?: string;
  date: string; // ISO date
  startTime?: string; // "18:00"
  endTime?: string;
  location: string;
  format: "in_person" | "online" | "hybrid";
  category: EventCategory;
  description: string;
  tracks: CareerTrack[];
  skills: string[];
  benefits: string[];
  bookingUrl?: string;
  sourceUrl?: string;
  sourceName: string;
  verifiedAt?: string;
  isDemo: boolean;
  isCancelled?: boolean;
  provider: string;
}

export interface EventSource {
  id: string;
  name: string;
  url: string;
  kind: "website" | "instagram" | "feed";
  university: string;
  description: string;
  tracks: CareerTrack[];
}

export type ContactStatus =
  | "want_to_contact"
  | "message_drafted"
  | "contacted"
  | "replied"
  | "chat_scheduled"
  | "completed";

export interface NetworkingRecommendation {
  id: string;
  recommendationType: "search" | "verified" | "demo";
  title: string; // e.g. "UCL alumni working as data scientists"
  name?: string; // only when verified / user-provided
  role: string;
  company?: string;
  universityConnection?: string;
  profileUrl?: string;
  searchUrl?: string;
  /** LinkedIn's university alumni tool, when we know the school's page */
  alumniUrl?: string;
  relevanceExplanation: string;
  conversationTopics: string[];
  isDemo: boolean;
}

export interface ContactTracking {
  status: ContactStatus;
  draft?: string;
  notes?: string;
  followUpDate?: string;
  insight?: string;
  updatedAt: string;
}

export interface UserContact {
  id: string;
  name: string;
  role: string;
  company: string;
  profileUrl?: string;
  background?: string;
  createdAt: string;
}

export interface MatchFactor {
  key: string;
  label: string;
  score: number; // 0..1
  weight: number;
  detail: string;
  status: "good" | "partial" | "gap" | "unknown" | "blocker";
}

export interface ScoredOpportunity {
  opportunity: Opportunity;
  score: number; // 0..100 requirement alignment
  factors: MatchFactor[];
  missingSkills: string[];
  matchedSkills: string[];
  eligible: boolean | "unknown";
  fitSummary: string;
}

export interface ScoredEvent {
  event: CareerEvent;
  score: number;
  reasons: string[];
  explanation: string;
  matchedGaps: string[];
}

export interface RoadmapPhase {
  id: string;
  name: string;
  subtitle: string;
  start: string;
  end: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/* Industry insights                                                   */
/* ------------------------------------------------------------------ */

export type InsightAreaId =
  | "ai"
  | "tech"
  | "data"
  | "consulting"
  | "investment-banking"
  | "finance-markets"
  | "healthcare"
  | "biotech"
  | "marketing"
  | "energy"
  | "public-sector";

export type FeedItemKind = "news" | "podcast" | "primer";

/** Something to read/listen to. Live items always carry a real URL and source; primers are STAY-written explainers. */
export interface FeedItem {
  id: string;
  kind: FeedItemKind;
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  area?: InsightAreaId;
  company?: string;
  summary?: string; // primers only (our own text)
  isLive: boolean;
}

export interface InsightEntry {
  id: string;
  date: string; // ISO date
  area?: InsightAreaId;
  company?: string;
  question: string;
  answer: string;
  item?: { title: string; url?: string; source: string; kind: FeedItemKind };
  /** Step-by-step answers (older entries) */
  steps?: { prompt: string; answer: string }[];
  /** The discussion with the STAY industry expert */
  transcript?: ChatTurn[];
  summary?: ExpertSummary;
  tags: string[];
  feedback?: string;
  followUp?: string;
  parentId?: string;
  createdAt: string;
}

/** One message in a discussion with the STAY industry expert. */
export interface ChatTurn {
  role: "expert" | "user";
  text: string;
}

/** What the discussion is about. Everything the expert knows about the topic comes from here. */
export interface ExpertTopic {
  kind: "news" | "podcast" | "company" | "concept" | "primer" | "plan";
  question: string;
  area?: InsightAreaId;
  company?: string;
  concept?: string;
  item?: { title: string; url?: string; source: string; kind: FeedItemKind };
  primer?: { title: string; body: string };
  /** The user's own reading notes, if they took any */
  notes?: Record<string, string>;
}

/** Honest end-of-discussion assessment. */
export interface ExpertSummary {
  verdict: "strong" | "developing" | "weak";
  headline: string;
  strengths: string[];
  gaps: string[];
  corrections: string[];
  keyPoints: string[];
  interviewAnswer: string;
  nextQuestion: string;
  source: "ai" | "rules";
}

/** Notes taken while reading an article or listening to a podcast. */
export interface ReadingNote {
  id: string;
  item: { id: string; title: string; url?: string; source: string; kind: FeedItemKind; area?: InsightAreaId; company?: string };
  sections: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  reflectedEntryId?: string;
}

export interface InsightPrefs {
  areas: InsightAreaId[];
  companies: string[];
  planStart?: string; // ISO date the 7-day plan started
  planDone: number[]; // day indexes completed
}

/* ------------------------------------------------------------------ */
/* Interview prep                                                      */
/* ------------------------------------------------------------------ */

export type QuestionKind = "behavioural" | "motivation" | "technical" | "company" | "cv" | "case" | "commercial";

export interface InterviewQuestion {
  id: string;
  kind: QuestionKind;
  text: string;
  competency?: string;
  tests?: string; // what the interviewer is assessing
  tips?: string[];
  modelPoints?: string[]; // for technical questions: points a strong answer covers
  source: "bank" | "cv" | "company" | "ai";
}

export interface AnswerScores {
  structure: number; // 1-5
  specificity: number;
  impact: number;
  relevance: number;
  concision: number;
}

export type HiringVerdict = "strong_hire" | "hire" | "borderline" | "no_hire";

export interface RecruiterNote {
  /** Exact words from the candidate's answer this note is about (when applicable) */
  quote?: string;
  issue: string;
  fix: string;
}

export interface AnswerFeedback {
  scores: AnswerScores;
  strengths: string[];
  improvements: string[];
  followUp?: string;
  source: "ai" | "rules";
  verdict?: HiringVerdict;
  /** One-line hiring decision rationale, as a hiring manager would write it */
  headline?: string;
  /** Precise criticism tied to the candidate's own words */
  notes?: RecruiterNote[];
  /** Field-specific criteria the interviewer listens for */
  lens?: { criterion: string; met: boolean }[];
  /** Outline of a stronger answer, built from the candidate's material */
  rewrite?: string;
  field?: string;
}

export interface MockTurn {
  question: InterviewQuestion;
  answer: string;
  seconds: number;
  feedback?: AnswerFeedback;
}

export interface MockSession {
  id: string;
  type: "behavioural" | "mixed" | "company" | "cv" | "technical" | "case";
  company?: string;
  turns: MockTurn[];
  startedAt: string;
  completedAt?: string;
}

export interface StoryEntry {
  id: string;
  title: string;
  competencies: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  updatedAt: string;
}
