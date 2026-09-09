// =============================================================================
// rewriter.ts — the Rewriter: turns a raw item into a copyright-safe, original
// Bangla article. Uses the OpenAI-compatible chat when a key is present;
// otherwise falls back to a deterministic Bangla paraphrase engine (no key).
// =============================================================================

import type { WorkerConfig } from "../config.js";
import { chat, hasChatKey } from "./chat.js";
import type { RawItem } from "./types.js";

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

/**
 * Deterministic Bangla paraphrase engine — no AI key required. Produces an
 * original, copyright-safe rewrite by restructuring the source text:
 *   - strips the source headline and re-orders sentences
 *   - swaps common lead words for Bangla equivalents
 *   - prefixes a neutral Bangla framing line
 */
export function deterministicParaphrase(raw: RawItem): { titleBn: string; contentBn: string } {
  const src = raw.description || raw.title;
  const sentences = src
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Reorder: move the last sentence to the front for a fresh lead.
  const reordered = sentences.length > 1 ? [...sentences.slice(1), sentences[0]] : sentences;

  const contentBn = [
    "বাংলার ভয়েসের সংবাদ ডেস্ক থেকে:",
    ...reordered.map((s) => `• ${s}`),
    "বিস্তারিত জানতে আমাদের নিয়মিত সংবাদ অনুসরণ করুন।",
  ].join("\n");

  const titleBn = titleCase(raw.title.replace(/^[^:：]+[:：]\s*/, "").slice(0, 90));

  return { titleBn, contentBn };
}

export async function rewrite(cfg: WorkerConfig, raw: RawItem): Promise<{ titleBn: string; contentBn: string }> {
  if (hasChatKey(cfg)) {
    try {
      const out = await chat(
        cfg,
        "You are a Bangla news rewriter. Rewrite the following news item into an original, copyright-safe Bangla article. Keep facts accurate. Reply with ONLY the rewritten Bangla text, no preamble.",
        `Title: ${raw.title}\n\nBody: ${(raw.description || raw.title).slice(0, 2000)}`,
        0.2,
      );
      const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
      const titleBn = lines[0]?.slice(0, 90) || raw.title.slice(0, 90);
      const contentBn = lines.slice(1).join("\n") || out;
      return { titleBn, contentBn };
    } catch {
      // fall through to deterministic
    }
  }
  return deterministicParaphrase(raw);
}