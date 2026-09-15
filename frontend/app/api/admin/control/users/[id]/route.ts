import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { updateUserRole, updateUserVerified, deleteUser } from '@/lib/control/user-service';
import { logAction } from '@/lib/control/audit-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.role) {
      await updateUserRole(id, body.role);
      await logAction({
        actor_id: admin.id,
        actor_email: admin.email,
        action: 'user.role_change',
        target: id,
        metadata: { role: body.role },
      });
    }
    if (typeof body.verified === 'boolean') {
      await updateUserVerified(id, body.verified);
      await logAction({
        actor_id: admin.id,
        actor_email: admin.email,
        action: 'user.verify_change',
        target: id,
        metadata: { verified: body.verified },
      });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    if (id === admin.id) {
      return NextResponse.json({ error: 'cannot delete self' }, { status: 400 });
    }
    await deleteUser(id);
    await logAction({
      actor_id: admin.id,
      actor_email: admin.email,
      action: 'user.delete',
      target: id,
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
