import EPaperViewer from '../../components/epaper/EPaperViewer';

// Static demo edition for the e-paper viewer. In production this is fetched
// from the backend `epaper_editions` table (see worker/src/agents/epaper-cron.ts).
const DEMO_EDITION = {
  editionDate: '09 Sep 2026',
  leadArticle: {
    headline: 'পদ্মা সেতু দিয়ে প্রথম দিনে ৫১ হাজার যান পারাপার',
    body: 'পদ্মা সেতু উদ্বোধনের প্রথম দিনে রেকর্ড সংখ্যক যানবাহন পারাপার হয়েছে। সেতু কর্তৃপক্ষ জানিয়েছে, টোল আদায় হয়েছে ২ কোটি টাকার বেশি।',
    attribution: 'বাংলার ভয়েস ডেস্ক',
  },
  sideArticles: [
    {
      headline: 'নির্বাচন কমিশনের নতুন নির্দেশনা',
      body: 'আগামী জাতীয় নির্বাচনকে সামনে রেখে নতুন নির্দেশনা দিয়েছে নির্বাচন কমিশন।',
      attribution: 'রাজনীতি ডেস্ক',
    },
    {
      headline: 'ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন',
      body: 'ঢাকার যানজট কমাতে মেট্রোরেলের নতুন রুট চালু হয়েছে।',
      attribution: 'নগর ডেস্ক',
    },
  ],
};

export const metadata = {
  title: 'ই-পেপার — বাংলার ভয়েস',
  description: 'বাংলার ভয়েসের দৈনিক ই-পেপার — প্রতিদিন রাত ১১টায় স্বয়ংক্রিয়ভাবে তৈরি হয়।',
};

export default function EpaperPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 border-b-2 border-primary pb-4">
        <h1 className="font-serifbn text-3xl font-bold text-primary">ই-পেপার</h1>
        <p className="mt-1 text-sm text-ink/60">
          প্রতিদিন রাত ১১টা–১২টার মধ্যে দিনের সেরা সংবাদ থেকে স্বয়ংক্রিয়ভাবে তৈরি হয়।
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-paper p-4 shadow-card dark:border-white/10 dark:bg-ink">
        <EPaperViewer
          editionDate={DEMO_EDITION.editionDate}
          leadArticle={DEMO_EDITION.leadArticle}
          sideArticles={DEMO_EDITION.sideArticles}
        />
      </div>

      <p className="mt-6 text-center text-xs text-ink/50">
        ই-পেপার আর্কাইভ — আগের সব সংস্করণ এখানে পাওয়া যাবে (ব্যাকএন্ড সংযুক্ত হলে)।
      </p>
    </main>
  );
}
