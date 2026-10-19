'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/require-admin';
import { createClient } from '@/lib/supabase/server';

function parseCommentId(formData: FormData): string {
  const id = String(formData.get('id') || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid comment ID');
  }
  return id;
}

export async function moderateArticleComment(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error('Unauthorized');

  const id = parseCommentId(formData);
  const status = String(formData.get('status') || '');
  if (status !== 'approved' && status !== 'rejected') {
    throw new Error('Invalid moderation status');
  }

  const supabase = await createClient();
  // The database trigger, not client input, records the moderator and timestamp.
  const { data, error } = await supabase
    .from('article_comments')
    .update({ status })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !data) throw new Error('Comment moderation failed or the comment is no longer pending');

  revalidatePath('/admin/comments');
}

export async function deletePendingArticleComment(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error('Unauthorized');

  const id = parseCommentId(formData);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('article_comments')
    .delete()
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !data) throw new Error('Comment deletion failed or the comment is no longer pending');

  revalidatePath('/admin/comments');
}
