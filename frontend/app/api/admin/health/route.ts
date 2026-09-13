import { NextResponse } from 'next/server';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
export const revalidate = 0;
export async function GET() {
  let backendUp = false;
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      backendUp = r.ok;
    } catch {}
  }
  return NextResponse.json({
    web: 'up', backend: backendUp ? 'up' : 'down',
    backend_url: API_BASE || 'not-configured',
    timestamp: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
