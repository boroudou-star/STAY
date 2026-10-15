import type { CareerTrack } from "@/lib/types";

export interface TrackInfo {
  id: CareerTrack;
  label: string;
  /** Used inside sentences, e.g. "interested in data science" */
  noun: string;
  emoji: string;
  /** Representative target role used for skills analysis */
  primaryRole: string;
  roles: string[];
  /** Skills typically requested for the primary role (general guidance, not a verified job spec) */
  coreSkills: string[];
  /** Search keywords used for LinkedIn people/job searches */
  searchTitles: string[];
  societies: string[];
}

export const TRACKS: TrackInfo[] = [
  {
    id: "ai",
    noun: "AI",
    label: "Technology / AI",
    emoji: "🤖",
    primaryRole: "Junior AI / ML Engineer",
    roles: ["Machine Learning Engineer", "AI Engineer", "Applied Scientist"],
    coreSkills: ["Python", "PyTorch", "Machine learning", "Model evaluation", "SQL", "Git", "Software testing", "Deployment", "Statistics"],
    searchTitles: ["machine learning engineer", "AI engineer", "applied scientist"],
    societies: ["AI / machine learning society", "Data science society", "Hackathon society"],
  },
  {
    id: "software",
    noun: "software engineering",
    label: "Software engineering",
    emoji: "💻",
    primaryRole: "Graduate Software Engineer",
    roles: ["Software Engineer", "Backend Engineer", "Full-stack Engineer"],
    coreSkills: ["Python", "JavaScript / TypeScript", "Data structures & algorithms", "Git", "Software testing", "SQL", "System design", "Cloud basics"],
    searchTitles: ["graduate software engineer", "software engineer", "full stack engineer"],
    societies: ["Technology society", "Coding / competitive programming society", "Hackathon society"],
  },
  {
    id: "data",
    noun: "data science",
    label: "Data science / analytics",
    emoji: "📊",
    primaryRole: "Junior Data Scientist",
    roles: ["Data Scientist", "Data Analyst", "Analytics Engineer"],
    coreSkills: ["Python", "SQL", "Statistics", "Data visualisation", "Pandas", "Machine learning", "Experiment design", "Communication"],
    searchTitles: ["data scientist", "data analyst", "analytics engineer"],
    societies: ["Data science society", "Statistics / maths society"],
  },
  {
    id: "consulting",
    noun: "consulting",
    label: "Consulting",
    emoji: "🧭",
    primaryRole: "Graduate Consultant",
    roles: ["Business Analyst", "Technology Consultant", "Strategy Analyst"],
    coreSkills: ["Problem solving", "Case interviews", "Excel", "Communication", "Presentation", "Stakeholder management", "Data analysis"],
    searchTitles: ["technology consultant", "business analyst", "strategy analyst"],
    societies: ["Consulting society", "Business society"],
  },
  {
    id: "finance",
    noun: "finance",
    label: "Finance",
    emoji: "📈",
    primaryRole: "Graduate Analyst (Finance)",
    roles: ["Investment Banking Analyst", "Quant Analyst", "Risk Analyst"],
    coreSkills: ["Excel", "Financial modelling", "Accounting basics", "Python", "Statistics", "Commercial awareness", "Communication"],
    searchTitles: ["graduate analyst finance", "quantitative analyst", "risk analyst"],
    societies: ["Finance / investment society", "Trading society"],
  },
  {
    id: "biotech",
    noun: "biotech",
    label: "Biotechnology / pharma",
    emoji: "🧬",
    primaryRole: "Graduate Scientist / Bioinformatician",
    roles: ["Bioinformatician", "Research Associate", "Computational Biologist"],
    coreSkills: ["Lab or computational methods", "Python", "R", "Statistics", "Scientific writing", "Data analysis"],
    searchTitles: ["bioinformatician", "computational biologist", "research associate biotech"],
    societies: ["Biotech / life sciences society", "Bioinformatics society"],
  },
  {
    id: "research",
    noun: "research",
    label: "Research",
    emoji: "🔬",
    primaryRole: "Research Assistant",
    roles: ["Research Assistant", "Research Engineer", "PhD candidate"],
    coreSkills: ["Literature review", "Experiment design", "Python", "Statistics", "Scientific writing", "Presentation"],
    searchTitles: ["research assistant", "research engineer", "research scientist"],
    societies: ["Academic / research society", "Department seminar series"],
  },
  {
    id: "marketing",
    noun: "marketing",
    label: "Marketing",
    emoji: "📣",
    primaryRole: "Graduate Marketing Executive",
    roles: ["Marketing Executive", "Growth Analyst", "Content Strategist"],
    coreSkills: ["Copywriting", "Social media", "Analytics", "Communication", "Creativity", "Excel"],
    searchTitles: ["marketing executive", "growth marketer", "brand manager"],
    societies: ["Marketing society", "Media / journalism society"],
  },
  {
    id: "engineering",
    noun: "engineering",
    label: "Engineering",
    emoji: "⚙️",
    primaryRole: "Graduate Engineer",
    roles: ["Graduate Engineer", "Design Engineer", "Systems Engineer"],
    coreSkills: ["CAD", "Mathematics", "Project management", "Technical writing", "MATLAB", "Problem solving"],
    searchTitles: ["graduate engineer", "design engineer", "systems engineer"],
    societies: ["Engineering society", "Robotics society"],
  },
  {
    id: "exploring",
    noun: "a range of careers",
    label: "Still exploring",
    emoji: "🧪",
    primaryRole: "Graduate (open to options)",
    roles: ["Graduate scheme (rotational)", "Analyst", "Associate"],
    coreSkills: ["Communication", "Excel", "Problem solving", "Teamwork", "Commercial awareness"],
    searchTitles: ["graduate scheme", "rotational graduate programme", "associate"],
    societies: ["Careers society", "Entrepreneurship society"],
  },
  {
    id: "other",
    noun: "your chosen field",
    label: "Other",
    emoji: "✨",
    primaryRole: "Graduate role",
    roles: ["Graduate role"],
    coreSkills: ["Communication", "Problem solving", "Teamwork"],
    searchTitles: ["graduate"],
    societies: ["Careers society"],
  },
];

export const TRACK_MAP = Object.fromEntries(TRACKS.map((t) => [t.id, t])) as Record<CareerTrack, TrackInfo>;

export function trackLabel(id: CareerTrack) {
  return TRACK_MAP[id]?.label ?? id;
}

/** Skill synonyms so "pytorch" in a CV matches "PyTorch", "js" matches "JavaScript / TypeScript" etc. */
export const SKILL_ALIASES: Record<string, string[]> = {
  python: ["python", "py"],
  pytorch: ["pytorch", "torch"],
  "machine learning": ["machine learning", "ml", "scikit-learn", "sklearn", "deep learning"],
  "model evaluation": ["model evaluation", "evaluation", "cross-validation", "metrics"],
  sql: ["sql", "postgres", "mysql", "sqlite", "basic sql"],
  git: ["git", "github", "version control", "github portfolio"],
  "software testing": ["testing", "unit tests", "pytest", "jest", "tdd", "software testing"],
  deployment: ["deployment", "docker", "deploy", "mlops", "aws", "gcp", "azure", "vercel"],
  statistics: ["statistics", "stats", "basic statistics", "probability"],
  "javascript / typescript": ["javascript", "typescript", "js", "ts", "react", "node"],
  "data structures & algorithms": ["data structures", "algorithms", "dsa", "leetcode"],
  "system design": ["system design", "architecture"],
  "cloud basics": ["cloud", "aws", "gcp", "azure"],
  "data visualisation": ["data visualisation", "data visualization", "matplotlib", "tableau", "power bi", "plotly"],
  pandas: ["pandas", "numpy", "dataframes"],
  "experiment design": ["a/b testing", "experiment design", "experimentation"],
  communication: ["communication", "presenting", "public speaking"],
  excel: ["excel", "spreadsheets"],
  r: ["r", "rstudio", "tidyverse"],
};

export function canonicalSkill(s: string) {
  const n = s.trim().toLowerCase();
  for (const [canon, aliases] of Object.entries(SKILL_ALIASES)) {
    if (canon === n || aliases.includes(n)) return canon;
  }
  return n;
}

export interface SkillGuide {
  why: string;
  learn: string[];
}

/** Learning suggestions keyed by canonical skill. Free/public resources described generically. */
export const SKILL_GUIDES: Record<string, SkillGuide> = {
  pytorch: {
    why: "Most ML engineering job specs list a deep-learning framework.",
    learn: ["Work through the official PyTorch beginner tutorials", "Re-implement one small model from a paper you've studied"],
  },
  "model evaluation": {
    why: "Interviewers ask how you know a model works — not just that it trains.",
    learn: ["Practise train/validation/test splits and cross-validation", "Write up precision/recall trade-offs for one of your projects"],
  },
  deployment: {
    why: "Shipping a model behind an API shows you can work like an engineer, not just a student.",
    learn: ["Containerise a small app with Docker", "Deploy a demo API to a free cloud tier"],
  },
  "software testing": {
    why: "Testing is a standard expectation in engineering interviews and code reviews.",
    learn: ["Add pytest/jest tests to an existing project", "Set up GitHub Actions to run tests on every push"],
  },
  sql: {
    why: "SQL appears in most data and engineering roles and in many online assessments.",
    learn: ["Practise joins, window functions and GROUP BY on a public dataset", "Complete a SQL practice track (e.g. a free online course)"],
  },
  statistics: {
    why: "Underpins model evaluation, experimentation and data interviews.",
    learn: ["Review hypothesis testing and confidence intervals", "Explain one statistical result from a project in plain English"],
  },
  "machine learning": {
    why: "Core of AI and data science roles.",
    learn: ["Complete an introductory ML course with exercises", "Build an end-to-end model on a real dataset"],
  },
  "data structures & algorithms": {
    why: "Most software graduate schemes include a coding assessment.",
    learn: ["Do 3–5 practice problems a week", "Time-box mock assessments under exam conditions"],
  },
  "system design": {
    why: "Shows you can reason about how real systems fit together.",
    learn: ["Sketch the architecture of an app you use daily", "Read a few public engineering blog posts on scaling"],
  },
  "cloud basics": {
    why: "Cloud familiarity is a common 'nice to have' for graduate engineers.",
    learn: ["Use a free tier to host a small project", "Learn the basics of storage, compute and IAM"],
  },
  "javascript / typescript": {
    why: "Needed for front-end and full-stack roles.",
    learn: ["Build a small TypeScript + React app", "Add types to an existing JS project"],
  },
  "data visualisation": {
    why: "Communicating insight is half the job in data roles.",
    learn: ["Rebuild a chart from the news with your own tooling", "Create a small public dashboard"],
  },
  pandas: {
    why: "The default toolkit for data wrangling in Python.",
    learn: ["Clean a messy public dataset end-to-end", "Practise groupby/merge/pivot operations"],
  },
  "experiment design": {
    why: "Product data roles often involve A/B tests.",
    learn: ["Read an introduction to A/B testing", "Design a mock experiment with a sample-size estimate"],
  },
  "case interviews": {
    why: "Consulting recruitment relies heavily on case interviews.",
    learn: ["Practise weekly cases with a partner", "Join a consulting society case workshop"],
  },
  "financial modelling": {
    why: "A core expectation in many finance analyst roles.",
    learn: ["Build a simple three-statement model", "Take a free introductory modelling course"],
  },
  "commercial awareness": {
    why: "Asked in almost every graduate interview.",
    learn: ["Follow one industry newsletter weekly", "Prepare 2–3 opinions on current sector trends"],
  },
};

export const DEFAULT_GUIDE: SkillGuide = {
  why: "Commonly requested for your target roles.",
  learn: ["Find a short structured course or workshop", "Apply it in a small project you can show"],
};

export interface ProjectIdea {
  id: string;
  title: string;
  description: string;
  skills: string[];
  tracks: CareerTrack[];
}

export const PROJECT_IDEAS: ProjectIdea[] = [
  {
    id: "proj-ml-deploy",
    title: "Deploy an ML app with honest evaluation",
    description:
      "Build a small machine-learning application, deploy it behind an API, document your evaluation methodology and write up its limitations.",
    skills: ["pytorch", "model evaluation", "deployment", "software testing"],
    tracks: ["ai", "data"],
  },
  {
    id: "proj-fullstack",
    title: "Ship a tested full-stack app",
    description: "Build a TypeScript web app with authentication, a database and automated tests running in CI. Write a short README on design decisions.",
    skills: ["javascript / typescript", "software testing", "system design", "cloud basics"],
    tracks: ["software"],
  },
  {
    id: "proj-data-story",
    title: "Public data story with SQL + dashboard",
    description: "Pick a UK public dataset, model it in SQL, analyse it in Python and publish a dashboard with three clearly explained findings.",
    skills: ["sql", "pandas", "data visualisation", "statistics"],
    tracks: ["data", "consulting", "finance"],
  },
  {
    id: "proj-open-source",
    title: "Make 3 open-source contributions",
    description: "Find beginner-friendly issues in a library you use, submit pull requests and respond to review feedback.",
    skills: ["git", "software testing", "communication"],
    tracks: ["software", "ai", "data", "research"],
  },
  {
    id: "proj-case-portfolio",
    title: "Case-study portfolio",
    description: "Write up three short business case analyses (problem, approach, recommendation) using public data to show structured thinking.",
    skills: ["case interviews", "commercial awareness", "excel", "communication"],
    tracks: ["consulting", "finance", "exploring", "marketing"],
  },
  {
    id: "proj-bioinf",
    title: "Reproduce a published bioinformatics analysis",
    description: "Re-run a published analysis on a public dataset, compare your results and document differences.",
    skills: ["python", "r", "statistics", "scientific writing"],
    tracks: ["biotech", "research"],
  },
];

export const UK_CITIES = ["London", "Manchester", "Cambridge", "Oxford", "Edinburgh", "Bristol", "Birmingham", "Leeds", "Remote (UK)"];
export const COMPANY_TYPES = ["Big tech", "Startups / scale-ups", "Consultancies", "Banks & finance", "Public sector / NHS", "Research labs", "Any"];
export const ROLE_TYPES = ["Graduate scheme", "Summer internship", "Off-cycle internship", "Research placement", "Entry-level job", "Part-time / project"];
export const UNIVERSITIES = ["UCL", "Other"];
