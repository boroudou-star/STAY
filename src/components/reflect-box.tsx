"use client";

import { CheckCircle2, CornerDownRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { showEffects } from "@/components/effects-toast";
import { Badge, Button, Textarea } from "@/components/ui";
import { tagsFor, type ReflectionFeedback } from "@/lib/engine/insights";
import { useStay } from "@/lib/store";
import type { FeedItem, InsightAreaId } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

/**
 * Answer a question → STAY saves it to your notebook, gives feedback and a follow-up question.
 * The follow-up answer is saved as a linked entry, building a thread of your thinking.
 */
export function ReflectBox({
  question,
  area,
  company,
  item,
  compact,
  onSaved,
}: {
  question: string;
  area?: InsightAreaId;
  company?: string;
  item?: FeedItem;
  compact?: boolean;
  onSaved?: () => void;
}) {
  const addInsightEntry = useStay((s) => s.addInsightEntry);
  const updateInsightEntry = useStay((s) => s.updateInsightEntry);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(ReflectionFeedback & { entryId: string }) | null>(null);
  const [followAnswer, setFollowAnswer] = useState("");
  const [followSaved, setFollowSaved] = useState(false);

  const save = async () => {
    if (answer.trim().length < 10) return toast.error("Write a few sentences first — even rough thoughts count");
    setLoading(true);
    const itemRef = item ? { title: item.title, url: item.url, source: item.source, kind: item.kind } : undefined;
    const { id, effects } = addInsightEntry({
      date: todayISO(),
      area,
      company,
      question,
      answer: answer.trim(),
      item: itemRef,
      tags: tagsFor(`${question} ${answer}`, area, company),
    });
    let fb: ReflectionFeedback | null = null;
    try {
      const res = await fetch("/api/ai/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer: answer.trim(), area, company, item: itemRef ? { title: itemRef.title, source: itemRef.source } : undefined }),
      });
      if (res.ok) fb = (await res.json()) as ReflectionFeedback;
    } catch {
      /* offline */
    }
    if (!fb) {
      const { reflectHeuristic } = await import("@/lib/engine/insights");
      fb = reflectHeuristic(question, answer);
    }
    updateInsightEntry(id, { feedback: fb.feedback, followUp: fb.followUp });
    setResult({ ...fb, entryId: id });
    setLoading(false);
    toast.success("Saved to your notebook");
    showEffects(effects);
    onSaved?.();
  };

  const saveFollow = () => {
    if (!result || followAnswer.trim().length < 5) return;
    addInsightEntry({
      date: todayISO(),
      area,
      company,
      question: result.followUp,
      answer: followAnswer.trim(),
      tags: tagsFor(followAnswer, area, company),
      parentId: result.entryId,
    });
    setFollowSaved(true);
    toast.success("Follow-up saved — your thinking is getting sharper");
  };

  if (result) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-paper p-3 text-[13.5px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">You: </span>
          {answer}
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

  return (
    <div>
      <Textarea
        className={cn(compact ? "min-h-24" : "min-h-28")}
        placeholder="Your take — what you think, why, and so what? Rough is fine."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-muted">Tip: take a position → back it up → explain the &ldquo;so what&rdquo;.</span>
        <Button size="sm" onClick={save} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Save & get feedback
        </Button>
      </div>
    </div>
  );
}
