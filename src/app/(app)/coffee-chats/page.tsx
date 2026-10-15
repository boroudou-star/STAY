"use client";

import { Check, Copy, ExternalLink, Lightbulb, Loader2, MessageSquareText, Search, Sparkles, StickyNote, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, Input, Label, LinkButton, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { CONTACT_STATUS_LABEL, coffeeChatRecommendations, outreachTemplate } from "@/lib/engine/coffee";
import { useStay } from "@/lib/store";
import { showEffects } from "@/components/effects-toast";
import type { ContactStatus, NetworkingRecommendation, UserContact } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const STATUSES = Object.keys(CONTACT_STATUS_LABEL) as ContactStatus[];
const STATUS_TONE: Record<ContactStatus, string> = {
  want_to_contact: "bg-paper-2 text-ink-2",
  message_drafted: "bg-blue-soft text-blue",
  contacted: "bg-violet-soft text-violet",
  replied: "bg-sun-soft text-[#c2502f]",
  chat_scheduled: "bg-lime/50 text-ink",
  completed: "bg-teal-soft text-teal",
};

export default function CoffeeChatsPage() {
  const profile = useStay((s) => s.profile)!;
  const contacts = useStay((s) => s.contacts);
  const userContacts = useStay((s) => s.userContacts);
  const recs = coffeeChatRecommendations(profile);
  const [composeFor, setComposeFor] = useState<{ rec: NetworkingRecommendation | null; contact?: UserContact; trackId: string } | null>(null);
  const [addFor, setAddFor] = useState<NetworkingRecommendation | null | "new">(null);
  const [notesFor, setNotesFor] = useState<{ id: string; label: string } | null>(null);

  const allIds = [...recs.map((r) => r.id), ...userContacts.map((c) => c.id)];
  const counts = STATUSES.map((s) => ({ s, n: allIds.filter((id) => (contacts[id]?.status ?? "want_to_contact") === s).length }));

  return (
    <div>
      <PageHeader
        eyebrow="Coffee chats"
        title="5 conversations worth having"
        description="Targeted searches for the kinds of people who can help you most right now. Open a search, find a real person, then use STAY to draft a short, honest message. STAY never sends anything for you."
        actions={
          <Button variant="secondary" onClick={() => setAddFor("new")}>
            <UserPlus size={16} /> Add a contact
          </Button>
        }
      />

      {/* Pipeline */}
      <div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto pb-1">
        {counts.map(({ s, n }, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("flex items-center gap-2 whitespace-nowrap rounded-2xl px-3.5 py-2 text-[13px] font-medium", STATUS_TONE[s])}>
              <span className="font-display text-lg font-bold">{n}</span> {CONTACT_STATUS_LABEL[s]}
            </div>
            {i < counts.length - 1 && <span className="text-line">→</span>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {recs.map((r, i) => (
          <RecCard
            key={r.id}
            n={i + 1}
            rec={r}
            onCompose={() => setComposeFor({ rec: r, trackId: r.id })}
            onAddPerson={() => setAddFor(r)}
            onNotes={() => setNotesFor({ id: r.id, label: r.title })}
          />
        ))}
        <Card className="flex flex-col justify-center bg-ink p-6 text-white">
          <Lightbulb className="text-lime" />
          <h3 className="mt-3 font-display text-xl font-semibold">How to make it land</h3>
          <ul className="mt-3 space-y-1.5 text-[13.5px] text-white/80">
            <li>• Keep it under 300 characters for LinkedIn connection notes.</li>
            <li>• Mention one specific thing from their profile, and only what you&apos;ve actually read.</li>
            <li>• Ask for 15 minutes, not a job or a referral.</li>
            <li>• Follow up once after a week, then let it go.</li>
          </ul>
        </Card>
      </div>

      {userContacts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-xl font-semibold">People you&apos;ve found</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {userContacts.map((c) => (
              <ContactCard
                key={c.id}
                c={c}
                onCompose={() => setComposeFor({ rec: null, contact: c, trackId: c.id })}
                onNotes={() => setNotesFor({ id: c.id, label: c.name })}
              />
            ))}
          </div>
        </div>
      )}

      {composeFor && <ComposeModal {...composeFor} onClose={() => setComposeFor(null)} />}
      {addFor && <AddContactModal rec={addFor === "new" ? null : addFor} onClose={() => setAddFor(null)} />}
      {notesFor && <NotesModal {...notesFor} onClose={() => setNotesFor(null)} />}
    </div>
  );
}

function StatusSelect({ id }: { id: string }) {
  const status = useStay((s) => s.contacts[id]?.status ?? "want_to_contact");
  const setContact = useStay((s) => s.setContact);
  return (
    <Select
      aria-label="Contact status"
      value={status}
      onChange={(e) => {
        showEffects(setContact(id, { status: e.target.value as ContactStatus }));
        if (e.target.value === "completed") toast.success("Chat completed ☕ Now log what you learned in Notes");
      }}
      className={cn("h-8 w-auto rounded-full border-0 py-0 pl-3 pr-8 text-[12px] font-semibold", STATUS_TONE[status])}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {CONTACT_STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}

function RecCard({ n, rec, onCompose, onAddPerson, onNotes }: { n: number; rec: NetworkingRecommendation; onCompose: () => void; onAddPerson: () => void; onNotes: () => void }) {
  const tracking = useStay((s) => s.contacts[rec.id]);
  return (
    <Card interactive className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sun to-violet font-display text-lg font-bold text-white">{n}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="blue">
              <Search size={10} /> Targeted search, not a specific person
            </Badge>
            {rec.universityConnection && <Badge tone="teal">🎓 {rec.universityConnection}</Badge>}
          </div>
          <h3 className="mt-1.5 font-display text-[17px] font-semibold leading-snug">{rec.title}</h3>
        </div>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{rec.relevanceExplanation}</p>
      <div className="mt-3 rounded-2xl bg-paper p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ask them about</div>
        <ul className="mt-1 space-y-0.5 text-[13px]">
          {rec.conversationTopics.map((t) => (
            <li key={t}>💬 {t}</li>
          ))}
        </ul>
      </div>
      {tracking?.followUpDate && <div className="mt-2 text-[12px] text-muted">Follow up: {formatDate(tracking.followUpDate)}</div>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {rec.alumniUrl && (
          <LinkButton href={rec.alumniUrl} external size="sm" variant="secondary">
            Alumni tool <ExternalLink size={12} />
          </LinkButton>
        )}
        {rec.searchUrl && (
          <LinkButton href={rec.searchUrl} external size="sm" variant="secondary">
            {rec.alumniUrl ? "People search" : "Open LinkedIn search"} <ExternalLink size={12} />
          </LinkButton>
        )}
        <Button size="sm" onClick={onCompose}>
          <MessageSquareText size={14} /> Generate message
        </Button>
        <Button size="sm" variant="ghost" onClick={onAddPerson}>
          <UserPlus size={14} /> I found someone
        </Button>
        <button onClick={onNotes} className="rounded-lg p-2 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Notes">
          <StickyNote size={15} />
        </button>
        <div className="ml-auto">
          <StatusSelect id={rec.id} />
        </div>
      </div>
    </Card>
  );
}

function ContactCard({ c, onCompose, onNotes }: { c: UserContact; onCompose: () => void; onNotes: () => void }) {
  const remove = useStay((s) => s.removeUserContact);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{c.name}</span>
            <Badge tone="teal">Added by you</Badge>
          </div>
          <div className="text-[13px] text-ink-2">
            {c.role}
            {c.company ? ` · ${c.company}` : ""}
          </div>
          {c.background && <div className="mt-1 text-[12.5px] text-muted">{c.background}</div>}
        </div>
        <StatusSelect id={c.id} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onCompose}>
          <MessageSquareText size={14} /> Generate message
        </Button>
        {c.profileUrl && (
          <LinkButton href={c.profileUrl} external size="sm" variant="secondary">
            Profile <ExternalLink size={12} />
          </LinkButton>
        )}
        <Button size="sm" variant="ghost" onClick={onNotes}>
          <StickyNote size={14} /> Notes
        </Button>
        <button onClick={() => remove(c.id)} className="ml-auto rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove contact">
          <Trash2 size={15} />
        </button>
      </div>
    </Card>
  );
}

function ComposeModal({ rec, contact, trackId, onClose }: { rec: NetworkingRecommendation | null; contact?: UserContact; trackId: string; onClose: () => void }) {
  const profile = useStay((s) => s.profile)!;
  const saved = useStay((s) => s.contacts[trackId]?.draft);
  const setContact = useStay((s) => s.setContact);
  const [text, setText] = useState(saved ?? outreachTemplate(profile, rec, contact));
  const [polishing, setPolishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const polish = async () => {
    setPolishing(true);
    try {
      const res = await fetch("/api/ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: text,
          sender: { name: profile.name, university: profile.university, degree: profile.degree, stage: profile.studyStatus, goals: profile.careerGoals },
          recipient: contact ? { name: contact.name, role: contact.role, company: contact.company, background: contact.background } : { role: rec?.role, searchTitle: rec?.title },
          topics: rec?.conversationTopics ?? [],
        }),
      });
      const data = (await res.json()) as { text?: string; source?: string; message?: string };
      if (data.source === "ai" && data.text) {
        setText(data.text);
        toast.success("Polished with AI. Check it sounds like you");
      } else toast.info(data.message ?? "AI isn't configured, the template is ready to edit");
    } catch {
      toast.error("Couldn't reach AI. Your draft is unchanged");
    }
    setPolishing(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setContact(trackId, { draft: text, status: "message_drafted" });
    toast.success("Copied. Paste it into LinkedIn yourself");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Modal open onClose={onClose} title={contact ? `Message to ${contact.name}` : "Coffee-chat message"} wide>
      {!contact && (
        <p className="mb-3 rounded-xl bg-blue-soft px-3 py-2 text-[12.5px] text-ink-2">
          Replace <b>[Name]</b> with the person you found. Only add details you&apos;ve actually read on their profile.
        </p>
      )}
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-44 text-[14.5px]" aria-label="Message draft" />
      <div className={cn("mt-1 text-right text-[12px]", text.length > 300 ? "text-[#c2502f]" : "text-muted")}>
        {text.length} characters{text.length > 300 ? " (over LinkedIn's limit for connection notes, so trim it or send it as a message)" : ""}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={polish} disabled={polishing}>
            {polishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Polish with AI
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setText(outreachTemplate(profile, rec, contact))}>
            Reset
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setContact(trackId, { draft: text });
              toast.success("Draft saved");
              onClose();
            }}
          >
            Save draft
          </Button>
          <Button size="sm" onClick={copy}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy message"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddContactModal({ rec, onClose }: { rec: NetworkingRecommendation | null; onClose: () => void }) {
  const addUserContact = useStay((s) => s.addUserContact);
  const [name, setName] = useState("");
  const [role, setRole] = useState(rec?.role ?? "");
  const [company, setCompany] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [background, setBackground] = useState("");
  return (
    <Modal open onClose={onClose} title="Add someone you found">
      <p className="mb-4 text-[13px] text-ink-2">Only enter details you&apos;ve seen on their public profile. They&apos;re stored privately in your browser.</p>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Company</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <Label hint="(optional)">Profile URL</Label>
          <Input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://www.linkedin.com/in/…" />
        </div>
        <div>
          <Label hint="(optional)">Something specific about their background</Label>
          <Input value={background} onChange={(e) => setBackground(e.target.value)} placeholder="e.g. moved from biology into ML engineering" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim() || !role.trim()) return toast.error("Name and role are needed");
              addUserContact({ name: name.trim(), role: role.trim(), company: company.trim(), profileUrl: profileUrl.trim() || undefined, background: background.trim() || undefined });
              toast.success(`${name} added. Generate a message next`);
              onClose();
            }}
          >
            Add contact
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function NotesModal({ id, label, onClose }: { id: string; label: string; onClose: () => void }) {
  const t = useStay((s) => s.contacts[id]);
  const setContact = useStay((s) => s.setContact);
  const [notes, setNotes] = useState(t?.notes ?? "");
  const [insight, setInsight] = useState(t?.insight ?? "");
  const [followUp, setFollowUp] = useState(t?.followUpDate ?? "");
  return (
    <Modal open onClose={onClose} title={`Notes · ${label}`}>
      <div className="space-y-3">
        <div>
          <Label>Private notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who you contacted, when, what you said…" />
        </div>
        <div>
          <Label>Career insight you learned</Label>
          <Textarea value={insight} onChange={(e) => setInsight(e.target.value)} placeholder="e.g. Their team hires graduates in January; they value deployed projects." />
        </div>
        <div className="max-w-xs">
          <Label>Follow-up reminder</Label>
          <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setContact(id, { notes, insight, followUpDate: followUp || undefined });
              toast.success("Saved");
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
