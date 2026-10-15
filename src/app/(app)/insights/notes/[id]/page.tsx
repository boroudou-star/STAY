"use client";

import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, Headphones, Lightbulb, Newspaper, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AREA_MAP } from "@/data/insights";
import { ReflectBox } from "@/components/reflect-box";
import { Badge, Button, Card, EmptyState, LinkButton, Textarea } from "@/components/ui";
import { newsQuestion, newsSteps, noteSections, noteWordCount, podcastSteps, prefillFromNotes, readingTips } from "@/lib/engine/insights";
import { useStay } from "@/lib/store";
import type { FeedItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function ReadingNotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const note = useStay((s) => s.readingNotes.find((n) => n.id === id));
  const companies = useStay((s) => s.insightPrefs?.companies ?? []);
  const updateReadingNote = useStay((s) => s.updateReadingNote);
  const deleteReadingNote = useStay((s) => s.deleteReadingNote);
  const [reflecting, setReflecting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  if (!note) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title="Note not found"
        body="It may have been deleted. Open a story from your Industry Insights brief to start a new note."
        action={<LinkButton href="/insights">Back to Industry Insights</LinkButton>}
      />
    );
  }

  const item = note.item;
  const sections = noteSections(item.kind);
  const words = noteWordCount(note.sections);
  const feedItem: FeedItem = { ...item, isLive: true };
  const question = item.kind === "podcast" ? `After listening to "${item.title}": what's one idea you agreed or disagreed with, and why?` : newsQuestion(feedItem, companies);
  const steps = item.kind === "podcast" ? podcastSteps() : newsSteps(item.company ?? companies.find((c) => item.title.toLowerCase().includes(c.toLowerCase())));

  return (
    <div>
      <Link href="/insights" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={14} /> Industry Insights
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-teal">
            {item.kind === "podcast" ? <Headphones size={13} /> : <Newspaper size={13} />} {item.kind === "podcast" ? "Listening notes" : "Reading notes"}
          </div>
          <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[30px]">{item.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
            <span>{item.source}</span>
            {item.area && <Badge tone="violet">{AREA_MAP[item.area].label}</Badge>}
            {item.company && <Badge tone="blue">{item.company}</Badge>}
            <span>· started {formatDate(note.createdAt.slice(0, 10))}</span>
          </div>
        </div>
        {item.url && (
          <LinkButton href={item.url} external variant="secondary" className="shrink-0">
            Open {item.kind === "podcast" ? "podcast" : "article"} <ExternalLink size={14} />
          </LinkButton>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <PenLine size={18} className="text-violet" /> Your notes
              </h2>
              <span className="text-[12px] text-muted">{savedAt ? "Saved" : words ? `${words} words` : "Saves as you type"}</span>
            </div>
            <div className="space-y-4">
              {sections.map((sec) => (
                <div key={sec.key}>
                  <label htmlFor={`note-${sec.key}`} className="mb-1.5 block text-[13px] font-semibold">
                    {sec.label}
                  </label>
                  <Textarea
                    id={`note-${sec.key}`}
                    rows={sec.rows}
                    className="min-h-0"
                    placeholder={sec.placeholder}
                    value={note.sections[sec.key] ?? ""}
                    onChange={(e) => {
                      updateReadingNote(note.id, { sections: { [sec.key]: e.target.value } });
                      setSavedAt(Date.now());
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>

          {reflecting && (
            <Card className="p-5 sm:p-6">
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-violet">Turn your notes into a reflection</div>
              <p className="mb-4 text-[15px] font-medium leading-snug">{question}</p>
              <ReflectBox
                question={question}
                steps={steps}
                prefill={prefillFromNotes(item.kind, note.sections)}
                area={item.area}
                company={item.company}
                item={feedItem}
                onSaved={(entryId) => updateReadingNote(note.id, { reflectedEntryId: entryId })}
              />
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
              <Lightbulb size={18} className="text-sun" /> While you {item.kind === "podcast" ? "listen" : "read"}
            </h3>
            <ul className="space-y-2 text-[13.5px] text-ink-2">
              {readingTips(item.kind).map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-teal">•</span> {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-ink p-5 text-white">
            <div className="text-[12px] font-semibold uppercase tracking-widest text-lime">Next step</div>
            {note.reflectedEntryId ? (
              <p className="mt-2 flex items-start gap-2 text-[13.5px] text-white/85">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-lime" /> You turned these notes into a reflection. It&apos;s in your notebook.
              </p>
            ) : (
              <>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/80">
                  When you&apos;re done, answer a few short questions about it. Your notes fill in the first answers for you.
                </p>
                <Button
                  variant="lime"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    if (words < 5) return toast.error("Jot down a few notes first");
                    setReflecting(true);
                    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
                  }}
                >
                  Reflect on this
                </Button>
              </>
            )}
          </Card>

          <button
            onClick={() => {
              deleteReadingNote(note.id);
              toast("Note deleted");
              router.push("/insights");
            }}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-red-600"
          >
            <Trash2 size={13} /> Delete these notes
          </button>
        </div>
      </div>
    </div>
  );
}
