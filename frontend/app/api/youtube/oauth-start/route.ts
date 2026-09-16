import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'OAUTH_CLIENT_ID missing in env' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  (await cookies()).set('yt_oauth_state', state, {
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
}
