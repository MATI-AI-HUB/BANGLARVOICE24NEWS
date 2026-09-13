import { NextResponse } from 'next/server';

export const revalidate = 0;

const ACTIVE_SESSIONS = new Map<string, any>();

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    ACTIVE_SESSIONS.delete(id);
    return NextResponse.json(
      { ok: true, id },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
