import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  aiScore?: unknown;
  aiSummary?: unknown;
  sourceUrl?: unknown;
  sourceCategory?: unknown;
  status?: unknown;
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

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function ingestKeyOk(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(digest(provided), digest(expected));
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

export async function GET() {
  return json({
    service: 'banglar-voice-newsroom-ingest',
    method: 'POST',
    auth: 'x-ingest-key header',
  });
}

export async function POST(req: Request) {
  const expected = (process.env.NEWSROOM_INGEST_KEY || '').trim();
  if (!expected || expected === 'change-me') {
    return json({ error: 'ingest_disabled' }, 503);
  }

  const provided = req.headers.get('x-ingest-key') || '';
  if (!ingestKeyOk(provided, expected)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const title = asText(body.title);
  const content = asText(body.content);
  if (title.length < 5) return json({ error: 'title_required' }, 400);
  if (content.length < 40) return json({ error: 'content_required' }, 400);

  const sourceUrl = asText(body.sourceUrl);
  const excerpt = asText(body.excerpt) || content.slice(0, 160);
  const category = mapCategory(asText(body.sourceCategory));
  const mapped = mapStatus(asText(body.status));
  const imageUrl = asText(body.imageUrl);
  const now = new Date().toISOString();
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string').slice(0, 12)
    : [];

  let supabase;
  try {
    supabase = getAdmin();
  } catch {
    return json({ error: 'ingest_disabled' }, 503);
  }

  if (sourceUrl) {
    const { data: existing, error: lookupError } = await supabase
      .from('articles')
      .select('id, status')
      .eq('source_url', sourceUrl)
      .maybeSingle();

    if (lookupError) {
      return json({ error: 'storage_failed', detail: lookupError.message }, 500);
    }
    if (existing) {
      return json({
        ok: true,
        id: existing.id,
        status: existing.status,
        duplicate: true,
      });
    }
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
      source_name: '',
      source_url: sourceUrl || null,
      canonical_url: sourceUrl || null,
      thumbnail_url: imageUrl,
      featured_image: imageUrl,
      image_alt_bn: asText(body.imageAlt).slice(0, 250),
      media_type: imageUrl ? 'image' : 'none',
      ai_confidence: aiConfidence,
      fact_sources: sourceUrl
        ? [
            {
              name: 'worker',
              url: sourceUrl,
              type: 'publisher',
              checked_at: now,
              claim_scope: asText(body.aiSummary).slice(0, 500),
              tags,
            },
          ]
        : [],
      published_at: mapped.published_at,
      updated_at: now,
    })
    .select('id, status')
    .single();

  if (error || !data) {
    return json({ error: 'storage_failed', detail: error?.message || 'insert failed' }, 500);
  }

  return json({ ok: true, id: data.id, status: data.status });
}
