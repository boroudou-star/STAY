"use client";

import { LogOut, RefreshCw, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TRACKS, UK_CITIES, UNIVERSITIES } from "@/data/careers";
import { Button, Card, Chip, DemoBadge, Input, Label, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { useStay } from "@/lib/store";
import type { UserProfile } from "@/lib/types";
import { splitList } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const stored = useStay((s) => s.profile)!;
  const setProfile = useStay((s) => s.setProfile);
  const loadDemo = useStay((s) => s.loadDemo);
  const resetAll = useStay((s) => s.resetAll);
  const [p, setP] = useState<UserProfile>(stored);
  const [tech, setTech] = useState(stored.technicalSkills.join(", "));
  const [pro, setPro] = useState(stored.professionalSkills.join(", "));
  const [roles, setRoles] = useState(stored.preferredRoles.join(", "));
  const [gradMonth, setGradMonth] = useState(stored.graduationDate.slice(0, 7));
  const [confirmReset, setConfirmReset] = useState(false);
  const update = (patch: Partial<UserProfile>) => setP((x) => ({ ...x, ...patch }));

  const save = () => {
    if (!p.careerGoals.length) return toast.error("Pick at least one career goal");
    const goalsChanged = p.careerGoals.join() !== stored.careerGoals.join();
    const next: UserProfile = {
      ...p,
      technicalSkills: splitList(tech),
      professionalSkills: splitList(pro),
      preferredRoles: splitList(roles),
      graduationDate: `${gradMonth}-${gradMonth.endsWith("-02") ? "28" : "30"}`,
    };
    const s = setProfile(next, goalsChanged ? "Career goals updated" : "Profile updated");
    toast.success("STAY adapted your plan", {
      description: `${s.added} new task${s.added === 1 ? "" : "s"} · ${s.removed} removed · ${s.keptCompleted ? `${s.keptCompleted} completed kept` : "completed tasks kept"}. Opportunities and events re-ranked.`,
      action: { label: "View dashboard", onClick: () => router.push("/dashboard") },
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Profile"
        title="Your profile"
        description="Change anything. STAY rebuilds your roadmap, re-ranks opportunities and events, and keeps every task you've completed."
        actions={
          <Button onClick={save}>
            <Save size={16} /> Save & adapt roadmap
          </Button>
        }
      />
      {stored.isDemo && (
        <div className="mb-5 flex items-center gap-2 text-[13px] text-ink-2">
          <DemoBadge label="Demo profile" /> Alex Chen is fictional. Try switching their main goal to Consulting and saving to see STAY adapt.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">About you</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={p.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={p.studyStatus} onChange={(e) => update({ studyStatus: e.target.value as UserProfile["studyStatus"] })}>
                <option value="student">Currently studying</option>
                <option value="graduate">Graduated</option>
              </Select>
            </div>
            <div>
              <Label>University</Label>
              <Select value={UNIVERSITIES.includes(p.university) ? p.university : "Other"} onChange={(e) => update({ university: e.target.value === "Other" ? "" : e.target.value })}>
                {UNIVERSITIES.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
              {!UNIVERSITIES.includes(p.university) && <Input className="mt-2" placeholder="Your university" value={p.university} onChange={(e) => update({ university: e.target.value })} />}
            </div>
            <div>
              <Label>Degree</Label>
              <Input value={p.degree} onChange={(e) => update({ degree: e.target.value })} />
            </div>
            <div>
              <Label>{p.studyStatus === "student" ? "Expected graduation" : "Graduated"}</Label>
              <Input type="month" value={gradMonth} onChange={(e) => setGradMonth(e.target.value)} />
            </div>
            {p.studyStatus === "graduate" && (
              <div>
                <Label>Target start date</Label>
                <Input type="date" value={p.targetStartDate ?? ""} onChange={(e) => update({ targetStartDate: e.target.value || undefined })} />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 font-display text-lg font-semibold">Career goals</h2>
          <p className="mb-4 text-[13px] text-muted">The first one is your main goal.</p>
          <div className="flex flex-wrap gap-2">
            {TRACKS.map((t) => {
              const idx = p.careerGoals.indexOf(t.id);
              return (
                <Chip key={t.id} active={idx >= 0} onClick={() => update({ careerGoals: idx >= 0 ? p.careerGoals.filter((g) => g !== t.id) : [...p.careerGoals, t.id] })}>
                  {t.emoji} {t.label}
                  {idx === 0 && <span className="ml-1 rounded-full bg-lime px-1.5 text-[10px] font-bold text-ink">MAIN</span>}
                </Chip>
              );
            })}
          </div>
          <div className="mt-4">
            <Label hint="(comma-separated)">Preferred roles</Label>
            <Input value={roles} onChange={(e) => setRoles(e.target.value)} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Skills & experience</h2>
          <div className="space-y-4">
            <div>
              <Label hint="(comma-separated)">Technical skills</Label>
              <Input value={tech} onChange={(e) => setTech(e.target.value)} />
            </div>
            <div>
              <Label hint="(comma-separated)">Professional skills</Label>
              <Input value={pro} onChange={(e) => setPro(e.target.value)} />
            </div>
            <div>
              <Label>Internships</Label>
              <Textarea className="min-h-16" value={p.experience.internships} onChange={(e) => update({ experience: { ...p.experience, internships: e.target.value } })} />
            </div>
            <div>
              <Label>Projects</Label>
              <Textarea className="min-h-16" value={p.experience.projects} onChange={(e) => update({ experience: { ...p.experience, projects: e.target.value } })} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Preferences & visa</h2>
          <Label>Locations</Label>
          <div className="mb-4 flex flex-wrap gap-2">
            {UK_CITIES.map((c) => (
              <Chip
                key={c}
                active={p.locationPreferences.includes(c)}
                onClick={() => update({ locationPreferences: p.locationPreferences.includes(c) ? p.locationPreferences.filter((x) => x !== c) : [...p.locationPreferences, c] })}
              >
                {c}
              </Chip>
            ))}
          </div>
          <label className="mb-5 flex items-center gap-2 text-[14px]">
            <input type="checkbox" className="h-4 w-4 accent-[var(--teal)]" checked={p.willingToRelocate} onChange={(e) => update({ willingToRelocate: e.target.checked })} />
            Willing to relocate
          </label>
          <label className="mb-4 flex items-center gap-2 text-[14px]">
            <input type="checkbox" className="h-4 w-4 accent-[var(--teal)]" checked={p.visa.skipped} onChange={(e) => update({ visa: { ...p.visa, skipped: e.target.checked } })} />
            Don&apos;t use visa information
          </label>
          {!p.visa.skipped && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Needs sponsorship?</Label>
                <Select value={p.visa.needsSponsorship} onChange={(e) => update({ visa: { ...p.visa, needsSponsorship: e.target.value as UserProfile["visa"]["needsSponsorship"] } })}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">Not sure</option>
                </Select>
              </div>
              <div>
                <Label>Current visa</Label>
                <Select value={p.visa.visaType} onChange={(e) => update({ visa: { ...p.visa, visaType: e.target.value as UserProfile["visa"]["visaType"] } })}>
                  <option value="student">Student</option>
                  <option value="graduate">Graduate</option>
                  <option value="skilled_worker">Skilled Worker</option>
                  <option value="other">Other</option>
                  <option value="none">None</option>
                  <option value="unsure">Not sure</option>
                </Select>
              </div>
              <div>
                <Label hint="(optional)">Visa expiry</Label>
                <Input type="date" value={p.visa.expiryDate ?? ""} onChange={(e) => update({ visa: { ...p.visa, expiryDate: e.target.value || undefined } })} />
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              loadDemo();
              toast.success("Demo profile reloaded");
              router.push("/dashboard");
            }}
          >
            <RefreshCw size={16} /> Reset demo
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            <LogOut size={16} /> Start over
          </Button>
        </div>
        <Button onClick={save} size="lg">
          <Sparkles size={16} /> Save & adapt roadmap
        </Button>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Start over?">
        <p className="text-[14px] text-ink-2">This clears your profile, roadmap and saved items from this browser.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetAll();
              router.push("/onboarding");
            }}
          >
            Clear everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
