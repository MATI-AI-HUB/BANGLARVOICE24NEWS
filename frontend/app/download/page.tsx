import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // 1h ISR

const GITHUB_REPO = 'hizlanews46-design/Banglarvoice-apps';
const FALLBACK_VERSION = 'v1.0.0';

export const metadata: Metadata = {
  title: 'অ্যাপ ডাউনলোড — বাংলার ভয়েস',
  description:
    'বাংলার ভয়েস অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করুন — পাঠক, অ্যাডমিন, রিপোর্টার, লাইভ টিভি ও স্টুডিও — সব এক প্ল্যাটফর্মে।',
  alternates: { canonical: '/download' },
  openGraph: {
    title: 'বাংলার ভয়েস — অ্যান্ড্রয়েড অ্যাপ ডাউনলোড',
    description:
      'ব্রেকিং নিউজ, লাইভ টিভি, শর্টস, অডিও মোড — ৫টি অফিসিয়াল অ্যাপ।',
    type: 'website',
  },
};

type AppMeta = {
  id: string;
  filename: string;
  name: string;
  bnName: string;
  desc: string;
  icon: string;
  primary?: boolean;
  audience: string;
};

const APP_META: AppMeta[] = [
  {
    id: 'reader',
    filename: 'banglar-voice-reader.apk',
    name: 'Reader',
    bnName: 'পাঠক অ্যাপ',
    desc: 'সাধারণ পাঠকদের জন্য মূল অ্যাপ — ব্রেকিং নিউজ, লাইভ টিভি, শর্টস, অডিও মোড, বুকমার্ক ও ডার্ক মোড।',
    icon: '📰',
    primary: true,
    audience: 'সকল পাঠক',
  },
  {
    id: 'reporter',
    filename: 'banglar-voice-reporter.apk',
    name: 'Reporter',
    bnName: 'রিপোর্টার অ্যাপ',
    desc: 'মাঠপর্যায়ের রিপোর্টারদের জন্য — ঘটনাস্থল থেকে সরাসরি সংবাদ জমা, ছবি/ভিডিও আপলোড, লাইভ আপডেট।',
    icon: '📝',
    audience: 'নিউজরুম রিপোর্টার',
  },
  {
    id: 'admin',
    filename: 'banglar-voice-admin.apk',
    name: 'Admin',
    bnName: 'অ্যাডমিন অ্যাপ',
    desc: 'সম্পাদকীয় নিয়ন্ত্রণ — সংবাদ অনুমোদন, AI স্কোর যাচাই, প্রকাশনা ও বিশ্লেষণ ড্যাশবোর্ড।',
    icon: '⚙️',
    audience: 'এডিটর / অ্যাডমিন',
  },
  {
    id: 'tv',
    filename: 'banglar-voice-tv.apk',
    name: 'TV',
    bnName: 'লাইভ টিভি',
    desc: '২৪/৭ লাইভ স্ট্রিমিং অ্যাপ — ব্রেকিং কাভারেজ, টক শো, সংবাদ বুলেটিন — টেলিভিশন অভিজ্ঞতা।',
    icon: '📺',
    audience: 'লাইভ দর্শক',
  },
  {
    id: 'studio',
    filename: 'banglar-voice-studio.apk',
    name: 'Studio',
    bnName: 'স্টুডিও',
    desc: 'Breaking Live Studio কন্ট্রোল রুম — লাইভ সম্প্রচার পরিচালনা, স্ক্রিন শেয়ার, গেস্ট ইনভাইট।',
    icon: '🎙️',
    audience: 'ব্রডকাস্ট টিম',
  },
];

const STEPS = [
  {
    title: 'আপনার অ্যাপ বেছে নিন',
    desc: 'সাধারণ পাঠক হলে Reader, রিপোর্টার হলে Reporter, এডিটর হলে Admin। প্রতিটি অ্যাপ আলাদা ভূমিকার জন্য।',
  },
  {
    title: 'ডাউনলোড বাটনে চাপ দিন',
    desc: 'অ্যাপ কার্ডের নিচে ডাউনলোড বাটন — সরাসরি GitHub Releases থেকে APK নামবে।',
  },
  {
    title: 'অজানা উৎস অনুমোদন',
    desc: 'ইনস্টলের সময় ফোনে "Allow from this source" অনুমোদন করুন — এটি আমাদের সাইনড অফিসিয়াল APK।',
  },
  {
    title: 'ইনস্টল ও লগইন',
    desc: 'ইনস্টল শেষে অ্যাপ খুলে আপনার ভূমিকা অনুযায়ী লগইন করুন — সব অ্যাপ একই অ্যাকাউন্টে সিঙ্ক হবে।',
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

async function getLatestRelease() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        next: { revalidate: 3600 },
        headers: { Accept: 'application/vnd.github+json' },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function bnNum(s: string): string {
  return s.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
}

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const version = release?.tag_name || FALLBACK_VERSION;
  const publishedAt = release?.published_at;

  const apks = APP_META.map((meta) => {
    const asset = release?.assets?.find(
      (a: { name: string }) => a.name === meta.filename,
    );
    return {
      ...meta,
      size: formatBytes(asset?.size),
      url:
        asset?.browser_download_url ||
        `https://github.com/${GITHUB_REPO}/releases/download/${version}/${meta.filename}`,
      sha: asset?.digest?.replace('sha256:', '') || null,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Hero */}
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-crimson/10 px-3 py-1 text-[12px] font-bold uppercase tracking-widest text-crimson">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
          Android · {version}
        </span>
        <h1 className="mt-4 font-serif text-3xl font-extrabold leading-tight text-ink sm:text-4xl lg:text-5xl dark:text-paper">
          বাংলার ভয়েস অ্যাপ ডাউনলোড
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          পাঠক, রিপোর্টার, অ্যাডমিন, লাইভ টিভি ও স্টুডিও — ৫টি অফিসিয়াল
          অ্যান্ড্রয়েড অ্যাপ। আপনার ভূমিকা অনুযায়ী সঠিক অ্যাপ বেছে নিন।
        </p>
        {publishedAt && (
          <p className="mt-2 text-[12px] text-neutral-500 dark:text-neutral-500">
            সর্বশেষ রিলিজ: {bnNum(new Date(publishedAt).toLocaleDateString('bn-BD', { dateStyle: 'long' }))}
          </p>
        )}
      </section>

      {/* App cards */}
      <section
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="অ্যাপ ডাউনলোড"
      >
        {apks.map((apk) => (
          <article
            key={apk.id}
            className={`relative flex flex-col rounded-2xl border bg-paper p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-neutral-900 ${
              apk.primary
                ? 'border-crimson ring-1 ring-crimson/30'
                : 'border-border dark:border-white/10'
            }`}
          >
            {apk.primary && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-crimson px-3 py-0.5 text-[11px] font-bold text-white">
                ★ সবচেয়ে জনপ্রিয়
              </span>
            )}
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crimson/10 text-2xl"
              >
                {apk.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[17px] font-extrabold leading-tight text-ink dark:text-paper">
                  {apk.bnName}
                </h2>
                <p className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  {apk.name} · {apk.audience}
                </p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              {apk.desc}
            </p>
            <div className="mt-3 flex items-center justify-between text-[12px] font-medium text-neutral-500">
              <span>{apk.size}</span>
              <span className="font-mono text-[10px]">{version}</span>
            </div>
            <a
              href={apk.url}
              download
              className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-colors ${
                apk.primary
                  ? 'bg-crimson hover:bg-crimson-dark'
                  : 'bg-ink hover:bg-neutral-800 dark:bg-neutral-200 dark:text-ink dark:hover:bg-white'
              }`}
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
              ডাউনলোড APK
            </a>
            {apk.sha && (
              <details className="mt-3 text-[11px] text-neutral-500">
                <summary className="cursor-pointer font-medium hover:text-ink">
                  SHA-256 যাচাই
                </summary>
                <code className="mt-1 block break-all rounded bg-muted px-2 py-1.5 font-mono text-[10px] dark:bg-neutral-800">
                  {apk.sha}
                </code>
              </details>
            )}
          </article>
        ))}
      </section>

      {/* Features */}
      <section className="mt-12 rounded-2xl border border-border bg-muted/50 p-6 sm:p-8 dark:border-white/10 dark:bg-neutral-900/50">
        <h2 className="font-serif text-xl font-bold text-ink dark:text-paper">
          অ্যাপে যা যা পাবেন
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURES.map((f) => (
            <li
              key={f}
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
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Install steps */}
      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold text-ink dark:text-paper">
          ইনস্টল করার ধাপ
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="rounded-2xl border border-border bg-paper p-5 dark:border-white/10 dark:bg-neutral-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-crimson text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 text-[14px] font-bold text-ink dark:text-paper">
                {s.title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Security note */}
      <section className="mt-10 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-[13px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>নিরাপত্তা নোট:</strong> সব APK আমাদের অফিসিয়াল GitHub Releases
        থেকে সরাসরি ডাউনলোড হয় — কোনো তৃতীয় পক্ষের সার্ভার নেই। ইনস্টলের সময়
        Google Play Protect সতর্কতা দেখালে &ldquo;Install anyway&rdquo; বেছে
        নিন, কারণ এটি release-keystore দিয়ে signed।
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
