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
 * Baseline fact-check score 0-100.
 *
 * ⚠️ This is a PLACEHOLDER. It NEVER auto-publishes on its own.
 * Real verification lives in ./specialists/ — the specialists router
 * REPLACES this score with a composite verification score before the
 * supervisor decision is made.
 *
 * Baseline rules (conservative):
 *   - No verifiable source URL      -> 0   (reject)
 *   - Body shorter than 500 chars   -> 30  (reject — too thin)
 *   - Body shorter than 1000 chars  -> 60  (editor review)
 *   - Body has real substance       -> 70  (editor review)
 *
 * MAX = 70. Auto-publish requires specialist verification >= 85.
 */
export function computeAiScore(draft: DraftArticle): number {
  const link = draft.raw?.link ?? "";
  const hasSource = /^https?:\/\//i.test(link);
  if (!hasSource) return 0;

  const bodyLen = draft.contentBn.trim().length;
  if (bodyLen < 500) return 30;
  if (bodyLen < 1000) return 60;
  return 70;
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
    if (cfg.autoPublish && (draft.imageUrl || "").trim()) {
      return { itemId: draft.raw.id, action: "publish", reason: "auto-publish with image, ai_score 50-79", score };
    }
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