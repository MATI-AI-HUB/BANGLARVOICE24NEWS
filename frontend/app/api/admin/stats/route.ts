import { NextResponse } from 'next/server';
export const revalidate = 0;
export async function GET() {
  return NextResponse.json({
    today_published: 24, pending_count: 8, reporter_count: 3,
    ai_cost_usd: 12.34, ai_tokens: 145200,
    breaking_active: false,
    last_publish: new Date(Date.now() - 1800000).toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
