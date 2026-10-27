import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { findEligibleBroadcast, type LiveBroadcast } from '../../../../lib/youtube-live';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

type VideoRow = {
  id: string;
  title_bn: string;
  title_en: string | null;
  thumbnail_url: string | null;
  youtube_id: string | null;
  embed_url: string | null;
  published_at: string | null;
};

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getVaultSecret(client: SupabaseClient, serviceName: string): Promise<string | null> {
  const { data: row, error: lookupError } = await client
    .from('api_vault')
    .select('key_encrypted')
    .eq('service_name', serviceName)
    .eq('environment', 'prod')
    .eq('is_active', true)
    .maybeSingle();
  if (lookupError || !row?.key_encrypted) return null;
  const { data: secret, error: decryptError } = await client.rpc('decrypt_vault_secret', {
    p_secret_id: row.key_encrypted,
  });
  return !decryptError && typeof secret === 'string' && secret.length > 0 ? secret : null;
}

async function latestPublished(client: SupabaseClient): Promise<VideoRow | null> {
  const { data, error } = await client
    .from('videos')
    .select('id,title_bn,title_en,thumbnail_url,youtube_id,embed_url,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return error || !data ? null : (data as VideoRow);
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}

export async function GET() {
  const client = admin();
  if (!client) return response({ isLive: false, video: null, fallback: null, error: 'unavailable' }, 503);

  try {
    const [clientId, clientSecret, refreshToken, expectedChannelId] = await Promise.all([
      getVaultSecret(client, 'OAUTH_CLIENT_ID'),
      getVaultSecret(client, 'OAUTH_CLIENT_SECRET'),
      getVaultSecret(client, 'YOUTUBE_REFRESH_TOKEN'),
      getVaultSecret(client, 'YOUTUBE_CHANNEL_ID'),
    ]);

    if (clientId && clientSecret && refreshToken && expectedChannelId) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      const tokenBody = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null;

      if (tokenResponse.ok && tokenBody?.access_token) {
        const params = new URLSearchParams({
          part: 'id,snippet,status,contentDetails',
          broadcastStatus: 'active',
          mine: 'true',
          maxResults: '5',
        });
        const liveResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/liveBroadcasts?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${tokenBody.access_token}` },
            signal: AbortSignal.timeout(8000),
            cache: 'no-store',
          },
        );
        const liveBody = (await liveResponse.json().catch(() => null)) as { items?: LiveBroadcast[] } | null;
        const broadcast = liveResponse.ok
          ? findEligibleBroadcast(liveBody?.items, expectedChannelId)
          : undefined;

        if (broadcast?.id) {
          return response({
            isLive: true,
            video: {
              id: `youtube-live-${broadcast.id}`,
              youtube_id: broadcast.id,
              title_bn: broadcast.snippet?.title || 'লাইভ সম্প্রচার',
              title_en: broadcast.snippet?.title || '',
              is_live: true,
              status: 'live',
            },
            fallback: null,
          });
        }
      }
    }

    const fallback = await latestPublished(client);
    return response({ isLive: false, video: null, fallback });
  } catch (error) {
    console.error('[youtube-live] Live lookup failed; using published-video fallback.', error);
    const fallback = await latestPublished(client).catch(() => null);
    return response({ isLive: false, video: null, fallback });
  }
}
