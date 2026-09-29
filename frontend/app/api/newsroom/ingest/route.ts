import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  extractProvidedKey,
  ingestConfigured,
  ingestExpectedKey,
  ingestKeyOk,
} from '../../../../lib/ingest-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CATEGORY_ENUM = new Set([
  'national',
  'politics',
  'economy',
  'sports',
  'entertainment',
  'tech',
  'health',
  'education',
  'international',
  'city',
]);

const CATEGORY_ALIAS: Record<string, string> = {
  technology: 'tech',
  tech: 'tech',
  business: 'economy',
};

type IngestBody = {
  title?: unknown;
  content?: unknown;
  excerpt?: unknown;
  tags?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  imageCredit?: unknown;
  imageLicense?: unknown;
  imageSource?: unknown;
  rewriteMethod?: unknown;
  fallback?: unknown;
  aiScore?: unknown;
  aiSummary?: unknown;
  sourceUrl?: unknown;
  sourceName?: unknown;
  sourceCategory?: unknown;
  status?: unknown;
  contentHash?: unknown;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function sourceLabelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    return host || 'সূত্র';
  } catch {
    return 'সূত্র';
  }
}

function mapCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return 'national';
  const aliased = CATEGORY_ALIAS[key] || key;
  return CATEGORY_ENUM.has(aliased) ? aliased : 'national';
}

function mapStatus(raw: string): {
  status: 'published' | 'pending' | 'archived';
  editorial_status: 'auto_published' | 'pending_review';
  published_at: string | null;
} {
  const value = raw.trim().toLowerCase();
  if (value === 'published') {
    return {
      status: 'published',
      editorial_status: 'auto_published',
      published_at: new Date().toISOString(),
    };
  }
  if (value === 'rejected' || value === 'archived') {
    return {
      status: 'archived',
      editorial_status: 'pending_review',
      published_at: null,
    };
  }
  return {
    status: 'pending',
    editorial_status: 'pending_review',
    published_at: null,
  };
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin creds missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isUniqueViolation(message: string | undefined): boolean {
  const m = (message || '').toLowerCase();
  return m.includes('duplicate key') || m.includes('unique constraint') || m.includes('23505');
}

export async function GET() {
  return json({
    service: 'banglar-voice-newsroom-ingest',
    method: 'POST',
    auth: 'Authorization: Bearer <NEWSROOM_INGEST_KEY> or x-ingest-key',
  });
}

export async function POST(req: Request) {
  if (!ingestConfigured()) {
    return json({ error: 'ingest_unconfigured' }, 500);
  }

  const provided = extractProvidedKey(req);
  if (!ingestKeyOk(provided, ingestExpectedKey())) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (body.fallback === true || asText(body.rewriteMethod).toLowerCase() === 'fallback') {
    return json({ error: 'fallback_not_publishable' }, 422);
  }

  const title = asText(body.title);
  const content = asText(body.content);
  if (title.length < 5) return json({ error: 'title_required' }, 400);
  if (content.length < 40) return json({ error: 'content_required' }, 400);

  const sourceUrl = asText(body.sourceUrl);
  const sourceName = asText(body.sourceName) || sourceLabelFromUrl(sourceUrl);
  const contentHash = asText(body.contentHash);
  const excerpt = asText(body.excerpt) || content.slice(0, 160);
  const category = mapCategory(asText(body.sourceCategory));
  const mapped = mapStatus(asText(body.status));
  const imageUrl = asText(body.imageUrl);
  const imageCredit = asText(body.imageCredit) || asText(body.imageAlt);
  const imageLicense = asText(body.imageLicense);
  const now = new Date().toISOString();
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string').slice(0, 12)
    : [];

  let supabase;
  try {
    supabase = getAdmin();
  } catch {
    return json({ error: 'ingest_unconfigured' }, 500);
  }

  const duplicatePayload = (id: string, status: string) =>
    json({ ok: true, id, status, duplicate: true });

  if (sourceUrl) {
    const { data: existing, error: lookupError } = await supabase
      .from('articles')
      .select('id, status')
      .eq('source_url', sourceUrl)
      .maybeSingle();

    if (lookupError) {
      return json({ error: 'storage_failed', detail: lookupError.message }, 500);
    }
    if (existing) return duplicatePayload(existing.id, existing.status);
  }

  if (contentHash) {
    const { data: hashed, error: hashError } = await supabase
      .from('articles')
      .select('id, status')
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (hashError) {
      return json({ error: 'storage_failed', detail: hashError.message }, 500);
    }
    if (hashed) return duplicatePayload(hashed.id, hashed.status);
  }

  const aiScore = typeof body.aiScore === 'number' ? body.aiScore : Number(body.aiScore);
  const aiConfidence = Number.isFinite(aiScore) ? Math.max(0, Math.min(1, aiScore / 100)) : null;

  const { data, error } = await supabase
    .from('articles')
    .insert({
      title_bn: title.slice(0, 250),
      title_en: '',
      content_bn: content,
      content_en: '',
      excerpt_bn: excerpt.slice(0, 400),
      category,
      category_key: category,
      status: mapped.status,
      editorial_status: mapped.editorial_status,
      verification_status: 'pending',
      human_verified: false,
      source_type: 'syndicated',
      source_language: 'bn',
      source_name: sourceName,
      source_url: sourceUrl || null,
      canonical_url: sourceUrl || null,
      content_hash: contentHash || '',
      thumbnail_url: imageUrl,
      featured_image: imageUrl,
      image_alt_bn: asText(body.imageAlt).slice(0, 250),
      image_credit: imageCredit.slice(0, 250),
      media_type: imageUrl ? 'image' : 'none',
      ai_confidence: aiConfidence,
      ai_model: asText(body.rewriteMethod) === 'ai' ? 'chat' : '',
      fact_sources: sourceUrl
        ? [
            {
              name: 'worker',
              url: sourceUrl,
              type: 'publisher',
              checked_at: now,
              claim_scope: asText(body.aiSummary).slice(0, 500),
              tags,
              image_license: imageLicense,
              image_source: asText(body.imageSource),
            },
          ]
        : [],
      published_at: mapped.published_at,
      updated_at: now,
    })
    .select('id, status')
    .single();

  if (error) {
    if (isUniqueViolation(error.message)) {
      if (sourceUrl) {
        const { data: existing } = await supabase
          .from('articles')
          .select('id, status')
          .eq('source_url', sourceUrl)
          .maybeSingle();
        if (existing) return duplicatePayload(existing.id, existing.status);
      }
      if (contentHash) {
        const { data: hashed } = await supabase
          .from('articles')
          .select('id, status')
          .eq('content_hash', contentHash)
          .maybeSingle();
        if (hashed) return duplicatePayload(hashed.id, hashed.status);
      }
      return json({ ok: true, duplicate: true });
    }
    return json({ error: 'storage_failed', detail: error.message }, 500);
  }

  if (!data) return json({ error: 'storage_failed', detail: 'insert failed' }, 500);
  return json({ ok: true, id: data.id, status: data.status });
}
