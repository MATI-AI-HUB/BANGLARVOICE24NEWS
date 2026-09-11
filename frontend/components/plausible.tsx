import Script from 'next/script';
export function PlausibleAnalytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'banglarvoice24news.com';
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}
