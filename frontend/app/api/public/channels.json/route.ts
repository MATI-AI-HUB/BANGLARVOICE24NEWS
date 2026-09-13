import { NextResponse } from 'next/server';

export const revalidate = 300;

const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || '';

export async function GET() {
  const channels = [
    {
      id: 'main',
      name_bn: 'প্রধান চ্যানেল',
      stream_url: STREAM_URL,
      type: 'video',
      logo: null,
    },
    {
      id: 'audio',
      name_bn: 'অডিও ২৪/৭',
      stream_url: STREAM_URL,
      type: 'audio',
      logo: null,
    },
  ];

  return NextResponse.json(
    { channels },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
