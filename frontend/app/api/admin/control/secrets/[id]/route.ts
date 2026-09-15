import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { deleteSecret } from '@/lib/control/vault-service';
import { logAction } from '@/lib/control/audit-service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const result = await deleteSecret(id);
    await logAction({
      actor_id: admin.id,
      actor_email: admin.email,
      action: 'secret.delete',
      target: result.deleted,
    });
    return NextResponse.json(
      { ok: true, deleted: result.deleted },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
