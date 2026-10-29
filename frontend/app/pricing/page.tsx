'use client';

import { useRouter } from 'next/navigation';
import { useClientLocale } from '@/lib/use-client-locale';

const COPY = {
  bn: {
    title: 'সাবস্ক্রিপশন প্ল্যান', subtitle: 'আপনার প্রয়োজন অনুযায়ী প্ল্যান বেছে নিন',
    month: '/মাস', year: '/বছর', freeFeatures: ['মাসে ৫টি article পড়ুন', 'সাধারণ সংবাদ', 'বিজ্ঞাপন সহ'],
    freeCta: 'বর্তমান প্ল্যান', premiumFeatures: ['সীমাহীন article', 'বিজ্ঞাপন মুক্ত', 'অফলাইন পড়া', 'প্রিমিয়াম সংবাদ বিশ্লেষণ', 'নতুন ফিচার আগে পান'],
    premiumCta: 'Premium নিন', teamFeatures: ['৫ জন পর্যন্ত ব্যবহারকারী', 'সীমাহীন article', 'বিজ্ঞাপন মুক্ত', 'Newsroom dashboard', 'API access', 'Priority support'],
    teamCta: 'Team নিন', popular: 'জনপ্রিয়', trial: 'সকল প্ল্যানে ৭ দিনের ফ্রি ট্রায়াল। যেকোনো সময় বাতিল করুন।',
    checkoutFailed: 'চেকআউট সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।',
  },
  en: {
    title: 'Subscription plans', subtitle: 'Choose a plan that fits your needs',
    month: '/month', year: '/year', freeFeatures: ['Read 5 articles per month', 'Standard news', 'Ad-supported'],
    freeCta: 'Current plan', premiumFeatures: ['Unlimited articles', 'Ad-free reading', 'Offline reading', 'Premium news analysis', 'Early access to new features'],
    premiumCta: 'Choose Premium', teamFeatures: ['Up to 5 users', 'Unlimited articles', 'Ad-free reading', 'Newsroom dashboard', 'API access', 'Priority support'],
    teamCta: 'Choose Team', popular: 'Popular', trial: '7-day free trial on all plans. Cancel any time.',
    checkoutFailed: 'Checkout could not be completed. Please try again.',
  },
} as const;

export default function PricingPage() {
  const router = useRouter();
  const locale = useClientLocale();
  const copy = COPY[locale];
  const tiers = [
    { id: 'Free', name: 'Free', price: locale === 'en' ? 'BDT 0' : '০৳', period: copy.month, features: copy.freeFeatures, cta: copy.freeCta, highlight: false },
    { id: 'Premium', name: 'Premium', price: locale === 'en' ? 'BDT 199' : '১৯৯৳', period: copy.month, yearly: locale === 'en' ? 'BDT 1,990/year (17% off)' : '১৯৯০৳/বছর (১৭% ছাড়)', features: copy.premiumFeatures, cta: copy.premiumCta, highlight: true },
    { id: 'Team', name: 'Team', price: locale === 'en' ? 'BDT 999' : '৯৯৯৳', period: copy.month, features: copy.teamFeatures, cta: copy.teamCta, highlight: false },
  ];

  const handleSubscribe = async (tierName: string) => {
    if (tierName === 'Free') return;
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierName, interval: 'monthly' }),
      });
      const data = await response.json();
      if (data.checkoutUrl) router.push(data.checkoutUrl);
      else window.alert(copy.checkoutFailed);
    } catch (error) {
      console.error('checkout error:', error);
      window.alert(copy.checkoutFailed);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-4 text-lg text-neutral-600">{copy.subtitle}</p>
      </div>
      <div className="mt-16 grid gap-8 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div key={tier.id} className={`relative rounded-2xl border p-8 ${tier.highlight ? 'border-blue-500 ring-2 ring-blue-500' : 'border-neutral-200'}`}>
            {tier.highlight && <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-sm font-medium text-white">{copy.popular}</div>}
            <h2 className="text-2xl font-bold">{tier.name}</h2>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold">{tier.price}</span>
              <span className="text-neutral-500">{tier.period}</span>
            </div>
            {'yearly' in tier && tier.yearly && <p className="mt-2 text-sm text-green-600">{tier.yearly}</p>}
            <ul className="mt-8 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(tier.id)}
              disabled={tier.id === 'Free'}
              className={`mt-8 w-full rounded-lg px-4 py-3 font-medium transition ${tier.id === 'Free' ? 'cursor-not-allowed bg-neutral-100 text-neutral-400' : tier.highlight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-16 text-center text-sm text-neutral-500"><p>{copy.trial}</p></div>
    </main>
  );
}
