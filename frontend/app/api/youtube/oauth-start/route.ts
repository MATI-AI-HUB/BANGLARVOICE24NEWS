import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getVaultSecret(serviceName: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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

export async function GET(req: Request) {
  try {
    const clientId = await getVaultSecret('OAUTH_CLIENT_ID');
    if (!clientId) {
      console.error('[oauth-start] OAUTH_CLIENT_ID is not configured in Vault.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const cookieStore = await cookies(); // Next.js 15: cookies() is async
    cookieStore.set('yt_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    const redirectUri = `${new URL(req.url).origin}/api/youtube/oauth-callback`;
    const scope = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return NextResponse.redirect(
      'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString()
    );
  } catch (error) {
    console.error('[oauth-start] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
