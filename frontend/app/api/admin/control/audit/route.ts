import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { listAudit } from '@/lib/control/audit-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    const rows = await listAudit(limit);
    return NextResponse.json({ entries: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
