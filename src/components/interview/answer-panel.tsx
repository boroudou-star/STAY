"use client";

import { CheckCircle2, ChevronDown, CornerDownRight, Loader2, Mic, MicOff, Quote, Send, Timer, Volume2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Textarea } from "@/components/ui";
import { scoreAnswer } from "@/lib/engine/interview";
import { withArticle } from "@/data/hiring-bar";
import type { AnswerFeedback, AnswerScores, HiringVerdict, InterviewQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------------- Browser speech (optional, progressive enhancement) ---------------- */

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function speak(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* not supported */
  }
}

export function useDictation(onText: (t: string) => void) {
  const recRef = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => (typeof window === "undefined" ? false : Boolean(getRecognition())));
  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-GB";
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t) onText(t.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };
  useEffect(() => () => recRef.current?.stop(), []);
  return { listening, supported, toggle };
}

/* ---------------- Feedback ---------------- */

export type FeedbackCtx = { role?: string; company?: string; track?: string };

export async function getFeedback(question: InterviewQuestion, answer: string, ctx: FeedbackCtx = {}): Promise<AnswerFeedback> {
  try {
    const res = await fetch("/api/ai/interview-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: { id: question.id, kind: question.kind, text: question.text, competency: question.competency, tests: question.tests, modelPoints: question.modelPoints, source: question.source },
        answer,
        ...ctx,
      }),
    });
    if (res.ok) return (await res.json()) as AnswerFeedback;
  } catch {
    /* offline */
  }
  return scoreAnswer(question, answer, { track: ctx.track, company: ctx.company });
}

const SCORE_LABEL: Record<keyof AnswerScores, string> = {
  structure: "Structure",
  specificity: "Specificity",
  impact: "Impact",
  relevance: "Relevance",
  concision: "Concision",
};

export function ScoreBars({ scores }: { scores: AnswerScores }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {(Object.keys(SCORE_LABEL) as (keyof AnswerScores)[]).map((k) => (
        <div key={k}>
          <div className="flex h-16 items-end overflow-hidden rounded-xl bg-paper-2">
            <div
              className={cn("w-full rounded-xl transition-all duration-700", scores[k] >= 4 ? "bg-teal" : scores[k] >= 3 ? "bg-blue" : "bg-sun")}
              style={{ height: `${(scores[k] / 5) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-center text-[11px] font-medium text-muted">{SCORE_LABEL[k]}</div>
          <div className="text-center font-display text-sm font-bold">{scores[k]}/5</div>
        </div>
      ))}
    </div>
  );
}

const VERDICT: Record<HiringVerdict, { label: string; cls: string; dot: string }> = {
  strong_hire: { label: "Strong hire", cls: "border-teal/30 bg-teal-soft", dot: "bg-teal" },
  hire: { label: "Hire", cls: "border-blue/30 bg-blue-soft", dot: "bg-blue" },
  borderline: { label: "Borderline", cls: "border-sun/40 bg-sun-soft", dot: "bg-sun" },
  no_hire: { label: "No hire", cls: "border-red-200 bg-red-50", dot: "bg-red-500" },
};

export function FeedbackView({ fb, question, showModel = true }: { fb: AnswerFeedback; question: InterviewQuestion; showModel?: boolean }) {
  const [showRewrite, setShowRewrite] = useState(false);
  const v = fb.verdict ? VERDICT[fb.verdict] : null;
  return (
    <div className="space-y-4">
      {v && (
        <div className={cn("rounded-2xl border p-4", v.cls)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", v.dot)} />
              <span className="text-[12px] font-bold uppercase tracking-widest text-ink">Hiring decision: {v.label}</span>
            </div>
            {fb.field && <span className="text-[11.5px] font-medium text-ink-2">Scored against the {fb.field} hiring bar</span>}
          </div>
          {fb.headline && <p className="mt-2 text-[14px] font-medium leading-relaxed text-ink">{fb.headline}</p>}
        </div>
      )}

      <ScoreBars scores={fb.scores} />

      {fb.notes && fb.notes.length > 0 ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#c2502f]">Interviewer&apos;s notes</div>
          <ol className="space-y-3">
            {fb.notes.map((n, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun-soft text-[11px] font-bold text-[#c2502f]">{i + 1}</span>
                <div className="min-w-0 text-[13.5px] leading-relaxed">
                  {n.quote && (
                    <div className="mb-1 flex items-start gap-1.5 border-l-2 border-sun/50 pl-2 italic text-ink-2">
                      <Quote size={12} className="mt-1 shrink-0 text-muted" />
                      {n.quote}
                    </div>
                  )}
                  <div className="text-ink">{n.issue}</div>
                  <div className="mt-0.5 text-teal">
                    <span className="font-semibold">Fix: </span>
                    {n.fix}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="rounded-2xl bg-sun-soft/60 p-4">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#c2502f]">To improve</div>
          <ul className="space-y-1 text-[13.5px]">{fb.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {fb.lens && fb.lens.length > 0 && (
          <div className="rounded-2xl bg-paper p-4">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">What {withArticle(fb.field ?? "hiring")} interviewer listens for</div>
            <ul className="space-y-1.5 text-[13px]">
              {fb.lens.map((l) => (
                <li key={l.criterion} className="flex items-start gap-2">
                  {l.met ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" /> : <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />}
                  <span className={cn(!l.met && "text-ink-2")}>{l.criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-2xl bg-teal-soft/50 p-4">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-teal">What worked</div>
          <ul className="space-y-1 text-[13px]">{fb.strengths.length ? fb.strengths.map((s) => <li key={s}>{s}</li>) : <li className="text-ink-2">Nothing yet that would stand out to an interviewer. Work through the notes and try again.</li>}</ul>
        </div>
      </div>

      {fb.rewrite && (
        <div className="rounded-2xl border border-line">
          <button onClick={() => setShowRewrite(!showRewrite)} className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold">
            Outline of a stronger answer (built from what you said)
            <ChevronDown size={16} className={cn("transition-transform", showRewrite && "rotate-180")} />
          </button>
          {showRewrite && <pre className="whitespace-pre-wrap border-t border-line px-4 py-3 font-sans text-[13px] leading-relaxed text-ink-2">{fb.rewrite}</pre>}
        </div>
      )}

      {showModel && question.modelPoints && !fb.rewrite && (
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">A strong answer covers</div>
          <ul className="space-y-1 text-[13.5px]">{question.modelPoints.map((m) => <li key={m}>• {m}</li>)}</ul>
        </div>
      )}
      <p className="text-[11px] text-muted">
        {fb.source === "ai" ? "Scored by an AI interviewer against the hiring bar for this field." : "Scored by STAY's rules against the hiring bar for this field. Add an AI key for deeper, more nuanced critique."}
      </p>
    </div>
  );
}

/* ---------------- Answer panel ---------------- */

export function AnswerPanel({
  question,
  onFeedback,
  voice,
  ctx,
  submitLabel = "Get feedback",
}: {
  question: InterviewQuestion;
  onFeedback: (answer: string, fb: AnswerFeedback, seconds: number) => void;
  voice?: boolean;
  ctx?: FeedbackCtx;
  submitLabel?: string;
}) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const dict = useDictation((t) => setAnswer((a) => (a ? `${a} ${t}` : t)));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (voice) speak(question.text);
  }, [voice, question.text]);

  const secs = Math.round((now - startedAt) / 1000);
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  const submit = async () => {
    if (answer.trim().length < 15) return;
    if (dict.listening) dict.toggle();
    setLoading(true);
    const fb = await getFeedback(question, answer.trim(), ctx);
    setLoading(false);
    onFeedback(answer.trim(), fb, secs);
  };

  return (
    <div>
      <Textarea
        className="min-h-40 text-[14.5px]"
        placeholder={question.kind === "behavioural" ? "Situation → Task → Action → Result. Type or use the mic…" : "Think out loud. Structure first, then detail. Type or use the mic…"}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        aria-label="Your answer"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {dict.supported && (
            <Button size="sm" variant={dict.listening ? "danger" : "secondary"} onClick={dict.toggle}>
              {dict.listening ? <MicOff size={14} /> : <Mic size={14} />} {dict.listening ? "Stop" : "Speak answer"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => speak(question.text)} aria-label="Read question aloud">
            <Volume2 size={14} />
          </Button>
          <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", secs > 150 ? "text-[#c2502f]" : "text-muted")}>
            <Timer size={12} /> {mm}
            {dict.listening && <Badge tone="red">● recording</Badge>}
          </span>
        </div>
        <Button size="sm" onClick={submit} disabled={loading || answer.trim().length < 15}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** Practise one question: answer → feedback → optional follow-up probe. */
export function PracticeQuestion({ question, ctx, onDone }: { question: InterviewQuestion; ctx?: FeedbackCtx; onDone?: (answer: string, fb: AnswerFeedback) => void }) {
  const [result, setResult] = useState<{ answer: string; fb: AnswerFeedback } | null>(null);
  const [probe, setProbe] = useState<{ answer: string; fb: AnswerFeedback } | null>(null);
  const [attempt, setAttempt] = useState(0);
  if (!result)
    return (
      <AnswerPanel
        key={attempt}
        question={question}
        ctx={ctx}
        onFeedback={(answer, fb) => {
          setResult({ answer, fb });
          onDone?.(answer, fb);
        }}
      />
    );
  const followQ: InterviewQuestion | null = result.fb.followUp ? { ...question, id: `${question.id}-probe`, text: result.fb.followUp, modelPoints: undefined } : null;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-paper p-3 text-[13.5px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Your answer: </span>
        {result.answer}
      </div>
      <FeedbackView fb={result.fb} question={question} />
      {followQ && !probe && (
        <div className="rounded-2xl border border-violet/25 bg-violet-soft/40 p-4">
          <div className="mb-2 flex items-start gap-2 text-[14px] font-medium">
            <CornerDownRight size={16} className="mt-0.5 shrink-0 text-violet" /> Interviewer follow-up: {followQ.text}
          </div>
          <AnswerPanel question={followQ} ctx={ctx} onFeedback={(answer, fb) => setProbe({ answer, fb })} submitLabel="Answer follow-up" />
        </div>
      )}
      {probe && followQ && (
        <div className="rounded-2xl border border-violet/25 p-4">
          <div className="mb-3 text-[13px] font-semibold">Follow-up feedback</div>
          <FeedbackView fb={probe.fb} question={followQ} showModel={false} />
        </div>
      )}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setResult(null);
            setProbe(null);
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
