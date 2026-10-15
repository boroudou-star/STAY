"use client";

import { AlertTriangle, BookOpen, CheckCircle2, ExternalLink, HelpCircle, Info, ShieldCheck } from "lucide-react";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { estimateGraduateRoute, GRADUATE_ROUTE_CHANGE_DATE, VISA_LINKS, visaSummary } from "@/lib/engine/visa";
import { useStay } from "@/lib/store";
import { cn, daysBetween, formatDate, todayISO } from "@/lib/utils";

const KIND_STYLE = {
  fact: { icon: CheckCircle2, tone: "text-teal", label: "Fact" },
  estimate: { icon: Info, tone: "text-blue", label: "Estimate" },
  unknown: { icon: HelpCircle, tone: "text-muted", label: "Unknown" },
  action: { icon: AlertTriangle, tone: "text-[#c2502f]", label: "Do this" },
} as const;

export default function VisaPage() {
  const p = useStay((s) => s.profile)!;
  const s = visaSummary(p);
  const est = estimateGraduateRoute(p);
  const today = todayISO();

  return (
    <div>
      <PageHeader
        eyebrow="Immigration & work eligibility"
        title="Visa & work options"
        description="General information to help you plan — not legal advice. Rules change; always check GOV.UK or your university's international student advisers."
        actions={
          <LinkButton href="/profile" variant="secondary">
            Update visa answers
          </LinkButton>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue/20 bg-blue-soft px-4 py-3 text-[13.5px] text-ink-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue" />
        <span>
          STAY separates <b>facts</b> (official rules), <b>estimates</b> (based on your answers and stated assumptions) and <b>unknowns</b>. It never guarantees sponsorship or eligibility.
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-xl font-semibold">{s.headline}</h2>
          {s.points.length > 0 ? (
            <div className="mt-4 space-y-3">
              {s.points.map((pt) => {
                const k = KIND_STYLE[pt.kind];
                return (
                  <div key={pt.label} className="flex gap-3 rounded-2xl bg-paper p-4">
                    <k.icon size={18} className={cn("mt-0.5 shrink-0", k.tone)} />
                    <div>
                      <div className="flex items-center gap-2 text-[13px] font-semibold">
                        {pt.label} <Badge>{k.label}</Badge>
                      </div>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{pt.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-ink-2">You can still read the general overview below.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="text-[12px] font-semibold uppercase tracking-widest text-blue">Planning clock</div>
          {est ? (
            <>
              <div className="mt-3 font-display text-4xl font-bold">{est.durationLabel}</div>
              <div className="text-[13px] text-muted">likely Graduate visa length (estimate)</div>
              <div className="mt-5 space-y-3 text-[13px]">
                <Row label="Assumed course end / apply" value={formatDate(est.assumedApplicationDate)} />
                <Row label="Rule change date" value={formatDate(GRADUATE_ROUTE_CHANGE_DATE)} />
                <Row label="Rough end of Graduate visa" value={formatDate(est.estimatedExpiry)} />
                <Row label="Days from today" value={`${daysBetween(today, est.estimatedExpiry)}`} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-[13.5px] text-ink-2">
              {p.visa.skipped ? "You skipped visa questions." : "Not enough information for an estimate (this applies to Student visa holders)."}
            </p>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-semibold">The main routes, in plain English</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Route
          title="Student visa — working while studying"
          body="Work hours are usually limited during term time. Check the conditions on your own visa before taking internships or part-time work."
          href={VISA_LINKS.studentWork}
        />
        <Route
          title="Graduate visa"
          body="Lets eligible graduates work without sponsorship. For applications made on or after 1 January 2027, bachelor's and master's graduates get 18 months (previously 2 years); PhD graduates get 3 years. Apply before your Student visa expires; it can't be extended."
          href={VISA_LINKS.graduate}
        />
        <Route
          title="Skilled Worker visa"
          body="Needs a job offer from a licensed sponsor, for an eligible occupation, meeting salary requirements that depend on the role and your circumstances. STAY doesn't calculate thresholds."
          href={VISA_LINKS.skilledWorker}
        />
        <Route
          title="Register of licensed sponsors"
          body="Shows which organisations can sponsor. It does NOT tell you whether a particular vacancy offers sponsorship — always ask the employer."
          href={VISA_LINKS.sponsorRegister}
        />
      </div>

      <p className="mt-6 text-[12px] text-muted">
        <BookOpen size={12} className="mr-1 inline" />
        Graduate route duration change confirmed by the Home Office in October 2025. STAY provides general information, not legal advice. For personal guidance, speak to your
        university&apos;s international student support or a regulated immigration adviser.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Route({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Card interactive className="flex flex-col p-5">
      <h3 className="font-display text-[16px] font-semibold leading-snug">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{body}</p>
      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-blue hover:underline">
        GOV.UK <ExternalLink size={12} />
      </a>
    </Card>
  );
}
