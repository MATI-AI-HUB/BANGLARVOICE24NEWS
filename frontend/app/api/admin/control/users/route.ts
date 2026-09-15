import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { listUsers } from '@/lib/control/user-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const users = await listUsers();
    return NextResponse.json({ items: users }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
