import Link from 'next/link';

const EMAIL = 'banglarvoice24news@gmail.com';

const legalLinks = [
  { href: '/privacy', label: 'গোপনীয়তা নীতি' },
  { href: '/terms', label: 'ব্যবহারের শর্তাবলি' },
  { href: '/cookies', label: 'কুকি নীতি' },
  { href: '/ai-policy', label: 'AI নীতি' },
];

const ethicsLinks = [
  { href: '/disclaimer', label: 'দাবিত্যাগ' },
  { href: '/copyright', label: 'কপিরাইট / DMCA' },
  { href: '/correction', label: 'সংশোধন নীতি' },
  { href: '/about', label: 'আমাদের সম্পর্কে' },
];

const appLinks = [
  { href: '/download', label: 'অ্যাপ ডাউনলোড' },
  { href: '/download#arm64', label: 'Android (arm64)' },
  { href: '/download#armv7', label: 'Android (armv7)' },
  { href: '/download#x86_64', label: 'Android (x86_64)' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/60 dark:bg-neutral-950/60">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        {/* Brand */}
        <div>
          <p className="font-serif text-lg font-bold text-ink dark:text-paper">বাংলার ভয়েস</p>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">Banglar Voice · স্বাধীন ও দায়িত্বশীল সাংবাদিকতা</p>
          <p className="mt-3 text-[11px] text-neutral-500">সর্বশেষ হালনাগাদ: ০৮ সেপ্টেম্বর ২০২৬</p>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
            বাংলার ভয়েস প্রোডাকশন হাউসের তত্ত্বাবধানে পরিচালিত, একটি এআই অটোমেশন সিস্টেমের মাধ্যমে পরিচালিত অনলাইন গণমাধ্যম বাংলার ভয়েস।
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            টেক স্ট্যাক: Vercel + Supabase · বাংলাদেশের আইন অনুসারে পরিচালিত।
          </p>
        </div>

        {/* Legal Links */}
        <nav aria-label="আইনি লিংক">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-widest text-neutral-500">আইনি লিংক</p>
          <ul className="space-y-2 text-[14px]">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-neutral-700 transition-colors hover:text-primary dark:text-neutral-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Ethics Links */}
        <nav aria-label="নীতিমালা লিংক">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-widest text-neutral-500">নীতিমালা ও অন্যান্য</p>
          <ul className="space-y-2 text-[14px]">
            {ethicsLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-neutral-700 transition-colors hover:text-primary dark:text-neutral-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* App Links */}
        <nav aria-label="অ্যাপ ডাউনলোড">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-widest text-neutral-500">অ্যাপ</p>
          <ul className="space-y-2 text-[14px]">
            {appLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-neutral-700 transition-colors hover:text-primary dark:text-neutral-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal Inquiries */}
        <div>
          <p className="mb-3 text-[12px] font-bold uppercase tracking-widest text-neutral-500">আইনি অনুসন্ধান</p>
          <p className="text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            DMCA, গোপনীয়তা, সংশোধন ও যেকোনো আইনি অনুসন্ধানে লিখুন:
          </p>
          <a
            href={`mailto:${EMAIL}`}
            className="mt-2 inline-block break-all text-[14px] font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            {EMAIL}
          </a>
          <p className="mt-3 text-[13px] text-neutral-500">
            সংশোধন অনুরোধও একই ঠিকানায় — বিষয়: &ldquo;Correction&rdquo;।
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-[12px] text-neutral-500 sm:flex-row sm:px-6 sm:text-left">
          <p>© ২০২৬ Banglar Voice</p>
          <p>
            Governed by the Laws of Bangladesh ·{' '}
            <a href={`mailto:${EMAIL}`} className="underline underline-offset-4 hover:text-primary">
              {EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
