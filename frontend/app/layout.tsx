import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { notoSerifBengali, hindSiliguri } from '@/lib/fonts';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, getLocaleFromCookie } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieBanner } from '@/components/CookieBanner';
import { PlausibleAnalytics } from '@/components/plausible';
import { LearningHub } from '@/components/learning-hub';
import { canonicalSiteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: 'বাংলার ভয়েস', template: '%s — বাংলার ভয়েস' },
  description: 'স্বাধীন সংবাদ প্রকাশে নির্ভীক — Banglar Voice autonomous Bangla news platform',
  metadataBase: new URL(canonicalSiteUrl()),
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'বাংলার ভয়েস',
    title: 'বাংলার ভয়েস — স্বাধীন সংবাদ প্রচারে নির্ভীক',
    description: 'বাংলাদেশ ও বিশ্ব — নিরপেক্ষ, দায়িত্বশীল ও নির্ভরযোগ্য সাংবাদিকতা',
    url: canonicalSiteUrl(),
    locale: 'bn_BD',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFD' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: 'বাংলার ভয়েস',
  alternateName: 'Banglar Voice',
  url: canonicalSiteUrl(),
  logo: `${canonicalSiteUrl()}/banglar-voice-logo.png`,
  sameAs: [],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE)?.value);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </head>
      <body
        className={`${notoSerifBengali.variable} ${hindSiliguri.variable} bg-paper font-sansbn text-ink antialiased min-h-screen flex flex-col`}
      >
        <PlausibleAnalytics />
        <Header locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
        <CookieBanner />
        <LearningHub />
      </body>
    </html>
  );
}
