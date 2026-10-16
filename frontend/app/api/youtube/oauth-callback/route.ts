import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getVaultSecret(serviceName: string): Promise<string | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: row } = await sb
    .from('api_vault')
    .select('key_encrypted')
    .eq('service_name', serviceName)
    .eq('environment', 'prod')
    .eq('is_active', true)
    .maybeSingle();

  if (!row?.key_encrypted) return null;

  const { data: decrypted } = await sb.rpc('decrypt_vault_secret', {
    p_secret_id: row.key_encrypted,
  });

  return (decrypted as string) || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return new Response(`OAuth error: ${oauthError}`, { status: 400 });
  if (!code) return new Response('Missing authorization code', { status: 400 });

  const cookieStore = await cookies();
  const savedState = cookieStore.get('yt_oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return new Response('Invalid CSRF state', { status: 400 });
  }

  const clientId = await getVaultSecret('OAUTH_CLIENT_ID');
  const clientSecret = await getVaultSecret('OAUTH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return new Response(
      `Missing: ${!clientId ? 'OAUTH_CLIENT_ID ' : ''}${!clientSecret ? 'OAUTH_CLIENT_SECRET' : ''}`,
      { status: 500 }
    );
  }

  const redirectUri = `${url.origin}/api/youtube/oauth-callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });

  const tokens: any = await tokenRes.json();

  if (!tokens.refresh_token) {
    return new Response(
      'OAuth token exchange did not return a refresh token',
      { status: 500, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // Save to vault
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  await sb.rpc('delete_api_key', {
    p_service_name: 'YOUTUBE_REFRESH_TOKEN',
    p_environment: 'prod',
  });

  const { error: rpcErr } = await sb.rpc('create_api_key', {
    p_service_name: 'YOUTUBE_REFRESH_TOKEN',
    p_environment: 'prod',
    p_key_value: tokens.refresh_token,
  });

  if (rpcErr) return new Response(`Vault save failed: ${rpcErr.message}`, { status: 500 });

  const html = `<!DOCTYPE html><html><body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 24px;"><h1 style="color: #16a34a;">YouTube refresh authorization saved</h1><p>The refresh credential was stored server-side in the API Vault. No credential value or derived token metadata is displayed.</p><p style="margin-top: 30px;"><a href="/admin/control" style="background: #CC0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Back to Control Center</a></p></body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
