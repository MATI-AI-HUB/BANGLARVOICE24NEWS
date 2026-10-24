import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { evaluateYouTubePublishGate } from '../../../../lib/youtube-contract';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?playlist_id=UUH2pdJM-Rsv51WOtcfDcLQA';
const CHANNEL_ID = 'UCH2pdJM-Rsv51WOtcfDcLQA';
const UPLOADS_URL = 'https://www.youtube.com/playlist?list=UUH2pdJM-Rsv51WOtcfDcLQA';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
// The scheduler runs once per day. Keep the public video volume bounded so
// monetization review and social distribution remain manageable.
const DAILY_VIDEO_CAP = 6;
const INSTRUCTION_RE = /(?:ignore\s+(?:all\s+)?previous|system\s+prompt|developer\s+message|reveal\s+(?:the\s+)?secret|execute\s+(?:this|the)\s+command|run\s+(?:this|the)\s+command|do\s+not\s+follow|override\s+(?:the\s+)?instructions)/i;

type VideoInventoryRow = {
  title_bn: string;
  title_en: string;
  description_bn: string;
  category_key: string;
  thumbnail_url: string;
  video_url: string;
  embed_url: string;
  youtube_id: string;
  channel_id: string;
  source_url: string;
  duration_sec: number | null;
  is_live: boolean;
  view_count: number;
  status: 'published' | 'quarantined';
  audit_reason: string | null;
  published_at: string;
  updated_at: string;
};

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

function plainText(value: string, maxLength: number): string {
  return decodeXml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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

    const rows: VideoInventoryRow[] = [];
    const entriesToProcess = entries.slice(0, DAILY_VIDEO_CAP);
    for (const entry of entriesToProcess) {
      const youtubeId = tag(entry, 'yt:videoId');
      if (!VIDEO_ID_RE.test(youtubeId)) continue;
      const title = plainText(tag(entry, 'title'), 200);
      const publishedAt = tag(entry, 'published');
      if (!youtubeId || !title || !publishedAt) continue;
      const quarantineReason = INSTRUCTION_RE.test(title) ? 'feed_title_instruction_like_content' : null;
      if (quarantineReason) {
        rows.push({
          title_bn: title,
          title_en: '',
          description_bn: '',
          category_key: 'national',
          thumbnail_url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
          video_url: `https://www.youtube.com/watch?v=${youtubeId}`,
          embed_url: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
          youtube_id: youtubeId,
          channel_id: CHANNEL_ID,
          source_url: UPLOADS_URL,
          duration_sec: null,
          is_live: false,
          view_count: 0,
          status: 'quarantined',
          audit_reason: quarantineReason,
          published_at: publishedAt,
          updated_at: new Date().toISOString(),
        });
        continue;
      }
      let embeddable = false;
      try {
        const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}&format=json`, { signal: AbortSignal.timeout(10000) });
        embeddable = oembed.ok;
      } catch {
        embeddable = false;
      }
      let thumbnailReachable = false;
      const thumbnailUrl = attr(entry, 'media:thumbnail', 'url') || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
      try {
        const thumbnail = await fetch(thumbnailUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
        thumbnailReachable = thumbnail.ok;
      } catch {
        thumbnailReachable = false;
      }
      const gate = evaluateYouTubePublishGate({
        videoId: youtubeId,
        title,
        channelId: CHANNEL_ID,
        expectedChannelId: CHANNEL_ID,
        embeddable,
        thumbnailReachable,
      });
      rows.push({
        title_bn: title,
        title_en: '',
        description_bn: '',
        category_key: category(title),
        thumbnail_url: thumbnailUrl,
        video_url: `https://www.youtube.com/watch?v=${youtubeId}`,
        embed_url: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
        youtube_id: youtubeId,
        channel_id: CHANNEL_ID,
        source_url: UPLOADS_URL,
        duration_sec: null,
        is_live: false,
        view_count: 0,
        status: gate.publishable ? 'published' : 'quarantined',
        audit_reason: gate.reason,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      });
    }
    if (!rows.length) return NextResponse.json({ ok: false, error: 'youtube_feed_not_embeddable' }, { status: 503 });

    const client = admin();
    let inserted_count = 0;
    let updated_count = 0;
    for (const row of rows) {
      const { data: existing, error: lookupError } = await client
        .from('videos')
        .select('id')
        .eq('youtube_id', row.youtube_id)
        .maybeSingle();
      if (lookupError) return NextResponse.json({ ok: false, error: 'youtube_sync_database_error', synced_count: 0 }, { status: 500 });
      if (existing?.id) {
        const { error } = await client.from('videos').update(row).eq('id', existing.id);
        if (error) return NextResponse.json({ ok: false, error: 'youtube_sync_database_error', synced_count: 0 }, { status: 500 });
        updated_count += 1;
      } else {
        const { error } = await client.from('videos').insert(row);
        if (error) return NextResponse.json({ ok: false, error: 'youtube_sync_database_error', synced_count: 0 }, { status: 500 });
        inserted_count += 1;
      }
    }
    return NextResponse.json({ ok: true, source: 'youtube_atom_feed', daily_cap: DAILY_VIDEO_CAP, fetched_count: entries.length, processed_count: entriesToProcess.length, synced_count: rows.length, inserted_count, updated_count, published_count: rows.filter((row) => row.status === 'published').length, quarantined_count: rows.filter((row) => row.status === 'quarantined').length, duration_enrichment: 'pending', channel_id: CHANNEL_ID });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'youtube_sync_failed' }, { status: 500 });
  }
}
