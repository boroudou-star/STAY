"use client";

import { CheckCircle2, ExternalLink, GraduationCap, Headphones, Lightbulb, Newspaper, PenLine, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AREA_MAP } from "@/data/insights";
import { Badge, Button, Textarea } from "@/components/ui";
import { ExpertChat } from "@/components/insights/expert-chat";
import { feedTopic, noteSections, noteWordCount, readingTips } from "@/lib/engine/insights";
import { useStay } from "@/lib/store";
import type { FeedItem } from "@/lib/types";

/**
 * Notes for an article or podcast, shown in a side panel on the Insights page.
 * The article opens in its own tab; STAY never navigates away.
 */
export function NotesPanel({ noteId, companies, onClose }: { noteId: string; companies: string[]; onClose: () => void }) {
  const note = useStay((s) => s.readingNotes.find((n) => n.id === noteId));
  const updateReadingNote = useStay((s) => s.updateReadingNote);
  const deleteReadingNote = useStay((s) => s.deleteReadingNote);
  const hasDraft = useStay((s) => Boolean(s.insightChats?.[`note:${noteId}`]));
  const [discussing, setDiscussing] = useState(hasDraft);

  if (!note) {
    return (
      <div className="p-6">
        <p className="text-[14px] text-ink-2">These notes were deleted.</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const item = note.item;
  const feedItem: FeedItem = { ...item, isLive: true };
  const words = noteWordCount(note.sections);
  const topic = feedTopic(feedItem, companies, note.sections);

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-1.5 flex items-center gap-1.5 pr-10 text-[12px] font-semibold uppercase tracking-[0.14em] text-teal">
        {item.kind === "podcast" ? <Headphones size={13} /> : <Newspaper size={13} />} {item.kind === "podcast" ? "Listening notes" : "Reading notes"}
      </div>
      <h2 className="pr-8 font-display text-[21px] font-semibold leading-tight">{item.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
        <span>{item.source}</span>
        {item.area && <Badge tone="violet">{AREA_MAP[item.area].label}</Badge>}
        {item.company && <Badge tone="blue">{item.company}</Badge>}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-semibold text-blue hover:underline">
            Open {item.kind === "podcast" ? "podcast" : "article"} <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-sun-soft/60 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#c2502f]">
          <Lightbulb size={13} /> While you {item.kind === "podcast" ? "listen" : "read"}
        </div>
        <ul className="space-y-0.5 text-[12.5px] text-ink-2">
          {readingTips(item.kind).map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold">
            <PenLine size={16} className="text-violet" /> Your notes
          </h3>
          <span className="text-[12px] text-muted">{words ? `${words} words · saved` : "Saves as you type"}</span>
        </div>
        <div className="space-y-3">
          {noteSections(item.kind).map((sec) => (
            <div key={sec.key}>
              <label htmlFor={`note-${sec.key}`} className="mb-1 block text-[13px] font-semibold">
                {sec.label}
              </label>
              <Textarea
                id={`note-${sec.key}`}
                rows={sec.rows}
                className="min-h-0"
                placeholder={sec.placeholder}
                value={note.sections[sec.key] ?? ""}
                onChange={(e) => updateReadingNote(note.id, { sections: { [sec.key]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {note.reflectedEntryId && !discussing && (
          <p className="mb-2 flex items-center gap-1.5 text-[13px] text-teal">
            <CheckCircle2 size={14} /> You discussed this with the expert. It&apos;s in your notebook.
          </p>
        )}
        {discussing ? (
          <ExpertChat topic={topic} chatKey={`note:${note.id}`} onSaved={(entryId) => updateReadingNote(note.id, { reflectedEntryId: entryId })} />
        ) : (
          <div className="rounded-2xl bg-ink p-4 text-white">
            <p className="text-[13.5px] leading-relaxed text-white/80">
              Done reading? Talk it through with an industry expert. They&apos;ll read your notes, push on the weak spots and help you turn it into a view you can use in an interview.
            </p>
            <Button
              variant="lime"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (words < 5) toast("Tip: jot a few notes first so the expert has something to work with");
                setDiscussing(true);
              }}
            >
              <GraduationCap size={14} /> Discuss with the expert
            </Button>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          deleteReadingNote(note.id);
          toast("Notes deleted");
          onClose();
        }}
        className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-red-600"
      >
        <Trash2 size={13} /> Delete these notes
      </button>
    </div>
  );
}
