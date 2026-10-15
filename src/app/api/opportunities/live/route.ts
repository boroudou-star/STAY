import { z } from "zod";
import { TRACK_MAP } from "@/data/careers";
import { extractSkillsFromText } from "@/lib/engine/cv";
import type { CareerTrack, Opportunity, OpportunityType } from "@/lib/types";

/**
 * AdzunaProvider (server side) — a permitted public jobs API.
 * Switch on by setting ADZUNA_APP_ID and ADZUNA_APP_KEY (free developer keys: https://developer.adzuna.com).
 * Only facts present in the API response are shown; everything else is "Not verified".
 */

const Query = z.object({
  track: z.enum(["ai", "software", "data", "consulting", "finance", "biotech", "research", "marketing", "engineering", "exploring", "other"]),
  what: z.string().max(80).optional(),
  where: z.string().max(60).optional(),
});

const AdzunaJob = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().optional().default(""),
  created: z.string().optional(),
  redirect_url: z.string().url(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_is_predicted: z.union([z.string(), z.number()]).optional(),
  company: z.object({ display_name: z.string().optional() }).optional(),
  location: z.object({ display_name: z.string().optional() }).optional(),
  contract_time: z.string().optional(),
});
const AdzunaResponse = z.object({ results: z.array(z.unknown()) });

const TTL_MS = 60 * 60 * 1000;
const g = globalThis as unknown as { __stayJobs?: Map<string, { at: number; data: Opportunity[] }> };
g.__stayJobs ??= new Map();

const SENIOR = /\b(senior|sr\.?|lead|principal|head|director|manager|staff|vp)\b/i;

function inferType(title: string): OpportunityType {
  const t = title.toLowerCase();
  if (/graduate scheme|graduate programme|graduate program/.test(t)) return "graduate_scheme";
  if (/summer intern/.test(t)) return "summer_internship";
  if (/intern|placement/.test(t)) return "off_cycle_internship";
  if (/research assistant|research associate/.test(t)) return "research_placement";
  return "entry_level";
}

function strip(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: Request) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return Response.json({ configured: false, opportunities: [] });

  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });
  const track = parsed.data.track as CareerTrack;
  const info = TRACK_MAP[track];
  const what = parsed.data.what || `graduate ${info.searchTitles[0]}`;
  const where = parsed.data.where || "London";
  const key = `${what}|${where}|${track}`;
  const hit = g.__stayJobs!.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Response.json({ configured: true, opportunities: hit.data, cached: true });

  const api = new URL("https://api.adzuna.com/v1/api/jobs/gb/search/1");
  api.searchParams.set("app_id", appId);
  api.searchParams.set("app_key", appKey);
  api.searchParams.set("what", what);
  api.searchParams.set("where", where);
  api.searchParams.set("results_per_page", "20");
  api.searchParams.set("content-type", "application/json");

  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return Response.json({ configured: true, opportunities: [], message: `Job API returned ${res.status}` });
    const body = AdzunaResponse.parse(await res.json());
    const now = new Date().toISOString();
    const opportunities: Opportunity[] = body.results
      .map((r) => AdzunaJob.safeParse(r))
      .filter((r) => r.success)
      .map((r) => r.data!)
      .filter((j) => !SENIOR.test(j.title))
      .map((j) => {
        const desc = strip(j.description);
        const predicted = String(j.salary_is_predicted ?? "0") === "1";
        const salary =
          !predicted && j.salary_min
            ? `£${Math.round(j.salary_min).toLocaleString("en-GB")}${j.salary_max && j.salary_max !== j.salary_min ? `–£${Math.round(j.salary_max).toLocaleString("en-GB")}` : ""}`
            : undefined;
        return {
          id: `adzuna-${j.id}`,
          title: j.title.replace(/<[^>]+>/g, ""),
          company: j.company?.display_name ?? "Company not stated",
          companyBlurb: desc.slice(0, 220),
          location: j.location?.display_name ?? where,
          type: inferType(j.title),
          tracks: [track],
          skillsRequired: extractSkillsFromText(desc).slice(0, 6),
          degreeFields: [],
          eligibility: { note: "Not verified — check the listing" },
          experienceLevel: "unknown",
          salary,
          deadline: undefined,
          sponsorshipStatus: "not_verified",
          sourceUrl: j.redirect_url,
          sourceName: "Adzuna (live)",
          verifiedAt: now,
          isDemo: false,
          skillsSource: "description",
        } satisfies Opportunity;
      });
    g.__stayJobs!.set(key, { at: Date.now(), data: opportunities });
    return Response.json({ configured: true, opportunities });
  } catch (err) {
    return Response.json({ configured: true, opportunities: [], message: err instanceof Error ? err.message : "Job API unavailable" });
  }
}
