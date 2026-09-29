import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  extractProvidedKey,
  ingestConfigured,
  ingestExpectedKey,
  ingestKeyOk,
} from '../../../../lib/ingest-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
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
  revalidatePath('/');
  revalidatePath('/api/public/feed.json');
  revalidatePath('/api/health');
  return json({ ok: true, revalidated: true });
}
