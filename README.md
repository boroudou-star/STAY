# STAY — Your future, mapped out

AI career navigation for international students and recent graduates in the UK.
STAY turns career ambitions into a personalised timeline, matched opportunities, campus events and coffee chats.

> Hackathon MVP (Oct 2026). Demo listings and events are clearly labelled and are **not** real vacancies. Visa content is general information, not legal advice.

## Run it

```bash
npm install
cp .env.example .env.local   # optional — the app works without a key
npm run dev                  # http://localhost:3000
```

Production check: `npm run build && npm start`. Lint: `npm run lint`.

Deploy: import the repo into Vercel (framework: Next.js, no settings needed). Add `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables to switch on AI features.

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Enables AI insight text, outreach polishing, announcement extraction, CV skill extraction and live UCL Careers parsing. Server-side only. |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-5-5`. |

Without a key, every feature falls back to deterministic logic.

## Judge demo (2 minutes)

1. Landing → **Try the demo** (loads fictional Alex Chen, final-year CS at UCL).
2. Dashboard: insight, "3 best moves", tube-map timeline.
3. Opportunities → save a role, **Add to roadmap**, open **Why 89%?**
4. Campus Events → **Add to roadmap**; **Add from announcement** and paste a society post.
5. Coffee Chats → 5 targeted searches → **Generate message** → edit → **Copy**.
6. Roadmap → tick a task (confetti + progress updates).
7. Profile → change main goal to Consulting → **Save & adapt roadmap**. Completed tasks are kept.

**Reset demo** is on the Profile page.

## What's live vs demo

| Area | Source |
|---|---|
| Roadmap, scoring, priorities | Deterministic engine (`src/lib/engine`) — works offline |
| Opportunities | 20 fictional demo listings + working links to live searches (LinkedIn Jobs, Prospects, GOV.UK Find a job) |
| Campus events | Demo events + user-pasted announcements + live UCL Careers fetch (`/api/events/live`, 6h cache, robots.txt checked; parsed via JSON-LD or Claude) |
| Coffee chats | 5 real LinkedIn people-search URLs per profile + user-added contacts. No invented people, nothing auto-sent |
| Visa | General rules incl. Graduate route change (18 months for applications from 1 Jan 2027; PhD 3 years), links to GOV.UK |

Needs access to integrate later: job APIs (e.g. Adzuna/Reed), Students' Union UCL feed, society Instagram (Graph API with each account's authorisation), LinkedIn (no people-search API), Supabase auth.

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

- Progress is stored in the browser (no accounts yet); clearing site data resets it.
- Demo deadlines are generated relative to today so the demo stays fresh — they are labelled "example".
- Recruitment-cycle timing uses typical UK patterns, not employer-verified dates.
- Live UCL Careers parsing depends on the page structure and an AI key; if it fails, the UI links to the source instead.
