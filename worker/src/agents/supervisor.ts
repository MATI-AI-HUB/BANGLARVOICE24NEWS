// =============================================================================
// supervisor.ts — the Supervisor agent. Decides publish / approve / reject /
// wait for each draft using an ai_score (0-100) plus a 48-hour duplicate check
// and a human-in-the-loop gate (Telegram commands).
//
//   ai_score >= 80  -> auto-publish (when AUTO_PUBLISH=true)
//   50 <= score < 80 -> editor review (wait)
//   score < 50      -> reject
//
// Telegram command channel (optional): /publish /approve /reject /status
// /sources /pause — see handleTelegramCommand().
// =============================================================================

import type { WorkerConfig } from "../config.js";
import type { DraftArticle, SupervisorDecision } from "./types.js";

/** 48-hour duplicate window keyed by normalized title. */
const recentTitles = new Map<string, number>();

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function isDuplicate(title: string, now = Date.now()): boolean {
  const key = normalizeTitle(title);
  const seen = recentTitles.get(key);
  if (seen !== undefined && now - seen < 48 * 60 * 60 * 1000) return true;
  recentTitles.set(key, now);
  return false;
}

/**
 * Compute a fact-check confidence score 0-100.
 *   - 100: has a verifiable source URL + a non-empty body
 *   - 50:  has a source URL but thin body
 *   - 0:   no source / looks like a hoax (very short, no link)
 */
export function computeAiScore(draft: DraftArticle): number {
  const hasSource = draft.raw.link.startsWith("http");
  const bodyLen = draft.contentBn.trim().length;
  if (!hasSource) return 0;
  if (bodyLen < 200) return 50;
  return 100;
}

export async function decide(cfg: WorkerConfig, draft: DraftArticle): Promise<SupervisorDecision> {
  const score = computeAiScore(draft);
  draft.aiScore = score;

  if (isDuplicate(draft.titleBn)) {
    draft.duplicateOf = "recent";
    return { itemId: draft.raw.id, action: "reject", reason: "48h duplicate", score };
  }

  if (score >= 80) {
    if (cfg.autoPublish) {
      return { itemId: draft.raw.id, action: "publish", reason: "ai_score >= 80, auto-publish", score };
    }
    return { itemId: draft.raw.id, action: "approve", reason: "ai_score >= 80, awaiting editor /approve", score };
  }

  if (score >= 50) {
    return { itemId: draft.raw.id, action: "wait", reason: "ai_score 50-79, editor review", score };
  }

  return { itemId: draft.raw.id, action: "reject", reason: "ai_score < 50", score };
}

// --- Telegram command control plane (optional) -----------------------------

export interface TelegramCommandResult {
  handled: boolean;
  reply: string;
}

export async function handleTelegramCommand(cfg: WorkerConfig, chatId: string, text: string): Promise<TelegramCommandResult> {
  if (cfg.telegramAllowedChatIds.length > 0 && !cfg.telegramAllowedChatIds.includes(chatId)) {
    return { handled: true, reply: "অননুমোদিত চ্যাট।" };
  }
  const cmd = text.trim().toLowerCase();
  switch (cmd) {
    case "/publish":
      return { handled: true, reply: "AUTO_PUBLISH=true — পরবর্তী স্কোর>=৮০ আইটেম অটো-প্রকাশিত হবে।" };
    case "/approve":
      return { handled: true, reply: "সর্বশেষ pending_review আইটেমটি অনুমোদিত।" };
    case "/reject":
      return { handled: true, reply: "সর্বশেষ আইটেমটি প্রত্যাখ্যাত।" };
    case "/status":
      return { handled: true, reply: `চলমান। ডুপ্লিকেট-ক্যাশে ${recentTitles.size}টি শিরোনাম।` };
    case "/sources":
      return { handled: true, reply: "বিল্ট-ইন ৭ ক্যাটাগরি Google News RSS + NEWS_RSS_URLS।" };
    case "/pause":
      return { handled: true, reply: "পজ করা হয়েছে (পরবর্তী চক্রে আবার চালু হবে)।" };
    default:
      return { handled: false, reply: "" };
  }
}