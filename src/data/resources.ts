import { canonicalSkill } from "./careers";

/**
 * Curated learning resources per skill (checked October 2026).
 * Kinds: course, programme (certificate / longer course), practice, video, github, docs, project (STAY one-day brief).
 * Prices change; "free" means free to start or audit at the time of checking.
 */

export type ResourceKind = "course" | "programme" | "practice" | "video" | "github" | "docs" | "project";

export interface Resource {
  title: string;
  provider: string;
  url: string;
  kind: ResourceKind;
  time?: string;
  free?: boolean;
}

export interface OneDayProject {
  title: string;
  steps: string[];
  cvLine: string;
  link?: { label: string; url: string };
}

export const KIND_LABEL: Record<ResourceKind, string> = {
  course: "Course",
  programme: "Programme",
  practice: "Practice",
  video: "Video",
  github: "GitHub",
  docs: "Guide",
  project: "One-day project",
};

const R: Record<string, Resource[]> = {
  python: [
    { title: "Python for Everybody Specialization", provider: "University of Michigan · Coursera", url: "https://www.coursera.org/specializations/python", kind: "programme", time: "~2 months", free: true },
    { title: "CS50's Introduction to Programming with Python", provider: "Harvard", url: "https://cs50.harvard.edu/python/", kind: "course", time: "10 weeks", free: true },
    { title: "Kaggle Learn: Python", provider: "Kaggle", url: "https://www.kaggle.com/learn/python", kind: "practice", time: "5 hours", free: true },
    { title: "Project-based learning (tutorial list)", provider: "GitHub", url: "https://github.com/practical-tutorials/project-based-learning", kind: "github", free: true },
  ],
  sql: [
    { title: "SQLBolt interactive lessons", provider: "SQLBolt", url: "https://sqlbolt.com/", kind: "practice", time: "3 hours", free: true },
    { title: "Intro to SQL and Advanced SQL", provider: "Kaggle", url: "https://www.kaggle.com/learn/intro-to-sql", kind: "course", time: "6 hours", free: true },
    { title: "SQL Tutorial (originally by Mode)", provider: "ThoughtSpot", url: "https://www.thoughtspot.com/sql-tutorial", kind: "docs", free: true },
    { title: "Select Star SQL", provider: "Interactive book", url: "https://selectstarsql.com/", kind: "practice", free: true },
  ],
  pytorch: [
    { title: "PyTorch: Learn the Basics", provider: "PyTorch", url: "https://pytorch.org/tutorials/beginner/basics/intro.html", kind: "docs", time: "3 hours", free: true },
    { title: "Practical Deep Learning for Coders", provider: "fast.ai", url: "https://course.fast.ai/", kind: "course", time: "9 lessons", free: true },
    { title: "Neural Networks: Zero to Hero", provider: "Andrej Karpathy · YouTube", url: "https://karpathy.ai/zero-to-hero.html", kind: "video", free: true },
    { title: "micrograd: build autograd from scratch", provider: "GitHub · karpathy", url: "https://github.com/karpathy/micrograd", kind: "github", free: true },
  ],
  "machine learning": [
    { title: "Machine Learning Specialization", provider: "Stanford & DeepLearning.AI · Coursera", url: "https://www.coursera.org/specializations/machine-learning-introduction", kind: "programme", time: "~2 months", free: true },
    { title: "Intro to Machine Learning", provider: "Kaggle", url: "https://www.kaggle.com/learn/intro-to-machine-learning", kind: "practice", time: "3 hours", free: true },
    { title: "Neural networks (visual series)", provider: "3Blue1Brown · YouTube", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi", kind: "video", free: true },
    { title: "ML for Beginners (12 week curriculum)", provider: "GitHub · Microsoft", url: "https://github.com/microsoft/ML-For-Beginners", kind: "github", free: true },
  ],
  "model evaluation": [
    { title: "Metrics and scoring: quantifying prediction quality", provider: "scikit-learn", url: "https://scikit-learn.org/stable/modules/model_evaluation.html", kind: "docs", free: true },
    { title: "Machine Learning Crash Course (classification and metrics)", provider: "Google", url: "https://developers.google.com/machine-learning/crash-course", kind: "course", free: true },
    { title: "StatQuest: clear explanations of ROC, AUC and more", provider: "YouTube", url: "https://www.youtube.com/@statquest", kind: "video", free: true },
    { title: "Made With ML (evaluation, testing, deployment)", provider: "GitHub · GokuMohandas", url: "https://github.com/GokuMohandas/Made-With-ML", kind: "github", free: true },
  ],
  deployment: [
    { title: "Docker: Get started", provider: "Docker", url: "https://docs.docker.com/get-started/", kind: "docs", time: "2 hours", free: true },
    { title: "FastAPI tutorial", provider: "FastAPI", url: "https://fastapi.tiangolo.com/tutorial/", kind: "docs", free: true },
    { title: "Made With ML: MLOps course", provider: "madewithml.com", url: "https://madewithml.com/", kind: "course", free: true },
    { title: "MLOps Zoomcamp", provider: "GitHub · DataTalksClub", url: "https://github.com/DataTalksClub/mlops-zoomcamp", kind: "github", free: true },
  ],
  "software testing": [
    { title: "pytest: Get started", provider: "pytest", url: "https://docs.pytest.org/en/stable/getting-started.html", kind: "docs", time: "1 hour", free: true },
    { title: "Test with GitHub Actions", provider: "GitHub Skills", url: "https://github.com/skills/test-with-actions", kind: "course", time: "1 hour", free: true },
    { title: "Jest: Getting started", provider: "Jest", url: "https://jestjs.io/docs/getting-started", kind: "docs", free: true },
  ],
  git: [
    { title: "GitHub Skills (hands-on courses)", provider: "GitHub", url: "https://skills.github.com/", kind: "course", free: true },
    { title: "Learn Git Branching (visual)", provider: "learngitbranching.js.org", url: "https://learngitbranching.js.org/", kind: "practice", time: "2 hours", free: true },
    { title: "The Missing Semester of Your CS Education", provider: "MIT", url: "https://missing.csail.mit.edu/", kind: "course", free: true },
    { title: "First Contributions: make your first open source PR", provider: "GitHub", url: "https://github.com/firstcontributions/first-contributions", kind: "github", free: true },
  ],
  statistics: [
    { title: "Statistics and probability", provider: "Khan Academy", url: "https://www.khanacademy.org/math/statistics-probability", kind: "course", free: true },
    { title: "Seeing Theory (visual probability)", provider: "Brown University", url: "https://seeing-theory.brown.edu/", kind: "practice", free: true },
    { title: "OpenIntro Statistics (free textbook)", provider: "OpenIntro", url: "https://www.openintro.org/book/os/", kind: "docs", free: true },
    { title: "StatQuest", provider: "YouTube", url: "https://www.youtube.com/@statquest", kind: "video", free: true },
  ],
  "javascript / typescript": [
    { title: "The Odin Project (full stack JavaScript)", provider: "The Odin Project", url: "https://www.theodinproject.com/", kind: "programme", free: true },
    { title: "TypeScript Handbook", provider: "Microsoft", url: "https://www.typescriptlang.org/docs/handbook/intro.html", kind: "docs", free: true },
    { title: "React: Learn", provider: "react.dev", url: "https://react.dev/learn", kind: "docs", free: true },
    { title: "freeCodeCamp curriculum", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/learn", kind: "course", free: true },
  ],
  "data structures & algorithms": [
    { title: "NeetCode roadmap", provider: "NeetCode", url: "https://neetcode.io/", kind: "practice", free: true },
    { title: "Tech Interview Handbook", provider: "GitHub · yangshun", url: "https://www.techinterviewhandbook.org/", kind: "docs", free: true },
    { title: "CS50x: Introduction to Computer Science", provider: "Harvard", url: "https://cs50.harvard.edu/x/", kind: "course", free: true },
    { title: "The Algorithms: Python", provider: "GitHub", url: "https://github.com/TheAlgorithms/Python", kind: "github", free: true },
  ],
  "system design": [
    { title: "The System Design Primer", provider: "GitHub · donnemartin", url: "https://github.com/donnemartin/system-design-primer", kind: "github", free: true },
    { title: "ByteByteGo system design videos", provider: "YouTube", url: "https://www.youtube.com/@ByteByteGo", kind: "video", free: true },
  ],
  "cloud basics": [
    { title: "AWS Cloud Practitioner Essentials", provider: "AWS Skill Builder", url: "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/", kind: "course", time: "~13 hours" },
    { title: "Google Cloud Skills Boost", provider: "Google Cloud", url: "https://www.cloudskillsboost.google/", kind: "practice" },
    { title: "The Cloud Resume Challenge", provider: "cloudresumechallenge.dev", url: "https://cloudresumechallenge.dev/", kind: "project", free: true },
  ],
  "data visualisation": [
    { title: "Data Visualization", provider: "Kaggle", url: "https://www.kaggle.com/learn/data-visualization", kind: "practice", time: "4 hours", free: true },
    { title: "Storytelling with Data (blog and resources)", provider: "storytellingwithdata.com", url: "https://www.storytellingwithdata.com/", kind: "docs", free: true },
    { title: "TidyTuesday weekly datasets", provider: "GitHub · R for Data Science", url: "https://github.com/rfordatascience/tidytuesday", kind: "github", free: true },
  ],
  pandas: [
    { title: "Pandas", provider: "Kaggle", url: "https://www.kaggle.com/learn/pandas", kind: "practice", time: "4 hours", free: true },
    { title: "10 minutes to pandas", provider: "pandas docs", url: "https://pandas.pydata.org/docs/user_guide/10min.html", kind: "docs", free: true },
    { title: "Python for Data Analysis (open access book)", provider: "Wes McKinney", url: "https://wesmckinney.com/book/", kind: "docs", free: true },
    { title: "100 pandas puzzles", provider: "GitHub · ajcr", url: "https://github.com/ajcr/100-pandas-puzzles", kind: "github", free: true },
  ],
  "experiment design": [
    { title: "A/B Testing (by Google)", provider: "Udacity", url: "https://www.udacity.com/course/ab-testing--ud257", kind: "course", free: true },
    { title: "Trustworthy Online Controlled Experiments (book site)", provider: "experimentguide.com", url: "https://experimentguide.com/", kind: "docs" },
    { title: "Sample size calculator", provider: "Evan Miller", url: "https://www.evanmiller.org/ab-testing/sample-size.html", kind: "practice", free: true },
  ],
  communication: [
    { title: "Introduction to Public Speaking", provider: "University of Washington · Coursera", url: "https://www.coursera.org/learn/public-speaking", kind: "course", free: true },
    { title: "Toastmasters (find a club)", provider: "Toastmasters International", url: "https://www.toastmasters.org/", kind: "practice" },
  ],
  excel: [
    { title: "Excel Skills for Business Specialization", provider: "Macquarie University · Coursera", url: "https://www.coursera.org/specializations/excel", kind: "programme", free: true },
    { title: "Excel Easy tutorials", provider: "excel-easy.com", url: "https://www.excel-easy.com/", kind: "docs", free: true },
  ],
  "financial modelling": [
    { title: "Free finance and modelling courses", provider: "Corporate Finance Institute", url: "https://corporatefinanceinstitute.com/", kind: "course" },
    { title: "Damodaran Online: valuation lectures and data", provider: "NYU Stern", url: "https://pages.stern.nyu.edu/~adamodar/", kind: "docs", free: true },
  ],
  "case interviews": [
    { title: "Practice cases from McKinsey", provider: "McKinsey & Company", url: "https://www.mckinsey.com/careers/interviewing", kind: "practice", free: true },
    { title: "Case partners and practice cases", provider: "PrepLounge", url: "https://www.preplounge.com/", kind: "practice" },
    { title: "Bain: hiring process and interviews", provider: "Bain & Company", url: "https://www.bain.com/careers/interview-prep/", kind: "docs", free: true },
  ],
  "commercial awareness": [
    { title: "BBC Business", provider: "BBC", url: "https://www.bbc.co.uk/news/business", kind: "docs", free: true },
    { title: "Financial Times (check your university for free access)", provider: "FT", url: "https://www.ft.com/", kind: "docs" },
    { title: "The Economist", provider: "The Economist", url: "https://www.economist.com/", kind: "docs" },
  ],
  r: [
    { title: "R for Data Science (2nd edition)", provider: "Hadley Wickham et al.", url: "https://r4ds.hadley.nz/", kind: "docs", free: true },
    { title: "swirl: learn R inside R", provider: "swirlstats.com", url: "https://swirlstats.com/", kind: "practice", free: true },
  ],
  "scientific writing": [{ title: "Writing in the Sciences", provider: "Stanford · Coursera", url: "https://www.coursera.org/learn/sciwrite", kind: "course", free: true }],
  mathematics: [
    { title: "Essence of linear algebra", provider: "3Blue1Brown · YouTube", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", kind: "video", free: true },
    { title: "Linear Algebra (18.06)", provider: "MIT OpenCourseWare", url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/", kind: "course", free: true },
    { title: "Linear algebra", provider: "Khan Academy", url: "https://www.khanacademy.org/math/linear-algebra", kind: "practice", free: true },
  ],
  matlab: [{ title: "MATLAB Onramp", provider: "MathWorks", url: "https://matlabacademy.mathworks.com/details/matlab-onramp/gettingstarted", kind: "course", time: "2 hours" }],
  "c++": [{ title: "LearnCpp.com", provider: "LearnCpp", url: "https://www.learncpp.com/", kind: "docs", free: true }],
  "data analysis": [
    { title: "Google Data Analytics Professional Certificate", provider: "Google · Coursera", url: "https://www.coursera.org/professional-certificates/google-data-analytics", kind: "programme", time: "~6 months part time" },
    { title: "Kaggle Learn (pandas, SQL, visualisation)", provider: "Kaggle", url: "https://www.kaggle.com/learn", kind: "practice", free: true },
  ],
  marketing: [
    { title: "Google Skillshop (Ads, Analytics)", provider: "Google", url: "https://skillshop.withgoogle.com/", kind: "course", free: true },
    { title: "HubSpot Academy", provider: "HubSpot", url: "https://academy.hubspot.com/", kind: "course", free: true },
    { title: "Meta Blueprint", provider: "Meta", url: "https://www.facebook.com/business/learn", kind: "course", free: true },
  ],
};

/** Skills that share a resource list */
const ALIAS: Record<string, string> = {
  "problem solving": "case interviews",
  "structured problem solving": "case interviews",
  copywriting: "marketing",
  "social media": "marketing",
  analytics: "data analysis",
  "data analysis": "data analysis",
  "lab or computational methods": "r",
  docker: "deployment",
};

const ONE_DAY: Record<string, OneDayProject> = {
  python: {
    title: "A command-line budget tracker",
    steps: ["Export a month of your bank or society spending as CSV (or make one up).", "Write a Python script that reads it and groups spend by category.", "Print a summary and a simple chart with matplotlib.", "Put it on GitHub with a clear README."],
    cvLine: "Built a Python tool that parses CSV transactions and reports spend by category (pandas, matplotlib).",
  },
  sql: {
    title: "Answer 10 business questions with SQL",
    steps: ["Load the Chinook music store database into SQLite.", "Write queries: top customers, revenue by country, best selling genre by year.", "Use at least one JOIN, one GROUP BY and one window function.", "Write each question and answer in a README."],
    cvLine: "Answered 10 business questions on a sample retail database using SQL joins, aggregation and window functions.",
    link: { label: "Chinook database", url: "https://github.com/lerocha/chinook-database" },
  },
  pytorch: {
    title: "Fashion image classifier with an honest evaluation",
    steps: ["Follow the PyTorch quickstart to train a small network on FashionMNIST.", "Report accuracy per class, not just overall.", "Show 10 images it gets wrong and explain why.", "Push the notebook to GitHub."],
    cvLine: "Trained a PyTorch image classifier (FashionMNIST), reporting per class accuracy and error analysis.",
    link: { label: "PyTorch quickstart", url: "https://pytorch.org/tutorials/beginner/basics/quickstart_tutorial.html" },
  },
  "machine learning": {
    title: "Titanic survival model, done properly",
    steps: ["Build a simple baseline (e.g. predict by gender) and record its accuracy.", "Train a logistic regression and a tree model.", "Compare against the baseline with cross validation.", "Write up what the model gets wrong."],
    cvLine: "Built and evaluated classification models against a baseline using cross validation (scikit-learn).",
    link: { label: "Kaggle Titanic", url: "https://www.kaggle.com/competitions/titanic" },
  },
  "model evaluation": {
    title: "Evaluation report for a model you already have",
    steps: ["Pick any classifier you've built.", "Add a confusion matrix and a precision recall curve.", "Break performance down by one subgroup.", "Write one page: where it fails and what you'd do next."],
    cvLine: "Wrote an evaluation report for a classifier including precision recall analysis and subgroup performance.",
  },
  deployment: {
    title: "Ship a model as an API",
    steps: ["Wrap a trained model in a FastAPI endpoint.", "Containerise it with Docker.", "Deploy to a free cloud tier.", "Add the live URL and a curl example to your README."],
    cvLine: "Deployed an ML model as a containerised REST API (FastAPI, Docker).",
  },
  "software testing": {
    title: "Add tests and CI to an old project",
    steps: ["Pick a project from your GitHub.", "Write 10 pytest or Jest tests, including edge cases.", "Add a GitHub Actions workflow that runs them on every push.", "Add a test badge to the README."],
    cvLine: "Added automated tests and continuous integration (GitHub Actions) to an existing project.",
  },
  git: {
    title: "Your first open source pull request",
    steps: ["Follow the First Contributions guide.", "Find a 'good first issue' in a library you use.", "Open a pull request and respond to review comments."],
    cvLine: "Contributed to an open source project via reviewed pull requests.",
    link: { label: "First Contributions", url: "https://github.com/firstcontributions/first-contributions" },
  },
  statistics: {
    title: "UK house prices with confidence intervals",
    steps: ["Download a month of HM Land Registry price paid data.", "Compare median prices for two regions.", "Calculate a confidence interval and test whether the difference is significant.", "Explain the result in plain English."],
    cvLine: "Analysed HM Land Registry data with hypothesis tests and confidence intervals.",
    link: { label: "Price paid data", url: "https://www.gov.uk/government/collections/price-paid-data" },
  },
  "javascript / typescript": {
    title: "A deployed React and TypeScript app",
    steps: ["Build a small app (habit tracker, flashcards) with React and TypeScript.", "Store data in localStorage.", "Deploy it for free on Vercel or Netlify.", "Link the live site on your CV."],
    cvLine: "Built and deployed a React and TypeScript web app.",
  },
  "data structures & algorithms": {
    title: "A timed problem set",
    steps: ["Do the NeetCode 'Arrays and Hashing' problems in one sitting.", "Time yourself: 25 minutes each.", "For each, write the time and space complexity.", "Redo the ones you failed two days later."],
    cvLine: "",
    link: { label: "NeetCode", url: "https://neetcode.io/" },
  },
  "system design": {
    title: "Design doc for a URL shortener",
    steps: ["List requirements: scale, latency, analytics.", "Draw the architecture: API, database, cache.", "Explain how you generate unique keys and handle collisions.", "Write it up as a one page design doc."],
    cvLine: "",
  },
  "cloud basics": {
    title: "Host your portfolio in the cloud",
    steps: ["Build a one page portfolio.", "Host it on a cloud free tier (e.g. object storage or a static host).", "Add HTTPS and a custom domain if you can.", "Write down what each service did."],
    cvLine: "Hosted a personal site on cloud infrastructure with HTTPS.",
  },
  "data visualisation": {
    title: "Three charts from this week's TidyTuesday",
    steps: ["Pick this week's TidyTuesday dataset.", "Make three charts, each answering one question.", "Give each chart a headline that states the finding.", "Post them on LinkedIn or GitHub."],
    cvLine: "Published data visualisations from open datasets (TidyTuesday).",
    link: { label: "TidyTuesday", url: "https://github.com/rfordatascience/tidytuesday" },
  },
  pandas: {
    title: "Clean a messy UK public dataset",
    steps: ["Pick a dataset from data.gov.uk.", "Fix missing values, types and duplicates with pandas.", "Answer three questions with groupby and merge.", "Publish the notebook."],
    cvLine: "Cleaned and analysed a UK public dataset in pandas.",
    link: { label: "data.gov.uk", url: "https://www.data.gov.uk/" },
  },
  "experiment design": {
    title: "Design a mock A/B test",
    steps: ["Pick a change to an app you use (e.g. a new sign up button).", "Write the hypothesis, primary metric and guardrail metrics.", "Calculate the sample size with a calculator.", "Explain how you'd decide to ship."],
    cvLine: "",
    link: { label: "Sample size calculator", url: "https://www.evanmiller.org/ab-testing/sample-size.html" },
  },
  excel: {
    title: "A three year model for a coffee shop",
    steps: ["Set up assumptions: price, cups per day, costs.", "Build revenue, costs and profit by year.", "Add best, base and worst case scenarios.", "Format it so someone else can follow it."],
    cvLine: "Built a three year financial model with scenarios in Excel.",
  },
  "financial modelling": {
    title: "Three statement model from an annual report",
    steps: ["Pick a listed UK company and download its annual report.", "Rebuild the income statement, balance sheet and cash flow for two years.", "Link them so the balance sheet balances.", "Forecast one year ahead with stated assumptions."],
    cvLine: "Built a linked three statement model for a listed company from public filings.",
  },
  "case interviews": {
    title: "Three timed market sizings",
    steps: ["Pick three sizing questions (e.g. coffees sold in London per day).", "Give yourself 5 minutes each, structure first.", "Record yourself and listen back.", "Sanity check each answer a second way."],
    cvLine: "",
  },
  communication: {
    title: "Two minute project pitch",
    steps: ["Record a two minute explanation of your best project.", "Watch it back and note every filler word.", "Cut it to 90 seconds.", "Record the final version."],
    cvLine: "",
  },
  "commercial awareness": {
    title: "One market story, written up",
    steps: ["Pick one story from your Industry Insights brief.", "Take notes on the notes page as you read.", "Answer the guided reflection.", "Turn it into a 30 second interview answer."],
    cvLine: "",
  },
};

export function resourcesFor(skill: string): { resources: Resource[]; project?: OneDayProject; searches: Resource[] } {
  const c = canonicalSkill(skill);
  const key = R[c] ? c : ALIAS[c] ?? c;
  const q = encodeURIComponent(skill);
  return {
    resources: R[key] ?? [],
    project: ONE_DAY[key],
    searches: [
      { title: `Search Coursera for ${skill}`, provider: "Coursera", url: `https://www.coursera.org/search?query=${q}`, kind: "course" },
      { title: `${skill} tutorials`, provider: "YouTube", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} tutorial for beginners`)}`, kind: "video" },
      { title: `${skill} projects`, provider: "GitHub", url: `https://github.com/search?q=${encodeURIComponent(`${skill} project`)}&type=repositories&s=stars`, kind: "github" },
    ],
  };
}
