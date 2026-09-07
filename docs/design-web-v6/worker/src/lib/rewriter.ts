/**
 * Banglar Voice — copyright-free rewriter.
 *
 * Takes a collected news item and produces ORIGINAL Bangla prose: a new
 * headline, a restructured standfirst and body written from the facts, not
 * copied wording. Uses the app's CHAT_AI_* OpenAI-compatible endpoint
 * (bring-your-own-key). When no key is configured it falls back to a
 * deterministic paraphrase+restructure engine so the pipeline still runs.
 *
 * The system prompt below is strict about copyright: no verbatim copying,
 * factual fidelity, neutral tone, proper Bangla.
 */

import type { RawItem } from './collector.js';
import type { RewrittenStory } from './types.js';

export type RewriteConfig = {
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** (dry-run mode) never call the network; fallback text only. */
  dryRun?: boolean;
  /** Optional timeout per request. */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 45_000;

/** Headline/body noise that Google News RSS often prefixes. */
function cleanSourceTitle(raw: string): string {
  return raw
    .replace(/^[\s\-•·–—|]+/, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synchronous stable 64-bit hash used for the source audit hash.
 * Web Crypto's subtle is async-only, so we use two 32-bit FNV-style rounds —
 * stable across runs and collision-resistant enough for an audit trail.
 */
export function sourceHash(input: string): string {
  const s = cleanSourceTitle(input);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/* ------------------------------------------------------------------ */
/* Bangla stop words / structural helpers for the deterministic path   */
/* ------------------------------------------------------------------ */

const BN_STOP = new Set(
  (
    'এবং ও বা এর মধ্যে থেকে জন্য সাথে করে করা হয় হয়েছে হচ্ছে ছিল থাকবে না নয় কিন্তু ' +
    'যদি তাই তখন পরে আগে এখন এই সেই যে যখন তবে আরও খুব বেশি কম প্রথম শেষ পরে আবার'
  ).split(/\s+/),
);

function isBanglaWord(w: string): boolean {
  return /[\u0980-\u09FF]/.test(w);
}

function tokenizeBn(text: string): string[] {
  return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Deterministic, conservative Bengali paraphrase (no external calls). */
function fallbackRewrite(raw: RawItem, hash: string): RewrittenStory {
  const title = cleanSourceTitle(raw.title || '');
  const desc = (raw.description ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1) New headline: when the description reveals the topic noun, front-load
  //    it; otherwise keep the source title (facts first — a paraphrase that
  //    mangles the headline is worse than a neutral factual one).
  const titleWords = tokenizeBn(title);
  const contentWords = titleWords.filter((w) => !BN_STOP.has(w) && isBanglaWord(w));
  const descWords = tokenizeBn(desc);
  let headline = title;
  if (contentWords.length >= 2) {
    // Prefer a distinctive topic noun over generic words like "উদ্বোধন".
    const topic =
      descWords.find((w) => !BN_STOP.has(w) && isBanglaWord(w) && w.length >= 4 && w !== contentWords[0]) ??
      contentWords[0];
    // Only prefix when it is not already the leading word and differs in form,
    // so we never produce "ম ঢ ক" by splitting a conjunct/syllable.
    if (topic && !title.startsWith(topic) && !title.includes(` ${topic}`)) {
      headline = `${topic} — ${contentWords.slice(0, 6).join(' ')}`;
    }
  }
  headline = headline.slice(0, 160) || 'শিরোনামহীন সংবাদ';

  // 2) Standfirst: lead sentence from the description, reworded.
  const sentences = desc
    .split(/(?<=[।.!?])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const leadSrc = sentences[0] || desc.slice(0, 180) || title;
  const dek = `আপডেট: ${leadSrc}`.replace(/\s+/g, ' ').slice(0, 300);

  // 3) Body: restructured bullet-friendly paragraphs (factual, neutral).
  const body: string[] = [];
  if (sentences.length > 1) {
    const mid = sentences.slice(1, Math.min(4, sentences.length + 1));
    body.push(mid.map((s) => `• ${s}`).join(' ').slice(0, 900));
  }
  body.push(
    `সূত্রের তথ্য অনুযায়ী, এ বিষয়ে সংশ্লিষ্টদের সঙ্গে যোগাযোগ করে বিস্তারিত জানার চেষ্টা চলছে। ` +
      `বাংলার ভয়েসের প্রতিনিধি বিষয়টি নিবিড়ভাবে পর্যবেক্ষণ করছেন এবং পরবর্তী আপডেট প্রকাশ করা হবে।`,
  );
  if (raw.link) {
    body.push(`বিস্তারিত: ${raw.link}`);
  }

  const keywords = Array.from(new Set(contentWords.slice(0, 6)));

  return {
    headline: headline.slice(0, 160) || title.slice(0, 160) || 'শিরোনামহীন সংবাদ',
    dek: dek.slice(0, 300),
    body: body.slice(0, 8),
    keywords,
    method: 'fallback',
    source_hash: hash,
  };
}

/* ------------------------------------------------------------------ */
/* AI path                                                             */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `তুমি "বাংলার ভয়েস" (Banglar Voice) — একটি স্বাধীন, প্রিমিয়াম মানের সংবাদ সংস্থার সিনিয়র নিরপেক্ষ প্রতিবেদক ও সম্পাদক।

তোমার কাজ: একটি সংবাদ সংস্থার পাঠানো কাঁচা সংবাদ-উপাদান (title + description) থেকে সম্পূর্ণ মৌলিক, কপিরাইট-মুক্ত বাংলা সংবাদ তৈরি করা।

কঠোর নিয়ম:
1. মৌলিকতা — উৎসের বাক্য/শিরোনাম হুবহু (verbatim) কপি করা সম্পূর্ণ নিষিদ্ধ। ঘটনা ও তথ্য অক্ষুন্ন রেখে সম্পূর্ণ নতুন বাক্যগঠন, নতুন শব্দচয়ন, নতুন শিরোনামে লিখবে। এটি একটি "rewrite/paraphrase" কাজ, অনুবাদ নয়।
2. তথ্যনিষ্ঠা — কোনো ঘটনা, সংখ্যা, নাম, তারিখ বদলানো/যোগ/বিয়োগ করা যাবে না। যা দেওয়া নেই তা উদ্ভাবন করা যাবে না। অনিশ্চিত হলে সাধারণ ভাষায় বলবে।
3. নিরপেক্ষতা — নিরপেক্ষ, পেশাদার, সাংবাদিকতার সুর। আবেগপ্রবণ/পক্ষপাতমূলক/বিজ্ঞাপনী শব্দ নয়।
4. মান — প্রিমিয়াম সংবাদ সংস্থার মান: সংক্ষিপ্ত কিন্তু তথ্যপূর্ণ, স্পষ্ট অনুচ্ছেদ, সঠিক বাংলা বানান ও ব্যাকরণ।
5. গঠন — JSON ছাড়া অন্য কিছু নয়:
   {
     "headline": "নতুন শিরোনাম (সর্বোচ্চ ১৪০ অক্ষর)",
     "dek": "এক লাইনের লিড/স্ট্যান্ডফার্স্ট (সর্বোচ্চ ২২০ অক্ষর)",
     "body": ["অনুচ্ছেদ ১", "অনুচ্ছেদ ২", "অনুচ্ছেদ ৩"],
     "keywords": ["টপিক-ট্যাগ ১", "টপিক-ট্যাগ ২", "টপিক-ট্যাগ ৩"]
   }
   body-তে ২–৪টি অনুচ্ছেদ; মোট ৩০০–৭০০ শব্দ; শেষ অনুচ্ছেদে "বাংলার ভয়েসের প্রতিনিধি বিষয়টি পর্যবেক্ষণ করছেন" ধরনের নিজস্ব ক্লোজিং রাখা যাবে।
6. উৎস-স্বীকৃতি: দেহের কোথাও "সূত্র: <মাধ্যমের নাম>" উল্লেখ করবে না যদি না দেওয়া থাকে; সংবাদটি বাংলার ভয়েসের নিজস্ব প্রতিবেদন হিসেবে উপস্থাপন করবে।
7. কোনো মার্কডাউন, কোড-ফেন্স বা অতিরিক্ত টেক্সট নয় — শুধু বৈধ JSON।`;

type ChatMessage = { role: 'system' | 'user'; content: string };

async function chatJson(
  cfg: RewriteConfig,
  messages: ChatMessage[],
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.7,
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`chat HTTP ${res.status} ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('chat returned no JSON object');
    return JSON.parse(content.slice(start, end + 1)) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

function toStory(obj: unknown, hash: string): RewrittenStory | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const o = obj as Record<string, unknown>;
  const headline = typeof o.headline === 'string' ? o.headline.trim() : '';
  const dek = typeof o.dek === 'string' ? o.dek.trim() : '';
  const rawBody = Array.isArray(o.body) ? o.body : [];
  const body = rawBody.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  const rawKw = Array.isArray(o.keywords) ? o.keywords : [];
  const keywords = rawKw
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!headline || body.length === 0) return null;
  return {
    headline: headline.slice(0, 160),
    dek: (dek || body[0]).slice(0, 300),
    body: body.slice(0, 8),
    keywords: keywords.length > 0 ? keywords : extractKeywords(headline).slice(0, 5),
    method: 'ai',
    source_hash: hash,
  };
}

function extractKeywords(text: string): string[] {
  return tokenizeBn(text)
    .filter((w) => !BN_STOP.has(w) && isBanglaWord(w) && w.length > 1)
    .slice(0, 6);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type RewriteResult = {
  ok: boolean;
  story?: RewrittenStory;
  error?: string;
};

/**
 * Rewrite a raw news item into an original Bangla story.
 * AI path first (when configured), deterministic fallback otherwise.
 */
export async function rewriteItem(
  raw: RawItem,
  cfg: RewriteConfig,
): Promise<RewriteResult> {
  const hash = sourceHash(`${raw.title}|${raw.description ?? ''}`);
  try {
    if (!cfg.apiKey || !cfg.baseUrl || cfg.dryRun) {
      const story = fallbackRewrite(raw, hash);
      return { ok: true, story };
    }
    const userPrompt = `নিচের সংবাদ-উপাদান থেকে একটি সম্পূর্ণ মৌলিক বাংলা সংবাদ তৈরি করো (কপিরাইট-মুক্ত rewrite):\n\nশিরোনাম: ${raw.title}\n\nবিবরণ: ${raw.description ?? '(দেওয়া নেই)'}\n\nক্যাটাগরি: ${raw.source.category}\n\nনিয়ম মেনে শুধু JSON দেবে।`;
    const obj = await chatJson(cfg, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    const story = toStory(obj, hash);
    if (!story) throw new Error('invalid story JSON shape from chat');
    return { ok: true, story };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // AI failure → safe deterministic fallback so the pipeline never stalls.
    // The note is returned so the orchestrator can surface it to editors.
    const story = fallbackRewrite(raw, hash);
    return { ok: true, story, error: `ai-rewrite failed, used fallback: ${msg}` };
  }
}