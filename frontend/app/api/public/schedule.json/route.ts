import { NextResponse } from 'next/server';

export const revalidate = 300;

const SCHEDULE = [
  { hour: 6, time: '০৬:০০', title: 'সকালের সংবাদ' },
  { hour: 9, time: '০৯:০০', title: 'অর্থনীতি ডেস্ক' },
  { hour: 12, time: '১২:০০', title: 'মধ্যাহ্ন সংবাদ' },
  { hour: 15, time: '১৫:০০', title: 'খেলাধুলা' },
  { hour: 18, time: '১৮:০০', title: 'প্রধান সংবাদ' },
  { hour: 21, time: '২১:০০', title: 'রাতের সংবাদ' },
];

export async function GET() {
  const nowHour = new Date().getHours();
  let currentIdx = 0;
  for (let i = 0; i < SCHEDULE.length; i++) {
    if (nowHour >= SCHEDULE[i].hour) currentIdx = i;
  }
  const entries = SCHEDULE.map((s, i) => ({
    time: s.time,
    title: s.title,
    is_now: i === currentIdx,
    is_past: i < currentIdx,
  }));
  return NextResponse.json(
    { entries },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
