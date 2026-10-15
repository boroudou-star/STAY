"use client";

import { toast } from "sonner";
import type { Effects } from "@/lib/store";

/** Turn linked side-effects (auto-completed tasks, new skills, follow-ups) into friendly toasts. */
export function showEffects(e: Effects) {
  e.autoCompleted.forEach((a, i) =>
    setTimeout(() => toast.success(`Ticked off: ${a.title}`, { description: `Because ${a.because}.` }), 250 * (i + 1)),
  );
  if (e.addedSkill) toast(`Added ${e.addedSkill} to your skills`, { description: "Opportunity scores and skill gaps updated." });
  if (e.removedSkill) toast(`Removed ${e.removedSkill} from your skills`);
  if (e.newTasks.length) {
    setTimeout(
      () =>
        toast(`Next up: ${e.newTasks[0]}`, {
          description: e.newTasks.length > 1 ? `+${e.newTasks.length - 1} more new step${e.newTasks.length > 2 ? "s" : ""} on your roadmap` : "Added to your roadmap",
        }),
      600,
    );
  }
}
