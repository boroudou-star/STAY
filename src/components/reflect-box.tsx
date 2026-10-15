"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, CornerDownRight, Loader2, Pencil, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { showEffects } from "@/components/effects-toast";
import { Badge, Button, Textarea } from "@/components/ui";
import { answersOnly, generalSteps, joinSteps, reflectHeuristic, tagsFor, type ReflectionFeedback } from "@/lib/engine/insights";
import { useStay } from "@/lib/store";
import type { FeedItem, InsightAreaId, ReflectionStep } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

/**
 * Guided reflection. A big question is broken into small steps answered one at a time,
 * then saved to the notebook with coach feedback and one follow-up question.
 */
export function ReflectBox({
  question,
  steps: stepsProp,
  prefill,
  area,
  company,
  item,
  onSaved,
}: {
  question: string;
  steps?: ReflectionStep[];
  prefill?: Record<string, string>;
  area?: InsightAreaId;
  company?: string;
  item?: FeedItem;
  compact?: boolean;
  onSaved?: (entryId: string) => void;
}) {
  const steps = useMemo(() => stepsProp ?? generalSteps(question), [stepsProp, question]);
  const addInsightEntry = useStay((s) => s.addInsightEntry);
  const updateInsightEntry = useStay((s) => s.updateInsightEntry);
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...(prefill ?? {}) }));
  const [idx, setIdx] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(ReflectionFeedback & { entryId: string }) | null>(null);
  const [followAnswer, setFollowAnswer] = useState("");
  const [followSaved, setFollowSaved] = useState(false);

  const current = steps[idx];
  const filled = steps.filter((s) => answers[s.key]?.trim()).length;
  const required = steps.filter((s) => !s.optional);
  const canReview = required.every((s) => (answers[s.key] ?? "").trim().length >= 3);

  const next = () => {
    if (!current.optional && (answers[current.key] ?? "").trim().length < 3) return toast.error("A few words is enough. Then move on.");
    if (idx < steps.length - 1) setIdx(idx + 1);
    else setReviewing(true);
  };

  const save = async () => {
    if (!canReview) return toast.error("Answer each required step first");
    setLoading(true);
    const answer = joinSteps(steps, answers);
    const plain = answersOnly(steps, answers);
    const stepList = steps.filter((s) => answers[s.key]?.trim()).map((s) => ({ prompt: s.prompt, answer: answers[s.key].trim() }));
    const itemRef = item ? { title: item.title, url: item.url, source: item.source, kind: item.kind } : undefined;
    const { id, effects } = addInsightEntry({
      date: todayISO(),
      area,
      company,
      question,
      answer,
      steps: stepList,
      item: itemRef,
      tags: tagsFor(`${question} ${plain}`, area, company),
    });
    let fb: ReflectionFeedback | null = null;
    try {
      const res = await fetch("/api/ai/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer: plain, steps: stepList, area, company, item: itemRef ? { title: itemRef.title, source: itemRef.source } : undefined }),
      });
      if (res.ok) fb = (await res.json()) as ReflectionFeedback;
    } catch {
      /* offline */
    }
    if (!fb) fb = reflectHeuristic(question, plain);
    updateInsightEntry(id, { feedback: fb.feedback, followUp: fb.followUp });
    setResult({ ...fb, entryId: id });
    setLoading(false);
    toast.success("Saved to your notebook");
    showEffects(effects);
    onSaved?.(id);
  };

  const saveFollow = () => {
    if (!result || followAnswer.trim().length < 5) return;
    addInsightEntry({ date: todayISO(), area, company, question: result.followUp, answer: followAnswer.trim(), tags: tagsFor(followAnswer, area, company), parentId: result.entryId });
    setFollowSaved(true);
    toast.success("Follow-up saved. Your thinking is getting sharper.");
  };

  /* ---------- After saving: feedback + follow-up ---------- */
  if (result) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5 rounded-2xl bg-paper p-3 text-[13.5px] leading-relaxed text-ink-2">
          {steps
            .filter((s) => answers[s.key]?.trim())
            .map((s) => (
              <div key={s.key}>
                <span className="font-semibold text-ink">{s.label}: </span>
                {answers[s.key]}
              </div>
            ))}
        </div>
        <div className="rounded-2xl border border-teal/20 bg-teal-soft/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-teal">
            <Sparkles size={13} /> {result.source === "ai" ? "Coach feedback (AI)" : "Coach feedback"}
          </div>
          <p className="text-[13.5px] leading-relaxed text-ink">{result.feedback}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.checks.map((c) => (
              <Badge key={c.key} tone={c.met ? "teal" : "neutral"}>
                {c.met ? <CheckCircle2 size={11} /> : "○"} {c.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-start gap-2 text-[14px] font-medium">
            <CornerDownRight size={16} className="mt-0.5 shrink-0 text-violet" />
            {result.followUp}
          </div>
          {followSaved ? (
            <p className="mt-2 text-[13px] text-teal">✓ Saved to your notebook.</p>
          ) : (
            <>
              <Textarea className="mt-3 min-h-20" placeholder="Go one level deeper…" value={followAnswer} onChange={(e) => setFollowAnswer(e.target.value)} />
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="secondary" onClick={saveFollow} disabled={followAnswer.trim().length < 5}>
                  Save follow-up
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Review all steps ---------- */
  if (reviewing) {
    return (
      <div className="space-y-3">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Review your answer</div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <button
              key={s.key}
              onClick={() => {
                setIdx(i);
                setReviewing(false);
              }}
              className="group flex w-full items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-left hover:border-ink/25"
            >
              <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", answers[s.key]?.trim() ? "bg-teal text-white" : "bg-paper-2 text-muted")}>
                {answers[s.key]?.trim() ? <Check size={12} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 text-[13.5px]">
                <span className="font-semibold">{s.label}</span>
                <span className="block text-ink-2">{answers[s.key]?.trim() || <i className="text-muted">Skipped</i>}</span>
              </span>
              <Pencil size={13} className="mt-1 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={() => setReviewing(false)}>
            <ArrowLeft size={14} /> Back
          </Button>
          <Button size="sm" onClick={save} disabled={loading || !canReview}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Save & get feedback
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- One step at a time ---------- */
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setIdx(i)}
            aria-label={`Step ${i + 1}: ${s.label}`}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i === idx ? "bg-ink" : answers[s.key]?.trim() ? "bg-teal" : "bg-paper-2",
            )}
          />
        ))}
      </div>
      <div className="mb-1 flex items-center justify-between text-[12px] font-semibold text-muted">
        <span>
          Step {idx + 1} of {steps.length} · {current.label}
          {current.optional && <span className="ml-1 font-normal">(optional)</span>}
        </span>
        <span className="font-normal">{filled} answered</span>
      </div>
      <p className="mb-2 text-[14px] font-medium leading-snug text-ink">{current.prompt}</p>
      <Textarea
        key={current.key}
        autoFocus={idx > 0}
        className="min-h-20"
        placeholder={current.hint}
        value={answers[current.key] ?? ""}
        onChange={(e) => setAnswers((a) => ({ ...a, [current.key]: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) next();
        }}
        aria-label={current.prompt}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="flex gap-2">
          {current.optional && !(answers[current.key] ?? "").trim() && (
            <Button size="sm" variant="ghost" onClick={() => (idx < steps.length - 1 ? setIdx(idx + 1) : setReviewing(true))}>
              Skip
            </Button>
          )}
          <Button size="sm" variant={idx === steps.length - 1 ? "primary" : "secondary"} onClick={next}>
            {idx === steps.length - 1 ? "Review" : "Next"} <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
