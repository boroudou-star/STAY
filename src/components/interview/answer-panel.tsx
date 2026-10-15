"use client";

import { CornerDownRight, Loader2, Mic, MicOff, Send, Timer, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Textarea } from "@/components/ui";
import { scoreAnswer } from "@/lib/engine/interview";
import type { AnswerFeedback, AnswerScores, InterviewQuestion } from "@/lib/types";
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

export async function getFeedback(question: InterviewQuestion, answer: string, ctx: { role?: string; company?: string } = {}): Promise<AnswerFeedback> {
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
  return scoreAnswer(question, answer);
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

export function FeedbackView({ fb, question, showModel = true }: { fb: AnswerFeedback; question: InterviewQuestion; showModel?: boolean }) {
  return (
    <div className="space-y-4">
      <ScoreBars scores={fb.scores} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-teal-soft/60 p-4">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-teal">What worked</div>
          <ul className="space-y-1 text-[13.5px]">{fb.strengths.length ? fb.strengths.map((s) => <li key={s}>✓ {s}</li>) : <li className="text-muted">Keep going — strengths will show as you add detail.</li>}</ul>
        </div>
        <div className="rounded-2xl bg-sun-soft/60 p-4">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#c2502f]">To improve</div>
          <ul className="space-y-1 text-[13.5px]">{fb.improvements.map((s) => <li key={s}>→ {s}</li>)}</ul>
        </div>
      </div>
      {showModel && question.modelPoints && (
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">A strong answer covers</div>
          <ul className="space-y-1 text-[13.5px]">{question.modelPoints.map((m) => <li key={m}>• {m}</li>)}</ul>
        </div>
      )}
      <p className="text-[11px] text-muted">{fb.source === "ai" ? "Feedback by AI interviewer." : "Rule-based feedback (structure, numbers, outcomes, length). Add an AI key for richer coaching."}</p>
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
  ctx?: { role?: string; company?: string };
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
        placeholder={question.kind === "behavioural" ? "Situation → Task → Action → Result. Type or use the mic…" : "Think out loud — structure first, then detail. Type or use the mic…"}
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
export function PracticeQuestion({ question, ctx, onDone }: { question: InterviewQuestion; ctx?: { role?: string; company?: string }; onDone?: (answer: string, fb: AnswerFeedback) => void }) {
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
