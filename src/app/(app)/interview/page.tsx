"use client";

import { BookMarked, Briefcase, Building2, ChevronDown, ChevronRight, FileText, History, Loader2, MessageSquare, Mic, Play, Plus, Sparkles, Trash2, Trophy, Volume2 } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { CASES, COMPETENCIES, type CaseStudy } from "@/data/interview";
import { TRACK_MAP } from "@/data/careers";
import { showEffects } from "@/components/effects-toast";
import { AnswerPanel, FeedbackView, PracticeQuestion, ScoreBars, speak } from "@/components/interview/answer-panel";
import { Badge, Button, Card, Chip, EmptyState, Input, Label, Modal, PageHeader, Select, Tabs, Textarea } from "@/components/ui";
import { checkCaseStage, cvItems, overall, pickMockQuestions, questionSet, sessionSummary, storyCoverage, storyToAnswer } from "@/lib/engine/interview";
import { roleForTrack } from "@/data/careers";
import { useInsightFeed } from "@/lib/hooks";
import { useStay } from "@/lib/store";
import type { CareerTrack, InterviewQuestion, MockSession, StoryEntry } from "@/lib/types";
import { cn, formatDate, uid } from "@/lib/utils";

/** The field being prepared for, so feedback is scored against that field's hiring bar. */
const TrackCtx = createContext<string>("");

type View = "bank" | "mock" | "cv" | "case" | "technical" | "stories" | "history";

const KIND_LABEL: Record<InterviewQuestion["kind"], string> = {
  behavioural: "Behavioural",
  motivation: "Motivation",
  technical: "Technical",
  company: "Company",
  cv: "Your CV",
  case: "Case",
  commercial: "Commercial awareness",
};

export default function InterviewPage() {
  const profile = useStay((s) => s.profile)!;
  const interviewCompany = useStay((s) => s.interviewCompany);
  const setInterviewCompany = useStay((s) => s.setInterviewCompany);
  const insightPrefs = useStay((s) => s.insightPrefs);
  const tasks = useStay((s) => s.tasks);
  const mockSessions = useStay((s) => s.mockSessions);
  const [track, setTrack] = useState<CareerTrack>(profile.careerGoals[0] ?? "exploring");
  const [view, setView] = useState<View>("bank");
  const company = interviewCompany.trim();
  const companyFeed = useInsightFeed([], company ? [company] : []);
  const set = useMemo(() => questionSet(profile, { company, track, companyNews: companyFeed.items }), [profile, company, track, companyFeed.items]);
  const role = roleForTrack(track, profile.preferredRoles);
  const isCaseTrack = profile.careerGoals.some((g) => g === "consulting") || track === "consulting";

  // Companies the user has shown interest in elsewhere in STAY
  const suggestions = Array.from(
    new Set([
      ...(insightPrefs?.companies ?? []),
      ...tasks.filter((t) => t.sourceOpportunityId && / (at|\u2014) /.test(t.title)).map((t) => t.title.split(/ at | \u2014 /).pop()!.trim()),
    ]),
  ).slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Interview prep"
        title="Practise until it feels easy"
        description="Likely questions for your role and target companies, mock interviews with feedback, a walkthrough of your own CV, and case or technical practice for your field."
        actions={
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2 text-[13px] shadow-[var(--shadow-soft)]">
            <Trophy size={16} className="text-sun" /> <b>{mockSessions.filter((m) => m.completedAt).length}</b> mock interviews done
          </div>
        }
      />

      <Card className="mb-5 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <Label>Preparing for</Label>
            <Select value={track} onChange={(e) => setTrack(e.target.value as CareerTrack)}>
              {(profile.careerGoals.length ? profile.careerGoals : (["exploring"] as CareerTrack[])).map((g) => (
                <option key={g} value={g}>
                  {TRACK_MAP[g].emoji} {TRACK_MAP[g].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label hint="(optional)">Target company</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={interviewCompany} onChange={(e) => setInterviewCompany(e.target.value)} placeholder="e.g. Accenture, Monzo, Google DeepMind" className="max-w-xs" />
              {suggestions.map((s) => (
                <Chip key={s} active={company === s} onClick={() => setInterviewCompany(company === s ? "" : s)}>
                  <Building2 size={12} /> {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="scrollbar-none mb-5 overflow-x-auto">
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: "bank", label: "Question bank" },
            { value: "mock", label: "Mock interview" },
            { value: "cv", label: "Your CV" },
            ...(isCaseTrack ? [{ value: "case" as View, label: "Case practice" }] : []),
            { value: "technical", label: track === "consulting" ? "Cases & estimates" : "Technical" },
            { value: "stories", label: "Story bank" },
            { value: "history", label: `History (${mockSessions.length})` },
          ]}
        />
      </div>

      <TrackCtx.Provider value={track}>
      {view === "bank" && <BankView set={set} company={company} role={role} track={track} />}
      {view === "mock" && <MockView set={set} company={company} role={role} />}
      {view === "cv" && <CvView questions={set.cv} role={role} onMock={() => setView("mock")} />}
      {view === "case" && <CaseView />}
      {view === "technical" && <QuestionList questions={set.technical} role={role} company={company} empty="No technical bank for this area yet." />}
      {view === "stories" && <StoriesView />}
      {view === "history" && <HistoryView />}
      </TrackCtx.Provider>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuestionCard({ q, role, company, onAddStory }: { q: InterviewQuestion; role: string; company?: string; onAddStory?: (competency?: string) => void }) {
  const track = useContext(TrackCtx);
  const [open, setOpen] = useState(false);
  const [practising, setPractising] = useState(false);
  return (
    <Card className="p-4">
      <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(!open)}>
        <div>
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge tone={q.kind === "behavioural" ? "violet" : q.kind === "technical" || q.kind === "case" ? "blue" : q.kind === "cv" ? "teal" : "sun"}>{KIND_LABEL[q.kind]}</Badge>
            {q.competency && <Badge>{q.competency}</Badge>}
            {q.source === "ai" && <Badge tone="lime">Tailored by AI</Badge>}
          </div>
          <div className="text-[14.5px] font-medium leading-snug">{q.text}</div>
        </div>
        {open ? <ChevronDown size={18} className="mt-1 shrink-0 text-muted" /> : <ChevronRight size={18} className="mt-1 shrink-0 text-muted" />}
      </button>
      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          {q.tests && (
            <p className="text-[13px] text-ink-2">
              <b className="text-ink">What they&apos;re testing:</b> {q.tests}
            </p>
          )}
          {q.tips && q.tips.length > 0 && (
            <ul className="space-y-1 text-[13px] text-ink-2">
              {q.tips.map((t) => (
                <li key={t}>💡 {t}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setPractising(true)}>
              <Play size={13} /> Practise this
            </Button>
            {q.kind === "behavioural" && onAddStory && (
              <Button size="sm" variant="secondary" onClick={() => onAddStory(q.competency)}>
                <BookMarked size={13} /> Prepare a story
              </Button>
            )}
          </div>
        </div>
      )}
      <Modal open={practising} onClose={() => setPractising(false)} title="Practise" wide>
        <p className="mb-3 flex items-start justify-between gap-3 text-[15px] font-medium leading-snug">
          {q.text}
          <button onClick={() => speak(q.text)} className="rounded-lg p-1.5 text-muted hover:bg-paper-2" aria-label="Read aloud">
            <Volume2 size={16} />
          </button>
        </p>
        <PracticeQuestion question={q} ctx={{ role, company, track }} />
      </Modal>
    </Card>
  );
}

function QuestionList({ questions, role, company, empty, onAddStory }: { questions: InterviewQuestion[]; role: string; company?: string; empty?: string; onAddStory?: (c?: string) => void }) {
  if (!questions.length) return <EmptyState title={empty ?? "No questions"} />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {questions.map((q) => (
        <QuestionCard key={q.id} q={q} role={role} company={company} onAddStory={onAddStory} />
      ))}
    </div>
  );
}

function BankView({ set, company, role, track }: { set: ReturnType<typeof questionSet>; company: string; role: string; track: CareerTrack }) {
  const [section, setSection] = useState<"company" | "behavioural" | "motivation" | "technical">(company ? "company" : "behavioural");
  const [aiQs, setAiQs] = useState<InterviewQuestion[]>([]);
  const [jdOpen, setJdOpen] = useState(false);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [storyFor, setStoryFor] = useState<string | undefined | null>(null);

  const tailor = async () => {
    if (!company) return toast.error("Add a target company first");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, industry: TRACK_MAP[track].noun, jobDescription: jd.trim() || undefined }),
      });
      const d = (await res.json()) as { questions?: Omit<InterviewQuestion, "id" | "source">[]; source?: string };
      if (d.source === "ai" && d.questions?.length) {
        setAiQs(d.questions.map((q, i) => ({ ...q, id: `ai-${i}-${Date.now()}`, source: "ai" })));
        setSection("company");
        toast.success(`${d.questions.length} tailored questions added`);
      } else toast.info("AI isn't configured, the company questions below are built from proven templates.");
    } catch {
      toast.error("Couldn't reach AI");
    }
    setLoading(false);
    setJdOpen(false);
  };

  const sections = [
    ...(company ? [{ value: "company" as const, label: `${company} (${set.company.length + aiQs.length})` }] : []),
    { value: "behavioural" as const, label: `Behavioural (${set.behavioural.length})` },
    { value: "motivation" as const, label: `Motivation (${set.motivation.length})` },
    { value: "technical" as const, label: `Technical (${set.technical.length})` },
  ];
  const list = section === "company" ? [...aiQs, ...set.company] : set[section];

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {sections.map((s) => (
            <Chip key={s.value} active={section === s.value} onClick={() => setSection(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={() => (company ? setJdOpen(true) : toast.error("Add a target company first"))}>
          <Sparkles size={14} /> Tailor to {company || "a company"}
        </Button>
      </div>
      {section === "company" && (
        <p className="mb-3 text-[12.5px] text-muted">
          Likely question types for {company} based on the role, not leaked or confirmed questions. Paste the job description to tailor them further.
        </p>
      )}
      <QuestionList questions={list} role={role} company={company} onAddStory={(c) => setStoryFor(c)} />

      <Modal open={jdOpen} onClose={() => setJdOpen(false)} title={`Tailor questions to ${company}`} wide>
        <Label hint="(optional, recommended)">Paste the job description</Label>
        <Textarea className="min-h-40" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Responsibilities, requirements, values…" />
        <div className="mt-3 flex justify-end">
          <Button onClick={tailor} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate likely questions
          </Button>
        </div>
      </Modal>
      {storyFor !== null && <StoryEditor initial={{ competencies: storyFor ? [storyFor] : [] }} onClose={() => setStoryFor(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const MOCK_TYPES: { value: MockSession["type"]; label: string; desc: string }[] = [
  { value: "mixed", label: "Mixed", desc: "Like a real first round" },
  { value: "behavioural", label: "Behavioural", desc: "Competency questions" },
  { value: "company", label: "Company", desc: "Why us + commercial awareness" },
  { value: "cv", label: "CV deep-dive", desc: "Explain everything on your CV" },
  { value: "technical", label: "Technical", desc: "Questions for your field" },
];

function MockView({ set, company, role }: { set: ReturnType<typeof questionSet>; company: string; role: string }) {
  const track = useContext(TrackCtx);
  const saveMockSession = useStay((s) => s.saveMockSession);
  const [type, setType] = useState<MockSession["type"]>("mixed");
  const [count, setCount] = useState(4);
  const [voice, setVoice] = useState(true);
  const [session, setSession] = useState<MockSession | null>(null);
  const [current, setCurrent] = useState(0);
  const [showFb, setShowFb] = useState(false);

  const start = () => {
    if (type === "company" && !company) return toast.error("Add a target company above for a company interview");
    const qs = pickMockQuestions(set, type, count);
    if (!qs.length) return toast.error("No questions for this type yet");
    setSession({ id: uid("mock"), type, company: company || undefined, turns: qs.map((q) => ({ question: q, answer: "", seconds: 0 })), startedAt: new Date().toISOString() });
    setCurrent(0);
    setShowFb(false);
  };

  if (!session) {
    return (
      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold">Set up your mock interview</h2>
        <p className="mt-1 text-[14px] text-ink-2">One question at a time, with a timer, optional voice, feedback after each answer and a summary at the end.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MOCK_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn("rounded-2xl border-2 p-4 text-left transition-all", type === t.value ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-ink/30")}
            >
              <div className="font-semibold">{t.label}</div>
              <div className={cn("text-[12.5px]", type === t.value ? "text-white/70" : "text-muted")}>{t.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-[14px]">
            Questions:
            {[3, 4, 6].map((n) => (
              <Chip key={n} active={count === n} onClick={() => setCount(n)}>
                {n}
              </Chip>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" className="h-4 w-4 accent-[var(--teal)]" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
            Interviewer reads questions aloud
          </label>
        </div>
        <Button size="lg" className="mt-6" onClick={start}>
          <Mic size={16} /> Start interview
        </Button>
        <p className="mt-3 text-[12px] text-muted">Tip: use &ldquo;Speak answer&rdquo; to answer out loud (works in Chrome and Edge). Nothing is recorded or uploaded except the text of your answers when AI feedback is on.</p>
      </Card>
    );
  }

  const done = session.completedAt;
  if (done) {
    const sum = sessionSummary(session);
    return (
      <div className="space-y-5">
        <Card className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-widest text-teal">Interview complete</div>
              <h2 className="font-display text-2xl font-semibold">{sum ? `${sum.overall}% overall` : "Done"}</h2>
              {sum && (
                <p className="mt-1 text-[14px] text-ink-2">
                  Strongest: <b>{sum.best}</b> · Work on: <b>{sum.worst}</b>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSession(null)}>
                New interview
              </Button>
            </div>
          </div>
          {sum && (
            <div className="mt-5">
              <ScoreBars scores={sum.avg} />
            </div>
          )}
        </Card>
        {session.turns.map((t, i) => (
          <Card key={i} className="p-5">
            <div className="mb-1 text-[12px] font-semibold text-muted">
              Q{i + 1} · {KIND_LABEL[t.question.kind]} · {Math.floor(t.seconds / 60)}m {t.seconds % 60}s
            </div>
            <p className="font-medium">{t.question.text}</p>
            <p className="mt-2 rounded-xl bg-paper p-3 text-[13.5px] text-ink-2">{t.answer || "(skipped)"}</p>
            {t.feedback && (
              <div className="mt-2 text-[13px]">
                <b>{overall(t.feedback.scores)}%</b> · {t.feedback.improvements[0] ?? t.feedback.strengths[0]}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  const turn = session.turns[current];
  const finish = (s: MockSession) => {
    const completed = { ...s, completedAt: new Date().toISOString() };
    setSession(completed);
    const fx = saveMockSession(completed);
    toast.success("Mock interview saved to History");
    showEffects(fx);
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-muted">
          Question {current + 1} of {session.turns.length} · {MOCK_TYPES.find((m) => m.value === session.type)?.label}
          {session.company ? ` · ${session.company}` : ""}
        </div>
        <div className="flex gap-1">
          {session.turns.map((_, i) => (
            <span key={i} className={cn("h-1.5 w-8 rounded-full", i < current ? "bg-teal" : i === current ? "bg-ink" : "bg-paper-2")} />
          ))}
        </div>
      </div>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink text-lime">
          <MessageSquare size={18} />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-paper px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Interviewer · {KIND_LABEL[turn.question.kind]}</div>
          <p className="mt-0.5 text-[16px] font-medium leading-snug">{turn.question.text}</p>
        </div>
      </div>
      {!showFb ? (
        <AnswerPanel
          key={turn.question.id}
          question={turn.question}
          voice={voice}
          ctx={{ role, company, track }}
          onFeedback={(answer, fb, seconds) => {
            const turns = session.turns.map((t, i) => (i === current ? { ...t, answer, feedback: fb, seconds } : t));
            const next = { ...session, turns };
            setSession(next);
            saveMockSession(next);
            setShowFb(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {turn.feedback && <FeedbackView fb={turn.feedback} question={turn.question} />}
          <div className="flex justify-end gap-2">
            {current < session.turns.length - 1 ? (
              <Button
                onClick={() => {
                  setCurrent(current + 1);
                  setShowFb(false);
                }}
              >
                Next question →
              </Button>
            ) : (
              <Button onClick={() => finish(session)}>Finish & see summary</Button>
            )}
          </div>
        </div>
      )}
      {!showFb && (
        <button
          className="mt-3 text-[12px] text-muted underline"
          onClick={() => {
            if (current < session.turns.length - 1) setCurrent(current + 1);
            else finish(session);
          }}
        >
          Skip question
        </button>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function CvView({ questions, role, onMock }: { questions: InterviewQuestion[]; role: string; onMock: () => void }) {
  const profile = useStay((s) => s.profile)!;
  const items = cvItems(profile);
  return (
    <div className="space-y-5">
      <Card className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 text-teal" />
          <div>
            <div className="font-display text-lg font-semibold">Can you explain everything on your CV?</div>
            <p className="text-[13.5px] text-ink-2">
              {items.length
                ? `We found ${items.length} items in your profile and CV text. Interviewers often go 2–3 levels deep on each.`
                : "Add your projects, roles or paste your CV on the Profile page to get questions about each item."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/profile" className="inline-flex h-10 items-center rounded-xl border border-line bg-card px-4 text-sm font-medium hover:bg-paper">
            Edit CV details
          </Link>
          <Button onClick={onMock}>
            <Mic size={14} /> CV mock interview
          </Button>
        </div>
      </Card>
      <QuestionList questions={questions} role={role} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CaseView() {
  const [active, setActive] = useState<CaseStudy | null>(null);
  if (active) return <CaseRunner c={active} onExit={() => setActive(null)} />;
  return (
    <div>
      <p className="mb-4 text-[14px] text-ink-2">
        Practise the flow of a consulting case: clarify → structure → analyse → recommend. All companies and data are fictional and made for practice.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {CASES.map((c) => (
          <Card key={c.id} interactive className="flex flex-col p-5">
            <div className="flex gap-1.5">
              <Badge tone="blue">{c.type}</Badge>
              <Badge>{c.difficulty}</Badge>
            </div>
            <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{c.title}</h3>
            <p className="mt-1 line-clamp-3 text-[13px] text-ink-2">{c.brief}</p>
            <Button size="sm" className="mt-auto self-start" style={{ marginTop: 16 }} onClick={() => setActive(c)}>
              <Briefcase size={13} /> Start case
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CaseRunner({ c, onExit }: { c: CaseStudy; onExit: () => void }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [chat, setChat] = useState<{ role: "interviewer" | "candidate"; content: string }[]>([{ role: "interviewer", content: c.brief }]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Record<string, ReturnType<typeof checkCaseStage>>>({});
  const stage = c.stages[stageIdx];
  const result = results[stage.id];
  const finished = stageIdx >= c.stages.length - 1 && Boolean(result);

  const ask = async () => {
    const m = msg.trim();
    if (!m) return;
    const history = [...chat, { role: "candidate" as const, content: m }];
    setChat(history);
    setMsg("");
    setSending(true);
    let reply: string | null = null;
    try {
      const res = await fetch("/api/ai/case-turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId: c.id, stageId: stage.id, history: chat, message: m }) });
      const d = await res.json();
      if (d.source === "ai" && d.text) reply = d.text;
    } catch {
      /* fallback */
    }
    if (!reply) reply = stage.info ? `Good question. Here's what we know: ${stage.info}` : "That information isn't available. Make a reasonable assumption, state it, and keep going.";
    setChat((h) => [...h, { role: "interviewer", content: reply! }]);
    setSending(false);
  };

  const submitStage = () => {
    if (answer.trim().length < 15) return toast.error("Write your answer for this stage first");
    setResults((r) => ({ ...r, [stage.id]: checkCaseStage(stage, answer) }));
    setChat((h) => [...h, { role: "candidate", content: answer.trim() }]);
  };

  const next = () => {
    setAnswer("");
    setStageIdx((i) => i + 1);
    const ns = c.stages[stageIdx + 1];
    if (ns) setChat((h) => [...h, { role: "interviewer", content: ns.prompt }]);
  };

  const total = Object.values(results);
  const avg = total.length ? Math.round(total.reduce((a, r) => a + r.pct, 0) / total.length) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="p-5 lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{c.title}</h2>
          <Button size="sm" variant="ghost" onClick={onExit}>
            Exit case
          </Button>
        </div>
        <div className="mb-4 flex gap-1.5">
          {c.stages.map((s, i) => (
            <div key={s.id} className={cn("flex-1 rounded-full px-2 py-1 text-center text-[11.5px] font-semibold", i < stageIdx || results[s.id] ? "bg-teal-soft text-teal" : i === stageIdx ? "bg-ink text-white" : "bg-paper-2 text-muted")}>
              {s.title}
            </div>
          ))}
        </div>
        <p className="text-[15px] font-medium">{stage.prompt}</p>
        {stage.exhibit && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
            <div className="bg-paper px-3 py-2 text-[12px] font-semibold text-muted">{stage.exhibit.caption}</div>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-line">
                  {stage.exhibit.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stage.exhibit.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    {r.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!result ? (
          <div className="mt-4">
            <Textarea className="min-h-36" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer for this stage. Structure first, then numbers." />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={submitStage}>
                Submit {stage.title.toLowerCase()}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-line p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">What a strong answer covers</span>
                <Badge tone={result.pct >= 75 ? "teal" : result.pct >= 40 ? "blue" : "sun"}>{result.pct}% covered</Badge>
              </div>
              <ul className="space-y-1 text-[13.5px]">
                {result.covered.map((c2) => (
                  <li key={c2.point} className={cn(c2.hit ? "text-ink" : "text-muted")}>
                    {c2.hit ? "✓" : "○"} {c2.point}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted">Coverage is a keyword-based guide. What matters is that your logic is clear and correct.</p>
            </div>
            {!finished ? (
              <div className="flex justify-end">
                <Button onClick={next}>Next: {c.stages[stageIdx + 1]?.title} →</Button>
              </div>
            ) : (
              <div className="rounded-2xl bg-ink p-4 text-white">
                <div className="font-display text-lg font-semibold">Case complete: {avg}% average coverage</div>
                <p className="text-[13px] text-white/70">Try it again in a few days without looking, or attempt another case.</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="flex max-h-[640px] flex-col p-5 lg:col-span-2">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-muted">Talk to the interviewer</div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {chat.map((m, i) => (
            <div key={i} className={cn("rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed", m.role === "interviewer" ? "mr-6 bg-paper" : "ml-6 bg-blue-soft")}>
              {m.content}
            </div>
          ))}
          {sending && <div className="mr-6 h-9 animate-pulse rounded-2xl bg-paper" />}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ask a clarifying question…" />
          <Button type="submit" size="sm" disabled={sending}>
            Ask
          </Button>
        </form>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StoryEditor({ initial, onClose }: { initial: Partial<StoryEntry>; onClose: () => void }) {
  const upsertStory = useStay((s) => s.upsertStory);
  const [s, setS] = useState<StoryEntry>({
    id: initial.id ?? uid("story"),
    title: initial.title ?? "",
    competencies: initial.competencies ?? [],
    situation: initial.situation ?? "",
    task: initial.task ?? "",
    action: initial.action ?? "",
    result: initial.result ?? "",
    updatedAt: new Date().toISOString(),
  });
  const field = (k: "situation" | "task" | "action" | "result", label: string, ph: string) => (
    <div>
      <Label>{label}</Label>
      <Textarea className="min-h-20" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} placeholder={ph} />
    </div>
  );
  return (
    <Modal open onClose={onClose} title={initial.id ? "Edit story" : "New STAR story"} wide>
      <div className="space-y-3">
        <div>
          <Label>Short title</Label>
          <Input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} placeholder="e.g. Rescuing the group ML project" />
        </div>
        <div>
          <Label>Shows which competencies?</Label>
          <div className="flex flex-wrap gap-2">
            {COMPETENCIES.map((c) => (
              <Chip key={c} active={s.competencies.includes(c)} onClick={() => setS({ ...s, competencies: s.competencies.includes(c) ? s.competencies.filter((x) => x !== c) : [...s.competencies, c] })}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("situation", "Situation", "Where and when? Keep it to 1–2 sentences.")}
          {field("task", "Task", "What needed to happen, and what was your role?")}
          {field("action", "Action", "What did YOU do, step by step?")}
          {field("result", "Result", "What happened? Numbers, feedback, what you learned.")}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!s.title.trim() || !s.action.trim()) return toast.error("Add a title and at least the Action");
              upsertStory({ ...s, updatedAt: new Date().toISOString() });
              toast.success("Story saved to your bank");
              onClose();
            }}
          >
            Save story
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StoriesView() {
  const track = useContext(TrackCtx);
  const stories = useStay((s) => s.stories);
  const deleteStory = useStay((s) => s.deleteStory);
  const [editing, setEditing] = useState<Partial<StoryEntry> | null>(null);
  const [practice, setPractice] = useState<StoryEntry | null>(null);
  const cov = storyCoverage(stories);
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Competency coverage</h2>
            <p className="text-[13px] text-ink-2">Aim for at least one strong story per competency. Most behavioural questions map onto these.</p>
          </div>
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus size={14} /> New story
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cov.map((c) => (
            <span key={c.competency} className={cn("rounded-full border px-3 py-1 text-[12.5px] font-medium", c.stories ? "border-teal/25 bg-teal-soft text-teal" : "border-dashed border-line text-muted")}>
              {c.stories ? "✓" : "○"} {c.competency}
              {c.stories > 1 ? ` ×${c.stories}` : ""}
            </span>
          ))}
        </div>
      </Card>
      {stories.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {stories.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[16px] font-semibold">{s.title}</h3>
                <button onClick={() => deleteStory(s.id)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete story">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {s.competencies.map((c) => (
                  <Badge key={c} tone="violet">
                    {c}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 line-clamp-3 text-[13px] text-ink-2">{storyToAnswer(s)}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setPractice(s)}>
                  <Play size={13} /> Rehearse
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<BookMarked />} title="No stories yet" body="Write 5–6 STAR stories from your projects, societies and jobs. You'll reuse them across most behavioural questions." action={<Button onClick={() => setEditing({})}>Write your first story</Button>} />
      )}
      {editing && <StoryEditor initial={editing} onClose={() => setEditing(null)} />}
      {practice && (
        <Modal open onClose={() => setPractice(null)} title={`Rehearse: ${practice.title}`} wide>
          <p className="mb-2 text-[13px] text-ink-2">Tell this story out loud in under 2 minutes, without reading. Then compare with your notes.</p>
          <PracticeQuestion
            ctx={{ track }}
            question={{ id: `story-${practice.id}`, kind: "behavioural", competency: practice.competencies[0], text: `Tell me about a time that shows your ${(practice.competencies[0] ?? "strengths").toLowerCase()}.`, source: "bank" }}
          />
        </Modal>
      )}
    </div>
  );
}

function HistoryView() {
  const sessions = useStay((s) => s.mockSessions);
  const del = useStay((s) => s.deleteMockSession);
  const [open, setOpen] = useState<MockSession | null>(null);
  if (!sessions.length) return <EmptyState icon={<History />} title="No mock interviews yet" body="Finished interviews are saved here with scores, so you can see yourself improve." />;
  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const sum = sessionSummary(s);
        return (
          <Card key={s.id} className="flex items-center justify-between gap-3 p-4">
            <button className="flex items-center gap-4 text-left" onClick={() => setOpen(s)}>
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl font-display text-lg font-bold text-white", sum && sum.overall >= 70 ? "bg-teal" : sum && sum.overall >= 50 ? "bg-blue" : "bg-muted")}>{sum ? sum.overall : "–"}</div>
              <div>
                <div className="font-semibold">
                  {MOCK_TYPES.find((m) => m.value === s.type)?.label} interview{s.company ? ` · ${s.company}` : ""}
                </div>
                <div className="text-[12.5px] text-muted">
                  {formatDate(s.startedAt.slice(0, 10))} · {s.turns.filter((t) => t.answer).length}/{s.turns.length} answered {s.completedAt ? "" : "· in progress"}
                </div>
              </div>
            </button>
            <button onClick={() => del(s.id)} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete session">
              <Trash2 size={15} />
            </button>
          </Card>
        );
      })}
      {open && (
        <Modal open onClose={() => setOpen(null)} title="Interview review" wide>
          <div className="space-y-4">
            {open.turns.map((t, i) => (
              <div key={i} className="border-b border-line pb-4 last:border-0">
                <p className="font-medium">
                  Q{i + 1}. {t.question.text}
                </p>
                <p className="mt-1 text-[13.5px] text-ink-2">{t.answer || "(skipped)"}</p>
                {t.feedback && <FeedbackView fb={t.feedback} question={t.question} showModel={false} />}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

