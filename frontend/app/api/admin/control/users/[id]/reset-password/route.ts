import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { listUsers, sendPasswordReset } from '@/lib/control/user-service';
import { logAction } from '@/lib/control/audit-service';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const users = await listUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });
    if (!user.email) return NextResponse.json({ error: 'user has no email' }, { status: 400 });

    await sendPasswordReset(user.email);
    await logAction({
      actor_id: admin.id,
      actor_email: admin.email,
      action: 'user.password_reset',
      target: user.email,
    });
    return NextResponse.json(
      { ok: true, message: `Reset link sent to ${user.email}` },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
