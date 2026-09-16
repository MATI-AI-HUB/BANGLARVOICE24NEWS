import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const clientId = process.env.OAUTH_CLIENT_ID;
    if (!clientId) {
      console.error('[oauth-start] OAUTH_CLIENT_ID is not set in environment variables.');
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
