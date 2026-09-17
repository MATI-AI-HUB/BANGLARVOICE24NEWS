import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const notes = body.notes || '';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Get queue entry
  const { data: queue } = await sb
    .from('verification_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (!queue) {
    return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Update queue
  const { error: qErr } = await sb
    .from('verification_queue')
    .update({
      status: 'approved',
      checked_at: now,
      checker_notes: notes,
      human_override: queue.ai_consensus_verdict !== 'auto_approve',
    })
    .eq('id', id);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // Update article
  if (queue.content_type === 'article') {
    await sb
      .from('articles')
      .update({
        verification_status: 'verified',
        human_verified: true,
        verified_at: now,
        verification_notes: notes,
      })
      .eq('id', queue.content_id);
  }

  // Audit
  await sb.from('verification_audit').insert({
    queue_id: id,
    action: 'human_approved',
    actor: (admin as any).id || 'admin',
    actor_type: 'human',
    details: { notes, override: queue.ai_consensus_verdict !== 'auto_approve' },
  });

  return NextResponse.json({ success: true, status: 'approved' });
}
