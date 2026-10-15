/** Tiny text helpers shared by the insights and interview engines. */

export const STOPWORDS = new Set(
  "a an the and or but if then so of to in on at by for with from as is are was were be been being it its this that these those i me my we our you your they them their he she his her not no yes do does did done have has had will would could should can may might must about into over under than also just very more most less much many some any each other such what which who whom why how when where there here up down out off again further once only own same too both few all because while during before after above below between through until against s t don".split(
    " ",
  ),
);

export function tokens(text: string) {
  return (text.toLowerCase().match(/[a-z0-9£%][a-z0-9£%'-]*/g) ?? []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function wordCount(text: string) {
  return (text.trim().match(/\S+/g) ?? []).length;
}

/** Fraction of a point's significant words that appear in the answer (with crude stemming). */
export function coverage(point: string, answer: string) {
  const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
  const a = new Set(tokens(answer).map(stem));
  const p = [...new Set(tokens(point).map(stem))];
  if (!p.length) return 0;
  return p.filter((w) => a.has(w)).length / p.length;
}

/** Deterministic pseudo-random index from a string seed (stable per day). */
export function seededIndex(seed: string, n: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return n ? Math.abs(h) % n : 0;
}

export function topTerms(texts: string[], n = 8, exclude: string[] = []) {
  const ex = new Set(exclude.map((e) => e.toLowerCase()));
  const freq = new Map<string, number>();
  for (const t of texts) for (const w of new Set(tokens(t))) if (!ex.has(w) && !/^\d+$/.test(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w, c]) => ({ term: w, count: c }));
}
