"use client";

import { Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORY_EMOJI, CATEGORY_LABEL, TaskRow } from "@/components/task-row";
import { TubeMap } from "@/components/tube-map";
import { Button, Card, Chip, EmptyState, Input, Label, Modal, PageHeader, ProgressBar, Select, Tabs, Textarea } from "@/components/ui";
import { phaseForDate } from "@/lib/engine/roadmap";
import { useDerived } from "@/lib/hooks";
import { useStay } from "@/lib/store";
import type { Priority, RoadmapTask, TaskCategory, TaskStatus } from "@/lib/types";
import { addDays, formatDate, todayISO } from "@/lib/utils";

type StatusFilter = "all" | TaskStatus;

export default function RoadmapPage() {
  const d = useDerived();
  const { tasks, phases, horizon, profile } = d;
  const regenerate = useStay((s) => s.regenerate);
  const resetProgress = useStay((s) => s.resetProgress);
  const setTaskStatus = useStay((s) => s.setTaskStatus);
  const deleteTask = useStay((s) => s.deleteTask);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoadmapTask | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const filtered = tasks.filter(
    (t) => (status === "all" || t.status === status) && (!category || t.category === category) && (!phase || phaseForDate(phases, t.deadline)?.id === phase),
  );
  const categories = Array.from(new Set(tasks.map((t) => t.category)));
  const done = tasks.filter((t) => t.status === "completed").length;

  return (
    <div>
      <PageHeader
        eyebrow={profile.studyStatus === "student" ? "Student pathway" : "Graduate pathway"}
        title="My Roadmap"
        description={`${tasks.length} steps from today to ${horizon.anchorLabel === "graduation" ? "graduation" : horizon.anchorLabel} (${formatDate(horizon.anchorDate, { month: "long", year: "numeric" })}). Dates follow typical UK recruitment cycles and any deadlines you've added.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add task
            </Button>
            <Button
              onClick={() => {
                const s = regenerate("Recommendations regenerated");
                if (s) toast.success("Roadmap regenerated", { description: `${s.added} new · ${s.removed} removed · completed tasks kept` });
              }}
            >
              <RefreshCw size={16} /> Regenerate
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="min-w-0 p-5 lg:col-span-2">
          <TubeMap phases={phases} tasks={tasks} start={horizon.start} end={horizon.end} anchorLabel={horizon.anchorLabel} onSelectPhase={setPhase} activePhase={phase} />
          <p className="-mt-2 text-[12px] text-muted">Tip: click a line to filter tasks by phase.</p>
        </Card>
        <Card className="p-5" >
          <div id="progress" className="scroll-mt-24">
            <div className="text-[12px] font-semibold uppercase tracking-widest text-teal">My progress</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="font-display text-4xl font-bold">{d.progress}%</div>
              <div className="text-[13px] text-muted">
                {done} of {tasks.length} done
              </div>
            </div>
            <ProgressBar value={d.progress} className="mt-2" />
            <div className="mt-4 space-y-2.5">
              {phases.map((ph) => {
                const inPhase = tasks.filter((t) => phaseForDate(phases, t.deadline)?.id === ph.id);
                const pct = inPhase.length ? Math.round((inPhase.filter((t) => t.status === "completed").length / inPhase.length) * 100) : 0;
                return (
                  <div key={ph.id}>
                    <div className="flex justify-between text-[12.5px]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2 w-2 rounded-full" style={{ background: ph.color }} />
                        {ph.name}
                      </span>
                      <span className="text-muted">
                        {inPhase.filter((t) => t.status === "completed").length}/{inPhase.length}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: ph.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setConfirmReset(true)} className="mt-4 inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink">
              <RotateCcw size={12} /> Reset progress
            </button>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          items={[
            { value: "all", label: `All (${tasks.length})` },
            { value: "todo", label: "To do" },
            { value: "in_progress", label: "In progress" },
            { value: "completed", label: "Completed" },
          ]}
        />
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          <Chip active={!category} onClick={() => setCategory(null)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
              {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {phases
          .filter((ph) => !phase || ph.id === phase)
          .map((ph) => {
            const list = filtered.filter((t) => phaseForDate(phases, t.deadline)?.id === ph.id);
            if (!list.length) return null;
            return (
              <Card key={ph.id} className="p-4 sm:p-5">
                <div className="mb-2 flex items-center gap-3 px-1">
                  <span className="h-3 w-8 rounded-full" style={{ background: ph.color }} />
                  <div>
                    <h2 className="font-display text-lg font-semibold">{ph.name}</h2>
                    <div className="text-[12px] text-muted">
                      {formatDate(ph.start, { day: "numeric", month: "short" })} – {formatDate(ph.end, { day: "numeric", month: "short", year: "numeric" })} · {ph.subtitle}
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-line/60">
                  {list.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      actions={
                        <>
                          <Select
                            aria-label="Status"
                            value={t.status}
                            onChange={(e) => setTaskStatus(t.id, e.target.value as TaskStatus)}
                            className="hidden h-8 w-[124px] rounded-lg py-0 pl-2.5 pr-7 text-[12px] sm:block"
                          >
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                          </Select>
                          <button onClick={() => setEditing(t)} className="rounded-lg p-2 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Edit task">
                            <Pencil size={15} />
                          </button>
                          {t.origin !== "engine" && (
                            <button
                              onClick={() => {
                                deleteTask(t.id);
                                toast("Task removed");
                              }}
                              className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete task"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </>
                      }
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        {!filtered.length && <EmptyState title="Nothing here" body="No tasks match these filters." action={<Button variant="secondary" onClick={() => { setStatus("all"); setCategory(null); setPhase(null); }}>Clear filters</Button>} />}
      </div>

      <TaskModal open={adding} onClose={() => setAdding(false)} />
      {editing && <TaskModal open task={editing} onClose={() => setEditing(null)} />}

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all progress?">
        <p className="text-[14px] text-ink-2">This marks every task as to-do. Your tasks and dates stay the same.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetProgress();
              setConfirmReset(false);
              toast("Progress reset");
            }}
          >
            Reset progress
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TaskModal({ open, onClose, task }: { open: boolean; onClose: () => void; task?: RoadmapTask }) {
  const addCustomTask = useStay((s) => s.addCustomTask);
  const updateTask = useStay((s) => s.updateTask);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [deadline, setDeadline] = useState(task?.deadline ?? addDays(todayISO(), 14));
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [category, setCategory] = useState<TaskCategory>(task?.category ?? "custom");

  const save = () => {
    if (!title.trim()) return toast.error("Give the task a title");
    if (task) {
      updateTask(task.id, {
        title,
        description,
        priority,
        category,
        ...(deadline !== task.deadline ? { deadline } : {}),
      });
      toast.success("Task updated");
    } else {
      addCustomTask({ title, description, deadline, priority, category });
      toast.success("Task added to your roadmap");
      setTitle("");
      setDescription("");
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "Add a custom task"}>
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finish portfolio README" autoFocus />
        </div>
        <div>
          <Label hint="(optional)">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Target date</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        {task?.origin === "engine" && <p className="text-[12px] text-muted">Edited dates are kept when STAY regenerates your roadmap.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{task ? "Save changes" : "Add task"}</Button>
        </div>
      </div>
    </Modal>
  );
}
