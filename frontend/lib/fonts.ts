import localFont from 'next/font/local';

// Bengali serif — used for headlines and body in e-paper.
// File: public/fonts/SolaimanLipi.ttf (actually Noto Serif Bengali, OFL-licensed).
export const notoSerifBengali = localFont({
  src: [
    {
      path: '../public/fonts/SolaimanLipi.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-serif-bn',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['Noto Serif Bengali', 'Noto Sans Bengali', 'serif'],
});

// Bengali sans — used for UI, navigation, and body text.
export const hindSiliguri = localFont({
  src: [
    {
      path: '../public/fonts/HindSiliguri-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/HindSiliguri-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-sans-bn',
  display: 'swap',
  fallback: ['Hind Siliguri', 'system-ui', 'sans-serif'],
});
