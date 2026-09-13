import { NextResponse } from 'next/server';
export const revalidate = 0;
let breakingState = { active: false, text: '', updated_at: new Date().toISOString() };
export async function POST(req: Request) {
  try {
    const { active, text } = await req.json();
    breakingState = {
      active: Boolean(active),
      text: text || breakingState.text,
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json(breakingState, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}
export async function GET() {
  return NextResponse.json(breakingState, { headers: { 'Cache-Control': 'no-store' } });
}
