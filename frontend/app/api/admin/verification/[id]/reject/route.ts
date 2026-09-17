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
  const reasons = body.reasons || [];
  const notes = body.notes || '';

  if (reasons.length === 0 && !notes) {
    return NextResponse.json({ error: 'Reasons or notes required' }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: queue } = await sb
    .from('verification_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (!queue) return NextResponse.json({ error: 'Queue not found' }, { status: 404 });

  const now = new Date().toISOString();

  await sb
    .from('verification_queue')
    .update({
      status: 'rejected',
      checked_at: now,
      checker_notes: notes,
      rejection_reasons: reasons,
    })
    .eq('id', id);

  if (queue.content_type === 'article') {
    await sb
      .from('articles')
      .update({
        verification_status: 'rejected',
        human_verified: false,
        verified_at: now,
        verification_notes: notes,
      })
      .eq('id', queue.content_id);
  }

  await sb.from('verification_audit').insert({
    queue_id: id,
    action: 'human_rejected',
    actor: (admin as any).id || 'admin',
    actor_type: 'human',
    details: { reasons, notes },
  });

  return NextResponse.json({ success: true, status: 'rejected' });
}
