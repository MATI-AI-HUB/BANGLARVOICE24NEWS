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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 border-b-2 border-primary pb-4">
        <h1 className="font-serifbn text-3xl font-bold text-primary">ই-পেপার</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-paper/60">
          প্রতিদিন রাত ১১টা–১২টার মধ্যে দিনের সেরা সংবাদ থেকে স্বয়ংক্রিয়ভাবে তৈরি হয়।
        </p>
      </header>

      {isDemo && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          ডেমো মোড — ব্যাকএন্ড সংযোগ নেই। নমুনা সংস্করণ দেখানো হচ্ছে।
        </div>
      )}

      {edition ? (
        <>
          {requestedDate && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm dark:border-white/10">
              <span className="text-ink/80 dark:text-paper/80">
                নির্বাচিত সংস্করণ: {edition.editionLabel}
              </span>
              <Link href="/epaper" className="font-semibold text-primary hover:underline">
                সর্বশেষ সংস্করণ দেখুন
              </Link>
            </div>
          )}
          <EPaperViewer edition={edition} />
        </>
      ) : (
        <p className="rounded-xl border border-border bg-muted/30 p-6 text-center text-neutral-600 dark:border-white/10 dark:text-neutral-300">
          {requestedDate
            ? 'এই তারিখের ই-পেপার সংস্করণ পাওয়া যায়নি। নিচের আর্কাইভ থেকে অন্য তারিখ বেছে নিন।'
            : 'ই-পেপার এই মুহূর্তে লভ্য নয়। কোনো সংস্করণ প্রকাশিত হয়নি।'}
        </p>
      )}

      <section className="mt-10 border-t border-border pt-6 dark:border-white/10">
        <h2 className="font-serifbn text-xl font-bold text-ink dark:text-paper">ই-পেপার আর্কাইভ</h2>
        {archive.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60 dark:text-paper/60">
            আর্কাইভ এখনো খালি — প্রতিদিন রাত ১১টার পর নতুন সংস্করণ স্বয়ংক্রিয়ভাবে যুক্ত হবে।
          </p>
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
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-paper text-ink/80 hover:border-primary hover:text-primary dark:border-white/10 dark:bg-neutral-900 dark:text-paper/80'
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
  );
}
