import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
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

  // Queue entry
  const { data: queue, error: qErr } = await sb
    .from('verification_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (qErr || !queue) {
    return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
  }

  // AI verifications
  const { data: verifications } = await sb
    .from('ai_verifications')
    .select('*')
    .eq('queue_id', id)
    .order('agent_name');

  // Article detail
  let article: any = null;
  if (queue.content_type === 'article') {
    const { data } = await sb
      .from('articles')
      .select('*')
      .eq('id', queue.content_id)
      .single();
    article = data;
  }

  // Audit log
  const { data: audit } = await sb
    .from('verification_audit')
    .select('*')
    .eq('queue_id', id)
    .order('created_at');

  return NextResponse.json({
    queue,
    verifications: verifications || [],
    article,
    audit: audit || [],
  });
}
