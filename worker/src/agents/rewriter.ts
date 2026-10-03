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

export function classifyRewriteFailure(e: unknown, cfg: WorkerConfig): string {
  if (!hasChatKey(cfg)) return "missing_env:CHAT_AI_KEY";
  if (!(e instanceof Error)) return "ai_rewrite_failed";
  const msg = e.message;
  if (/\b401\b|\b403\b/.test(msg)) return "invalid_or_missing_key";
  if (/\b429\b/.test(msg)) return "rate_limit";
  if (/\b404\b/.test(msg)) return `model_not_found:${cfg.chatAiModel || "unset"}`;
  return `ai_rewrite_failed:${msg.slice(0, 80)}`;
}

function logRewriteFailure(cfg: WorkerConfig, reason: string, extra: Record<string, unknown> = {}): void {
  let host = "";
  try {
    host = new URL(cfg.chatAiBaseUrl).host;
  } catch {
    host = cfg.chatAiBaseUrl ? "invalid_base_url" : "unset";
  }
  console.error("[rewriter] ai_rewrite failure", {
    reason,
    model: cfg.chatAiModel || "unset",
    has_key: hasChatKey(cfg),
    base_host: host,
    ...extra,
  });
}

export async function rewrite(cfg: WorkerConfig, raw: RawItem): Promise<RewriteResult> {
  if (!hasChatKey(cfg)) {
    logRewriteFailure(cfg, "missing_env:CHAT_AI_KEY", { source_url: raw.link });
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
    if (lines.length === 0) {
      logRewriteFailure(cfg, "ai_empty_response", { source_url: raw.link });
      return fallbackResult(raw, "ai_empty_response");
    }
    const titleBn = lines[0].slice(0, 90);
    const contentBn = lines.slice(1).join("\n") || out;
    return { titleBn, contentBn, method: "ai", fallback: false };
  } catch (e) {
    const reason = classifyRewriteFailure(e, cfg);
    logRewriteFailure(cfg, reason, { source_url: raw.link });
    return fallbackResult(raw, reason);
  }
}
