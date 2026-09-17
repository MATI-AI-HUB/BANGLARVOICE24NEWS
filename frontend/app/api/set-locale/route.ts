import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOCALE_COOKIE = 'bv_locale';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get('locale') || 'bn';
  const valid = locale === 'bn' || locale === 'en';
  const setLocale = valid ? locale : 'bn';

  const response = NextResponse.redirect(new URL('/', req.url), { status: 303 });
  response.cookies.set(LOCALE_COOKIE, setLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const locale = String(formData.get('locale') || '');
  const valid = locale === 'bn' || locale === 'en';

  const referer = req.headers.get('referer') || '/';
  const response = NextResponse.redirect(referer, { status: 303 });
  if (valid) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return response;
}
