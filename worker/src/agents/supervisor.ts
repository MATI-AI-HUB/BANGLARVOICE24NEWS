import type { WorkerConfig } from "../config.js";
import type { DraftArticle, SupervisorDecision } from "./types.js";
import {
  computeScore,
  decidePublish,
  minAiScore,
} from "../lib/publish-gate.js";

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

export function computeAiScore(draft: DraftArticle): number {
  return computeScore({
    titleBn: draft.titleBn,
    bodyBn: draft.contentBn,
    sourceUrl: draft.raw?.link ?? "",
    imageUrl: draft.imageUrl,
    isFallback: draft.imageSource === "brand" || draft.fallback,
    rewriteMethod: draft.rewriteMethod,
    sourceText: draft.raw?.description,
  });
}

export async function decide(cfg: WorkerConfig, draft: DraftArticle): Promise<SupervisorDecision> {
  const score = computeAiScore(draft);
  draft.aiScore = score;

  if (isDuplicate(draft.titleBn) || isDuplicate(draft.raw.link)) {
    draft.duplicateOf = "recent";
    return { itemId: draft.raw.id, action: "reject", reason: "48h duplicate", score };
  }

  const extra = draft as {
    sourceText?: string;
    aiSensitive?: boolean;
    aiSensitivityFailed?: boolean;
    licenceAllowsReuse?: boolean;
  };
  const gate = decidePublish({
    autoPublish: cfg.autoPublish,
    sourceEnabled: true,
    killSwitch: false,
    sourceUrl: draft.raw.link,
    imageUrl: draft.imageUrl,
    isFallback: draft.imageSource === "brand" || draft.fallback,
    rewriteMethod: draft.rewriteMethod,
    bodyBn: draft.contentBn,
    titleBn: draft.titleBn,
    sourceText: extra.sourceText || draft.raw.description,
    sourcePublishedAt: draft.raw.publishedAt,
    category: draft.raw.sourceCategory,
    minAiScore: minAiScore(),
    aiSensitive: false,
    aiSensitivityFailed: false,
    imageSource: draft.imageSource,
    licenceAllowsReuse: extra.licenceAllowsReuse === true || draft.imageSource === "pexels",
  });

  if (gate.action === "reject") {
    return { itemId: draft.raw.id, action: "reject", reason: gate.reason, score: gate.score };
  }
  if (gate.action === "hold") {
    return { itemId: draft.raw.id, action: "wait", reason: gate.reason, score: gate.score };
  }
  return { itemId: draft.raw.id, action: "publish", reason: gate.reason, score: gate.score };
}

export async function sendTelegramAlert(cfg: WorkerConfig, text: string): Promise<boolean> {
  if (!cfg.telegramBotToken || !cfg.telegramChannelId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.telegramChannelId, text }),
    });
    const data = (await res.json()) as { ok?: boolean };
    return data?.ok === true;
  } catch {
    return false;
  }
}

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
      return { handled: true, reply: "AUTO_PUBLISH=true — পরবর্তী স্কোর>=৪০ আইটেম অটো-প্রকাশিত হবে।" };
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
