import { NextResponse } from 'next/server';
export const revalidate = 0;
export async function GET() {
  return NextResponse.json({
    reporters: [
      { id: 'r1', name: 'রফিকুল ইসলাম', email: 'rafiq@bv.com', reports_count: 142, last_active: new Date(Date.now() - 300000).toISOString(), status: 'active' },
      { id: 'r2', name: 'সালমা বেগম', email: 'salma@bv.com', reports_count: 89, last_active: new Date(Date.now() - 1800000).toISOString(), status: 'active' },
      { id: 'r3', name: 'করিম আহমেদ', email: 'karim@bv.com', reports_count: 67, last_active: new Date(Date.now() - 7200000).toISOString(), status: 'idle' },
    ],
  }, { headers: { 'Cache-Control': 'no-store' } });
}
