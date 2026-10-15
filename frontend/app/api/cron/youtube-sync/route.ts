import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?playlist_id=UUH2pdJM-Rsv51WOtcfDcLQA';
const CHANNEL_ID = 'UCH2pdJM-Rsv51WOtcfDcLQA';
const UPLOADS_URL = 'https://www.youtube.com/playlist?list=UUH2pdJM-Rsv51WOtcfDcLQA';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authorized(request: Request): Promise<boolean> {
  const client = admin();
  const { data: row } = await client.from('api_vault').select('key_encrypted').eq('service_name', 'NEWSROOM_INGEST_KEY').eq('environment', 'prod').eq('is_active', true).maybeSingle();
  if (!row?.key_encrypted) return false;
  const { data: secret } = await client.rpc('decrypt_vault_secret', { p_secret_id: row.key_encrypted });
  if (typeof secret !== 'string' || !secret) return false;
  const supplied = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  return supplied === secret;
}

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function tag(entry: string, name: string): string {
  const match = entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return decodeXml(match?.[1] || '');
}

function attr(entry: string, name: string, attribute: string): string {
  const match = entry.match(new RegExp(`<${name}[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`));
  return decodeXml(match?.[1] || '');
}

function category(title: string): string {
  const text = title.toLowerCase();
  if (/খেলা|ক্রিকেট|sport/.test(text)) return 'sports';
  if (/রাজনীতি|নির্বাচন|politics|bnp/.test(text)) return 'politics';
  if (/বিনোদন|entertainment|গল্প/.test(text)) return 'entertainment';
  if (/অর্থনীতি|বাজার|economy/.test(text)) return 'economy';
  return 'national';
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const xml = await (await fetch(FEED_URL, { signal: AbortSignal.timeout(20000) })).text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
    if (!entries.length) return NextResponse.json({ ok: false, error: 'youtube_feed_empty' }, { status: 503 });

    const rows = [];
    for (const entry of entries) {
      const youtubeId = tag(entry, 'yt:videoId');
      const title = tag(entry, 'title');
      const publishedAt = tag(entry, 'published');
      if (!youtubeId || !title || !publishedAt) continue;
      let embeddable = false;
      try {
        const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}&format=json`, { signal: AbortSignal.timeout(10000) });
        embeddable = oembed.ok;
      } catch {
        embeddable = false;
      }
      if (!embeddable) continue;
      rows.push({
        title_bn: title,
        title_en: '',
        description_bn: '',
        category_key: category(title),
        thumbnail_url: attr(entry, 'media:thumbnail', 'url') || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        video_url: `https://www.youtube.com/watch?v=${youtubeId}`,
        embed_url: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
        youtube_id: youtubeId,
        channel_id: CHANNEL_ID,
        source_url: UPLOADS_URL,
        duration_sec: null,
        is_live: false,
        view_count: 0,
        status: 'needs_enrichment',
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      });
    }
    if (!rows.length) return NextResponse.json({ ok: false, error: 'youtube_feed_not_embeddable' }, { status: 503 });

    const { error } = await admin().from('videos').upsert(rows, { onConflict: 'youtube_id' });
    if (error) return NextResponse.json({ ok: false, error: 'youtube_sync_database_error', synced_count: 0 }, { status: 500 });
    return NextResponse.json({ ok: true, source: 'youtube_atom_feed', fetched_count: entries.length, synced_count: rows.length, duration_enrichment: 'pending', channel_id: CHANNEL_ID });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'youtube_sync_failed' }, { status: 500 });
  }
}
