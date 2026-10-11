import type { Metadata } from 'next';
import Link from 'next/link';
import EPaperViewer from '../../components/epaper/EPaperViewer';
import { buildDemoEdition, epaperApi } from '../../lib/epaper/api';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ই-পেপার — বাংলার ভয়েস',
  description: 'বাংলার ভয়েসের দৈনিক ই-পেপার — প্রতিদিন রাত ১১টায় স্বয়ংক্রিয়ভাবে তৈরি হয়।',
};

export default async function EpaperPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const requestedDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  // Backend OFF - force demo only, no fetch
  const edition = buildDemoEdition();
  const archive = [{ date: '2026-10-11', label: '১১ অক্টোবর ২০২৬' }, { date: '2026-10-10', label: '১০ অক্টোবর ২০২৬' }];

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      {/* Premium Masthead */}
      <div className="border-b border-[#c5c0b5] bg-[#f4f1ea]">
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className="h-[3px] w-full bg-[#1a1a1a]" />
          <div className="flex justify-between py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#3a3a3a]">
            <span>ঢাকা | {edition.editionLabel}</span>
            <span className="hidden md:inline">ডেমো • ব্যাকএন্ড বন্ধ</span>
            <span>banglarvoice24news.com</span>
          </div>
          <div className="border-y-[3px] border-double border-[#2d2a26] bg-white py-3 text-center">
            <h1 className="font-serifbn text-[32px] font-black leading-none text-[#1a1a1a] md:text-[48px]">
              বাংলার ভয়েস <span className="ml-1 align-super font-sans text-[14px]">| 24NEWS</span>
            </h1>
            <p className="mt-1 font-serifbn text-[12px] italic text-[#2d2a26]">বাংলার কণ্ঠস্বর - সত্যের পথে</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <EPaperViewer edition={edition} />

        <section className="mt-10 border-t-2 border-[#1a1a1a] bg-white p-4">
          <h2 className="font-serifbn text-xl font-bold">আর্কাইভ</h2>
          <ul className="mt-3 flex gap-2">
            {archive.map((item) => (
              <li key={item.date}>
                <Link href={`/epaper?date=${item.date}`} className="rounded-full border border-[#c5c0b5] bg-[#f4f1ea] px-3 py-1 text-xs font-bold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
