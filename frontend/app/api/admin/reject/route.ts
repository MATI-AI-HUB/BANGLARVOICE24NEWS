import { NextResponse } from 'next/server';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
export const revalidate = 0;
export async function POST(req: Request) {
  try {
    const { id, reason } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/api/newsroom/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'rejected', reason }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {}
    }
    return NextResponse.json({ ok: true, id, status: 'rejected', reason: reason || '' },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
