import type { Metadata } from 'next';
import Link from 'next/link';
import EPaperViewer from '../../components/epaper/EPaperViewer';
import { epaperApi, buildDemoEdition } from '../../lib/epaper/api';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'ই-পেপার — বাংলার ভয়েস',
  description:
    'বাংলার ভয়েসের দৈনিক ই-পেপার — প্রতিদিন রাত ১১টায় স্বয়ংক্রিয়ভাবে তৈরি হয়। PDF ডাউনলোড ও প্রিন্ট করুন।',
  alternates: { canonical: '/epaper' },
  openGraph: {
    title: 'ই-পেপার — বাংলার ভয়েস',
    description: 'প্রতিদিন রাত ১১টায় স্বয়ংক্রিয়ভাবে তৈরি দৈনিক ই-পেপার।',
    type: 'article',
    locale: 'bn_BD',
  },
};

export default async function EpaperPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const requestedDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  const [backendEdition, archive] = await Promise.all([
    requestedDate ? epaperApi.byDate(requestedDate) : epaperApi.latest(),
    epaperApi.archive(30),
  ]);

  const demoMode = process.env.NODE_ENV !== 'production';
  const edition = backendEdition ?? (demoMode && !requestedDate ? buildDemoEdition() : null);
  const isDemo = demoMode && !backendEdition && !requestedDate;
  const dateBn = edition?.editionLabel || new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      {/* Premium Classic Masthead - 100% Open Source */}
      <div className="border-b border-[#c5c0b5] bg-[#f4f1ea]">
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <div className="h-[3px] w-full bg-[#1a1a1a]" />
          <div className="flex justify-between py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-[#3a3a3a]">
            <span>ঢাকা | {dateBn}</span>
            <span className="hidden md:inline">প্রতিদিন রাত ১১টা-১২টা • স্বয়ংক্রিয়</span>
            <span>banglarvoice24news.com</span>
          </div>
          <div className="border-y-[3px] border-double border-[#2d2a26] bg-white py-3 text-center">
            <h1 className="font-serifbn text-[32px] font-black leading-none text-[#1a1a1a] md:text-[48px]">
              বাংলার ভয়েস <span className="ml-1 align-super font-sans text-[14px] md:text-[18px]">| 24NEWS</span>
            </h1>
            <p className="mt-1 font-serifbn text-[12px] italic text-[#2d2a26]">বাংলার কণ্ঠস্বর - সত্যের পথে • দৈনিক ই-পেপার</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {isDemo && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            ডেমো মোড — ব্যাকএন্ড সংযোগ নেই। নমুনা সংস্করণ দেখানো হচ্ছে।
          </div>
        )}

        {edition ? (
          <>
            {requestedDate && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#c5c0b5] bg-white px-4 py-2 text-sm">
                <span className="font-serifbn text-ink/80">নির্বাচিত সংস্করণ: {edition.editionLabel}</span>
                <Link href="/epaper" className="font-semibold text-[#b91c1c] hover:underline">
                  সর্বশেষ সংস্করণ দেখুন
                </Link>
              </div>
            )}
            <EPaperViewer edition={edition} />
          </>
        ) : (
          <p className="rounded-xl border border-[#c5c0b5] bg-white p-6 text-center text-neutral-600">
            {requestedDate
              ? 'এই তারিখের ই-পেপার সংস্করণ পাওয়া যায়নি। নিচের আর্কাইভ থেকে অন্য তারিখ বেছে নিন।'
              : 'ই-পেপার এই মুহূর্তে লভ্য নয়। কোনো সংস্করণ প্রকাশিত হয়নি।'}
          </p>
        )}

        <section className="mt-10 border-t-2 border-[#1a1a1a] bg-white p-4 pt-6">
          <h2 className="font-serifbn text-xl font-bold text-[#1a1a1a]">ই-পেপার আর্কাইভ • ৩০ দিন</h2>
          {archive.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">আর্কাইভ এখনো খালি — প্রতিদিন রাত ১১টার পর নতুন সংস্করণ স্বয়ংক্রিয়ভাবে যুক্ত হবে।</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {archive.map((item) => {
                const selected = requestedDate === item.date || (!requestedDate && edition?.editionDate === item.date);
                return (
                  <li key={item.date}>
                    <Link
                      href={`/epaper?date=${item.date}`}
                      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        selected
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                          : 'border-[#c5c0b5] bg-[#f4f1ea] text-ink/80 hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
                      }`}
                    >
                      {item.label || item.date}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
