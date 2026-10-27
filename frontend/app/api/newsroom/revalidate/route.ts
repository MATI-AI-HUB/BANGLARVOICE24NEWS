import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { categorySlug, isKnownCategorySlug } from '../../../../lib/category';
import {
  extractProvidedKey,
  ingestConfigured,
  ingestExpectedKey,
  ingestKeyOk,
} from '../../../../lib/ingest-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_WEBHOOK_BYTES = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function articlePathSegment(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim();
  if (!slug || slug.length > 200 || /[\\/?#\u0000-\u001f]/u.test(slug)) return null;
  return encodeURIComponent(slug);
}

function categoryPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const slug = categorySlug(value);
  return isKnownCategorySlug(slug) ? `/category/${slug}` : null;
}

export async function POST(req: Request) {
  if (!ingestConfigured()) {
    return json({ error: 'ingest_unconfigured' }, 500);
  }
  const provided = extractProvidedKey(req);
  if (!ingestKeyOk(provided, ingestExpectedKey())) {
    return json({ error: 'unauthorized' }, 401);
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
    return json({ error: 'payload_too_large' }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) return json({ error: 'invalid_payload' }, 400);
    payload = parsed;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const record = isRecord(payload.record) ? payload.record : payload;
  const oldRecord = isRecord(payload.old_record) ? payload.old_record : null;
  const newStatus = typeof record.status === 'string' ? record.status : null;
  const oldStatus = typeof oldRecord?.status === 'string' ? oldRecord.status : null;
  const eventType = typeof payload.type === 'string' ? payload.type.toUpperCase() : '';
  const isPublished = newStatus === 'published';
  const wasPublished = oldStatus === 'published';
  const isRemoval = wasPublished && (eventType === 'DELETE' || (newStatus !== null && newStatus !== 'published'));

  if (!isPublished && !isRemoval) {
    if (newStatus && ['draft', 'pending', 'submitted', 'rejected', 'archived'].includes(newStatus)) {
      return json({ ok: true, skipped: true, reason: 'article_not_published' });
    }
    return json({ error: 'published_status_required' }, 400);
  }

  const records = [record, oldRecord].filter((value): value is Record<string, unknown> => Boolean(value));
  const articleSegments = new Set<string>();
  for (const item of records) {
    const slug = articlePathSegment(item.slug);
    if (slug) articleSegments.add(slug);
    if (typeof item.id === 'string' && UUID_RE.test(item.id)) articleSegments.add(item.id);
  }
  if (!articleSegments.size) {
    return json({ error: 'article_identifier_required' }, 400);
  }

  const paths = new Set<string>(['/', '/api/public/feed.json']);
  for (const segment of articleSegments) paths.add(`/article/${segment}`);
  for (const item of records) {
    const category = categoryPath(item.category_key) || categoryPath(item.category);
    if (category) paths.add(category);
  }

  for (const path of paths) revalidatePath(path);
  revalidateTag('articles');

  return json({
    ok: true,
    revalidated: [...paths, 'tag:articles'],
    event: isPublished ? 'published' : 'unpublished',
  });
}
