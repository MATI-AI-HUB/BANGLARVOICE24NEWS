import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * Set locale cookie + redirect back
 * POST form submission — no JS required
 */
export async function POST(req: Request) {
  const formData = await req.formData();
  const localeRaw = formData.get('locale');
  const locale = typeof localeRaw === 'string' ? localeRaw : '';

  // Referer for redirect back
  const referer = req.headers.get('referer') || '/';
  // Strip any existing _lang param
  const cleanReferer = referer.replace(/[?&]_lang=[a-z]{2}/g, '').replace(/[?&]_t=\d+/g, '');
  const finalUrl = cleanReferer || '/';

  if (!isLocale(locale)) {
    return NextResponse.redirect(finalUrl, { status: 303 });
  }

  const response = NextResponse.redirect(finalUrl, { status: 303 });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
    secure: true,
  });

  return response;
}

// Also support GET for testing
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get('locale') || 'bn';

  if (!isLocale(locale)) {
    return NextResponse.redirect('/', { status: 303 });
  }

  const response = NextResponse.redirect('/', { status: 303 });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
    secure: true,
  });

  return response;
}
