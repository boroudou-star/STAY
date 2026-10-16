export type Rule = { allow: boolean; path: string };

/** The rule that decides this path, if any. Longest match wins; Allow wins a tie. "*" matches anything, "$" anchors the end. */
export function robotsMatch(rules: Rule[], path: string): Rule | null {
  let best: Rule | null = null;
  for (const r of rules) {
    const re = new RegExp(`^${r.path.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$$/, "$")}`);
    if (!re.test(path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best;
}

export function robotsAllow(rules: Rule[], path: string) {
  const best = robotsMatch(rules, path);
  return !best || best.allow;
}
