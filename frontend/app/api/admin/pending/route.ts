import { NextResponse } from 'next/server';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
export const revalidate = 0;
export async function GET() {
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/api/public/articles?status=pending&limit=30`, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const data = await r.json();
        return NextResponse.json({ items: data.items || [] });
      }
    } catch {}
  }
  return NextResponse.json({
    items: [
      { id: 'p1', slug: 'padma-setu-record-traffic', title_bn: 'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন পারাপার', category: 'অর্থনীতি', reporter_name: 'রফিকুল ইসলাম', submitted_at: new Date(Date.now() - 900000).toISOString(), ai_score: 87 },
      { id: 'p2', slug: 'election-commission', title_bn: 'নির্বাচন কমিশনের নতুন নির্দেশনা', category: 'রাজনীতি', reporter_name: 'সালমা বেগম', submitted_at: new Date(Date.now() - 3600000).toISOString(), ai_score: 72 },
      { id: 'p3', slug: 'metro-new-route', title_bn: 'ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন', category: 'নগর', reporter_name: 'করিম আহমেদ', submitted_at: new Date(Date.now() - 7200000).toISOString(), ai_score: 91 },
    ],
  }, { headers: { 'Cache-Control': 'no-store' } });
}
