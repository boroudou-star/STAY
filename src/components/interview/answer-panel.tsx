"use client";

import { CheckCircle2, ChevronDown, CornerDownRight, Loader2, Mic, MicOff, Quote, RotateCcw, Send, Timer, Trophy, Volume2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Textarea } from "@/components/ui";
import { overall, scoreAnswer } from "@/lib/engine/interview";
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

/* ---------------- Pass level ---------------- */

/** The pass mark: an interviewer would put you through ("Hire" or better). */
export const PASS_LABEL = "Hire";
export function isPass(fb?: AnswerFeedback | null) {
  if (!fb) return false;
  if (fb.verdict) return fb.verdict === "hire" || fb.verdict === "strong_hire";
  return overall(fb.scores) >= 70;
}

export function PassBanner({ fb, attempt }: { fb: AnswerFeedback; attempt: number }) {
  const pass = isPass(fb);
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border p-4", pass ? "border-teal/30 bg-teal-soft" : "border-sun/40 bg-sun-soft/70")}>
      {pass ? <Trophy size={18} className="mt-0.5 shrink-0 text-teal" /> : <RotateCcw size={18} className="mt-0.5 shrink-0 text-[#c2502f]" />}
      <div className="text-[13.5px] leading-relaxed">
        <div className="font-semibold text-ink">
          {pass ? `Pass level reached${attempt > 1 ? ` on attempt ${attempt}` : ""}.` : `Not at pass level yet${attempt > 1 ? ` (attempt ${attempt})` : ""}.`}
        </div>
        <div className="text-ink-2">
          {pass
            ? "An interviewer would put this answer through. Next, the interviewer probes deeper with a follow-up."
            : `The pass mark is "${PASS_LABEL}". Use the interviewer's notes above, then try again, or continue the interview and come back to it later.`}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Answer panel (timed) ---------------- */

export const THINK_SECONDS = 30;
export const ANSWER_SECONDS = 120;

const clock = (secs: number) => `${Math.floor(Math.max(0, secs) / 60)}:${String(Math.max(0, secs) % 60).padStart(2, "0")}`;

/**
 * Answer one question like a real interview: 30 seconds to think, then 2 minutes to answer.
 * When time runs out the answer so far is submitted (or, if there's nothing, you can try again).
 */
export function AnswerPanel({
  question,
  onFeedback,
  voice,
  ctx,
  submitLabel = "Get feedback",
  thinkSeconds = THINK_SECONDS,
  answerSeconds = ANSWER_SECONDS,
}: {
  question: InterviewQuestion;
  onFeedback: (answer: string, fb: AnswerFeedback, seconds: number) => void;
  voice?: boolean;
  ctx?: FeedbackCtx;
  submitLabel?: string;
  thinkSeconds?: number;
  answerSeconds?: number;
}) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"think" | "answer" | "timeup">(thinkSeconds > 0 ? "think" : "answer");
  const [now, setNow] = useState(() => Date.now());
  const phaseRef = useRef(phase);
  const [phaseStart, setPhaseStart] = useState(() => Date.now());
  const startRef = useRef(phaseStart);
  const answerRef = useRef("");
  const submittedRef = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const dict = useDictation((t) =>
    setAnswer((a) => {
      const next = a ? `${a} ${t}` : t;
      answerRef.current = next;
      return next;
    }),
  );
  const dictRef = useRef(dict);

  const go = (p: "think" | "answer" | "timeup") => {
    const t = Date.now();
    phaseRef.current = p;
    startRef.current = t;
    setPhaseStart(t);
    setPhase(p);
    if (p === "answer") setTimeout(() => textRef.current?.focus(), 30);
  };

  const submit = async (timedOut = false) => {
    const text = answerRef.current.trim();
    if (submittedRef.current || text.length < 15) return;
    submittedRef.current = true;
    if (dictRef.current.listening) dictRef.current.toggle();
    const used = Math.min(answerSeconds, Math.round((Date.now() - startRef.current) / 1000));
    setLoading(true);
    const fb = await getFeedback(question, text, ctx);
    const withTime: AnswerFeedback = timedOut
      ? {
          ...fb,
          notes: [
            { issue: `You ran out of time at ${clock(answerSeconds)}. Interviewers notice when an answer has no ending.`, fix: "Aim to finish in about 90 seconds: give the headline result first, then the detail if there's time." },
            ...(fb.notes ?? []),
          ].slice(0, 6),
        }
      : fb;
    setLoading(false);
    onFeedback(text, withTime, used);
  };
  const submitRef = useRef(submit);
  // Keep the timer's view of the latest handlers current
  useEffect(() => {
    dictRef.current = dict;
    submitRef.current = submit;
  });

  // One clock drives both phases
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const elapsed = (t - startRef.current) / 1000;
      if (phaseRef.current === "think" && elapsed >= thinkSeconds) go("answer");
      else if (phaseRef.current === "answer" && elapsed >= answerSeconds && !submittedRef.current) {
        if (dictRef.current.listening) dictRef.current.toggle();
        if (answerRef.current.trim().length >= 15) submitRef.current(true);
        else go("timeup");
      }
    }, 250);
    return () => clearInterval(id);
  }, [thinkSeconds, answerSeconds]);
  useEffect(() => {
    if (voice) speak(question.text);
  }, [voice, question.text]);

  const elapsed = Math.floor((now - phaseStart) / 1000);
  const total = phase === "think" ? thinkSeconds : answerSeconds;
  const left = Math.max(0, total - elapsed);
  const pct = Math.min(100, (elapsed / total) * 100);

  if (phase === "think") {
    return (
      <div className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-widest text-violet">Thinking time</div>
            <p className="mt-1 text-[13.5px] text-ink-2">
              {question.kind === "behavioural"
                ? "Pick one real example. Plan it as Situation, Task, Action, Result, and decide your result first."
                : question.kind === "technical" || question.kind === "case"
                  ? "Structure first: what are the 2 or 3 parts of your answer?"
                  : "Decide your main point and one specific example to back it up."}
            </p>
          </div>
          <div className="font-display text-4xl font-bold tabular-nums" aria-live="polite" aria-label={`${left} seconds to think`}>
            {clock(left)}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
          <div className="h-full rounded-full bg-violet transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted">You&apos;ll then have {clock(answerSeconds)} to answer.</span>
          <Button size="sm" onClick={() => go("answer")}>
            I&apos;m ready: start answering
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "timeup") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-[13.5px]">
        <div className="font-semibold text-ink">Time&apos;s up, and there wasn&apos;t enough of an answer to score.</div>
        <p className="mt-1 text-ink-2">In a real interview, the interviewer would move on. Take another 30 seconds to plan, then aim to start speaking straight away.</p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => {
            answerRef.current = "";
            setAnswer("");
            go("think");
          }}
        >
          <RotateCcw size={14} /> Try again
        </Button>
      </div>
    );
  }

  const urgent = left <= 10;
  const warn = left <= 30;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-widest text-teal">Your answer</span>
        <span className={cn("inline-flex items-center gap-1 font-display text-lg font-bold tabular-nums", urgent ? "text-red-600" : warn ? "text-[#c2502f]" : "text-ink")} aria-label={`${left} seconds left to answer`}>
          <Timer size={15} /> {clock(left)} left
        </span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className={cn("h-full rounded-full transition-[width] duration-300", urgent ? "bg-red-500" : warn ? "bg-sun" : "bg-teal")} style={{ width: `${pct}%` }} />
      </div>
      <Textarea
        ref={textRef}
        className="min-h-40 text-[14.5px]"
        placeholder={question.kind === "behavioural" ? "Situation → Task → Action → Result. Type or use the mic…" : "Think out loud. Structure first, then detail. Type or use the mic…"}
        value={answer}
        onChange={(e) => {
          answerRef.current = e.target.value;
          setAnswer(e.target.value);
        }}
        disabled={loading}
        aria-label="Your answer"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {dict.supported && (
            <Button size="sm" variant={dict.listening ? "danger" : "secondary"} onClick={dict.toggle} disabled={loading}>
              {dict.listening ? <MicOff size={14} /> : <Mic size={14} />} {dict.listening ? "Stop" : "Speak answer"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => speak(question.text)} aria-label="Read question aloud">
            <Volume2 size={14} />
          </Button>
          {dict.listening && <Badge tone="red">● recording</Badge>}
        </div>
        <Button size="sm" onClick={() => submit(false)} disabled={loading || answer.trim().length < 15}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** Practise one question: answer → feedback → try again until pass level → the interviewer's follow-up. */
export function PracticeQuestion({ question, ctx, onDone }: { question: InterviewQuestion; ctx?: FeedbackCtx; onDone?: (answer: string, fb: AnswerFeedback) => void }) {
  const [result, setResult] = useState<{ answer: string; fb: AnswerFeedback } | null>(null);
  const [probe, setProbe] = useState<{ answer: string; fb: AnswerFeedback } | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [probeAttempt, setProbeAttempt] = useState(1);
  const [moveOn, setMoveOn] = useState(false);
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
  const passed = isPass(result.fb);
  const followQ: InterviewQuestion | null = result.fb.followUp ? { ...question, id: `${question.id}-probe`, text: result.fb.followUp, modelPoints: undefined } : null;
  const retry = () => {
    setResult(null);
    setProbe(null);
    setMoveOn(false);
    setProbeAttempt(1);
    setAttempt((a) => a + 1);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-paper p-3 text-[13.5px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Your answer{attempt > 1 ? ` (attempt ${attempt})` : ""}: </span>
        {result.answer}
      </div>
      <FeedbackView fb={result.fb} question={question} />
      <PassBanner fb={result.fb} attempt={attempt} />
      {!passed && !moveOn && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMoveOn(true)} disabled={!followQ}>
            Continue to the follow-up
          </Button>
          <Button size="sm" onClick={retry}>
            <RotateCcw size={14} /> Try again
          </Button>
        </div>
      )}
      {followQ && (passed || moveOn) && !probe && (
        <div className="rounded-2xl border border-violet/25 bg-violet-soft/40 p-4">
          <div className="mb-3 flex items-start gap-2 text-[14px] font-medium">
            <CornerDownRight size={16} className="mt-0.5 shrink-0 text-violet" /> Interviewer follow-up: {followQ.text}
          </div>
          <AnswerPanel key={`probe-${probeAttempt}`} question={followQ} ctx={ctx} onFeedback={(answer, fb) => setProbe({ answer, fb })} submitLabel="Answer follow-up" />
        </div>
      )}
      {probe && followQ && (
        <div className="space-y-3 rounded-2xl border border-violet/25 p-4">
          <div className="text-[13px] font-semibold">Follow-up feedback</div>
          <FeedbackView fb={probe.fb} question={followQ} showModel={false} />
          <PassBanner fb={probe.fb} attempt={probeAttempt} />
          {!isPass(probe.fb) && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setProbe(null);
                  setProbeAttempt((a) => a + 1);
                }}
              >
                <RotateCcw size={14} /> Try the follow-up again
              </Button>
            </div>
          )}
        </div>
      )}
      {(passed || moveOn) && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={retry}>
            <RotateCcw size={14} /> Practise the main question again
          </Button>
        </div>
      )}
    </div>
  );
}
