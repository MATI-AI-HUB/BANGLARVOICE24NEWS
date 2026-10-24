import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getVaultSecret(client: SupabaseClient, serviceName: string): Promise<string | null> {
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

function html(title: string, message: string, ok = false): Response {
  const color = ok ? '#16a34a' : '#b91c1c';
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:24px"><h1 style="color:${color}">${title}</h1><p>${message}</p><p><a href="/admin/control">Back to Control Center</a></p></body></html>`,
    { headers: { 'Content-Type': 'text/html' }, status: ok ? 200 : 400 },
  );
}

export async function GET(req: Request) {
  const client = supabaseAdmin();
  if (!client) return html('Configuration error', 'Supabase server configuration is unavailable.', false);

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  if (oauthError) return html('Google OAuth cancelled', 'No production credential was changed.', false);
  if (!code) return html('Missing authorization code', 'No production credential was changed.', false);

  const cookieStore = await cookies();
  const savedState = cookieStore.get('yt_oauth_state')?.value;
  if (!savedState || savedState !== state) return html('Invalid OAuth state', 'No production credential was changed.', false);

  const [clientId, clientSecret, expectedChannelId] = await Promise.all([
    getVaultSecret(client, 'OAUTH_CLIENT_ID'),
    getVaultSecret(client, 'OAUTH_CLIENT_SECRET'),
    getVaultSecret(client, 'YOUTUBE_CHANNEL_ID'),
  ]);
  if (!clientId || !clientSecret || !expectedChannelId) {
    return html('YouTube configuration incomplete', 'Required OAuth values are not available in Supabase Vault. No production credential was changed.', false);
  }

  // Use the exact callback origin that initiated OAuth; preview callbacks cannot
  // silently replace production credentials because the state cookie is scoped.
  const redirectUri = `${url.origin}/api/youtube/oauth-callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10000),
  });
  const tokens = (await tokenRes.json().catch(() => null)) as { access_token?: string; refresh_token?: string } | null;
  if (!tokenRes.ok || !tokens?.access_token || !tokens.refresh_token) {
    return html('Google token exchange failed', 'The existing production credential was preserved. Try OAuth consent again.', false);
  }

  // Verify the account before mutating Vault. This is the zero-downtime guard.
  const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(10000),
  });
  const channelBody = (await channelRes.json().catch(() => null)) as { items?: Array<{ id?: string }> } | null;
  const actualChannelId = channelBody?.items?.[0]?.id;
  if (!channelRes.ok || !actualChannelId || actualChannelId !== expectedChannelId) {
    return html('YouTube channel verification failed', 'The authorized Google account does not match the configured channel. The existing production credential was preserved.', false);
  }

  // Only after successful provider and identity verification do we rotate Vault.
  const { error: rpcError } = await client.rpc('create_api_key', {
    p_service_name: 'YOUTUBE_REFRESH_TOKEN',
    p_environment: 'prod',
    p_key_value: tokens.refresh_token,
  });
  if (rpcError) return html('Vault save failed', 'The existing production credential was preserved. No publishing state was changed.', false);

  await client
    .from('social_platforms')
    .update({ names_verified: true, updated_at: new Date().toISOString() })
    .eq('platform', 'youtube');

  return html('YouTube reconnected successfully', 'The verified refresh credential was stored in Supabase Vault. YouTube readiness was restored without changing news or Facebook automation.', true);
}
