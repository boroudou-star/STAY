import type { CareerTrack } from "@/lib/types";

/**
 * What senior interviewers in each field listen for in graduate interviews.
 * Each criterion has a simple detector used by the rule-based scorer; the AI scorer
 * receives the same criteria so both judge against the same bar.
 */

export type FieldId = "consulting" | "banking" | "software" | "ai" | "data" | "research" | "marketing" | "engineering" | "general";

export interface LensCheck {
  criterion: string;
  test: RegExp;
}

export interface FieldBar {
  id: FieldId;
  label: string;
  /** Used mid-sentence, e.g. "an AI and machine learning interviewer" */
  noun: string;
  interviewer: string;
  /** What the hiring manager is ultimately deciding */
  bar: string;
  behavioural: LensCheck[];
  motivation: LensCheck[];
  /** Probes this interviewer would use, keyed by the weakest dimension */
  probes: Record<"structure" | "specificity" | "impact" | "relevance" | "concision", string>;
}

const NUM = /(\d+(\.\d+)?\s?(%|k|m|bn|x|£|\$|hours?|days?|weeks?|months?|people|users|customers|members|students|clients|ms|seconds?)|£\s?\d+|\$\s?\d+|\b(doubled|halved|tripled)\b)/i;

export const FIELD_BARS: Record<FieldId, FieldBar> = {
  consulting: {
    id: "consulting",
    label: "Consulting",
    noun: "consulting",
    interviewer: "Engagement manager at a strategy consultancy",
    bar: "Could I put this person in front of a client in their first month? Structured, answer first, quantified, persuasive with stakeholders.",
    behavioural: [
      { criterion: "Answer first: the outcome or point is clear in the opening", test: /^[\s\S]{0,260}?(\d|result|outcome|led to|so that|which meant|i (led|delivered|won|built|persuaded|convinced))/i },
      { criterion: "Signposted structure (first, second, then, finally)", test: /\b(first(ly)?|second(ly)?|third(ly)?|then|finally|two (things|reasons|steps)|three (things|reasons|steps))\b/i },
      { criterion: "Quantified impact", test: NUM },
      { criterion: "Managed stakeholders: persuaded, aligned or influenced others", test: /\b(persuad|convinc|align|stakeholder|client|negotiat|buy-in|got (the|my) (team|manager|lecturer))/i },
      { criterion: "Prioritisation or judgement explained", test: /\b(prioriti[sz]|decided to|chose to|trade-?off|instead of|rather than|most important)\b/i },
    ],
    motivation: [
      { criterion: "Shows understanding of the consultant's job (problem solving for clients, variety, impact)", test: /\b(client|problem|projects?|industr(y|ies)|variety|impact|recommendation)\b/i },
      { criterion: "Backs motivation with personal evidence", test: /\bi (led|built|worked|ran|organised|organized|analysed|analyzed|did|spent|joined|founded|competed)\b/i },
      { criterion: "Specific to the firm: practice, sector, value or person spoken to", test: /\b(practice|sector|team|office|spoke (to|with)|coffee chat|met|value|values|insight|case competition)\b/i },
    ],
    probes: {
      structure: "Give me that again in three parts, and lead with the result.",
      specificity: "What exactly did you do on day one, and what data did you use?",
      impact: "What changed because of you? Put a number on it.",
      relevance: "Which part of that shows you could handle a difficult client?",
      concision: "You have 30 seconds with a partner. What's the headline?",
    },
  },
  banking: {
    id: "banking",
    label: "Investment banking & finance",
    noun: "investment banking",
    interviewer: "Vice President in an investment banking division",
    bar: "Will this analyst be accurate, resilient under pressure and commercially switched on? One careless error in a model can embarrass the team in front of a client.",
    behavioural: [
      { criterion: "Attention to detail: checking, accuracy, catching errors", test: /\b(check(ed|ing)?|accura(te|cy)|error|mistake|detail|review(ed)?|reconcil|double-?check|verified)\b/i },
      { criterion: "Resilience: tight deadlines, long hours, pressure handled", test: /\b(deadline|pressure|overnight|weekend|late|hours|tight|last-?minute|juggl)/i },
      { criterion: "Team player in a hierarchy: supported seniors or peers", test: /\b(manager|senior|supervisor|team ?mates?|colleague|supported|took on|handed)\b/i },
      { criterion: "Quantified outcome", test: NUM },
      { criterion: "Owns their part clearly (I did X)", test: /\bi (built|prepared|modelled|modeled|analysed|analyzed|wrote|checked|led|managed|calculated|presented)\b/i },
    ],
    motivation: [
      { criterion: "Understands the analyst job (models, pitch books, due diligence, deal execution)", test: /\b(model|pitch|deal|due diligence|valuation|transaction|m&a|ipo|capital|execution|analyst)\b/i },
      { criterion: "Commercial awareness: refers to a deal, market or sector trend", test: /\b(deal|acquisition|merger|ipo|rates?|market|sector|valuation|financing)\b/i },
      { criterion: "Backs motivation with personal evidence", test: /\bi (led|built|worked|ran|traded|invested|analysed|analyzed|joined|competed|completed|interned)\b/i },
    ],
    probes: {
      structure: "Walk me through it again, step by step, as if I'm checking your work.",
      specificity: "What numbers were you working with, and how did you check them?",
      impact: "What was the outcome, in pounds, percentages or time saved?",
      relevance: "How does that prepare you for 80-hour weeks before a deal signs?",
      concision: "Summarise that for the MD in one sentence.",
    },
  },
  software: {
    id: "software",
    label: "Software engineering",
    noun: "software engineering",
    interviewer: "Engineering manager hiring graduate software engineers",
    bar: "Does this person own technical decisions, understand trade-offs and ship working, tested code?",
    behavioural: [
      { criterion: "Names the concrete technology and what they built with it", test: /\b(python|java(script)?|typescript|react|node|sql|postgres|docker|kubernetes|aws|gcp|azure|api|rest|c\+\+|go|rust|git|linux|django|flask|spring)\b/i },
      { criterion: "Explains a technical decision and the trade-off", test: /\b(trade-?off|instead of|rather than|chose|decided|option|because it|so that|performance|scalab|latency)\b/i },
      { criterion: "Quality: testing, code review, debugging or monitoring", test: /\b(test(s|ed|ing)?|unit|integration|ci|code review|debug|bug|monitor|logging|refactor)\b/i },
      { criterion: "Measured result (latency, users, bugs, time saved)", test: NUM },
      { criterion: "Clear personal ownership of the code", test: /\bi (built|wrote|implemented|designed|refactored|fixed|debugged|deployed|shipped|optimi[sz]ed|added)\b/i },
    ],
    motivation: [
      { criterion: "Shows genuine interest through things built", test: /\b(built|side project|github|open source|hackathon|app|tool|shipped)\b/i },
      { criterion: "Specific to the company's product or engineering", test: /\b(product|platform|engineering|stack|scale|users|api|infrastructure|blog)\b/i },
      { criterion: "Knows what they want to learn or work on", test: /\b(learn|work on|grow|team|backend|frontend|infrastructure|distributed|mobile)\b/i },
    ],
    probes: {
      structure: "Start from the problem, then your design, then what happened.",
      specificity: "Which language, which libraries, and what did the architecture look like?",
      impact: "How did you measure that it worked? Any numbers?",
      relevance: "What would you do differently if this had a million users?",
      concision: "Explain the hardest bug in two sentences.",
    },
  },
  ai: {
    id: "ai",
    label: "AI & machine learning",
    noun: "AI and machine learning",
    interviewer: "ML engineering lead hiring graduate machine learning engineers",
    bar: "Does this person frame problems well, evaluate honestly and know the limits of their models? Benchmarks without rigour are a red flag.",
    behavioural: [
      { criterion: "Frames the problem and the success metric", test: /\b(metric|accuracy|f1|precision|recall|auc|rmse|mae|loss|objective|kpi|success)\b/i },
      { criterion: "Compares against a baseline", test: /\b(baseline|benchmark|compared (to|with)|vs\.?|versus|simple model|heuristic)\b/i },
      { criterion: "Evaluation rigour (held-out data, validation, error analysis, leakage)", test: /\b(validation|test set|held[- ]out|cross[- ]validation|error analysis|leak|split|overfit)/i },
      { criterion: "Acknowledges limitations or failure modes", test: /\b(limitation|bias|fail(ed|ure)?|didn'?t work|edge case|weakness|caveat|drift)\b/i },
      { criterion: "Took it beyond a notebook (deployment, users, real data)", test: /\b(deploy|production|api|users|served|real[- ]world|pipeline|monitor)/i },
    ],
    motivation: [
      { criterion: "Evidence of hands-on ML work", test: /\b(trained|built|fine-?tuned|model|dataset|pytorch|tensorflow|kaggle|paper|research)\b/i },
      { criterion: "Understands the company's ML use case", test: /\b(product|users|use case|data|model|platform|research|safety|evaluation)\b/i },
      { criterion: "A grounded view on AI (not hype)", test: /\b(limit|risk|evaluat|cost|reliab|trade-?off|safety|responsib)/i },
    ],
    probes: {
      structure: "Take me through it as: problem, data, model, evaluation, result.",
      specificity: "What was the dataset size, the model, and the metric?",
      impact: "What was the baseline, and how much better were you?",
      relevance: "How did you know the result wasn't just data leakage?",
      concision: "If I only remember one thing about this project, what should it be?",
    },
  },
  data: {
    id: "data",
    label: "Data & analytics",
    noun: "data and analytics",
    interviewer: "Analytics manager hiring graduate data analysts and scientists",
    bar: "Can this person turn a messy business question into a clear answer that changes a decision?",
    behavioural: [
      { criterion: "Defines the business question or metric", test: /\b(question|metric|kpi|goal|hypothesis|defin)/i },
      { criterion: "Names the tools and method (SQL, Python, test, model)", test: /\b(sql|python|pandas|excel|tableau|power ?bi|r\b|regression|a\/b|experiment|dashboard)/i },
      { criterion: "Checks data quality or caveats", test: /\b(clean|missing|quality|outlier|caveat|bias|sample|validat|sanity)/i },
      { criterion: "Turns analysis into a decision or recommendation", test: /\b(recommend|decision|decided|stakeholder|so (we|the team)|led to|changed|action)/i },
      { criterion: "Quantified impact", test: NUM },
    ],
    motivation: [
      { criterion: "Evidence of hands-on analysis", test: /\b(analysed|analyzed|dashboard|sql|dataset|model|kaggle|project)\b/i },
      { criterion: "Links data to business decisions", test: /\b(decision|business|customers|product|revenue|growth|insight)\b/i },
      { criterion: "Specific to the company's data or product", test: /\b(product|users|customers|platform|data|market)\b/i },
    ],
    probes: {
      structure: "Question, data, method, answer, decision. Go.",
      specificity: "Which table, which metric, which time window?",
      impact: "What decision changed because of your analysis?",
      relevance: "How would you explain that to a non-technical manager?",
      concision: "Give me the one chart you'd show.",
    },
  },
  research: {
    id: "research",
    label: "Research & life sciences",
    noun: "research",
    interviewer: "Principal scientist hiring graduate researchers",
    bar: "Is this person rigorous, honest about uncertainty and able to own a piece of a project?",
    behavioural: [
      { criterion: "Clear hypothesis or research question", test: /\b(hypothes|research question|aim|we wanted to test|objective)/i },
      { criterion: "Method and rigour (controls, replicates, statistics)", test: /\b(control|replicat|statistic|significan|sample size|method|protocol|p-?value|confidence)/i },
      { criterion: "Own contribution separated from supervisor/team", test: /\bi (designed|ran|analysed|analyzed|wrote|built|optimi[sz]ed|developed|performed)\b/i },
      { criterion: "Interprets the result, including what it doesn't show", test: /\b(suggest|indicat|limitation|however|does not|didn'?t|caveat|future work)/i },
      { criterion: "Quantified result", test: NUM },
    ],
    motivation: [
      { criterion: "Genuine scientific curiosity with evidence", test: /\b(research|lab|project|dissertation|paper|experiment)\b/i },
      { criterion: "Knows the organisation's research area", test: /\b(pipeline|programme|therapeutic|platform|area|disease|target|group)\b/i },
      { criterion: "Clear on what they'd contribute", test: /\b(contribute|skills?|bring|learn)\b/i },
    ],
    probes: {
      structure: "Hypothesis, method, result, interpretation. In that order.",
      specificity: "What was your n, and what controls did you use?",
      impact: "What did the result change in the project's direction?",
      relevance: "What would you do if the experiment failed twice?",
      concision: "Explain the finding to a non-scientist in one sentence.",
    },
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    noun: "marketing",
    interviewer: "Marketing director hiring graduate marketers",
    bar: "Does this person understand an audience, make sharp creative and channel choices, and prove results with numbers?",
    behavioural: [
      { criterion: "Starts from the audience or customer insight", test: /\b(audience|customer|target|insight|persona|segment|students|users)\b/i },
      { criterion: "Explains channel and creative choices", test: /\b(channel|instagram|tiktok|linkedin|email|content|campaign|post|creative|brand)\b/i },
      { criterion: "Measured results (reach, engagement, conversions, cost)", test: /(\d+(\.\d+)?\s?(%|k|m)?\s?(followers|views|reach|clicks|sign-?ups|conversions|engagement|impressions|sales))|\b(ctr|cac|roi|conversion rate)\b/i },
      { criterion: "Tested and iterated", test: /\b(test(ed)?|a\/b|iterat|tweak|optimi[sz]|changed the)\b/i },
      { criterion: "Own role clear", test: /\bi (wrote|designed|ran|launched|created|planned|managed|grew|posted)\b/i },
    ],
    motivation: [
      { criterion: "Talks about the brand with specifics (a campaign, product or audience)", test: /\b(campaign|ad|advert|brand|product|audience|launch)\b/i },
      { criterion: "Evidence of marketing they've done", test: /\bi (ran|grew|created|launched|wrote|managed|designed)\b/i },
      { criterion: "Commercial lens: links marketing to growth or revenue", test: /\b(growth|revenue|sales|retention|customers|market share)\b/i },
    ],
    probes: {
      structure: "Audience, idea, channel, result. Go.",
      specificity: "Which platform, what budget, what did the creative say?",
      impact: "What were the numbers before and after?",
      relevance: "How would you do that for our brand?",
      concision: "Pitch the campaign in one line.",
    },
  },
  engineering: {
    id: "engineering",
    label: "Engineering",
    noun: "engineering",
    interviewer: "Chartered engineer leading a graduate scheme",
    bar: "Is this person safe, methodical and able to make sound design decisions within constraints?",
    behavioural: [
      { criterion: "States requirements and constraints", test: /\b(requirement|constraint|spec|tolerance|budget|load|standard|regulation)/i },
      { criterion: "Explains a design decision and trade-off", test: /\b(trade-?off|chose|decided|instead of|rather than|option)/i },
      { criterion: "Safety, testing or validation", test: /\b(safety|test|validat|risk|failure mode|fmea|simulat|prototype)/i },
      { criterion: "Quantified outcome", test: NUM },
      { criterion: "Own contribution clear", test: /\bi (designed|built|calculated|tested|modelled|modeled|led|drew|simulated)\b/i },
    ],
    motivation: [
      { criterion: "Interest in the company's projects or sector", test: /\b(project|infrastructure|energy|product|sector|plant|site)\b/i },
      { criterion: "Evidence of hands-on engineering", test: /\b(designed|built|project|cad|prototype|placement)\b/i },
      { criterion: "Aware of professional development (chartership, training)", test: /\b(chartered|chartership|graduate scheme|training|ice|imeche|iet)\b/i },
    ],
    probes: {
      structure: "Requirement, options, decision, validation, result.",
      specificity: "What were the actual numbers: loads, tolerances, costs?",
      impact: "How did you prove the design worked?",
      relevance: "Where could it have failed, and how did you mitigate it?",
      concision: "Explain the design choice to a client in one sentence.",
    },
  },
  general: {
    id: "general",
    label: "Graduate schemes",
    noun: "graduate scheme",
    interviewer: "Graduate recruitment manager at a large employer",
    bar: "Does this candidate show the competency with clear personal evidence and a result, in a way that would score well against our framework?",
    behavioural: [
      { criterion: "Clear STAR structure", test: /\b(result|outcome|as a result|led to)\b/i },
      { criterion: "Personal contribution (I, not we)", test: /\bi (led|built|organised|organized|decided|wrote|created|proposed|persuaded|analysed|analyzed)\b/i },
      { criterion: "Quantified result", test: NUM },
      { criterion: "Reflection: what you learned", test: /\b(learn|learned|learnt|taught me|next time|differently|realised|realized)\b/i },
    ],
    motivation: [
      { criterion: "Specific to this employer", test: /\b(programme|scheme|rotation|team|value|values|product|clients?)\b/i },
      { criterion: "Personal evidence for the motivation", test: /\bi (led|built|worked|ran|joined|organised|organized|did|volunteered)\b/i },
      { criterion: "Clear on what they'd contribute", test: /\b(contribute|bring|skills?|help)\b/i },
    ],
    probes: {
      structure: "Situation in one line, then what you did.",
      specificity: "Give me one concrete example from that.",
      impact: "What was the measurable result?",
      relevance: "Which of our values does that show?",
      concision: "What's the one-sentence version?",
    },
  },
};

export function fieldFor(track?: CareerTrack | string): FieldBar {
  const map: Record<string, FieldId> = {
    consulting: "consulting",
    finance: "banking",
    software: "software",
    ai: "ai",
    research: "research",
    data: "data",
    biotech: "research",
    marketing: "marketing",
    engineering: "engineering",
  };
  return FIELD_BARS[map[track ?? ""] ?? "general"];
}

/** A precise, actionable fix for each criterion an interviewer listens for. */
const LENS_FIXES: [RegExp, string][] = [
  [/answer first/i, 'Open with the outcome, e.g. "I got a stalled project delivered on time by…", then tell the story.'],
  [/signposted/i, 'Say "I did three things. First…, second…, third…" so the interviewer can follow and score you.'],
  [/quantified|measured result|measured results/i, "Put a number on the outcome: %, £, time saved, people affected, grade or users."],
  [/stakeholder|persuaded/i, "Add the moment you had to convince someone, what they objected to, and how you won them over."],
  [/prioriti|judgement/i, 'Name a choice you made and what you gave up: "I chose X over Y because…".'],
  [/attention to detail/i, "Mention how you checked your work and one error you caught before it mattered."],
  [/resilience/i, "Say how tight the deadline was and how you kept quality up under it."],
  [/hierarchy/i, "Show exactly how you supported a senior or teammate, and what they could do because of it."],
  [/owns their part|own contribution|own role|personal contribution|ownership of the code/i, 'Use "I" with a precise verb for your part: built, wrote, modelled, decided.'],
  [/concrete technology/i, "Name the language, framework or tool, and exactly what you built with it."],
  [/technical decision|design decision|trade-off/i, 'Explain one decision and the alternative you rejected: "I used X instead of Y because…".'],
  [/quality: testing|safety, testing/i, "Say how you tested or validated it, and one problem testing caught."],
  [/frames the problem/i, "State the goal and the metric you optimised before you describe the model."],
  [/baseline/i, "Give the baseline and how much you beat it by. Without it, your number means nothing."],
  [/evaluation rigour/i, "Say how you split the data and how you ruled out leakage or overfitting."],
  [/limitations|failure modes|doesn't show/i, "Name one limitation or failure case and what you'd do about it."],
  [/beyond a notebook/i, "Say whether it was deployed, used by anyone, or tested on real data."],
  [/business question/i, "Start with the question the business needed answering and the metric you used."],
  [/tools and method/i, "Name the tool and the method, e.g. SQL window functions, a regression, an A/B test."],
  [/data quality/i, "Mention one data quality issue you found and how you handled it."],
  [/decision or recommendation/i, "End with the decision your analysis changed, and who made it."],
  [/hypothesis/i, "State your hypothesis or research question in the first two sentences."],
  [/controls, replicates/i, "Mention your controls, sample size or the statistical test you used."],
  [/interprets the result/i, "Say what the result means, and what it does not show."],
  [/audience or customer insight/i, "Start with who the audience was and the insight you had about them."],
  [/channel and creative/i, "Explain why you chose that channel and that creative, not just what you posted."],
  [/tested and iterated/i, "Say what you tested, what the numbers showed, and what you changed."],
  [/requirements and constraints/i, "State the requirement and the key constraint: load, cost, tolerance or standard."],
  [/clear star/i, "Make sure the answer ends with a concrete result."],
  [/reflection/i, 'Add one line: "What I do differently now is…".'],
  [/consultant's job/i, "Describe the actual work, client problems, analysis and recommendations, and why it suits you."],
  [/personal evidence/i, "Back the interest with one specific thing you've already done about it."],
  [/specific to the firm|specific to this employer|specific to the company/i, "Name something specific: a practice area, product, client, recent move or a person you spoke to."],
  [/analyst job/i, "Show you know the day to day: building models, pitch books, due diligence, and the hours."],
  [/commercial awareness/i, "Reference a recent deal or market trend and say why it matters to this bank."],
  [/genuine interest through things built/i, "Mention something you built in your own time and what it taught you."],
  [/knows what they want/i, "Say which team or problem you want to work on, and why."],
  [/hands-on ml|hands-on analysis|hands-on engineering|evidence of marketing/i, "Mention one real project you did, with a detail and a number."],
  [/grounded view/i, "Show you understand costs, risks or limits of AI, not just the hype."],
  [/links data to business|commercial lens/i, "Connect your interest to a business outcome: growth, revenue, retention or cost."],
  [/scientific curiosity/i, "Mention the project or paper that hooked you and the question it left you with."],
  [/research area|company's projects|ml use case|brand with specifics/i, "Name one of their projects, products or campaigns and what interests you about it."],
  [/clear on what they'd contribute/i, "Say what you would bring from day one."],
  [/professional development/i, "Mention chartership or the training you want from the scheme."],
];

export function lensFix(criterion: string) {
  return LENS_FIXES.find(([re]) => re.test(criterion))?.[1] ?? "Add one sentence that clearly shows this, using your own example.";
}

export function withArticle(word: string) {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
}
