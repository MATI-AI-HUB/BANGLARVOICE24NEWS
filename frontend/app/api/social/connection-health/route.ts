import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Check = { connected: boolean; reason?: string };

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type YouTubeChannelsResponse = {
  items?: Array<{ id?: string }>;
  error?: { message?: string };
};

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function vaultSecret(client: SupabaseClient, serviceName: string): Promise<string | null> {
  const { data: row } = await client
    .from('api_vault')
    .select('key_encrypted')
    .eq('service_name', serviceName)
    .eq('environment', 'prod')
    .eq('is_active', true)
    .maybeSingle();
  if (!row?.key_encrypted) return null;
  const { data: secret } = await client.rpc('decrypt_vault_secret', { p_secret_id: row.key_encrypted });
  return typeof secret === 'string' && secret.length > 0 ? secret : null;
}

async function authorized(request: Request, client: SupabaseClient): Promise<boolean> {
  const secret = await vaultSecret(client, 'NEWSROOM_INGEST_KEY');
  const supplied = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  return Boolean(secret && supplied === secret);
}

async function checkX(client: SupabaseClient): Promise<Check> {
  const token = await vaultSecret(client, 'SOCIAL_X_ACCESS_TOKEN');
  if (!token) return { connected: false, reason: 'missing_vault_mapping' };
  try {
    const response = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { connected: false, reason: `x_api_http_${response.status}` };
    const body = (await response.json().catch(() => null)) as { data?: { id?: string } } | null;
    return body?.data?.id ? { connected: true } : { connected: false, reason: 'x_api_missing_identity' };
  } catch {
    return { connected: false, reason: 'x_api_unreachable' };
  }
}

async function checkYouTube(client: SupabaseClient): Promise<Check> {
  const [clientId, clientSecret, refreshToken, expectedChannelId] = await Promise.all([
    vaultSecret(client, 'OAUTH_CLIENT_ID'),
    vaultSecret(client, 'OAUTH_CLIENT_SECRET'),
    vaultSecret(client, 'YOUTUBE_REFRESH_TOKEN'),
    vaultSecret(client, 'YOUTUBE_CHANNEL_ID'),
  ]);
  if (!clientId || !clientSecret || !refreshToken || !expectedChannelId) {
    return { connected: false, reason: 'missing_vault_mapping' };
  }

  try {
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
    });
    const tokenBody = (await tokenResponse.json().catch(() => null)) as GoogleTokenResponse | null;
    if (!tokenResponse.ok || !tokenBody?.access_token) return { connected: false, reason: 'youtube_token_refresh_failed' };

    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`,
      { headers: { Authorization: `Bearer ${tokenBody.access_token}` }, signal: AbortSignal.timeout(8000) },
    );
    const channelBody = (await channelResponse.json().catch(() => null)) as YouTubeChannelsResponse | null;
    const actualChannelId = channelBody?.items?.[0]?.id;
    if (!channelResponse.ok || !actualChannelId) return { connected: false, reason: 'youtube_channel_lookup_failed' };
    return actualChannelId === expectedChannelId
      ? { connected: true }
      : { connected: false, reason: 'youtube_channel_mismatch' };
  } catch {
    return { connected: false, reason: 'youtube_api_unreachable' };
  }
}

export async function GET(request: Request) {
  const client = admin();
  if (!client) return NextResponse.json({ error: 'server_configuration_error' }, { status: 500 });
  if (!(await authorized(request, client))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [x, youtube] = await Promise.all([checkX(client), checkYouTube(client)]);
  return NextResponse.json({
    ok: x.connected && youtube.connected,
    x,
    youtube,
    side_effects: 'read_only',
  });
}
