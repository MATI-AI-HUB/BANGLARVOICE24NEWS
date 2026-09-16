import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return new Response(`OAuth error: ${oauthError}`, { status: 400 });
  }
  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('yt_oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return new Response('Invalid CSRF state', { status: 400 });
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing OAUTH_CLIENT_ID or SECRET', { status: 500 });
  }

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
  });

  const tokens: any = await tokenRes.json();

  if (!tokens.refresh_token) {
    return new Response(
      `No refresh_token in response:\n${JSON.stringify(tokens, null, 2)}`,
      { status: 500, headers: { 'Content-Type': 'text/plain' } }
    );
  }

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

  if (rpcErr) {
    return new Response(`Vault save failed: ${rpcErr.message}`, { status: 500 });
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Token Saved</title></head>
    <body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 24px;">
      <h1 style="color: #16a34a;">✅ YouTube Refresh Token Saved!</h1>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Length</b></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${tokens.refresh_token.length} chars</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Prefix</b></td>
            <td style="padding: 8px; border: 1px solid #ddd;"><code>${tokens.refresh_token.slice(0, 18)}...</code></td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Scope</b></td>
            <td style="padding: 8px; border: 1px solid #ddd;"><code>${tokens.scope || 'N/A'}</code></td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Stored in</b></td>
            <td style="padding: 8px; border: 1px solid #ddd;">Supabase Vault <code>api_vault</code> table</td></tr>
      </table>
      <p style="margin-top: 30px;">
        <a href="/admin/control" style="background: #CC0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">← Back to Control Center</a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Token is now persistent. Local sync: <code>node pull-vault.js --write</code>
      </p>
    </body>
    </html>
  `;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
