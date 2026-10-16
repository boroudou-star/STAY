# STAY — Your future, mapped out

AI career navigation for international students and recent graduates in the UK.
STAY turns career ambitions into a personalised timeline, matched opportunities, campus events and coffee chats.

> Hackathon MVP (Oct 2026). Opportunities are real UK programmes linked to official pages; the demo's example events are clearly labelled. Visa content is general information, not legal advice.

## Run it

```bash
npm install
cp .env.example .env.local   # optional — the app works without a key
npm run dev                  # http://localhost:3000
```

Production check: `npm run build && npm start`. Lint: `npm run lint`. Engine tests: `npm test`.

Deploy: import the repo into Vercel (framework: Next.js, no settings needed). Add `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables to switch on AI features.

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Enables the AI industry expert in Insights, AI insight text, outreach polishing, announcement extraction, CV skill extraction and live UCL Careers parsing. Server-side only. |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-5-5`. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | No | Live UK job listings from the Adzuna API (free developer keys), merged into the same scoring engine. |

Without a key, every feature falls back to deterministic logic.

## For real users

Anyone can **create an account** (`/signup`: name, email, password), then build their own plan (`/onboarding`, about 5 minutes):

**Accounts** (`src/lib/accounts.ts`, `src/components/auth.tsx`):
- **Sign up / Sign in / Log out / Switch account.** Log out and Switch sit at the bottom of the sidebar (and the mobile menu), on the landing page and on Profile → Account. Each account has its own plan, so several people can share a browser.
- **Sign in** lists the accounts on this device; tap one and type its password. Wrong passwords and duplicate emails are refused with clear messages.
- Passwords are never stored: only a salted PBKDF2-SHA256 hash (210k iterations, Web Crypto). **Change password** and **Delete my account** are on Profile.
- Accounts live in this browser (`stay-accounts-v1`, data per account in `stay-acct-<id>`). They separate people sharing a browser; they don't sync between devices (use Download / Restore). A plan made before accounts existed (`stay-state-v1`) is offered to the next account created and moved into it.
- The demo needs no account and never touches anyone's data.


| Step | What it asks | What it changes |
|---|---|---|
| You | Name, studying or graduated, a one-line goal | Dashboard greeting and goal |
| Studies | University (any UK university), subject, year, graduation | Timing of the whole plan; events and alumni searches |
| Goals | Careers, roles, **target companies**, industries | Tasks, role scores (target companies boosted 🎯), insight areas, coffee chats, interview company |
| Experience | Skills (tap-to-add suggestions for your field), experience, **CV upload (PDF or Word .docx, read in the browser, never uploaded)** or paste | Skill gaps (skills found in the CV are added), role scores, CV interview questions |
| Starting point | CV / LinkedIn / societies / outreach already done, applications and interviews so far, **what feels hardest**, **hours a week** | Done steps are pre-ticked, applications count towards goals, hard areas move up and come sooner, deadlines are paced to your hours |
| Preferences | Cities, company and role types, priorities | Role ranking |
| Visa | Sponsorship, visa type and expiry (optional) | Sponsorship flags and visa milestones |
| Review | Every answer with Edit links and a plain-English "how STAY will tailor your plan" | |

- Answers are saved as you go, so a refresh doesn't lose them.
- The **Profile** page edits every answer, shows a profile-strength score with the most useful missing answers, and has **Log out**, **Change password**, **Delete my account**, **Download my data** and **Restore from a file**.
- The dashboard explains how the plan was tailored and prompts for missing answers.
- Students outside UCL get search links for their own careers service and societies, plus paste-an-announcement.
- **Example events for pages STAY can't read** (`src/data/example-events.ts`): when a university's careers or union pages block automated reading or load events with JavaScript (e.g. UCL), or STAY has no verified pages for that university, the Events page shows examples of what those pages usually list. They're tailored to the student's goals, second goal, preferred role, skill gaps and visa needs; each is badged "Example, not a real date", has no booking link or Add to roadmap, and its "Find real dates" button opens the real page. Real listings always come first.

**Demo and real data are separate.** The demo (Alex) lives in its own space in the browser (`stay-demo-v1`); each account's data is in `stay-acct-<id>`. Trying or resetting the demo never touches your plan, and a banner offers "Back to my plan".

## Judge demo (2 minutes)

1. Landing → **Try the demo** (loads fictional Alex Chen, final-year CS at UCL).
2. Dashboard: insight, "3 best moves", tube-map timeline.
3. Opportunities → save a role, **Add to roadmap**, open **Why 89%?**
4. Campus Events → **Add to roadmap**; **Add from announcement** and paste a society post.
5. Coffee Chats → 5 targeted searches → **Generate message** → edit → **Copy**.
6. Roadmap → tick a task (confetti + progress updates).
7. Profile → change main goal to Consulting → **Save & adapt my plan**. Completed tasks are kept.
8. Landing → **Build my plan** to show a real user's onboarding; the demo stays untouched.

**Reset demo** is on the Profile page while viewing the demo.

## What's live vs demo

| Area | Source |
|---|---|
| Roadmap, scoring, priorities | Deterministic engine (`src/lib/engine`) — works offline |
| Opportunities | **Real UK programmes** (`src/data/programmes.ts`): about 65 internships, placements, spring insights and graduate schemes across every career area, including pharma and biotech (AstraZeneca, GSK, Pfizer, Roche, MSD) and healthcare consulting (L.E.K., ClearView, ZS, IQVIA, Deloitte, NHS Graduate Management Training Scheme). Each links to the employer's official page, checked on 16 Oct 2026. No invented deadlines or salaries; visa notes quote the employer's own pages. Matched on stage (first year, penultimate, final year or graduate, placement year, PhD). Plus live Adzuna vacancies when keys are set and job-board searches |
| Campus events | **Real pages for ~55 UK universities** (`src/data/universities.ts`): careers service events and fairs, booking platform, students' union events, societies and (UCL) international student events, each checked on 16 Oct 2026; employers' campus pages (e.g. BCG at UCL/King's). Live UCL Careers listings (`/api/events/live`, 6h cache, robots.txt checked). User-pasted announcements. Pages that can't be read get clearly marked, tailored example events linking to the real page |
| Industry insights | Live Google News RSS headlines + Apple Podcasts search (`/api/insights/feed`, 1h cache) + STAY-written primers; falls back to search links if offline |
| Interview prep | Question bank, cases and rubric scoring work offline; AI adds tailored questions, richer feedback and a live case interviewer |
| Coffee chats | 5 real LinkedIn people-search URLs per profile (+ UCL's LinkedIn alumni tool) + user-added contacts. No invented people, nothing auto-sent |
| Visa | General rules incl. Graduate route change (18 months for applications from 1 Jan 2027; PhD 3 years), links to GOV.UK |

Needs access to integrate later: Adzuna keys (code ready), other job APIs (e.g. Reed), Students' Union UCL feed, society Instagram (Graph API with each account's authorisation), LinkedIn (no people-search API), Supabase auth.

## Industry Insights (`/insights`)

- Follow up to 4 **areas** (AI, tech, data, consulting, investment banking, markets & fintech, healthcare, biotech, marketing, energy, public sector) and up to 4 **target companies**.
- **Today**: live news (Google News RSS, UK edition, last 7 days — headlines and links only) and podcasts (Apple iTunes Search API), plus a STAY-written primer and 3 daily questions.
- **Expert discussion** (`src/lib/engine/expert.ts`, `src/data/insight-expert.ts`, `/api/ai/insight-chat`): every question opens a chat with an industry expert for that area (AI, consulting, banking, healthcare and so on). The expert reacts to what the student actually wrote, corrects answers that are off topic, a list of names, "idk" or too short, explains the idea when they're stuck, and only goes deeper (example → how it works → your view → the counterargument → why it matters to the employer) once they've given a real answer. It never repeats a question and changes approach if told it is repeating itself. "Wrap up & save" gives an honest verdict (interview-ready / developing / not there yet), corrections, what's missing, key points and an interview answer built only from the student's words with [Add: …] gaps. Drafts are kept until saved; the transcript is stored in the notebook. With `ANTHROPIC_API_KEY` the expert is Claude; without it, a rule-based expert uses STAY's knowledge base (55 concepts across 11 areas).
- **Reading notes**: clicking a story or podcast opens it in a new tab and a notes panel on the Insights page (STAY never leaves the page). "Discuss with the expert" starts the discussion from your notes.
- **7-day plan**: basics → business models → key players → news → risks → target-company deep-dive → your point of view.
- **Notebook & insight profile**: searchable entries by area/company, recurring themes, company dossiers, readiness score, and "Organise my thinking" (AI summarises only your own words into a point of view and interview talking points).

## Interview Prep (`/interview`)

- **Question bank**: behavioural (by competency), motivation, technical for your field, and company questions — including one built on a real recent headline about the company. "Tailor" generates likely questions from a pasted job description (AI).
- **Timed answers** (`AnswerPanel` in `src/components/interview/answer-panel.tsx`): every question gives 30 seconds to think, then 2 minutes to answer. When time runs out a typed answer is submitted automatically with a note about pacing; an empty one offers Try again.
- **Try again until you pass**: the pass mark is a "Hire" decision. After feedback the student can **Try again** (the question resets to thinking time and the attempt is counted) or **Continue the interview**. Once they pass, the follow-up probe is asked, also timed and retryable. The summary and Question bank practice show which questions passed and on which attempt.
- **Mock interview**: mixed / behavioural / company / CV / technical; timer, interviewer voice (speech synthesis), answer by voice (Chrome/Edge speech recognition) or typing; summary saved to History.
- **Recruiter-grade feedback** (`src/data/hiring-bar.ts`, `scoreAnswer` in `src/lib/engine/interview.ts`): a hiring decision (no hire / borderline / hire / strong hire), scored against the hiring bar of the chosen field (consulting, investment banking, software, AI/ML, data, research, marketing, engineering, general). Numbered interviewer notes quote the candidate's exact words with a concrete fix, a checklist of what that field's interviewers listen for, a stronger-answer outline built from the candidate's own material, and a field-specific follow-up probe. Calibrated strictly: most first attempts land borderline or no hire.
- **Your CV**: questions generated only from your own profile/CV text.
- **Case practice** (consulting): 3 fictional cases — clarify → structure → analysis with exhibits → recommendation, with an interviewer chat (AI, or scripted) and coverage of what a strong answer includes.
- **Story bank**: STAR stories with competency coverage and rehearsal.

## Skills and resources

- Every demo opportunity explains what each skill is used for in that specific role and what you'd do day to day (`ROLE_DETAILS` in `src/data/opportunities.ts`). Live listings quote the listing's own sentence for each skill.
- Skill gaps link to checked learning resources (`src/data/resources.ts`): courses and programmes (Coursera, Harvard CS50, fast.ai, Kaggle, Udacity), practice sites, YouTube channels and playlists, GitHub repos, and a STAY one-day project brief with a CV line. Search links for Coursera, YouTube and GitHub cover everything else. Shown on the Skills page, in "Why X%?" on opportunities, and linked from skill tasks on the roadmap.

## How the pieces are linked

STAY reacts to what you do, using deterministic rules (`src/lib/engine/roadmap.ts`, `src/lib/store.ts`):

- **Save a role** → "Apply to your saved role" task, dated before its deadline.
- **Mark roles applied** → "Track responses / prep for online tests"; 5 and 10 applications auto-tick the matching roadmap tasks.
- **Coffee-chat statuses** → 2 contacted auto-ticks "Send 2 coffee-chat messages"; no replies adds a follow-up; a reply adds "Prepare 3 questions"; low networking boosts networking events.
- **Tick a skill task** (e.g. "Build PyTorch") → the skill is added to your profile, so gaps and opportunity scores update; un-ticking removes it.
- **Finish CV / project / skill tasks** → next-step tasks (CV review, project showcase, prove-it-in-public).
- **Change goals or preferences** → roadmap rebuilt, opportunities and events re-ranked; completed tasks and user-edited dates are always kept.
- **Insights & interviews** → 5 reflections auto-tick "Build commercial awareness"; 3 mock interviews auto-tick "Run 3 mock interviews"; saving/applying to a role adds "Practise a company mock interview"; Insights company dossiers and Opportunity cards link straight into Interview Prep for that company.
- **Scoring** also uses role types, company types and your priority sliders (weights are shown in "Why X%?").

## Project structure

```
src/
  app/                 pages (App Router)
    (app)/             signed-in area: dashboard, roadmap, opportunities, events, coffee-chats, skills, visa, profile
    api/ai/*           server-side Claude routes (zod-validated, with fallbacks)
    api/events/live    public UCL Careers provider
    onboarding/        8-step questionnaire
  components/          UI kit (ui.tsx), app shell, tube map, task row
  data/                careers catalogue, demo opportunities/events, demo profile
  lib/
    engine/            roadmap, opportunities, events, skills, coffee, visa, insight (pure functions)
    services/catalog   glue between data providers and engines
    store.ts           zustand + localStorage (swap `persistence.ts` for Supabase later)
    types.ts           shared data models — agree changes here first
```

## Working together (Git)

- `main` is always demo-ready. Work on a branch per feature: `git checkout -b feat/events-filter`.
- Commit small, push often, open a PR, and have the other person glance at it before merging.
- Pull before you start: `git pull --rebase origin main`.
- Suggested split: **UI person** — `src/app/**`, `src/components/**`. **Logic person** — `src/lib/**`, `src/data/**`, `src/app/api/**`. Changes to `src/lib/types.ts` need a heads-up.
- If you connect the repo to Vercel, every PR gets a preview link.

## Known limitations

- Accounts and progress are stored in the browser, so they don't follow you to another device and clearing site data removes them; there's no email password reset. Use Profile → Download my data to keep a copy or move devices. For cloud accounts, replace `src/lib/accounts.ts` with a hosted auth service and `stayStorage` in `src/lib/persistence.ts` with a database (e.g. Supabase).
- Demo deadlines are generated relative to today so the demo stays fresh — they are labelled "example".
- Recruitment-cycle timing uses typical UK patterns, not employer-verified dates.
- Live UCL Careers parsing depends on the page structure and an AI key; if it fails, the UI links to the source instead.
