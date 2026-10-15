"use client";

import { Download, RefreshCw, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AboutFields,
  EducationFields,
  GoalsFields,
  GraduateStartField,
  PreferenceFields,
  SkillsFields,
  StartingPointFields,
  VisaFields,
} from "@/components/profile-fields";
import { Button, Card, DemoBadge, Modal, PageHeader, ProgressBar } from "@/components/ui";
import { profileCompleteness, profileGaps, withDefaults } from "@/lib/profile";
import { deleteMyData, switchSlot, useStay } from "@/lib/store";
import type { UserProfile } from "@/lib/types";
import { todayISO } from "@/lib/utils";

const SECTIONS: { id: string; title: string; body: string }[] = [
  { id: "about", title: "About you", body: "Your stage and what success looks like." },
  { id: "education", title: "Studies", body: "Sets the timing of your whole plan." },
  { id: "goals", title: "Goals and target companies", body: "Drives roles, searches, insights and interview prep." },
  { id: "skills", title: "Skills, experience and CV", body: "Skill gaps, role scores and CV interview questions use this." },
  { id: "start", title: "Starting point", body: "What's done, what's hard and how much time you have." },
  { id: "prefs", title: "Preferences", body: "How roles are ranked for you." },
  { id: "visa", title: "Visa", body: "Optional. Sponsorship flags and visa milestones." },
];

const comparable = (x: UserProfile) => JSON.stringify({ ...withDefaults(x), updatedAt: "" });

export default function ProfilePage() {
  const stored = useStay((s) => s.profile)!;
  // Remount when switching between the demo and your own data, or after a restore
  return <ProfileEditor key={`${stored.id}-${stored.isDemo}`} stored={stored} />;
}

function ProfileEditor({ stored }: { stored: UserProfile }) {
  const router = useRouter();
  const setProfile = useStay((s) => s.setProfile);
  const [p, setP] = useState<UserProfile>(() => withDefaults(stored));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = (patch: Partial<UserProfile>) => setP((x) => ({ ...x, ...patch }));
  const dirty = comparable(p) !== comparable(stored);
  const gaps = profileGaps(p);
  const pct = profileCompleteness(p);

  const save = () => {
    if (!p.careerGoals.length) return toast.error("Pick at least one career goal");
    if (!p.university.trim()) return toast.error("Add your university");
    const s = setProfile(p, "Profile updated");
    toast.success("STAY adapted your plan", {
      description: `${s.added} new task${s.added === 1 ? "" : "s"} · ${s.removed} removed · completed tasks kept. Roles and events re-ranked.`,
      action: { label: "View dashboard", onClick: () => router.push("/dashboard") },
    });
  };

  const section = (id: string): ReactNode => {
    if (id === "about") return <AboutFields p={p} update={update} />;
    if (id === "education")
      return (
        <div className="space-y-5">
          <EducationFields p={p} update={update} />
          <GraduateStartField p={p} update={update} />
        </div>
      );
    if (id === "goals") return <GoalsFields p={p} update={update} />;
    if (id === "skills") return <SkillsFields p={p} update={update} />;
    if (id === "start") return <StartingPointFields p={p} update={update} />;
    if (id === "prefs") return <PreferenceFields p={p} update={update} />;
    return <VisaFields p={p} update={update} />;
  };

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Profile"
        title="Your profile"
        description="Everything STAY knows about you, all editable. Save and STAY rebuilds your roadmap, re-ranks roles and events, and keeps everything you've completed."
        actions={
          <Button onClick={save} disabled={!dirty}>
            <Save size={16} /> Save & adapt
          </Button>
        }
      />
      {stored.isDemo && (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
          <DemoBadge label="Demo profile" /> Alex Chen is fictional. Try changing the main goal to Consulting and saving to watch STAY adapt.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-8 space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold">Profile strength</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <ProgressBar value={pct} className="mt-2 h-1.5" />
              {gaps[0] && <p className="mt-2 text-[12px] text-muted">Next: {gaps[0].title.toLowerCase()}</p>}
            </Card>
            <ul className="space-y-0.5 text-[13.5px]">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">
                    {s.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#data" className="block rounded-lg px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">
                  Your data
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          {gaps.length > 0 && (
            <Card className="border-sun/30 bg-sun-soft/40 p-5">
              <h2 className="font-display text-lg font-semibold">Make your plan more specific</h2>
              <ul className="mt-2 space-y-1.5 text-[13.5px]">
                {gaps.slice(0, 4).map((g) => (
                  <li key={g.id}>
                    <a href={`#${g.section}`} className="font-semibold text-blue hover:underline">
                      {g.title}
                    </a>{" "}
                    <span className="text-ink-2">{g.why}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {SECTIONS.map((s) => (
            <Card key={s.id} className="scroll-mt-24 p-5 sm:p-6">
              <div id={s.id} className="scroll-mt-24" />
              <h2 className="font-display text-lg font-semibold">{s.title}</h2>
              <p className="mb-5 text-[13px] text-muted">{s.body}</p>
              {section(s.id)}
            </Card>
          ))}

          <div id="data" className="scroll-mt-24">
            {stored.isDemo ? <DemoControls /> : <DataControls onDelete={() => setConfirmDelete(true)} />}
          </div>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 lg:bottom-6 lg:left-64">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-line bg-ink px-4 py-3 text-white shadow-[var(--shadow-lift)]">
            <span className="text-[13.5px]">You have unsaved changes.</span>
            <div className="flex gap-2">
              <button className="rounded-full px-3 py-1.5 text-[13px] text-white/70 hover:text-white" onClick={() => setP(withDefaults(stored))}>
                Discard
              </button>
              <Button variant="lime" size="sm" onClick={save}>
                <Sparkles size={14} /> Save & adapt my plan
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your data?">
        <p className="text-[14px] text-ink-2">
          This permanently removes your profile, roadmap, notes, interview practice and everything else from this device. The demo isn&apos;t affected. Download a copy first if you might want it back.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await deleteMyData();
              toast("Your data was deleted from this device");
              router.push("/");
            }}
          >
            Delete everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function DemoControls() {
  const router = useRouter();
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Demo controls</h2>
      <p className="mb-4 text-[13px] text-muted">The demo lives in its own space on this device. Resetting it never touches your own plan.</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            await switchSlot("demo", { freshDemo: true });
            toast.success("Demo reset to the start");
            router.push("/dashboard");
          }}
        >
          <RefreshCw size={16} /> Reset demo
        </Button>
        <Button
          onClick={async () => {
            const has = await switchSlot("mine");
            router.push(has ? "/dashboard" : "/onboarding");
          }}
        >
          Go to my own plan
        </Button>
      </div>
    </Card>
  );
}

/** Download, restore or delete everything STAY stores for this user. */
function DataControls({ onDelete }: { onDelete: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const exportData = () => {
    const s = useStay.getState();
    const state = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function"));
    const blob = new Blob([JSON.stringify({ app: "STAY", version: 1, exportedAt: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stay-my-data-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded your data");
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as { app?: string; state?: { profile?: UserProfile } };
      if (parsed.app !== "STAY" || !parsed.state?.profile) throw new Error("not a STAY file");
      const state = parsed.state as Record<string, unknown>;
      useStay.setState({ ...state, profile: { ...parsed.state.profile, isDemo: false } } as Partial<ReturnType<typeof useStay.getState>>);
      toast.success("Your data was restored");
      router.push("/dashboard");
    } catch {
      toast.error("That file isn't a STAY export");
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Your data</h2>
      <p className="mb-4 text-[13px] text-muted">
        Everything is stored on this device only. There&apos;s no account yet, so download a copy to move to another device or browser, and restore it there.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportData}>
          <Download size={16} /> Download my data
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Restore from a file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = "";
          }}
        />
        <Button variant="ghost" onClick={onDelete} className="text-red-600 hover:bg-red-50">
          <Trash2 size={16} /> Delete my data
        </Button>
      </div>
    </Card>
  );
}
