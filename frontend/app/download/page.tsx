import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600;

const READER_DOWNLOAD_HREF = '/api/download/reader';

export const metadata: Metadata = {
  title: 'পাঠক অ্যাপ ডাউনলোড — বাংলার ভয়েস',
  description:
    'বাংলার ভয়েস পাঠক অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করুন — ব্রেকিং নিউজ, লাইভ টিভি, শর্টস ও অডিও মোড।',
  alternates: { canonical: '/download' },
  openGraph: {
    title: 'বাংলার ভয়েস — পাঠক অ্যাপ ডাউনলোড',
    description: 'ব্রেকিং নিউজ, লাইভ টিভি, শর্টস, অডিও মোড — অফিসিয়াল পাঠক অ্যাপ।',
    type: 'website',
  },
};

const STEPS = [
  {
    title: 'ডাউনলোড বাটনে চাপ দিন',
    desc: 'নিচের বাটন থেকে সরাসরি অফিসিয়াল পাঠক APK নামবে। অন্য কোনো অ্যাপ এই পাতায় দেওয়া হয় না।',
  },
  {
    title: 'অজানা উৎস অনুমোদন',
    desc: 'ইনস্টলের সময় ফোনে "Allow from this source" অনুমোদন করুন — এটি আমাদের সাইনড অফিসিয়াল APK।',
  },
  {
    title: 'ইনস্টল ও পড়া শুরু',
    desc: 'ইনস্টল শেষে অ্যাপ খুলুন। পাঠক অ্যাপে লগইন ছাড়াই সংবাদ পড়া যায়।',
  },
];

const FEATURES = [
  'ব্রেকিং নিউজ টিকার',
  'লাইভ টিভি স্ট্রিম',
  'শর্টস (ভার্টিকাল ভিডিও)',
  'অডিও মোড / TTS',
  'বুকমার্ক ও পড়ার তালিকা',
  'ডার্ক মোড',
  'বাংলা ইন্টারফেস',
  'অফলাইন ক্যাশ',
];

export default function DownloadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-crimson/10 px-3 py-1 text-[12px] font-bold uppercase tracking-widest text-crimson">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
          Android · পাঠক অ্যাপ
        </span>
        <h1 className="mt-4 font-serif text-3xl font-extrabold leading-tight text-ink sm:text-4xl lg:text-5xl dark:text-paper">
          বাংলার ভয়েস পাঠক অ্যাপ
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          সাধারণ পাঠকদের জন্য একমাত্র পাবলিক অ্যাপ — ব্রেকিং নিউজ, লাইভ টিভি, শর্টস, অডিও মোড,
          বুকমার্ক ও ডার্ক মোড।
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-crimson bg-paper p-6 shadow-sm ring-1 ring-crimson/30 dark:bg-neutral-900" aria-label="পাঠক অ্যাপ ডাউনলোড">
        <h2 className="font-serif text-[22px] font-extrabold leading-tight text-ink dark:text-paper">
          পাঠক অ্যাপ
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          এই পাতায় শুধু পাঠক APK দেওয়া আছে। ফাইলটি আমাদের ওয়েবসাইটের ডাউনলোড এন্ডপয়েন্ট থেকে যায় —
          রিপোজিটরি ব্রাউজ করার কোনো লিংক নেই।
        </p>
        <a
          href={READER_DOWNLOAD_HREF}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-crimson px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-crimson-dark"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          পাঠক অ্যাপ ডাউনলোড
        </a>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-muted/50 p-6 sm:p-8 dark:border-white/10 dark:bg-neutral-900/50">
        <h2 className="font-serif text-xl font-bold text-ink dark:text-paper">অ্যাপে যা যা পাবেন</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-crimson"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold text-ink dark:text-paper">ইনস্টল করার ধাপ</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-border bg-paper p-5 dark:border-white/10 dark:bg-neutral-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-crimson text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 text-[14px] font-bold text-ink dark:text-paper">{step.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-[13px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>নিরাপত্তা নোট:</strong> পাঠক APK শুধু এই ওয়েবসাইটের ডাউনলোড বাটন থেকে নিন।
        ইনস্টলের সময় Google Play Protect সতর্কতা দেখালে &ldquo;Install anyway&rdquo; বেছে নিন,
        কারণ এটি release-keystore দিয়ে signed।
      </section>

      <p className="mt-8 text-center text-[13px] text-neutral-500">
        কোনো সমস্যা?{' '}
        <Link
          href="/contact"
          className="font-semibold text-crimson underline underline-offset-4 hover:decoration-crimson"
        >
          যোগাযোগ করুন
        </Link>
      </p>
    </main>
  );
}
