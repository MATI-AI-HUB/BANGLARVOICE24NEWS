import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requests = new Map<string, { count: number; resetAt: number }>();

function limited(request: Request): boolean {
  if (requests.size > 1000) requests.clear();
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const entry = requests.get(ip);
  if (!entry || entry.resetAt <= now) {
    requests.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 6;
}

export async function POST(request: Request) {
  if (limited(request)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const body: unknown = await request.json().catch(() => null);
  const text = typeof body === 'object' && body !== null && 'text' in body && typeof body.text === 'string'
    ? body.text.replace(/\s+/g, ' ').trim().slice(0, 3500)
    : '';
  if (text.length < 1) return NextResponse.json({ error: 'text_required' }, { status: 400 });

  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) return NextResponse.json({ error: 'tts_unavailable' }, { status: 503 });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': key, accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok || !response.body) {
      console.warn('[tts] provider request failed', response.status);
      return NextResponse.json({ error: 'tts_unavailable' }, { status: 502 });
    }
    return new Response(response.body, {
      status: 200,
      headers: {
        'content-type': 'audio/mpeg',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'tts_unavailable' }, { status: 503 });
  }
}
