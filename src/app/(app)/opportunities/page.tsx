"use client";

import { Bookmark, BookmarkCheck, Building2, CalendarClock, CheckCircle2, ExternalLink, Info, MapPin, Plus, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { liveJobSearches } from "@/data/opportunities";
import { SKILL_GUIDES, canonicalSkill, DEFAULT_GUIDE, roleForTrack, TRACK_MAP } from "@/data/careers";
import { Badge, Button, Card, Chip, DemoBadge, EmptyState, Input, LinkButton, Modal, PageHeader, Tabs } from "@/components/ui";
import { OPPORTUNITY_TYPE_LABEL } from "@/lib/engine/opportunities";
import { useDerived } from "@/lib/hooks";
import { useStay } from "@/lib/store";
import type { MatchFactor, OpportunityType, ScoredOpportunity } from "@/lib/types";
import { cn, daysBetween, formatDate } from "@/lib/utils";

type View = "recommended" | "saved" | "applied";

export default function OpportunitiesPage() {
  const d = useDerived();
  const savedOpps = useStay((s) => s.savedOpps);
  const appliedOpps = useStay((s) => s.appliedOpps);
  const [view, setView] = useState<View>("recommended");
  const [q, setQ] = useState("");
  const [type, setType] = useState<OpportunityType | null>(null);
  const [showIneligible, setShowIneligible] = useState(false);
  const [detail, setDetail] = useState<ScoredOpportunity | null>(null);

  const types = Array.from(new Set(d.opportunities.map((o) => o.opportunity.type)));
  const list = useMemo(() => {
    let l = d.opportunities;
    if (view === "saved") l = l.filter((s) => savedOpps.includes(s.opportunity.id));
    if (view === "applied") l = l.filter((s) => appliedOpps[s.opportunity.id]);
    if (view === "recommended" && !showIneligible) l = l.filter((s) => s.eligible !== false);
    if (type) l = l.filter((s) => s.opportunity.type === type);
    if (q.trim()) {
      const n = q.toLowerCase();
      l = l.filter((s) => `${s.opportunity.title} ${s.opportunity.company} ${s.opportunity.location} ${s.opportunity.skillsRequired.join(" ")}`.toLowerCase().includes(n));
    }
    return l;
  }, [d.opportunities, view, savedOpps, appliedOpps, showIneligible, type, q]);
  const hiddenIneligible = d.opportunities.filter((s) => s.eligible === false).length;
  const goal = TRACK_MAP[d.profile.careerGoals[0] ?? "exploring"];
  const keyword = roleForTrack(goal.id, d.profile.preferredRoles);
  const city = d.profile.locationPreferences.find((l) => !/remote/i.test(l)) ?? "London";

  return (
    <div>
      <PageHeader
        eyebrow="Find opportunities"
        title="Opportunities matched to you"
        description={`Ranked by requirement alignment with your ${goal.noun} goals, skills, graduation date${!d.profile.visa.skipped && d.profile.visa.needsSponsorship === "yes" ? ", sponsorship needs" : ""} and location. A score shows fit — never your chance of being hired.`}
      />

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-dashed border-ink/20 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-[13.5px] text-ink-2">
          <DemoBadge className="mt-0.5 shrink-0" />
          <span>
            Listings below are <b>fictional examples</b> showing how matching works — they are not real vacancies. Live job connectors plug into the same scoring engine.
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {liveJobSearches(keyword, city).map((s) => (
            <LinkButton key={s.name} href={s.url} external variant="secondary" size="sm">
              {s.name} <ExternalLink size={12} />
            </LinkButton>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: "recommended", label: "Recommended" },
            { value: "saved", label: `Saved (${savedOpps.length})` },
            { value: "applied", label: `Applied (${Object.keys(appliedOpps).length})` },
          ]}
        />
        <div className="relative w-full lg:w-72">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input placeholder="Search roles, companies, skills" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
      </div>
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        <Chip active={!type} onClick={() => setType(null)}>
          All types
        </Chip>
        {types.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
            {OPPORTUNITY_TYPE_LABEL[t]}
          </Chip>
        ))}
      </div>

      {list.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((s) => (
            <OpportunityCard key={s.opportunity.id} s={s} onDetails={() => setDetail(s)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bookmark />}
          title={view === "saved" ? "No saved roles yet" : view === "applied" ? "Nothing marked as applied" : "No matches for these filters"}
          body={view === "recommended" ? "Try clearing the search or type filter." : "Save or mark roles from the Recommended tab."}
          action={view !== "recommended" ? <Button variant="secondary" onClick={() => setView("recommended")}>See recommendations</Button> : undefined}
        />
      )}

      {view === "recommended" && hiddenIneligible > 0 && (
        <button onClick={() => setShowIneligible(!showIneligible)} className="mt-5 text-[13px] font-medium text-muted underline underline-offset-2 hover:text-ink">
          {showIneligible ? "Hide" : "Show"} {hiddenIneligible} role{hiddenIneligible === 1 ? "" : "s"} you&apos;re probably not eligible for (based on graduation date)
        </button>
      )}

      {detail && <ScoreModal s={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 75) return "from-teal to-blue";
  if (score >= 55) return "from-blue to-violet";
  return "from-muted to-ink-2";
}

function OpportunityCard({ s, onDetails }: { s: ScoredOpportunity; onDetails: () => void }) {
  const o = s.opportunity;
  const saved = useStay((st) => st.savedOpps.includes(o.id));
  const applied = useStay((st) => Boolean(st.appliedOpps[o.id]));
  const toggleSavedOpp = useStay((st) => st.toggleSavedOpp);
  const toggleApplied = useStay((st) => st.toggleApplied);
  const addOpportunityToRoadmap = useStay((st) => st.addOpportunityToRoadmap);
  const inRoadmap = useStay((st) => st.tasks.some((t) => t.sourceOpportunityId === o.id));
  const days = o.deadline ? daysBetween(new Date().toISOString().slice(0, 10), o.deadline) : null;
  const needsSponsor = useStay((st) => st.profile && !st.profile.visa.skipped && st.profile.visa.needsSponsorship === "yes");

  return (
    <Card interactive className={cn("flex flex-col p-5", s.eligible === false && "opacity-70")}>
      <div className="flex items-start gap-4">
        <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br text-white", scoreTone(s.score))}>
          <span className="font-display text-xl font-bold leading-none">{s.score}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">match</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="violet">{OPPORTUNITY_TYPE_LABEL[o.type]}</Badge>
            {o.isDemo && <DemoBadge />}
            {s.eligible === false && <Badge tone="red">Likely not eligible</Badge>}
            {applied && (
              <Badge tone="teal">
                <CheckCircle2 size={11} /> Applied
              </Badge>
            )}
          </div>
          <h3 className="mt-1.5 font-display text-[17px] font-semibold leading-snug">{o.title}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-1">
              <Building2 size={13} /> {o.company}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {o.location}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            toggleSavedOpp(o.id);
            toast.success(saved ? "Removed from saved" : "Saved — find it under Saved");
          }}
          className={cn("rounded-xl p-2 transition-colors", saved ? "bg-lime/50 text-ink" : "text-muted hover:bg-paper-2 hover:text-ink")}
          aria-label={saved ? "Unsave" : "Save opportunity"}
        >
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
        <Sparkles size={13} className="mr-1 inline text-teal" />
        {s.fitSummary}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
        <Fact icon={<CalendarClock size={13} />} label={o.isDemo ? "Deadline (example)" : "Deadline"}>
          {o.deadline ? (
            <span className={cn(days !== null && days <= 14 && "font-semibold text-[#c2502f]")}>
              {formatDate(o.deadline, { day: "numeric", month: "short" })} · {days}d
            </span>
          ) : (
            "Not verified"
          )}
        </Fact>
        <Fact icon={<span className="text-[12px] font-bold">£</span>} label={o.isDemo ? "Salary (example)" : "Salary"}>
          {o.salary?.replace(" (example)", "") ?? "Not verified"}
        </Fact>
        <Fact icon={<ShieldCheck size={13} />} label="Sponsorship">
          <span className={cn(needsSponsor && o.sponsorshipStatus === "not_offered" && "text-[#c2502f]")}>
            {o.sponsorshipStatus === "offered" ? "Stated as available" : o.sponsorshipStatus === "not_offered" ? "Not offered" : "Not verified"}
          </span>
        </Fact>
        <Fact icon={<Info size={13} />} label="Eligibility">
          <span className="line-clamp-1" title={o.eligibility.note}>
            {o.eligibility.note}
          </span>
        </Fact>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.matchedSkills.map((k) => (
          <Badge key={k} tone="teal">
            ✓ {k}
          </Badge>
        ))}
        {s.missingSkills.map((k) => (
          <Badge key={k} tone="sun">
            + {k}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button
          size="sm"
          variant={inRoadmap ? "secondary" : "primary"}
          disabled={inRoadmap}
          onClick={() => {
            if (addOpportunityToRoadmap(o)) toast.success("Added to your roadmap", { description: o.deadline ? `Target: 2 days before the ${o.isDemo ? "example " : ""}deadline` : "Deadline not verified — set your own date" });
          }}
        >
          {inRoadmap ? <CheckCircle2 size={14} /> : <Plus size={14} />} {inRoadmap ? "In roadmap" : "Add to roadmap"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            toggleApplied(o.id);
            toast.success(applied ? "Unmarked as applied" : "Marked as applied — good luck! 🍀");
          }}
        >
          {applied ? "Undo applied" : "Mark applied"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDetails}>
          Why {s.score}%?
        </Button>
        {o.sourceUrl ? (
          <LinkButton href={o.sourceUrl} external size="sm" variant="ghost">
            View listing <ExternalLink size={12} />
          </LinkButton>
        ) : (
          <span className="ml-auto text-[11px] text-muted">Source: {o.sourceName}</span>
        )}
      </div>
    </Card>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-paper px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-ink">{children}</div>
    </div>
  );
}

const STATUS_STYLE: Record<MatchFactor["status"], string> = {
  good: "bg-teal",
  partial: "bg-blue",
  gap: "bg-sun",
  unknown: "bg-muted/50",
  blocker: "bg-red-500",
};

function ScoreModal({ s, onClose }: { s: ScoredOpportunity; onClose: () => void }) {
  const o = s.opportunity;
  const addSkillTask = useStay((st) => st.addSkillTaskToRoadmap);
  return (
    <Modal open onClose={onClose} title={`Why ${s.score}% for ${o.title}`} wide>
      <p className="mb-4 text-[13.5px] text-ink-2">
        Requirement alignment = weighted sum of the factors below. It describes how well your stated profile matches what the listing asks for — not your odds of an offer.
      </p>
      <div className="space-y-3">
        {s.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold">
                {f.label} <span className="font-normal text-muted">· weight {Math.round(f.weight * 100)}%</span>
              </span>
              <span className="text-muted">{Math.round(f.score * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div className={cn("h-full rounded-full", STATUS_STYLE[f.status])} style={{ width: `${Math.max(4, f.score * 100)}%` }} />
            </div>
            <div className="mt-1 text-[12.5px] text-ink-2">{f.detail}</div>
          </div>
        ))}
      </div>
      {s.missingSkills.length > 0 && (
        <div className="mt-6 rounded-2xl bg-paper p-4">
          <div className="mb-2 font-display font-semibold">Skills to improve for this role</div>
          <div className="space-y-2.5">
            {s.missingSkills.map((m) => {
              const g = SKILL_GUIDES[canonicalSkill(m)] ?? DEFAULT_GUIDE;
              return (
                <div key={m} className="flex items-start justify-between gap-3">
                  <div className="text-[13px]">
                    <b>{m}</b> — <span className="text-ink-2">{g.learn[0]}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const ok = addSkillTask({ key: `skill-${canonicalSkill(m)}`, title: `Build ${m}: ${g.learn[0].charAt(0).toLowerCase() + g.learn[0].slice(1)}`, description: g.why, skill: m, days: 21, category: "skills" });
                      toast[ok ? "success" : "info"](ok ? "Added to roadmap" : "Already in your roadmap");
                    }}
                  >
                    <Plus size={13} /> Roadmap
                  </Button>
                </div>
              );
            })}
          </div>
          <Link href="/skills" className="mt-3 inline-block text-[13px] font-semibold text-blue hover:underline" onClick={onClose}>
            Full skills analysis →
          </Link>
        </div>
      )}
      <p className="mt-4 text-[11.5px] text-muted">
        Source: {o.sourceName}
        {o.verifiedAt ? ` · last checked ${formatDate(o.verifiedAt)}` : " · demo data, not verified"}
      </p>
    </Modal>
  );
}
