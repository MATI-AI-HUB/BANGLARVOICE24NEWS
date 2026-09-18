import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOCALE_COOKIE = 'bv_locale';

/**
 * Safely resolve where to send the user after locale switch.
 * Falls back to the current request origin if referer is missing/invalid.
 */
function resolveRedirectTarget(req: Request): URL {
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const parsed = new URL(referer);
      // Only allow same-origin redirects (security: prevent open redirect)
      const reqOrigin = new URL(req.url).origin;
      if (parsed.origin === reqOrigin) return parsed;
    } catch {
      // fallthrough
    }
  }
  return new URL('/', req.url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get('locale') || 'bn';
  const setLocale = locale === 'en' ? 'en' : 'bn';

  const response = NextResponse.redirect(new URL('/', req.url), { status: 303 });
  response.cookies.set(LOCALE_COOKIE, setLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false, // read by client if needed
  });
  return response;
}

export async function POST(req: Request) {
  let locale = '';
  try {
    const formData = await req.formData();
    locale = String(formData.get('locale') || '').trim();
  } catch {
    locale = '';
  }
  const valid = locale === 'bn' || locale === 'en';

  const response = NextResponse.redirect(resolveRedirectTarget(req), { status: 303 });
  if (valid) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    });
  }
  return response;
}
