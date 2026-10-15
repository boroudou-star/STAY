import { SKILL_ALIASES } from "@/data/careers";
import { displaySkill } from "./skills";

const EXTRA = ["C++", "Java", "Go", "Rust", "Kotlin", "Swift", "MATLAB", "Tableau", "Power BI", "Docker", "Kubernetes", "TensorFlow", "Spark", "Figma", "Excel"];

/** Deterministic skill extraction: only returns skills explicitly mentioned in the text. */
export function extractSkillsFromText(text: string): string[] {
  const found = new Set<string>();
  const lower = ` ${text.toLowerCase()} `;
  for (const [canon, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((a) => a.length > 1 && new RegExp(`(^|[^a-z+#])${a.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^a-z+#]|$)`, "i").test(lower))) {
      found.add(displaySkill(canon));
    }
  }
  for (const s of EXTRA) {
    if (new RegExp(`(^|[^a-z])${s.replace(/[+]/g, "\\+").toLowerCase()}([^a-z+]|$)`).test(lower)) found.add(s);
  }
  return [...found];
}
