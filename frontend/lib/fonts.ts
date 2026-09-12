import { Noto_Serif_Bengali, Hind_Siliguri } from 'next/font/google';

export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '700'],
  variable: '--font-noto-serif-bengali',
  display: 'swap',
});

export const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});
