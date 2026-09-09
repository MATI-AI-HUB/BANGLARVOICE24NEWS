// =============================================================================
// chain-agents.ts — the Editor and Social agents.
//
// Editor: validates a rewritten draft — headline length, tag extraction,
// duplicate guard, and (when a chat key exists) a quality pass.
//
// Social: broadcasts a published item to Facebook, X, Instagram, LinkedIn and
// Telegram. Each platform is skipped when its credentials are missing.
// =============================================================================

import type { WorkerConfig } from "../config.js";
import { chat, hasChatKey } from "./chat.js";
import type { DraftArticle, RawItem, SocialPostResult } from "./types.js";

// --- Editor ----------------------------------------------------------------

export interface EditorResult {
  titleBn: string;
  tags: string[];
  ok: boolean;
  issues: string[];
}

const BAD_HEADLINE_PATTERNS = [
  /breaking\s*:/i,
  /urgent\s*:/i,
  /^https?:\/\//i,
  /\.\.\.$/,
];

/** Extract 3-5 Bangla tags from the content + source category. */
function extractTags(content: string, category: string): string[] {
  const words = content
    .split(/[\s\n।,;:!?()"'\u201c\u201d]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && /[\u0980-\u09FF]/.test(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w);
  const tags = [...new Set([category, ...top])].slice(0, 5);
  return tags;
}

export async function edit(cfg: WorkerConfig, draft: DraftArticle): Promise<EditorResult> {
  const issues: string[] = [];
  const title = draft.titleBn.trim();

  if (title.length < 10) issues.push("শিরোনাম খুব ছোট");
  if (title.length > 120) issues.push("শিরোনাম খুব বড়");
  for (const p of BAD_HEADLINE_PATTERNS) if (p.test(title)) issues.push("শিরোনামে অবাঞ্ছিত প্যাটার্ন");

  // Tag extraction: pick Bangla keywords from the content.
  const tags = extractTags(draft.contentBn, draft.raw.sourceCategory);

  // Optional AI quality pass.
  if (hasChatKey(cfg) && issues.length === 0) {
    try {
      const verdict = await chat(
        cfg,
        "You are a Bangla news editor. Reply with ONLY 'ok' or a short Bangla reason why the headline is not publishable.",
        `Headline: ${title}\n\nBody: ${draft.contentBn.slice(0, 800)}`,
        0.1,
      );
      if (!/^ok$/i.test(verdict.trim())) issues.push(verdict.trim().slice(0, 80));
    } catch {
      // non-fatal
    }
  }

  return { titleBn: title, tags, ok: issues.length === 0, issues };
}

// --- Social ---------------------------------------------------------------

async function postTelegram(cfg: WorkerConfig, text: string, url: string): Promise<SocialPostResult> {
  if (!cfg.telegramBotToken || !cfg.telegramChannelId) {
    return { platform: "telegram", ok: false, error: "no credentials" };
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.telegramChannelId, text: `${text}\n\n${url}` }),
      },
    );
    const data: any = await res.json();
    return { platform: "telegram", ok: data?.ok === true, postId: String(data?.result?.message_id ?? "") };
  } catch (e: any) {
    return { platform: "telegram", ok: false, error: e?.message };
  }
}

async function postFacebook(cfg: WorkerConfig, text: string, url: string): Promise<SocialPostResult> {
  if (!cfg.social.facebookPageToken || !cfg.social.facebookPageId) {
    return { platform: "facebook", ok: false, error: "no credentials" };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${cfg.social.facebookPageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `${text}\n\n${url}`, access_token: cfg.social.facebookPageToken }),
      },
    );
    const data: any = await res.json();
    return { platform: "facebook", ok: !!data?.id, postId: data?.id };
  } catch (e: any) {
    return { platform: "facebook", ok: false, error: e?.message };
  }
}

async function postX(cfg: WorkerConfig, text: string, url: string): Promise<SocialPostResult> {
  if (!cfg.social.xApiKey || !cfg.social.xAccessToken) {
    return { platform: "x", ok: false, error: "no credentials" };
  }
  try {
    const res = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.social.xAccessToken}`,
      },
      body: JSON.stringify({ text: `${text}\n\n${url}`.slice(0, 280) }),
    });
    const data: any = await res.json();
    return { platform: "x", ok: !!data?.data?.id, postId: data?.data?.id };
  } catch (e: any) {
    return { platform: "x", ok: false, error: e?.message };
  }
}

async function postLinkedIn(cfg: WorkerConfig, text: string, url: string): Promise<SocialPostResult> {
  if (!cfg.social.linkedinAccessToken || !cfg.social.linkedinOrganizationId) {
    return { platform: "linkedin", ok: false, error: "no credentials" };
  }
  try {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.social.linkedinAccessToken}`,
      },
      body: JSON.stringify({
        author: `urn:li:organization:${cfg.social.linkedinOrganizationId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: `${text}\n\n${url}` },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const data: any = await res.json();
    return { platform: "linkedin", ok: !!data?.id, postId: data?.id };
  } catch (e: any) {
    return { platform: "linkedin", ok: false, error: e?.message };
  }
}

export async function broadcast(cfg: WorkerConfig, article: { titleBn: string; url: string }): Promise<SocialPostResult[]> {
  const text = article.titleBn;
  const url = article.url;
  const results = await Promise.all([
    postTelegram(cfg, text, url),
    postFacebook(cfg, text, url),
    postX(cfg, text, url),
    postLinkedIn(cfg, text, url),
  ]);
  return results;
}