import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

function requestLocale(request: Request): 'bn' | 'en' {
  const pair = (request.headers.get('cookie') || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('bv_locale='));
  if (!pair) return 'bn';
  try {
    return decodeURIComponent(pair.slice('bv_locale='.length)) === 'en' ? 'en' : 'bn';
  } catch {
    return 'bn';
  }
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const rawEmail = typeof body === 'object' && body !== null && 'email' in body
    ? (body as { email?: unknown }).email
    : undefined;
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'invalid_email' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: 'newsletter_unavailable' }, { status: 503 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc('subscribe_and_queue_newsletter', {
      p_email: parsed.data,
    });
    if (error || !data?.success) {
      console.error('[newsletter.subscribe] queue operation failed', error?.code || 'unknown');
      return NextResponse.json({ success: false, error: 'newsletter_unavailable' }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      queued: Boolean(data.queued),
      message: requestLocale(request) === 'en'
        ? 'Thank you! Your email has been registered.'
        : 'ধন্যবাদ! আপনার ইমেইল সফলভাবে নিবন্ধিত হয়েছে।',
    }, { status: 202 });
  } catch {
    return NextResponse.json({ success: false, error: 'newsletter_unavailable' }, { status: 503 });
  }
}
