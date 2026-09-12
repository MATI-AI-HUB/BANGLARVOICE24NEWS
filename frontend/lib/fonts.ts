import { Noto_Serif_Bengali, Hind_Siliguri } from 'next/font/google';

export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '700', '800'],
  variable: '--font-serif-bn',
  display: 'swap',
});

export const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-bn',
  display: 'swap',
});
