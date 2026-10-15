import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

/**
 * Server-only Claude helper. API keys never reach the browser.
 * Every caller has a deterministic fallback, so the app works without a key.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

let client: Anthropic | null = null;
export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (!aiAvailable()) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 });
  return client;
}

export async function aiText(system: string, user: string, maxTokens = 400): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.error("[ai] text call failed", err instanceof Error ? err.message : err);
    return null;
  }
}

/** A multi-turn conversation. `messages` must start with a user turn and alternate. */
export async function aiChat(system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens = 400): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.error("[ai] chat call failed", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Ask for JSON only, extract the first JSON object, and validate it at runtime with zod. */
export async function aiJSON<T>(system: string, user: string, schema: z.ZodType<T>, maxTokens = 800): Promise<T | null> {
  const raw = await aiText(`${system}\n\nRespond with a single JSON object only. No prose, no markdown fences.`, user, maxTokens);
  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    if (!parsed.success) {
      console.error("[ai] schema validation failed", parsed.error.issues.slice(0, 3));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}
