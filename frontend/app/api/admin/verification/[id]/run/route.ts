import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Trigger AI verification on a queue entry
 * Note: This runs verification inline (may take 10-30s)
 * For production, use GitHub Actions dispatch for long-running
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Get queue + article
  const { data: queue } = await sb
    .from('verification_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (!queue) return NextResponse.json({ error: 'Queue not found' }, { status: 404 });

  // Update status to processing
  await sb.from('verification_queue').update({ status: 'ai_processing' }).eq('id', id);

  // Dispatch GitHub Actions (production) OR run inline (dev)
  if (process.env.GITHUB_DISPATCH_TOKEN) {
    // Production: trigger GitHub Actions
    const repo = 'banglarvoice33-byte/BANGLARVOICE-APPS';
    await fetch(`https://api.github.com/repos/${repo}/actions/workflows/verify-single.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { queue_id: id },
      }),
    });
    return NextResponse.json({
      success: true,
      message: 'Verification dispatched to GitHub Actions',
      queue_id: id,
    });
  }

  // Fallback: mark as queued for next batch
  return NextResponse.json({
    success: true,
    message: 'Queued for next batch verification',
    queue_id: id,
  });
}
