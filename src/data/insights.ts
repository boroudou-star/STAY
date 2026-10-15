import type { CareerTrack, InsightAreaId } from "@/lib/types";

/**
 * Industry areas for the Insights feed.
 * Primers are STAY-written explainers of well-established concepts (not news, not time-sensitive claims).
 * Live news and podcasts come from /api/insights/* and always link to their original source.
 */

export interface Primer {
  id: string;
  title: string;
  body: string;
  questions: string[];
}

export interface InsightArea {
  id: InsightAreaId;
  label: string;
  emoji: string;
  /** Search phrases for live news (UK edition) */
  newsQueries: string[];
  /** Search term for podcast discovery */
  podcastTerm: string;
  primers: Primer[];
  /** Concepts worth being able to explain in an interview */
  keyConcepts: string[];
}

export const INSIGHT_AREAS: InsightArea[] = [
  {
    id: "ai",
    label: "AI & machine learning",
    emoji: "🤖",
    newsQueries: ["artificial intelligence UK", "AI regulation", "generative AI enterprise"],
    podcastTerm: "artificial intelligence industry",
    keyConcepts: ["Foundation models vs fine-tuning", "Inference cost", "Evaluation & safety", "Data moats", "AI regulation"],
    primers: [
      {
        id: "ai-1",
        title: "How AI companies make money",
        body: "Most AI revenue comes from a few models: selling API access priced per token, subscriptions for apps built on models, enterprise licences with support and privacy guarantees, and selling the compute (chips and cloud) underneath. Margins depend heavily on the cost of running models (inference) versus what customers will pay.",
        questions: ["Which of these business models do you think is most defensible, and why?", "If inference costs fell by 10x, who would benefit most: model labs, app builders or customers?"],
      },
      {
        id: "ai-2",
        title: "Why evaluation is the hard part",
        body: "Training a model is only half the job. Knowing whether it works for a real use case is often harder. Teams build evaluation sets, measure failure modes, and monitor models after launch because performance on benchmarks doesn't always transfer to messy real data.",
        questions: ["Describe how you'd evaluate a model in one of your own projects. What could fool your metric?", "Why might a company prefer a slightly weaker model that is easier to evaluate?"],
      },
      {
        id: "ai-3",
        title: "Regulation and trust",
        body: "Governments are setting rules for how AI is built and used, covering transparency, high-risk uses, copyright and safety testing. For employers, this creates demand for people who can explain model behaviour, document data sources and manage risk alongside building products.",
        questions: ["Pick one AI use case (e.g. hiring, healthcare). What risks should a company manage before launching it?", "How could regulation create new jobs in AI rather than reduce them?"],
      },
    ],
  },
  {
    id: "tech",
    label: "Technology & software",
    emoji: "💻",
    newsQueries: ["UK tech industry", "software company earnings", "tech hiring graduates"],
    podcastTerm: "technology business",
    keyConcepts: ["SaaS metrics (ARR, churn)", "Platform effects", "Cloud economics", "Open source business models", "Product-led growth"],
    primers: [
      {
        id: "tech-1",
        title: "SaaS in one paragraph",
        body: "Software-as-a-service companies sell subscriptions, so investors watch recurring revenue (ARR), how much customers grow their spend over time (net revenue retention) and how many leave (churn). Acquiring a customer is expensive upfront; profit comes from keeping and expanding them.",
        questions: ["Pick a SaaS product you use. How does it get you to pay more over time?", "Why might a company accept losses for years while growing ARR?"],
      },
      {
        id: "tech-2",
        title: "Platforms and network effects",
        body: "A product has network effects when each new user makes it more valuable for others: marketplaces, social networks, developer ecosystems. These can create strong moats, but they're hard to start (the 'cold start' problem) and can attract regulatory scrutiny once dominant.",
        questions: ["Name a product with network effects. How did it solve its cold-start problem?", "When can network effects work against a company?"],
      },
      {
        id: "tech-3",
        title: "Build vs buy",
        body: "Engineering teams constantly choose between building in-house and using vendors or open-source tools. The trade-off is control and differentiation versus speed, cost and maintenance burden, a common theme in technical and behavioural interviews.",
        questions: ["Describe a project where you chose to use an existing library instead of building something. Was it the right call?", "What would make you build something in-house at a company?"],
      },
    ],
  },
  {
    id: "data",
    label: "Data & analytics",
    emoji: "📊",
    newsQueries: ["data analytics business", "data privacy UK", "data science industry"],
    podcastTerm: "data science analytics",
    keyConcepts: ["Experimentation (A/B tests)", "Data quality", "Privacy & GDPR", "Metrics that matter", "Analytics engineering"],
    primers: [
      {
        id: "data-1",
        title: "Choosing the right metric",
        body: "Good analysts start from the decision, not the data. A metric is useful when it moves with the outcome the business cares about, is hard to game, and can be measured reliably. Many interview questions test whether you can pick and defend a metric.",
        questions: ["What single metric would you track for a food-delivery app, and what could go wrong with it?", "Describe a time a number misled you. What did you learn?"],
      },
      {
        id: "data-2",
        title: "Why A/B tests fail",
        body: "Experiments can mislead when samples are too small, results are checked too early, users interact with each other, or the metric doesn't reflect long-term value. Knowing these pitfalls is a strong signal in product data interviews.",
        questions: ["You see a 2% uplift after two days of a test. What do you do next?", "Give an example of a change that could win a short test but hurt the business long term."],
      },
      {
        id: "data-3",
        title: "Privacy as a design constraint",
        body: "In the UK, data protection law shapes what data can be collected, how long it's kept and how it's used. Teams increasingly design analytics to minimise personal data from the start rather than bolt privacy on later.",
        questions: ["How would you measure a product's success while collecting as little personal data as possible?", "Why might privacy rules be a competitive advantage for some companies?"],
      },
    ],
  },
  {
    id: "consulting",
    label: "Consulting (general)",
    emoji: "🧭",
    newsQueries: ["management consulting industry", "consulting firms graduate", "UK business strategy"],
    podcastTerm: "management consulting strategy",
    keyConcepts: ["Strategy vs operations vs tech consulting", "Profitability frameworks", "Market sizing", "Stakeholder management", "Utilisation & pricing"],
    primers: [
      {
        id: "con-1",
        title: "How consulting firms make money",
        body: "Firms sell expertise by the project, typically priced on team time or outcomes. Profitability depends on utilisation (how much of consultants' time is billed), pricing and leverage (the ratio of junior to senior staff). Graduates are the engine of leverage, which is why they hire in large cohorts.",
        questions: ["Why might a client pay a consultant instead of hiring their own team?", "How could AI change the leverage model in consulting?"],
      },
      {
        id: "con-2",
        title: "Profit = revenue − costs",
        body: "The classic profitability case breaks revenue into price × volume and costs into fixed and variable. The skill is not reciting the framework but asking which branch explains the problem, then quantifying it with the data you're given.",
        questions: ["Pick a local business you know. Which branch of the profit tree is most likely under pressure right now, and why?", "What questions would you ask first if a client's profits fell 20%?"],
      },
      {
        id: "con-3",
        title: "Market sizing without panic",
        body: "Interviewers want a clear structure, sensible rounded assumptions and a sanity check, not the 'right' number. Top-down (population → segment → usage) and bottom-up (units × capacity) approaches can be compared to test your estimate.",
        questions: ["Estimate how many coffees are sold in London per day. Write your structure first.", "How would you sanity-check your answer?"],
      },
    ],
  },
  {
    id: "investment-banking",
    label: "Investment banking",
    emoji: "🏦",
    newsQueries: ["mergers and acquisitions UK", "IPO London Stock Exchange", "investment banking deals"],
    podcastTerm: "investment banking markets",
    keyConcepts: ["M&A process", "IPOs & capital raising", "Valuation (DCF, comparables)", "Deal fees & league tables", "Interest rates and deal activity"],
    primers: [
      {
        id: "ib-1",
        title: "What an investment bank's advisory team does",
        body: "Advisory teams help companies buy or sell businesses (M&A) and raise money through shares or debt. Analysts build models, prepare pitch materials and run due-diligence processes. Banks are mainly paid fees when deals complete, so deal activity drives hiring.",
        questions: ["Why might deal activity rise when interest rates fall?", "Pick a recent deal you read about. Why do you think the buyer wanted that company?"],
      },
      {
        id: "ib-2",
        title: "Valuation in plain English",
        body: "Two common approaches: a discounted cash flow (DCF) values a company on the cash it will generate in future, discounted for risk and time; comparables value it relative to similar companies' multiples (e.g. EV/EBITDA). Each has weaknesses. DCFs are sensitive to assumptions, comparables to the choice of peers.",
        questions: ["Explain to a friend why a fast-growing company with no profit can still be valuable.", "Which valuation method would you trust more for a stable utility company, and why?"],
      },
      {
        id: "ib-3",
        title: "Why 'commercial awareness' matters",
        body: "Banking interviews often ask you to discuss a deal or market story. They're testing whether you can explain what happened, why it matters to the parties involved, and what might happen next, in a structured, concise way.",
        questions: ["Summarise one market story from this week in three sentences: what, why, so what.", "What risks would you flag on a deal you read about?"],
      },
    ],
  },
  {
    id: "finance-markets",
    label: "Markets & fintech",
    emoji: "📈",
    newsQueries: ["Bank of England interest rates", "fintech UK", "financial markets week"],
    podcastTerm: "financial markets economics",
    keyConcepts: ["Interest rates & inflation", "Asset classes", "Risk vs return", "Payments & open banking", "Regulation (FCA)"],
    primers: [
      {
        id: "fm-1",
        title: "Why interest rates move everything",
        body: "Central banks raise rates to cool inflation and cut them to support growth. Rates change borrowing costs, how investors value future profits, currency moves and consumer spending, so many market stories trace back to rate expectations.",
        questions: ["How might higher interest rates affect a fast-growing tech startup differently from a supermarket?", "What would you watch to predict the next rate decision?"],
      },
      {
        id: "fm-2",
        title: "How fintechs compete with banks",
        body: "Fintechs often start with one product done better (payments, savings, FX), win on user experience and lower costs, then expand. Banks have deposits, trust and licences. Partnerships and regulation shape who wins.",
        questions: ["Pick a fintech you use. What does it do better than a traditional bank, and how does it make money?", "What would make a fintech's model fragile?"],
      },
      {
        id: "fm-3",
        title: "Risk and return",
        body: "Higher expected returns usually mean taking more risk: volatility, credit risk, liquidity risk. Diversification reduces risk that's specific to one asset but not market-wide risk. These basics underpin many finance interview questions.",
        questions: ["Explain diversification using an example from everyday life.", "Why might a 'safe' investment still lose real value?"],
      },
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    emoji: "🏥",
    newsQueries: ["NHS technology", "digital health UK", "healthcare innovation"],
    podcastTerm: "healthcare innovation",
    keyConcepts: ["NHS structure & procurement", "Digital health adoption", "Clinical evidence", "Health data & privacy", "Workforce pressures"],
    primers: [
      {
        id: "hc-1",
        title: "Selling into the NHS",
        body: "The NHS is not one buyer. Decisions are spread across national bodies, regional systems and individual trusts. New products usually need clinical evidence, clear cost savings and compliance with data and safety standards, which makes sales cycles long.",
        questions: ["Why might a health-tech startup struggle to scale across the NHS even if one hospital loves its product?", "What evidence would convince you a digital health tool is worth funding?"],
      },
      {
        id: "hc-2",
        title: "Data in healthcare",
        body: "Health data is powerful for research and AI but highly sensitive. Projects must balance patient benefit, consent, security and public trust, and the most successful ones explain their value to patients clearly.",
        questions: ["What would make you comfortable sharing your health data for research?", "Pick one AI healthcare use case. What could go wrong, and how would you prevent it?"],
      },
      {
        id: "hc-3",
        title: "Prevention vs treatment",
        body: "Health systems increasingly invest in prevention and earlier diagnosis because treating advanced disease is costly. That shift creates roles in analytics, behavioural science and community care.",
        questions: ["Design a simple measure of whether a prevention programme worked.", "Why is prevention often underfunded even when it saves money long term?"],
      },
    ],
  },
  {
    id: "biotech",
    label: "Biotech & pharma",
    emoji: "🧬",
    newsQueries: ["biotech UK funding", "pharmaceutical drug approval", "life sciences industry"],
    podcastTerm: "biotech pharma industry",
    keyConcepts: ["Drug development phases", "Regulatory approval", "Biotech funding cycles", "Computational biology & AI", "Pricing & access"],
    primers: [
      {
        id: "bio-1",
        title: "The drug development pipeline",
        body: "Drugs move from discovery to preclinical testing, then clinical trials in phases of increasing size, then regulatory review. Most candidates fail along the way, so companies manage portfolios of bets and value is concentrated in late-stage successes.",
        questions: ["Why might a biotech partner with a large pharma company instead of going alone?", "Where in the pipeline could computational methods save the most time or money?"],
      },
      {
        id: "bio-2",
        title: "How biotechs are funded",
        body: "Early biotechs rely on venture capital, grants and partnerships because revenue may be years away. Funding conditions swing with markets, which affects hiring and which projects survive.",
        questions: ["What questions would you ask a biotech in an interview about its funding runway?", "How might tighter funding change what a biotech prioritises?"],
      },
      {
        id: "bio-3",
        title: "AI in life sciences",
        body: "Machine learning is used for target discovery, protein structure prediction, trial design and image analysis. The bottleneck is often high-quality labelled data and wet-lab validation, not the model itself.",
        questions: ["Why is lab validation still essential if a model predicts a promising molecule?", "What skills combine biology and computation in a way employers value?"],
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & brand",
    emoji: "📣",
    newsQueries: ["marketing industry UK", "brand campaign", "advertising technology"],
    podcastTerm: "marketing brand strategy",
    keyConcepts: ["Brand vs performance marketing", "Customer acquisition cost", "Attribution", "Creator economy", "Privacy & cookies"],
    primers: [
      {
        id: "mk-1",
        title: "Brand vs performance",
        body: "Performance marketing drives measurable actions now (clicks, sign-ups); brand marketing builds memory and preference over time. Strong teams balance both. Over-investing in short-term metrics can erode long-term growth.",
        questions: ["Pick a brand you're loyal to. What made you trust it?", "How would you justify brand spend to a CFO who only trusts click data?"],
      },
      {
        id: "mk-2",
        title: "Unit economics of growth",
        body: "Marketers track how much it costs to acquire a customer (CAC) and how much value that customer brings over time (LTV). Growth is healthy when LTV comfortably exceeds CAC and the payback period is reasonable.",
        questions: ["Estimate the CAC for a student-focused app. What channels would you test first?", "What would you do if CAC rose sharply this quarter?"],
      },
    ],
  },
  {
    id: "energy",
    label: "Energy & climate",
    emoji: "⚡",
    newsQueries: ["UK energy transition", "renewable energy investment", "net zero business"],
    podcastTerm: "energy transition climate",
    keyConcepts: ["Energy transition", "Grid & storage", "Carbon markets", "Policy & subsidies", "Engineering project delivery"],
    primers: [
      {
        id: "en-1",
        title: "Why the grid matters",
        body: "Adding renewable generation is only part of decarbonisation. Electricity grids need upgrades, storage and flexible demand to balance supply that varies with weather. Grid connection delays are a major bottleneck for new projects.",
        questions: ["Why might a wind farm be built but not connected for years?", "What kinds of jobs does the grid challenge create?"],
      },
      {
        id: "en-2",
        title: "Policy shapes markets",
        body: "Energy investment depends heavily on policy: subsidies, auctions, carbon pricing and planning rules. Stable policy lowers risk and the cost of capital; uncertainty can stall projects.",
        questions: ["Why do investors care so much about policy stability in energy?", "Pick one policy lever. Who wins and who loses?"],
      },
    ],
  },
  {
    id: "public-sector",
    label: "Public sector & policy",
    emoji: "🏛️",
    newsQueries: ["UK government digital services", "public sector data", "civil service technology"],
    podcastTerm: "public policy UK",
    keyConcepts: ["How policy is made", "Value for money", "Digital public services", "Evaluation of programmes", "Stakeholders & accountability"],
    primers: [
      {
        id: "ps-1",
        title: "Value for money",
        body: "Public spending decisions weigh costs against outcomes for citizens, often using business cases and evaluation. Analysts who can measure impact and explain trade-offs clearly are in demand across government.",
        questions: ["How would you measure whether a new public digital service is worth its cost?", "Why is measuring impact harder in the public sector than in a business?"],
      },
      {
        id: "ps-2",
        title: "Digital government",
        body: "Many services are being redesigned around user needs: simple online journeys, shared platforms and better data. The challenge is legacy systems, procurement rules and serving everyone, including people offline.",
        questions: ["Pick a government service you've used. What would you improve first?", "How would you design a service that works for people without smartphones?"],
      },
    ],
  },
];

export const AREA_MAP = Object.fromEntries(INSIGHT_AREAS.map((a) => [a.id, a])) as Record<InsightAreaId, InsightArea>;

/** Default insight areas from the user's career goals. */
export const TRACK_TO_AREAS: Record<CareerTrack, InsightAreaId[]> = {
  ai: ["ai"],
  software: ["tech"],
  data: ["data"],
  consulting: ["consulting"],
  finance: ["investment-banking", "finance-markets"],
  biotech: ["biotech", "healthcare"],
  research: ["ai"],
  marketing: ["marketing"],
  engineering: ["energy"],
  exploring: ["tech", "consulting"],
  other: ["tech"],
};

/** 7-day plan themes. {area} and {company} are filled in per user. */
export const WEEK_PLAN = [
  { theme: "The basics", task: "Read today's primer on {area} and explain it back in your own words.", question: "In two sentences, how does money flow in {area}?" },
  { theme: "Business models", task: "Pick one company in {area} and work out how it makes money.", question: "Who pays, for what, and why do they keep paying?" },
  { theme: "Key players", task: "List 5 companies in {area}: 2 leaders, 2 challengers, 1 you'd like to work for.", question: "What separates the leaders from the challengers?" },
  { theme: "This week's news", task: "Read two news stories from your feed and reflect on one.", question: "What happened, why does it matter, and what happens next?" },
  { theme: "Risks & regulation", task: "Find one risk or rule that shapes {area}.", question: "Who is most exposed to this risk, and how would you manage it?" },
  { theme: "Target company deep-dive", task: "Research {company}: products, customers, recent news, and graduate roles.", question: "Why {company}, specifically, and what would you want to work on there?" },
  { theme: "Your point of view", task: "Write your 'why this industry' answer using your notebook.", question: "What's your view on where {area} is heading in the next 3 years?" },
];
