import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'অ্যাপ ডাউনলোড',
  description:
    'বাংলার ভয়েস অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করুন — ব্রেকিং নিউজ, লাইভ টিভি, শর্টস, অডিও মোড ও ডার্ক মোডসহ। arm64 (সুপারিশকৃত), armv7 ও x86_64 ভার্সন উপলব্ধ।',
  alternates: { canonical: '/download' },
  openGraph: {
    title: 'বাংলার ভয়েস — অ্যান্ড্রয়েড অ্যাপ ডাউনলোড',
    description:
      'ব্রেকিং নিউজ, লাইভ টিভি, শর্টস, অডিও মোড ও ডার্ক মোড — বাংলার ভয়েস অ্যাপ এখন ডাউনলোড করুন।',
    type: 'website',
  },
};

const APKS = [
  {
    id: 'arm64',
    name: 'arm64-v8a',
    badge: 'সুপারিশকৃত',
    desc: 'আধুনিক ৬৪-বিট ফোনের জন্য (২০২০+ ফোনের ~৯৫%)। দ্রুততম ও সবচেয়ে অপটিমাইজড।',
    size: '২০.৮ MB',
    sha: '55ea8d5cacea93d7594787ec95bd553b341791c64ad892a4b63f7c13a34a8ca8',
    url: 'https://static.teamily.ai/sites/41013672-906e-4a82-94b6-179f91aa8f94/documents/banglar-voice-v6-apk/banglar-voice-reader-v6.0.0-arm64.apk',
    recommended: true,
  },
  {
    id: 'armv7',
    name: 'armeabi-v7a',
    tag: 'পুরনো ফোন',
    desc: 'পুরনো ৩২-বিট ফোনের জন্য (২০১৯-এর আগের ডিভাইস)।',
    size: '১৮.৩ MB',
    sha: 'ee075c61dea6efb48987d300b97d6b79a7653fb912f68e701bdddc259e4b3b06',
    url: 'https://static.teamily.ai/sites/41013672-906e-4a82-94b6-179f91aa8f94/documents/banglar-voice-v6-apk/banglar-voice-reader-v6.0.0-armv7.apk',
    recommended: false,
  },
  {
    id: 'x86_64',
    name: 'x86_64',
    tag: 'এমুলেটর / পিসি',
    desc: 'অ্যান্ড্রয়েড এমুলেটর বা পিসিতে চালানোর জন্য।',
    size: '২২.১ MB',
    sha: '339db9ef2b1419f2dc8f2ada9c425d26d7b584ceaa21504a911781d15f108e6d',
    url: 'https://static.teamily.ai/sites/41013672-906e-4a82-94b6-179f91aa8f94/documents/banglar-voice-v6-apk/banglar-voice-reader-v6.0.0-x86_64.apk',
    recommended: false,
  },
];

const STEPS = [
  {
    title: 'সঠিক ভার্সন বেছে নিন',
    desc: 'বেশিরভাগ আধুনিক ফোনে arm64-v8a (সুপারিশকৃত) কাজ করবে। কোনটা নিশ্চিত নন? arm64 দিয়েই শুরু করুন।',
  },
  {
    title: 'ডাউনলোড বাটনে চাপ দিন',
    desc: 'আপনার ফোনের ব্রাউজারে এই পেজ খুলে উপরের ডাউনলোড বাটনে চাপ দিন।',
  },
  {
    title: 'অজানা উৎস অনুমোদন করুন',
    desc: 'ইনস্টল করার সময় ফোন যদি জিজ্ঞেস করে, তাহলে "অজানা উৎস থেকে ইনস্টল" (Allow from this source) অনুমোদন করুন।',
  },
  {
    title: 'ইনস্টল ও উপভোগ করুন',
    desc: 'ইনস্টল শেষে অ্যাপ খুলুন — ব্রেকিং নিউজ, লাইভ টিভি, শর্টস ও অডিও মোড সব এক জায়গায়।',
  },
];

const FEATURES = [
  'ব্রেকিং নিউজ টিকার',
  'লাইভ টিভি',
  'শর্টস (ভার্টিকাল ভিডিও)',
  'অডিও মোড',
  'বুকমার্ক',
  'ডার্ক মোড',
  'অনুবাদ',
  'অফলাইন ক্যাশ',
];

export default function DownloadPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Hero */}
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-crimson/10 px-3 py-1 text-[12px] font-bold uppercase tracking-widest text-crimson">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
          Android App · v6.0.0
        </span>
        <h1 className="mt-4 font-serif text-3xl font-extrabold leading-tight text-ink sm:text-4xl lg:text-5xl">
          বাংলার ভয়েস অ্যাপ ডাউনলোড করুন
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          ব্রেকিং নিউজ, লাইভ টিভি, শর্টস, অডিও মোড ও ডার্ক মোড — সব এক অ্যাপে। আপনার ফোনের জন্য
          সঠিক ভার্সন বেছে নিয়ে ডাউনলোড করুন।
        </p>
      </section>

      {/* Download cards */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="ডাউনলোড ভার্সন">
        {APKS.map((apk) => (
          <article
            key={apk.id}
            className={`relative flex flex-col rounded-2xl border bg-paper p-5 shadow-sm transition-shadow hover:shadow-md ${
              apk.recommended ? 'border-crimson ring-1 ring-crimson/30' : 'border-border'
            }`}
          >
            {apk.recommended && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-crimson px-3 py-0.5 text-[11px] font-bold text-white">
                ★ সুপারিশকৃত
              </span>
            )}
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[15px] font-bold text-ink">{apk.name}</h2>
              <span className="text-[12px] font-medium text-neutral-500">{apk.size}</span>
            </div>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              {apk.desc}
            </p>
            <a
              href={apk.url}
              download
              className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-colors ${
                apk.recommended
                  ? 'bg-crimson hover:bg-crimson-dark'
                  : 'bg-ink hover:bg-neutral-800 dark:bg-neutral-200 dark:text-ink dark:hover:bg-white'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              ডাউনলোড
            </a>
            <details className="mt-3 text-[11px] text-neutral-500">
              <summary className="cursor-pointer font-medium hover:text-ink">SHA-256 যাচাই</summary>
              <code className="mt-1 block break-all rounded bg-muted px-2 py-1.5 font-mono text-[10px]">
                {apk.sha}
              </code>
            </details>
          </article>
        ))}
      </section>

      {/* Features */}
      <section className="mt-12 rounded-2xl border border-border bg-muted/50 p-6 sm:p-8">
        <h2 className="font-serif text-xl font-bold text-ink">অ্যাপে যা যা পাবেন</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-crimson" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Install steps */}
      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold text-ink">ইনস্টল করার ধাপ</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-paper p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-crimson text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 text-[14px] font-bold text-ink">{s.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Note */}
      <section className="mt-10 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-[13px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>নিরাপত্তা নোট:</strong> অ্যাপটি শুধুমাত্র এই অফিসিয়াল পেজ থেকে ডাউনলোড করুন। অন্য
        কোনো সোর্স থেকে APK ইনস্টল করলে নিরাপত্তা ঝুঁকি থাকতে পারে। ইনস্টলের সময় Google Play
        Protect সতর্কতা দেখালে &ldquo;Install anyway&rdquo; বেছে নিন — এটি আমাদের সাইনড অ্যাপ।
      </section>

      <p className="mt-8 text-center text-[13px] text-neutral-500">
        কোনো সমস্যা?{' '}
        <Link href="/contact" className="font-semibold text-crimson underline underline-offset-4 hover:decoration-crimson">
          যোগাযোগ করুন
        </Link>
      </p>
    </main>
  );
}