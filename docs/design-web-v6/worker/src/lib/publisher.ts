/**
 * Banglar Voice — social broadcast adapters.
 *
 * One common interface, one adapter per platform, each guarded by config
 * presence. Missing credentials → graceful skip (never throws for that).
 *
 *   interface SocialAdapter {
 *     readonly platform: BroadcastPlatform;
 *     isConfigured(): boolean;
 *     publish(item: PublishedStory): Promise<BroadcastResult>;
 *   }
 *
 * Platforms need manual app setup at the provider (see README for exact
 * steps). All calls are HTTPS JSON; all adapters support being called in
 * dry-run mode by the publisher (they return a simulated result without
 * touching the network).
 */

import type { BroadcastPlatform, BroadcastResult, MediaAttachment, NewsCategory } from './types.js';
import { jsonFetch, withRetry } from './http.js';

export type PublishedStory = {
  id: string;
  slug: string;
  headline: string;
  dek: string;
  body: string[]; // paragraphs
  url?: string; // canonical website URL once published
  image?: MediaAttachment | null;
  category?: NewsCategory;
  keywords?: string[];
  source_label?: string;
};

export interface SocialAdapter {
  readonly platform: BroadcastPlatform;
  isConfigured(): boolean;
  publish(item: PublishedStory): Promise<BroadcastResult>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function skip(platform: BroadcastPlatform, reason: string): BroadcastResult {
  return { platform, ok: true, skipped: true, skipped_reason: reason, at: new Date().toISOString() };
}

function fail(platform: BroadcastPlatform, error: string): BroadcastResult {
  return { platform, ok: false, error, at: new Date().toISOString() };
}

function textOf(item: PublishedStory): string {
  const lines = [item.headline, '', ...(item.body.slice(0, 3).join(' ') ? [item.body.slice(0, 3).join(' ').slice(0, 900)] : [])];
  if (item.url) lines.push('', item.url);
  return lines.join('\n').slice(0, 2700);
}

/** Bangla-hashtag list (each ≤ 40 chars, ASCII letters/numbers allowed). */
function hashtags(item: PublishedStory): string[] {
  const base = ['বাংলারভয়েস', 'BanglarVoice', 'বাংলাদেশ'];
  const kw = (item.keywords ?? [])
    .slice(0, 2)
    .map((k) => k.replace(/[^\p{L}\p{N}]+/gu, ''));
  return [...new Set([...kw, ...base])].slice(0, 5);
}

export function buildMessage(item: PublishedStory): string {
  const tags = hashtags(item).map((t) => `#${t}`).join(' ');
  const body = [textOf(item), tags].filter(Boolean).join('\n\n');
  return body.slice(0, 2800);
}

/* ------------------------------------------------------------------ */
/* Facebook Page (Graph API)                                           */
/* ------------------------------------------------------------------ */

export class FacebookAdapter implements SocialAdapter {
  readonly platform = 'facebook' as const;
  constructor(private env: { pageId?: string; token?: string }) {}
  isConfigured(): boolean {
    return Boolean(this.env.pageId && this.env.token);
  }
  async publish(item: PublishedStory): Promise<BroadcastResult> {
    if (!this.isConfigured()) return skip('facebook', 'FACEBOOK_PAGE_ID/FACEBOOK_PAGE_TOKEN not set');
    const message = buildMessage(item);
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(this.env.pageId!)}/feed`;
    try {
      const r = await withRetry(
        () =>
          jsonFetch(url, {
            method: 'POST',
            body: new URLSearchParams({ message, access_token: this.env.token! }).toString(),
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
          }),
        { log: (m) => console.log(`[fb] ${m}`) },
      );
      const d = r.data as { id?: string; error?: { message?: string } };
      if (!r.ok) return fail('facebook', d.error?.message ?? `HTTP ${r.status}`);
      return { platform: 'facebook', ok: true, ref: d.id, at: new Date().toISOString() };
    } catch (e) {
      return fail('facebook', e instanceof Error ? e.message : String(e));
    }
  }
}

/* ------------------------------------------------------------------ */
/* X / Twitter (API v2)                                                */
/* ------------------------------------------------------------------ */

export class TwitterAdapter implements SocialAdapter {
  readonly platform = 'twitter' as const;
  constructor(private env: { appKey?: string; appSecret?: string; accessToken?: string; accessSecret?: string }) {}
  isConfigured(): boolean {
    return Boolean(this.env.accessToken && this.env.accessSecret && this.env.appKey && this.env.appSecret);
  }
  async publish(item: PublishedStory): Promise<BroadcastResult> {
    if (!this.isConfigured()) return skip('twitter', 'TWITTER_* OAuth1 keys not set');
    // NOTE: X API v2 requires OAuth 1.0a signing. Implemented in oauth1.ts
    // (tiny RFC-5849 signer, no dependency). We import lazily to keep this
    // file tree-shakeable.
    const { signAndPost } = await import('./oauth1.js');
    try {
      const text = textOf(item).slice(0, 279);
      const r = await withRetry(
        () =>
          signAndPost(
            'https://api.x.com/2/tweets',
            { text },
            {
              appKey: this.env.appKey!,
              appSecret: this.env.appSecret!,
              accessToken: this.env.accessToken!,
              accessSecret: this.env.accessSecret!,
            },
          ),
        { log: (m) => console.log(`[x] ${m}`) },
      );
      const d = r.data as { data?: { id?: string }; errors?: { message?: string }[] };
      if (!r.ok) return fail('twitter', d.errors?.[0]?.message ?? `HTTP ${r.status}`);
      return { platform: 'twitter', ok: true, ref: d.data?.id, at: new Date().toISOString() };
    } catch (e) {
      return fail('twitter', e instanceof Error ? e.message : String(e));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Instagram (Graph API — professional account + page linked)          */
/* ------------------------------------------------------------------ */

export class InstagramAdapter implements SocialAdapter {
  readonly platform = 'instagram' as const;
  constructor(private env: { pageId?: string; token?: string; igUserId?: string }) {}
  isConfigured(): boolean {
    return Boolean(this.env.token && (this.env.igUserId || this.env.pageId));
  }
  async publish(item: PublishedStory): Promise<BroadcastResult> {
    if (!this.isConfigured()) return skip('instagram', 'INSTAGRAM_* not set (needs FB Graph + linked pro account)');
    const token = this.env.token!;
    const igId = this.env.igUserId ?? this.env.pageId!;
    const caption = buildMessage(item).slice(0, 2200);
    const imageUrl = item.image?.url;
    try {
      // 1) Create media container (image_url). If no CC0 image available we
      //    skip instead of posting a text-only card (Instagram requires media).
      if (!imageUrl) return skip('instagram', 'no CC0 image available for the container');
      const createUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(igId)}/media`;
      const c = await jsonFetch(createUrl, {
        method: 'POST',
        body: new URLSearchParams({
          image_url: imageUrl,
          caption,
          access_token: token,
        }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      const cd = c.data as { id?: string; error?: { message?: string } };
      if (!c.ok) return fail('instagram', cd.error?.message ?? `HTTP ${c.status}`);
      const containerId = cd.id!;
      // 2) Poll until the container is ready (media_pending)…
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const st = await jsonFetch(
          `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
        );
        const sd = st.data as { status_code?: string };
        if (sd.status_code === 'FINISHED') break;
        if (sd.status_code === 'ERROR') return fail('instagram', 'container status ERROR');
      }
      // 3) Publish the container.
      const pubUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(igId)}/media_publish`;
      const p = await jsonFetch(pubUrl, {
        method: 'POST',
        body: new URLSearchParams({ creation_id: containerId, access_token: token }).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      const pd = p.data as { id?: string; error?: { message?: string } };
      if (!p.ok) return fail('instagram', pd.error?.message ?? `HTTP ${p.status}`);
      return { platform: 'instagram', ok: true, ref: pd.id, at: new Date().toISOString() };
    } catch (e) {
      return fail('instagram', e instanceof Error ? e.message : String(e));
    }
  }
}

/* ------------------------------------------------------------------ */
/* LinkedIn (shares API)                                               */
/* ------------------------------------------------------------------ */

export class LinkedInAdapter implements SocialAdapter {
  readonly platform = 'linkedin' as const;
  constructor(private env: { accessToken?: string; personUrn?: string }) {}
  isConfigured(): boolean {
    return Boolean(this.env.accessToken && this.env.personUrn);
  }
  async publish(item: PublishedStory): Promise<BroadcastResult> {
    if (!this.isConfigured()) return skip('linkedin', 'LINKEDIN_* not set');
    const person = this.env.personUrn!.startsWith('urn:')
      ? this.env.personUrn
      : `urn:li:person:${this.env.personUrn}`;
    const commentary = `${item.headline}\n\n${item.dek}`.slice(0, 2500);
    try {
      const r = await withRetry(
        () =>
          jsonFetch('https://api.linkedin.com/rest/shares', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.env.accessToken!}`,
              'content-type': 'application/json',
              'linkedin-version': '202412',
            },
            body: JSON.stringify({
              author: person,
              commentary,
              visibility: 'PUBLIC',
              distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionDisallowed: false },
            }),
          }),
        { log: (m) => console.log(`[in] ${m}`) },
      );
      const d = r.data as { id?: string; message?: string; serviceErrorCode?: number };
      if (!r.ok) return fail('linkedin', d.message ?? `HTTP ${r.status} (${d.serviceErrorCode ?? ''})`);
      return { platform: 'linkedin', ok: true, ref: String(d.id), at: new Date().toISOString() };
    } catch (e) {
      return fail('linkedin', e instanceof Error ? e.message : String(e));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Telegram channel (Bot API)                                          */
/* ------------------------------------------------------------------ */

export class TelegramAdapter implements SocialAdapter {
  readonly platform = 'telegram' as const;
  constructor(private env: { botToken?: string; chatId?: string }) {}
  isConfigured(): boolean {
    return Boolean(this.env.botToken && this.env.chatId);
  }
  async publish(item: PublishedStory): Promise<BroadcastResult> {
    if (!this.isConfigured()) return skip('telegram', 'TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set');
    const base = `https://api.telegram.org/bot${this.env.botToken!}`;
    try {
      const text = [
        `📰 ${item.headline}`,
        '',
        ...item.body.slice(0, 3),
        item.url ? `\n🔗 ${item.url}` : '',
        '',
        '#বাংলারভয়েস',
      ]
        .filter((s) => s.trim().length > 0)
        .join('\n')
        .slice(0, 4000);
      const payload: Record<string, unknown> = {
        chat_id: this.env.chatId!,
        text,
        disable_web_page_preview: false,
      };
      if (item.image?.url) payload.photo = item.image.url;
      const r = await withRetry(
        () =>
          jsonFetch(`${base}/sendPhoto`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'content-type': 'application/json' },
          }).then((res) => {
            if (res.status === 400 && payload.photo) {
              // Photo URL rejected (some hosts block hotlinks) → fall back to text.
              return jsonFetch(`${base}/sendMessage`, {
                method: 'POST',
                body: JSON.stringify({ chat_id: this.env.chatId!, text, disable_web_page_preview: false }),
                headers: { 'content-type': 'application/json' },
              });
            }
            return res;
          }),
        { log: (m) => console.log(`[tg] ${m}`) },
      );
      const d = r.data as { ok?: boolean; result?: { message_id?: number }; description?: string };
      if (!r.ok || d.ok === false) return fail('telegram', d.description ?? `HTTP ${r.status}`);
      return { platform: 'telegram', ok: true, ref: String(d.result?.message_id), at: new Date().toISOString() };
    } catch (e) {
      return fail('telegram', e instanceof Error ? e.message : String(e));
    }
  }
}
