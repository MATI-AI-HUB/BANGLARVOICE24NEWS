import { NextResponse } from 'next/server';

export const revalidate = 0;

const ACTIVE_SESSIONS = new Map<string, any>();

export async function POST(req: Request) {
  try {
    const { title, reporter_name, agora_channel } = await req.json();

    if (!title || !agora_channel) {
      return NextResponse.json(
        { error: 'title and agora_channel required' },
        { status: 400 },
      );
    }

    const id = `bv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const session = {
      id,
      title,
      reporter_name: reporter_name || 'রিপোর্টার',
      agora_channel,
      status: 'live',
      started_at: new Date().toISOString(),
      ended_at: null,
      viewer_count: 0,
    };

    ACTIVE_SESSIONS.set(id, session);

    return NextResponse.json(session, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ sessions: Array.from(ACTIVE_SESSIONS.values()) });
}
