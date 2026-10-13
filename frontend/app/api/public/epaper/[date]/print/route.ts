import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(_request: Request, context: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await context.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new NextResponse('invalid date', { status: 400 });
    }
    const { data, error } = await db()
      .from('epaper_editions')
      .select('html,title,edition_date')
      .eq('edition_date', date)
      .maybeSingle();
    if (error) throw error;
    if (!data?.html) return new NextResponse('edition not found', { status: 404 });
    const printable = String(data.html).includes('@media print')
      ? String(data.html)
      : String(data.html).replace(
          '</head>',
          '<style>@media print{body{background:#fff}a{color:inherit;text-decoration:none}}</style></head>',
        );
    return new NextResponse(printable, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': `inline; filename="banglar-voice-epaper-${date}.html"`,
      },
    });
  } catch {
    return new NextResponse('epaper unavailable', { status: 503 });
  }
}
