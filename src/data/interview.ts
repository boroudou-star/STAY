import type { CareerTrack, InterviewQuestion } from "@/lib/types";

/**
 * Interview question bank.
 * Behavioural/technical questions are widely used question *types* for UK graduate recruitment.
 * They are practice questions — not leaked or guaranteed questions for any specific employer.
 */

export const COMPETENCIES = ["Teamwork", "Leadership", "Problem solving", "Resilience", "Communication", "Initiative", "Influencing", "Learning agility", "Ethics & judgement"];

type Q = Omit<InterviewQuestion, "source">;

export const BEHAVIOURAL: Q[] = [
  { id: "b-team", kind: "behavioural", competency: "Teamwork", text: "Tell me about a time you worked in a team to achieve a difficult goal.", tests: "Collaboration, your specific role, handling different working styles", tips: ["Make your own contribution clear: say 'I', not only 'we'", "Mention how you handled a disagreement or a slow teammate"] },
  { id: "b-conflict", kind: "behavioural", competency: "Teamwork", text: "Describe a time you disagreed with someone. How did you handle it?", tests: "Maturity, listening, finding a resolution", tips: ["Show you understood their view", "End with the outcome and the relationship afterwards"] },
  { id: "b-lead", kind: "behavioural", competency: "Leadership", text: "Give an example of when you took the lead on something.", tests: "Ownership, motivating others, decision-making", tips: ["Leadership doesn't need a title. A project or society role works.", "Explain one decision you made and why"] },
  { id: "b-problem", kind: "behavioural", competency: "Problem solving", text: "Tell me about a complex problem you solved.", tests: "Structure, analysis, creativity", tips: ["Walk through how you broke the problem down", "Quantify the result if you can"] },
  { id: "b-fail", kind: "behavioural", competency: "Resilience", text: "Tell me about a time you failed or something didn't go to plan.", tests: "Self-awareness, learning, honesty", tips: ["Pick a real failure, not a disguised strength", "Spend most of your time on what you learned and changed"] },
  { id: "b-pressure", kind: "behavioural", competency: "Resilience", text: "Describe a time you had several deadlines at once. How did you prioritise?", tests: "Prioritisation, time management, calm under pressure", tips: ["Explain your prioritisation logic", "Mention communicating with stakeholders"] },
  { id: "b-explain", kind: "behavioural", competency: "Communication", text: "Tell me about a time you explained something complex to a non-expert.", tests: "Clarity, empathy for the audience", tips: ["Show how you checked they understood", "A technical project explained to a friend or client is perfect"] },
  { id: "b-initiative", kind: "behavioural", competency: "Initiative", text: "Give an example of when you went beyond what was expected.", tests: "Proactivity, ownership", tips: ["Why did you do it? What did you notice others didn't?", "What happened because of it?"] },
  { id: "b-influence", kind: "behavioural", competency: "Influencing", text: "Tell me about a time you persuaded someone to change their mind.", tests: "Influence through evidence and empathy", tips: ["Show you used evidence, not just persistence", "Mention how you adapted to their concerns"] },
  { id: "b-learn", kind: "behavioural", competency: "Learning agility", text: "Tell me about a time you had to learn something new quickly.", tests: "Learning approach, adaptability", tips: ["Describe how you learned, not just that you did", "Great place to mention a new tool or language"] },
  { id: "b-feedback", kind: "behavioural", competency: "Learning agility", text: "Describe a time you received difficult feedback. What did you do with it?", tests: "Coachability, self-reflection", tips: ["Show a concrete change you made afterwards"] },
  { id: "b-ethics", kind: "behavioural", competency: "Ethics & judgement", text: "Tell me about a time you faced an ethical dilemma or had to make a judgement call.", tests: "Integrity, reasoning under ambiguity", tips: ["Explain the options you weighed", "Keep it real but professional"] },
  { id: "b-cultural", kind: "behavioural", competency: "Communication", text: "Tell me about a time you worked with people from very different backgrounds.", tests: "Inclusion, adaptability", tips: ["International students: your experience here is a genuine strength", "Focus on what you did to bridge differences"] },
];

export const MOTIVATION: Q[] = [
  { id: "m-why-role", kind: "motivation", text: "Why do you want to work as a {role}?", tests: "Genuine motivation and understanding of the role", tips: ["Link a specific experience to what the job involves day to day", "Show you know what the role is actually like"] },
  { id: "m-why-industry", kind: "motivation", text: "Why {industry}?", tests: "Commercial awareness and motivation", tips: ["Use your Insights notebook: mention one trend you've followed", "Avoid generic answers like 'it's fast-paced'"] },
  { id: "m-yourself", kind: "motivation", text: "Walk me through your CV / tell me about yourself.", tests: "Concise narrative, relevance", tips: ["Aim for 90 seconds: past → present → why this role", "Pick 2–3 highlights, not everything"] },
  { id: "m-5y", kind: "motivation", text: "Where do you see yourself in five years?", tests: "Ambition, realism, fit with the career path", tips: ["Tie it to skills you'll build in this role"] },
  { id: "m-strength", kind: "motivation", text: "What's your greatest strength, and a weakness you're working on?", tests: "Self-awareness", tips: ["Back the strength with evidence", "Pick a real weakness with an improvement plan"] },
  { id: "m-questions", kind: "motivation", text: "Do you have any questions for us?", tests: "Curiosity and preparation", tips: ["Ask about the team's work, how success is measured, or something from recent news"] },
];

export const COMPANY_TEMPLATES: Q[] = [
  { id: "c-why", kind: "company", text: "Why {company}, rather than its competitors?", tests: "Research and genuine fit", tips: ["Name something specific: a product, client, value or recent move", "Connect it to your own experience or goals"] },
  { id: "c-know", kind: "company", text: "What do you know about {company} and how it makes money?", tests: "Commercial awareness", tips: ["Cover customers, products/services and revenue model", "Check the company's own website and annual report"] },
  { id: "c-news", kind: "commercial", text: "Tell me about something you've read recently about {company} or its industry, and why it matters.", tests: "Commercial awareness, structured opinion", tips: ["Use: what happened → why it matters → what's next", "Use a story from your Insights feed"] },
  { id: "c-values", kind: "company", text: "Which of {company}'s values resonates with you most, and when have you shown it?", tests: "Values fit", tips: ["Find the values on their careers site", "Back it with a short STAR example"] },
  { id: "c-challenge", kind: "commercial", text: "What do you think is the biggest challenge facing {company} in the next few years?", tests: "Strategic thinking", tips: ["Pick one challenge, explain why, suggest a response"] },
];

export const TECHNICAL: Record<string, Q[]> = {
  ai: [
    { id: "t-ai-overfit", kind: "technical", text: "What is overfitting, and how do you detect and prevent it?", modelPoints: ["Model fits noise in training data and generalises poorly", "Detect with a validation/test gap or cross-validation", "Prevent with more data, regularisation, simpler models, early stopping, augmentation"] },
    { id: "t-ai-metric", kind: "technical", text: "When would you use precision/recall instead of accuracy?", modelPoints: ["Imbalanced classes make accuracy misleading", "Precision: cost of false positives; recall: cost of false negatives", "F1 or PR-AUC to summarise; pick by business cost"] },
    { id: "t-ai-eval", kind: "technical", text: "How would you evaluate a model before shipping it to users?", modelPoints: ["Held-out test set that matches production data", "Error analysis by segment", "Baselines and offline metrics tied to the goal", "Monitoring and a rollback plan after launch"] },
    { id: "t-ai-project", kind: "technical", text: "Walk me through an ML project end to end, from data to deployment.", modelPoints: ["Problem framing and success metric", "Data collection, cleaning, leakage checks", "Model choice and evaluation", "Deployment, monitoring, iteration"] },
  ],
  software: [
    { id: "t-sw-complexity", kind: "technical", text: "Explain time complexity and give an example of improving an algorithm.", modelPoints: ["Big-O describes growth with input size", "Example: nested loop O(n²) → hash map O(n)", "Mention space/time trade-off"] },
    { id: "t-sw-test", kind: "technical", text: "How do you decide what to test in your code?", modelPoints: ["Critical paths and edge cases", "Unit vs integration tests", "Tests as documentation; CI to run them"] },
    { id: "t-sw-design", kind: "technical", text: "How would you design a URL shortener at a high level?", modelPoints: ["Generate unique short keys", "Store mapping in a database; read-heavy so cache", "Handle collisions, scale, analytics, abuse"] },
    { id: "t-sw-debug", kind: "technical", text: "Tell me about the hardest bug you've fixed.", modelPoints: ["Clear symptom and impact", "Systematic approach: reproduce, isolate, hypothesise", "Root cause and what you changed to prevent it"] },
  ],
  data: [
    { id: "t-d-sql", kind: "technical", text: "How would you find the top 3 products by revenue in each category using SQL?", modelPoints: ["Aggregate revenue by product and category", "Window function: ROW_NUMBER() or RANK() OVER (PARTITION BY category ORDER BY revenue DESC)", "Filter rank ≤ 3; mention ties"] },
    { id: "t-d-ab", kind: "technical", text: "How would you design an A/B test for a new checkout button?", modelPoints: ["Hypothesis and primary metric (conversion)", "Randomisation unit and sample size / duration", "Guardrail metrics; avoid peeking; interpret significance and practical impact"] },
    { id: "t-d-missing", kind: "technical", text: "How do you handle missing data?", modelPoints: ["Understand why it's missing", "Drop, impute (simple or model-based) or flag", "Check the impact on results"] },
    { id: "t-d-metric", kind: "technical", text: "Daily active users dropped 10% yesterday. How do you investigate?", modelPoints: ["Check data/tracking issues first", "Segment by platform, region, version, channel", "Look for external events or releases; form and test hypotheses"] },
  ],
  finance: [
    { id: "t-f-3s", kind: "technical", text: "Walk me through the three financial statements and how they link.", modelPoints: ["Income statement: revenue to net income", "Balance sheet: assets = liabilities + equity", "Cash flow statement starts from net income; ending cash flows to the balance sheet; net income flows to retained earnings"] },
    { id: "t-f-dcf", kind: "technical", text: "Walk me through a DCF.", modelPoints: ["Project free cash flows", "Discount at WACC", "Terminal value (perpetuity growth or exit multiple)", "Sum to enterprise value; adjust to equity value"] },
    { id: "t-f-ev", kind: "technical", text: "What's the difference between enterprise value and equity value?", modelPoints: ["Equity value: value to shareholders", "EV: value of the core business to all capital providers", "EV ≈ equity value + debt − cash (plus other adjustments)"] },
    { id: "t-f-dep", kind: "technical", text: "If depreciation increases by £10, how do the three statements change? (assume 20% tax)", modelPoints: ["Net income falls by £8", "Cash flow: net income −8, add back depreciation +10 → cash +2", "Balance sheet: PP&E −10, cash +2; retained earnings −8 balances"] },
    { id: "t-f-pitch", kind: "commercial", text: "Pitch me a stock or a recent deal.", modelPoints: ["What the company/deal is", "Thesis with 2–3 reasons", "Risks and what would change your mind"] },
  ],
  consulting: [
    { id: "t-c-market", kind: "case", text: "Estimate the number of electric-vehicle chargers needed in London.", modelPoints: ["Clarify: public vs home, timeframe", "Structure: EVs × charging needs ÷ charger capacity", "State rounded assumptions; sanity check"] },
    { id: "t-c-profit", kind: "case", text: "A gym chain's profits have fallen. How would you approach it?", modelPoints: ["Clarify timeframe and scope", "Profit tree: revenue (members × price, other income) and costs (fixed/variable)", "Prioritise hypotheses; ask for data; recommend"] },
  ],
  biotech: [
    { id: "t-b-pipeline", kind: "technical", text: "Explain the stages of drug development.", modelPoints: ["Discovery and preclinical", "Clinical phases of increasing size", "Regulatory review and post-market monitoring"] },
    { id: "t-b-stats", kind: "technical", text: "How would you tell if a difference between two experimental groups is real?", modelPoints: ["Hypothesis test and p-value", "Effect size and confidence intervals", "Sample size, replication, confounders"] },
  ],
  marketing: [
    { id: "t-m-campaign", kind: "technical", text: "How would you launch a product to university students with a small budget?", modelPoints: ["Target segment and insight", "Channels: societies, creators, referrals", "Metrics: CAC, activation, retention; test and iterate"] },
    { id: "t-m-measure", kind: "technical", text: "How would you measure whether a brand campaign worked?", modelPoints: ["Objective first: awareness vs consideration vs sales", "Brand lift studies, search volume, share of voice", "Compare with a control region/period"] },
  ],
  engineering: [
    { id: "t-e-project", kind: "technical", text: "Walk me through an engineering project, including a trade-off you made.", modelPoints: ["Requirements and constraints", "Options considered and decision criteria", "Testing/validation and outcome"] },
    { id: "t-e-safety", kind: "technical", text: "How do you approach safety and risk in a design?", modelPoints: ["Identify hazards and failure modes", "Mitigations and margins", "Standards, testing and documentation"] },
  ],
};

export function technicalFor(track: CareerTrack): Q[] {
  const map: Partial<Record<CareerTrack, string>> = { ai: "ai", research: "ai", software: "software", data: "data", finance: "finance", consulting: "consulting", biotech: "biotech", marketing: "marketing", engineering: "engineering" };
  return TECHNICAL[map[track] ?? "software"] ?? [];
}

/* ------------------------------------------------------------------ */
/* Case interviews (fictional companies and data)                      */
/* ------------------------------------------------------------------ */

export interface CaseStage {
  id: string;
  title: string;
  prompt: string;
  /** Information the interviewer reveals when asked (fallback mode) */
  info?: string;
  exhibit?: { caption: string; columns: string[]; rows: (string | number)[][] };
  /** What a strong answer covers */
  goodAnswer: string[];
}

export interface CaseStudy {
  id: string;
  title: string;
  type: "Profitability" | "Market entry" | "Market sizing";
  difficulty: "Beginner" | "Intermediate";
  brief: string;
  stages: CaseStage[];
}

export const CASES: CaseStudy[] = [
  {
    id: "case-coffee",
    title: "BeanBox: falling profits at a coffee chain",
    type: "Profitability",
    difficulty: "Beginner",
    brief: "Our client, BeanBox (fictional), runs 120 coffee shops across the UK. Profits have fallen 25% over the last two years while revenue stayed roughly flat. The CEO wants to know why and what to do.",
    stages: [
      {
        id: "clarify",
        title: "Clarify",
        prompt: "What would you like to ask before you start?",
        info: "Two-year timeframe. Store count is unchanged. Competitors' margins have been roughly stable. The objective is to restore profit to previous levels within 18 months.",
        goodAnswer: ["Confirm the objective and timeframe", "Check whether store count or footprint changed", "Ask how competitors are doing (company-specific vs market-wide)"],
      },
      {
        id: "structure",
        title: "Structure",
        prompt: "How would you structure your approach?",
        goodAnswer: ["Profit = revenue − costs", "Revenue: transactions × average spend; mix of drinks/food; channels", "Costs: variable (beans, milk, cups, labour) and fixed (rent, utilities, admin)", "Since revenue is flat, prioritise costs first"],
      },
      {
        id: "analysis",
        title: "Analysis",
        prompt: "Here is BeanBox's cost per cup two years ago and today. What stands out, and what is the profit impact?",
        exhibit: {
          caption: "Average cost per cup (fictional data)",
          columns: ["Cost item", "2 years ago", "Today"],
          rows: [
            ["Coffee beans", "£0.30", "£0.45"],
            ["Milk & other ingredients", "£0.20", "£0.22"],
            ["Cup & lid", "£0.08", "£0.09"],
            ["Store labour", "£0.90", "£0.92"],
            ["Average price", "£3.40", "£3.40"],
          ],
        },
        info: "BeanBox sells about 10 million cups a year.",
        goodAnswer: ["Bean cost up £0.15/cup (+50%), the biggest change", "Total cost per cup up ~£0.20 while price is flat", "~£0.20 × 10m cups ≈ £2m lower profit per year", "Bean cost explains most of the decline"],
      },
      {
        id: "recommend",
        title: "Recommendation",
        prompt: "The CEO walks in. What do you recommend?",
        goodAnswer: ["Lead with the answer: rising bean costs drive most of the profit fall", "Options: renegotiate/hedge supply, modest price rise, premium blends, reduce waste", "Risks: customer price sensitivity, quality perception", "Next steps: test price rise in a few stores; review supplier contracts"],
      },
    ],
  },
  {
    id: "case-scooter",
    title: "ZipRide: entering a UK city with e-scooters",
    type: "Market entry",
    difficulty: "Intermediate",
    brief: "ZipRide (fictional), a European e-scooter rental company, is considering launching in a large UK city. They want to know if it's attractive and how to enter.",
    stages: [
      {
        id: "clarify",
        title: "Clarify",
        prompt: "What would you like to clarify?",
        info: "The city allows rental e-scooters through licensed operators. Two competitors already operate. ZipRide wants to break even within 2 years.",
        goodAnswer: ["Regulatory context and licensing", "Existing competitors", "Objective and timeframe"],
      },
      {
        id: "structure",
        title: "Structure",
        prompt: "How would you decide whether ZipRide should enter?",
        goodAnswer: ["Market attractiveness: size, growth, regulation", "Competition: players, share, differentiation", "Company capabilities: operations, brand, funding", "Economics: revenue per scooter vs costs; break-even", "Entry mode: licence bid, partnership, acquisition"],
      },
      {
        id: "analysis",
        title: "Analysis",
        prompt: "Use the data to estimate whether a scooter breaks even in a year.",
        exhibit: {
          caption: "Unit economics per scooter (fictional data)",
          columns: ["Item", "Value"],
          rows: [
            ["Rides per scooter per day", "4"],
            ["Average revenue per ride", "£3.00"],
            ["Operating days per year", "300"],
            ["Annual operating cost per scooter", "£2,400"],
            ["Scooter purchase cost (2-year life)", "£1,000"],
          ],
        },
        goodAnswer: ["Revenue = 4 × £3 × 300 = £3,600/year", "Costs = £2,400 + £500 depreciation = £2,900/year", "Profit ≈ £700/scooter/year → breaks even", "Sensitive to rides per day: at 3 rides/day it is roughly break-even"],
      },
      {
        id: "recommend",
        title: "Recommendation",
        prompt: "What's your recommendation?",
        goodAnswer: ["Enter if a licence is achievable: unit economics are positive at 4 rides/day", "Differentiate (safety, pricing, partnerships with universities/employers)", "Risks: regulation changes, competitor price war, utilisation", "Pilot in high-density areas first"],
      },
    ],
  },
  {
    id: "case-sizing",
    title: "Market sizing: student meal kits",
    type: "Market sizing",
    difficulty: "Beginner",
    brief: "A startup wants to sell weekly meal kits to university students in the UK. Estimate the annual market size in £.",
    stages: [
      {
        id: "structure",
        title: "Structure",
        prompt: "Lay out your structure before you calculate.",
        goodAnswer: ["Number of UK students", "% who cook for themselves and might buy kits", "Kits per year per buyer × price per kit", "State assumptions clearly"],
      },
      {
        id: "analysis",
        title: "Calculate",
        prompt: "Use these assumptions to calculate the market size.",
        exhibit: {
          caption: "Assumptions for this exercise (illustrative)",
          columns: ["Assumption", "Value"],
          rows: [
            ["Students in scope", "2,000,000"],
            ["Share who might buy meal kits", "10%"],
            ["Kits bought per buyer per year", "15"],
            ["Price per kit", "£25"],
          ],
        },
        goodAnswer: ["2m × 10% = 200k buyers", "200k × 15 = 3m kits", "3m × £25 = £75m per year", "Sanity check vs. student food spend; mention ranges"],
      },
      {
        id: "recommend",
        title: "So what?",
        prompt: "Is this an attractive market for the startup?",
        goodAnswer: ["£75m is meaningful but niche", "Consider share achievable, competition and margins", "Seasonality (term time only) and student price sensitivity", "Possible adjacent segments (young professionals)"],
      },
    ],
  },
];
