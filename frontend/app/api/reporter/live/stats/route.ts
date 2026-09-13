import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ viewer_count: 0 });

  const viewerCount = Math.floor(Math.random() * 20) + 1;
  return NextResponse.json(
    { id, viewer_count: viewerCount },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
