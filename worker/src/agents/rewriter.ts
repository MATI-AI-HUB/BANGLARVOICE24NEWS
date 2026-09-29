import type { WorkerConfig } from "../config.js";
import { chat, hasChatKey } from "./chat.js";
import type { RawItem, RewriteResult } from "./types.js";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "at",
  "by", "from", "is", "are", "was", "were", "be", "been", "has", "have", "had",
  "it", "its", "this", "that", "these", "those", "as", "but", "not", "no",
]);

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (STOP_WORDS.has(w.toLowerCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function extractiveSummary(raw: RawItem): { titleBn: string; contentBn: string } {
  const src = (raw.description || raw.title).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = src
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const excerpt = sentences.slice(0, 2).join(" ") || src.slice(0, 280);
  const titleBn = titleCase(raw.title.replace(/^[^:：]+[:：]\s*/, "").slice(0, 90));
  const contentBn = excerpt.slice(0, 400);
  return { titleBn, contentBn };
}

/** @deprecated Use extractiveSummary. Kept for tests; never published. */
export function deterministicParaphrase(raw: RawItem): { titleBn: string; contentBn: string } {
  return extractiveSummary(raw);
}

function fallbackResult(raw: RawItem, reason: string): RewriteResult {
  const excerpt = extractiveSummary(raw);
  return {
    ...excerpt,
    method: "fallback",
    fallback: true,
    reason,
  };
}

export async function rewrite(cfg: WorkerConfig, raw: RawItem): Promise<RewriteResult> {
  if (!hasChatKey(cfg)) {
    return fallbackResult(raw, "no_chat_key");
  }
  try {
    const out = await chat(
      cfg,
      "You are a Bangla news rewriter. Rewrite the following news item into an original, copyright-safe Bangla article. Keep facts accurate. Reply with ONLY the rewritten Bangla text, no preamble.",
      `Title: ${raw.title}\n\nBody: ${(raw.description || raw.title).slice(0, 2000)}`,
      0.2,
    );
    const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return fallbackResult(raw, "ai_empty_response");
    const titleBn = lines[0].slice(0, 90);
    const contentBn = lines.slice(1).join("\n") || out;
    return { titleBn, contentBn, method: "ai", fallback: false };
  } catch (e) {
    const reason = e instanceof Error ? `ai_rewrite_failed:${e.message.slice(0, 80)}` : "ai_rewrite_failed";
    return fallbackResult(raw, reason);
  }
}
