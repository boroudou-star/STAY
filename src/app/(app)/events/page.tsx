"use client";

import { Bookmark, BookmarkCheck, CheckCircle2, Clock, ClipboardPaste, ExternalLink, Globe, Camera, Loader2, MapPin, Plus, Radio, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EVENT_SOURCES } from "@/data/events";
import { TRACK_MAP } from "@/data/careers";
import { Badge, Button, Card, Chip, DemoBadge, EmptyState, Input, Label, LinkButton, LiveBadge, Modal, PageHeader, Select, Tabs, Textarea } from "@/components/ui";
import { EVENT_CATEGORY_LABEL } from "@/lib/engine/events";
import { parseAnnouncementLocally } from "@/lib/engine/announcement";
import { useDerived, useLiveEvents } from "@/lib/hooks";
import { useStay } from "@/lib/store";
import type { CareerEvent, CareerTrack, EventCategory, ScoredEvent } from "@/lib/types";
import { addDays, cn, daysBetween, formatDate, parseISO, relativeDays, todayISO, uid } from "@/lib/utils";

type When = "week" | "month" | "all";

export default function EventsPage() {
  const profile = useStay((s) => s.profile)!;
  const live = useLiveEvents(profile.university);
  const d = useDerived(live.events);
  const savedEvents = useStay((s) => s.savedEvents);
  const manualEvents = useStay((s) => s.manualEvents);
  const [view, setView] = useState<"recommended" | "saved" | "mine">("recommended");
  const [track, setTrack] = useState<CareerTrack | null>(null);
  const [cat, setCat] = useState<EventCategory | null>(null);
  const [when, setWhen] = useState<When>("all");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [detail, setDetail] = useState<ScoredEvent | null>(null);

  const list = useMemo(() => {
    let l = d.events;
    if (view === "saved") l = l.filter((e) => savedEvents.includes(e.event.id));
    if (view === "mine") l = l.filter((e) => e.event.provider === "manual");
    if (track) l = l.filter((e) => e.event.tracks.includes(track));
    if (cat) l = l.filter((e) => e.event.category === cat);
    if (when !== "all") l = l.filter((e) => daysBetween(d.today, e.event.date) <= (when === "week" ? 7 : 31));
    return l;
  }, [d.events, d.today, view, savedEvents, track, cat, when]);

  const cats = Array.from(new Set(d.events.map((e) => e.event.category)));
  const uni = profile.university || "your university";
  const sources = EVENT_SOURCES.filter((s) => s.university === profile.university);

  return (
    <div>
      <PageHeader
        eyebrow="Campus events"
        title={`Events at ${uni} that move you forward`}
        description="Not just 'careers' events: society workshops, hackathons and talks that close your skill gaps or put you in front of employers."
        actions={
          <Button onClick={() => setPasteOpen(true)}>
            <ClipboardPaste size={16} /> Add from announcement
          </Button>
        }
      />

      {/* Sources */}
      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {profile.university === "UCL" ? (
          sources.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-center justify-between">
                <Globe size={16} className="text-teal" />
                {s.id === "src-ucl-careers" && live.status === "ok" ? (
                  <LiveBadge label={`${live.events.length} live`} />
                ) : s.id === "src-ucl-careers" && live.status === "loading" ? (
                  <Badge>
                    <Loader2 size={10} className="animate-spin" /> checking
                  </Badge>
                ) : (
                  <ExternalLink size={14} className="text-muted group-hover:text-ink" />
                )}
              </div>
              <div className="mt-2 text-[13.5px] font-semibold leading-snug">{s.name}</div>
              <div className="mt-1 line-clamp-2 text-[12px] text-muted">{s.description}</div>
            </a>
          ))
        ) : (
          <div className="rounded-2xl border border-line bg-card p-4 text-[13px] text-ink-2 md:col-span-2">
            Curated sources are set up for UCL first. For {uni}, paste event announcements or links and STAY will extract and rank them.
          </div>
        )}
      </div>
      {profile.university === "UCL" && live.status === "unavailable" && (
        <p className="-mt-3 mb-5 flex items-center gap-1.5 text-[12px] text-muted">
          <Radio size={12} /> Live UCL Careers listings couldn&apos;t be loaded right now{live.message ? ` (${live.message})` : ""}. Showing demo events. Open the source links above for current listings.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: "recommended", label: "Recommended" },
            { value: "saved", label: `Saved (${savedEvents.length})` },
            { value: "mine", label: `Added by me (${manualEvents.length})` },
          ]}
        />
        <Tabs
          value={when}
          onChange={setWhen}
          items={[
            { value: "week", label: "This week" },
            { value: "month", label: "This month" },
            { value: "all", label: "All upcoming" },
          ]}
        />
      </div>
      <div className="scrollbar-none mb-2 flex gap-2 overflow-x-auto">
        <Chip active={!track} onClick={() => setTrack(null)}>
          All goals
        </Chip>
        {profile.careerGoals.map((t) => (
          <Chip key={t} active={track === t} onClick={() => setTrack(track === t ? null : t)}>
            {TRACK_MAP[t].emoji} {TRACK_MAP[t].label}
          </Chip>
        ))}
      </div>
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        <Chip active={!cat} onClick={() => setCat(null)}>
          All types
        </Chip>
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
            {EVENT_CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>

      {list.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((s, i) => (
            <EventCard key={s.event.id} s={s} top={view === "recommended" && i < 3 && !track && !cat} onDetails={() => setDetail(s)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bookmark />}
          title={view === "mine" ? "No events added yet" : "No events match"}
          body={view === "mine" ? "Paste a society announcement (e.g. from Instagram) and STAY will turn it into an event card." : "Try a wider date range or clear filters."}
          action={view === "mine" ? <Button onClick={() => setPasteOpen(true)}>Add from announcement</Button> : undefined}
        />
      )}

      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} university={profile.university} onSaved={() => setView("mine")} />
      {detail && <EventDetail s={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function SourceBadge({ e }: { e: CareerEvent }) {
  if (e.isDemo) return <DemoBadge label="Example event" />;
  if (e.provider === "manual") return <Badge tone="blue">Added by you</Badge>;
  return <LiveBadge label={e.sourceName} />;
}

function EventCard({ s, top, onDetails }: { s: ScoredEvent; top?: boolean; onDetails: () => void }) {
  const e = s.event;
  const saved = useStay((st) => st.savedEvents.includes(e.id));
  const toggleSavedEvent = useStay((st) => st.toggleSavedEvent);
  const addEventToRoadmap = useStay((st) => st.addEventToRoadmap);
  const removeManualEvent = useStay((st) => st.removeManualEvent);
  const inRoadmap = useStay((st) => st.tasks.some((t) => t.sourceEventId === e.id));
  const date = parseISO(e.date);
  const book = e.bookingUrl || e.sourceUrl;

  return (
    <Card interactive className="flex gap-4 p-5">
      <div className="flex w-14 shrink-0 flex-col items-center">
        <div className="w-14 overflow-hidden rounded-2xl border border-line text-center">
          <div className="bg-ink py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-lime">{date.toLocaleDateString("en-GB", { month: "short" })}</div>
          <div className="bg-white py-1 font-display text-2xl font-bold leading-none">{date.getDate()}</div>
          <div className="bg-white pb-1 text-[10px] font-medium text-muted">{date.toLocaleDateString("en-GB", { weekday: "short" })}</div>
        </div>
        <div className="mt-2 text-center text-[10.5px] font-semibold text-teal">{s.score}% fit</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          {top && <Badge tone="lime">🔥 Top pick</Badge>}
          <Badge tone="violet">{EVENT_CATEGORY_LABEL[e.category]}</Badge>
          <SourceBadge e={e} />
        </div>
        <button onClick={onDetails} className="mt-1.5 text-left font-display text-[17px] font-semibold leading-snug hover:underline">
          {e.name}
        </button>
        <div className="text-[13px] text-ink-2">{e.organiser}</div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ""}` : "Time TBC"} · {relativeDays(e.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            {e.location}
          </span>
        </div>
        <p className="mt-2.5 rounded-xl bg-teal-soft/60 px-3 py-2 text-[13px] leading-relaxed text-ink-2">{s.explanation}</p>
        {e.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.skills.slice(0, 4).map((k) => (
              <Badge key={k} tone={s.matchedGaps.includes(k) ? "sun" : "neutral"}>
                {s.matchedGaps.includes(k) ? "⚡ " : ""}
                {k}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Button
            size="sm"
            variant={inRoadmap ? "secondary" : "primary"}
            disabled={inRoadmap}
            onClick={() => addEventToRoadmap(e) && toast.success("Added to your roadmap", { description: `${e.name} · ${formatDate(e.date)}` })}
          >
            {inRoadmap ? <CheckCircle2 size={14} /> : <Plus size={14} />} {inRoadmap ? "In roadmap" : "Add to roadmap"}
          </Button>
          {book && !e.isDemo ? (
            <LinkButton href={book} external size="sm" variant="secondary">
              Book <ExternalLink size={12} />
            </LinkButton>
          ) : (
            <span className="text-[11.5px] text-muted">Example event, no booking link</span>
          )}
          <button
            onClick={() => {
              toggleSavedEvent(e.id);
              toast.success(saved ? "Removed from saved" : "Event saved");
            }}
            className={cn("ml-auto rounded-xl p-2", saved ? "bg-lime/50 text-ink" : "text-muted hover:bg-paper-2 hover:text-ink")}
            aria-label={saved ? "Unsave event" : "Save event"}
          >
            {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
          {e.provider === "manual" && (
            <button onClick={() => removeManualEvent(e.id)} className="rounded-xl p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove event">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function EventDetail({ s, onClose }: { s: ScoredEvent; onClose: () => void }) {
  const e = s.event;
  return (
    <Modal open onClose={onClose} title={e.name} wide>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="violet">{EVENT_CATEGORY_LABEL[e.category]}</Badge>
        <SourceBadge e={e} />
        <Badge>{e.format.replace("_", " ")}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-[13.5px] sm:grid-cols-2">
        <div>
          <b>When:</b> {formatDate(e.date, { weekday: "long", day: "numeric", month: "long" })}
          {e.startTime ? `, ${e.startTime}${e.endTime ? `–${e.endTime}` : ""}` : ""}
        </div>
        <div>
          <b>Where:</b> {e.location}
        </div>
        <div>
          <b>Organiser:</b> {e.organiser}
        </div>
        <div>
          <b>Fit:</b> {s.score}%
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">{e.description}</p>
      <div className="mt-4 rounded-2xl bg-teal-soft/60 p-4 text-[13.5px]">{s.explanation}</div>
      {e.benefits.length > 0 && (
        <ul className="mt-4 list-inside list-disc text-[13.5px] text-ink-2">
          {e.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11.5px] text-muted">
        Source: {e.sourceName}
        {e.verifiedAt ? ` · last verified ${formatDate(e.verifiedAt)}` : e.isDemo ? " · illustrative example, not a scheduled event" : ""}
        {e.sourceUrl && (
          <>
            {" · "}
            <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              open source
            </a>
          </>
        )}
      </p>
    </Modal>
  );
}

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABEL) as EventCategory[];

function PasteModal({ open, onClose, university, onSaved }: { open: boolean; onClose: () => void; university: string; onSaved: () => void }) {
  const addManualEvent = useStay((s) => s.addManualEvent);
  const profile = useStay((s) => s.profile)!;
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<CareerEvent | null>(null);
  const [source, setSource] = useState<"ai" | "rules" | null>(null);
  const isInstagram = /instagram\.com/i.test(url);

  const reset = () => {
    setText("");
    setUrl("");
    setDraft(null);
    setSource(null);
  };

  const extract = async () => {
    if (!text.trim()) {
      toast.error(isInstagram ? "We can't read Instagram posts directly. Paste the caption text" : "Paste the announcement text first");
      return;
    }
    setLoading(true);
    const today = todayISO();
    let fields = parseAnnouncementLocally(text, today);
    let src: "ai" | "rules" = "rules";
    try {
      const res = await fetch("/api/ai/extract-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, today }) });
      if (res.ok) {
        const data = await res.json();
        if (data.source === "ai" && data.event) {
          fields = { ...fields, ...Object.fromEntries(Object.entries(data.event).filter(([, v]) => v !== null && v !== "" && v !== undefined)) };
          src = "ai";
        }
      }
    } catch {
      /* local fallback */
    }
    setSource(src);
    setDraft({
      id: uid("evt"),
      name: fields.name || "Untitled event",
      organiser: fields.organiser || "Unknown organiser",
      university,
      date: fields.date || addDays(today, 7),
      startTime: fields.startTime,
      endTime: fields.endTime,
      location: fields.location || "Location not stated",
      format: fields.format || "in_person",
      category: fields.category || "workshop",
      description: text.trim().slice(0, 600),
      tracks: fields.tracks?.length ? fields.tracks : profile.careerGoals,
      skills: fields.skills ?? [],
      benefits: fields.benefits ?? [],
      bookingUrl: fields.bookingUrl || (url && !isInstagram ? url : undefined),
      sourceUrl: url || undefined,
      sourceName: isInstagram ? "Instagram announcement (pasted)" : url ? "Pasted announcement" : "Pasted announcement",
      verifiedAt: undefined,
      isDemo: false,
      provider: "manual",
    });
    setLoading(false);
    if (!fields.date) toast.warning("No date found. Please set it before saving");
  };

  const save = () => {
    if (!draft) return;
    addManualEvent(draft);
    toast.success("Event added and ranked for you");
    reset();
    onClose();
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add an event from an announcement"
      wide
    >
      {!draft ? (
        <div className="space-y-4">
          <p className="text-[13.5px] text-ink-2">
            Paste a society post, email or Instagram caption. STAY extracts the details. It only uses what&apos;s in the text and never invents missing info.
          </p>
          <div>
            <Label hint="(optional)">Link to the post or page</Label>
            <Input placeholder="https://www.instagram.com/p/… or society page" value={url} onChange={(e) => setUrl(e.target.value)} />
            {isInstagram && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
                <Camera size={12} /> We don&apos;t read Instagram posts automatically.{" "}
                <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue underline">
                  Open Instagram announcement
                </a>{" "}
                and paste the caption below.
              </p>
            )}
          </div>
          <div>
            <Label>Announcement text</Label>
            <Textarea
              className="min-h-40"
              placeholder={"e.g. 🚀 AI Society x Hackathon Soc present: Intro to LLM Agents workshop! Thursday 6 Nov, 6–8pm, Roberts Building G06. Free, bring a laptop. Sign up via link in bio."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={extract} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} Extract event details
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            {source === "ai" ? "Extracted with AI from your text" : "Extracted with rules from your text"}. check and edit before saving.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Event name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label>Organiser</Label>
              <Input value={draft.organiser} onChange={(e) => setDraft({ ...draft, organiser: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as EventCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EVENT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start</Label>
                <Input type="time" value={draft.startTime ?? ""} onChange={(e) => setDraft({ ...draft, startTime: e.target.value || undefined })} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={draft.endTime ?? ""} onChange={(e) => setDraft({ ...draft, endTime: e.target.value || undefined })} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Location</Label>
              <Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label hint="(comma-separated)">Skills it builds</Label>
              <Input
                value={draft.skills.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    skills: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Back
            </Button>
            <Button onClick={save} disabled={draft.date < todayISO()}>
              Save event
            </Button>
          </div>
          {draft.date < todayISO() && <p className="text-right text-[12px] text-red-600">This date is in the past. Past events aren&apos;t added.</p>}
        </div>
      )}
    </Modal>
  );
}
