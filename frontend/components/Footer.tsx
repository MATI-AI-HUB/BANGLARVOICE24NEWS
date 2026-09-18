import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';

const EMAIL = 'banglarvoice24news@gmail.com';

export function Footer({ locale = 'bn' as Locale }: { locale?: Locale } = {}) {
  const isEn = locale === 'en';

  const legalLinks = [
    { href: '/privacy', label: isEn ? 'Privacy Policy' : 'গোপনীয়তা নীতি' },
    { href: '/terms', label: isEn ? 'Terms of Use' : 'ব্যবহারের শর্তাবলি' },
    { href: '/cookies', label: isEn ? 'Cookie Policy' : 'কুকি নীতি' },
    { href: '/ai-policy', label: isEn ? 'AI Policy' : 'AI নীতি' },
  ];

  const ethicsLinks = [
    { href: '/disclaimer', label: isEn ? 'Disclaimer' : 'দাবিত্যাগ' },
    { href: '/copyright', label: isEn ? 'Copyright / DMCA' : 'কপিরাইট / DMCA' },
    { href: '/correction', label: isEn ? 'Correction Policy' : 'সংশোধন নীতি' },
    { href: '/about', label: isEn ? 'About Us' : 'আমাদের সম্পর্কে' },
  ];

  const appLinks = [
    { href: '/download', label: isEn ? 'Download App' : 'অ্যাপ ডাউনলোড' },
    { href: '/download#arm64', label: 'Android (arm64)' },
    { href: '/download#armv7', label: 'Android (armv7)' },
    { href: '/download#x86_64', label: 'Android (x86_64)' },
  ];

  return (
    <footer className="border-t border-border bg-muted/60 dark:bg-neutral-950/60">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        {/* Brand */}
        <div className="lg:col-span-2">
          <p className="font-serif text-lg font-bold text-ink dark:text-paper">
            {isEn ? 'Banglar Voice' : 'বাংলার ভয়েস'}
          </p>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">
            {isEn
              ? 'Banglar Voice · Independent and responsible journalism'
              : 'Banglar Voice · স্বাধীন ও দায়িত্বশীল সাংবাদিকতা'}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
            {isEn
              ? 'Operated by Banglar Voice Production House, an online news outlet run by an AI automation system.'
              : 'বাংলার ভয়েস প্রোডাকশন হাউসের তত্ত্বাবধানে পরিচালিত, একটি এআই অটোমেশন সিস্টেমের মাধ্যমে পরিচালিত অনলাইন গণমাধ্যম বাংলার ভয়েস।'}
          </p>
          <p className="mt-3 text-[12px] text-neutral-500">
            <a href={`mailto:${EMAIL}`} className="hover:underline">{EMAIL}</a>
          </p>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-sm font-bold text-ink dark:text-paper">
            {isEn ? 'Legal' : 'আইনি'}
          </h3>
          <ul className="mt-3 space-y-2 text-[13px] text-neutral-500">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-ink dark:hover:text-paper">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Ethics */}
        <div>
          <h3 className="text-sm font-bold text-ink dark:text-paper">
            {isEn ? 'Ethics' : 'নীতিমালা'}
          </h3>
          <ul className="mt-3 space-y-2 text-[13px] text-neutral-500">
            {ethicsLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-ink dark:hover:text-paper">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* App */}
        <div>
          <h3 className="text-sm font-bold text-ink dark:text-paper">
            {isEn ? 'App' : 'অ্যাপ'}
          </h3>
          <ul className="mt-3 space-y-2 text-[13px] text-neutral-500">
            {appLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-ink dark:hover:text-paper">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-[11px] text-neutral-500 sm:flex-row">
          <p>
            {isEn
              ? `© ${new Date().getFullYear()} Banglar Voice. All rights reserved.`
              : `© ${new Date().getFullYear()} বাংলার ভয়েস। সর্বস্বত্ব সংরক্ষিত।`}
          </p>
          <p>
            {isEn
              ? 'Tech stack: Vercel + Supabase · Operated under the laws of Bangladesh.'
              : 'টেক স্ট্যাক: Vercel + Supabase · বাংলাদেশের আইন অনুসারে পরিচালিত।'}
          </p>
        </div>
      </div>
    </footer>
  );
}
