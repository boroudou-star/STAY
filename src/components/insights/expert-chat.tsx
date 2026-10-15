"use client";

import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, Copy, GraduationCap, Loader2, RotateCcw, Send, Sparkles, Target, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { showEffects } from "@/components/effects-toast";
import { Badge, Button, Textarea } from "@/components/ui";
import { expertFor, expertOpener, expertReply, expertSummary, MAX_USER_TURNS, userAnswerText } from "@/lib/engine/expert";
import { tagsFor } from "@/lib/engine/insights";
import { useStay } from "@/lib/store";
import type { ChatTurn, ExpertSummary, ExpertTopic } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

export function chatKeyFor(topic: ExpertTopic, scope = "") {
  return `${scope || topic.kind}:${topic.question}`.slice(0, 300);
}

/**
 * A discussion with an industry expert. The expert reacts to each answer, corrects what's off,
 * and asks one deeper question at a time. Drafts are kept until the student wraps up.
 */
export function ExpertChat({ topic, chatKey, onSaved, className }: { topic: ExpertTopic; chatKey: string; onSaved?: (entryId: string) => void; className?: string }) {
  const draft = useStay((s) => s.insightChats?.[chatKey]);
  const setInsightChat = useStay((s) => s.setInsightChat);
  const addInsightEntry = useStay((s) => s.addInsightEntry);
  const opener = useMemo(() => expertOpener(topic), [topic]);
  const turns: ChatTurn[] = draft ?? [{ role: "expert", text: opener }];
  const ex = expertFor(topic);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [wrapping, setWrapping] = useState(false);
  const [source, setSource] = useState<"ai" | "rules" | null>(null);
  const [done, setDone] = useState<{ entryId: string; summary: ExpertSummary; turns: ChatTurn[] } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const userCount = turns.filter((t) => t.role === "user").length;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, thinking]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    const next: ChatTurn[] = [...turns, { role: "user", text }];
    setInsightChat(chatKey, next);
    setInput("");
    setThinking(true);
    let reply: string | null = null;
    let src: "ai" | "rules" = "rules";
    try {
      const res = await fetch("/api/ai/insight-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", topic, turns: next }),
      });
      if (res.ok) {
        const d = (await res.json()) as { text?: string; source?: "ai" | "rules" };
        if (d.text) {
          reply = d.text;
          src = d.source ?? "rules";
        }
      }
    } catch {
      /* offline: answer locally */
    }
    if (!reply) reply = expertReply(topic, next);
    setInsightChat(chatKey, [...next, { role: "expert", text: reply }]);
    setSource(src);
    setThinking(false);
  };

  const wrap = async () => {
    if (!userCount) return toast.error("Answer at least once first");
    setWrapping(true);
    let summary: ExpertSummary | null = null;
    try {
      const res = await fetch("/api/ai/insight-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "wrap", topic, turns }),
      });
      if (res.ok) summary = ((await res.json()) as { summary?: ExpertSummary }).summary ?? null;
    } catch {
      /* offline */
    }
    if (!summary) summary = expertSummary(topic, turns);
    const answer = userAnswerText(topic, turns);
    const { id, effects } = addInsightEntry({
      date: todayISO(),
      area: topic.area,
      company: topic.company,
      question: topic.question,
      answer,
      item: topic.item,
      transcript: turns,
      summary,
      feedback: summary.headline,
      followUp: summary.nextQuestion,
      tags: tagsFor(`${topic.question} ${answer}`, topic.area, topic.company),
    });
    setInsightChat(chatKey, null);
    setDone({ entryId: id, summary, turns });
    setWrapping(false);
    toast.success("Saved to your notebook");
    showEffects(effects);
    onSaved?.(id);
  };

  if (done) {
    return (
      <div className={cn("space-y-3", className)}>
        <SummaryCard summary={done.summary} />
        <TranscriptToggle turns={done.turns} title={ex.title} />
        <Button size="sm" variant="secondary" onClick={() => setDone(null)}>
          <RotateCcw size={14} /> Discuss it again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-card", className)}>
      <div className="flex items-center gap-3 border-b border-line bg-paper/70 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-lime">
          <GraduationCap size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold">
            {ex.title}
            {source === "ai" && <Badge tone="teal">AI</Badge>}
          </div>
          <div className="text-[11.5px] text-muted">Pushes back, corrects mistakes and goes deeper. Think out loud.</div>
        </div>
        {userCount > 0 && (
          <button
            onClick={() => {
              setInsightChat(chatKey, null);
              setSource(null);
            }}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-paper-2 hover:text-ink"
            aria-label="Start the discussion again"
            title="Start again"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      <div ref={listRef} className="max-h-[440px] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {turns.map((t, i) => (
          <Bubble key={i} turn={t} />
        ))}
        {thinking && (
          <div className="flex items-center gap-1.5 pl-1 text-muted" aria-label="Expert is typing">
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${d * 150}ms` }} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {["I'm not sure", "Explain it first"].map((q) => (
            <button key={q} onClick={() => send(q)} disabled={thinking} className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-medium text-ink-2 hover:border-ink/30 disabled:opacity-50">
              {q}
            </button>
          ))}
          <button
            onClick={wrap}
            disabled={thinking || wrapping || !userCount}
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold disabled:opacity-40",
              userCount >= 4 ? "bg-ink text-white" : "border border-ink/20 text-ink",
            )}
          >
            {wrapping ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Wrap up & save
          </button>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={userCount >= MAX_USER_TURNS ? "You've covered a lot. Wrap up to see your assessment." : "Type your answer. Enter to send, Shift+Enter for a new line"}
            className="min-h-[44px] flex-1 resize-none py-2.5"
            rows={2}
            aria-label="Your answer"
          />
          <Button size="sm" onClick={() => send()} disabled={thinking || !input.trim()} aria-label="Send" className="h-11 w-11 shrink-0 p-0">
            {thinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const expert = turn.role === "expert";
  return (
    <div className={cn("flex", expert ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
          expert ? "rounded-tl-md bg-paper text-ink" : "rounded-tr-md bg-ink text-white",
        )}
      >
        {turn.text}
      </div>
    </div>
  );
}

export function TranscriptToggle({ turns, title }: { turns: ChatTurn[]; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-ink-2" aria-expanded={open}>
        Discussion with the {title.toLowerCase().replace(/^ai /, "AI ")} ({turns.length} messages)
        <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          {turns.map((t, i) => (
            <Bubble key={i} turn={t} />
          ))}
        </div>
      )}
    </div>
  );
}

const VERDICT: Record<ExpertSummary["verdict"], { label: string; tone: "teal" | "sun" | "red" }> = {
  strong: { label: "Interview-ready", tone: "teal" },
  developing: { label: "Developing", tone: "sun" },
  weak: { label: "Not there yet", tone: "red" },
};

export function SummaryCard({ summary, compact }: { summary: ExpertSummary; compact?: boolean }) {
  const v = VERDICT[summary.verdict];
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-paper/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={v.tone}>{v.label}</Badge>
        <span className="text-[11.5px] text-muted">{summary.source === "ai" ? "Expert assessment (AI)" : "Expert assessment"}</span>
      </div>
      <p className="text-[14px] font-medium leading-snug text-ink">{summary.headline}</p>
      {summary.strengths.length > 0 && (
        <Section icon={<CheckCircle2 size={13} className="text-teal" />} title="What worked">
          {summary.strengths}
        </Section>
      )}
      {summary.corrections.length > 0 && (
        <Section icon={<XCircle size={13} className="text-red-600" />} title="Corrections">
          {summary.corrections}
        </Section>
      )}
      {summary.gaps.length > 0 && (
        <Section icon={<AlertTriangle size={13} className="text-sun" />} title="What's missing">
          {summary.gaps}
        </Section>
      )}
      {!compact && summary.keyPoints.length > 0 && (
        <Section icon={<BookOpen size={13} className="text-violet" />} title="What an expert would want you to know">
          {summary.keyPoints}
        </Section>
      )}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
            <Target size={13} /> Your interview answer
          </span>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(summary.interviewAnswer).catch(() => undefined);
              toast.success("Copied");
            }}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue hover:underline"
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <p className="whitespace-pre-wrap rounded-xl bg-card px-3 py-2 text-[13px] leading-relaxed text-ink-2">
          {summary.interviewAnswer.split(/(\[Add:[^\]]*\])/).map((part, i) =>
            part.startsWith("[Add:") ? (
              <mark key={i} className="rounded bg-sun-soft px-1 text-[#c2502f]">
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </p>
      </div>
      {!compact && <p className="text-[13px] text-ink-2">💭 Next time, think about: {summary.nextQuestion}</p>}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: string[] }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
        {icon} {title}
      </div>
      <ul className="space-y-1 text-[13px] leading-relaxed text-ink-2">
        {children.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}
