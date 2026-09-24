import type { Metadata } from 'next';
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

export default async function EpaperPage() {
  const backendEdition = await epaperApi.latest();
  const demoMode = process.env.NODE_ENV !== 'production';
  const edition = backendEdition ?? (demoMode ? buildDemoEdition() : null);
  const isDemo = demoMode && !backendEdition;

  if (!edition) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 border-b-2 border-primary pb-4">
          <h1 className="font-serifbn text-3xl font-bold text-primary">
            ই-পেপার
          </h1>
        </header>
        <p className="text-neutral-600 dark:text-neutral-300">
          ই-পেপার এই মুহূর্তে লভ্য নয়। কোনো সংস্করণ প্রকাশিত হয়নি।
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 border-b-2 border-primary pb-4">
        <h1 className="font-serifbn text-3xl font-bold text-primary">
          ই-পেপার
        </h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-paper/60">
          প্রতিদিন রাত ১১টা–১২টার মধ্যে দিনের সেরা সংবাদ থেকে স্বয়ংক্রিয়ভাবে
          তৈরি হয়।
        </p>
      </header>

      {isDemo && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          ডেমো মোড — ব্যাকএন্ড সংযোগ নেই। নমুনা সংস্করণ দেখানো হচ্ছে।
        </div>
      )}

      <EPaperViewer edition={edition} />

      <p className="mt-6 text-center text-xs text-ink/50 dark:text-paper/50">
        ই-পেপার আর্কাইভ — আগের সব সংস্করণ এখানে পাওয়া যাবে (ব্যাকএন্ড সংযুক্ত
        হলে)।
      </p>
    </main>
  );
}
