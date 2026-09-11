// frontend/app/pricing/page.tsx
// Pricing page — 3 tiers: Free, Premium, Team
// Phase 10.3: Mock Stripe checkout integration

'use client';

import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();

  const tiers = [
    {
      name: "Free",
      price: "০৳",
      period: "/মাস",
      features: [
        "মাসে ৫টি article পড়ুন",
        "সাধারণ সংবাদ",
        "বিজ্ঞাপন সহ",
      ],
      cta: "বর্তমান প্ল্যান",
      highlight: false,
    },
    {
      name: "Premium",
      price: "১৯৯৳",
      period: "/মাস",
      yearly: "১৯৯০৳/বছর (১৭% ছাড়)",
      features: [
        "সীমাহীন article",
        "বিজ্ঞাপন মুক্ত",
        "অফলাইন পড়া",
        "প্রিমিয়াম সংবাদ বিশ্লেষণ",
        "নতুন ফিচার আগে পান",
      ],
      cta: "Premium নিন",
      highlight: true,
    },
    {
      name: "Team",
      price: "৯৯৯৳",
      period: "/মাস",
      features: [
        "৫ জন পর্যন্ত ব্যবহারকারী",
        "সীমাহীন article",
        "বিজ্ঞাপন মুক্ত",
        "Newsroom dashboard",
        "API access",
        "Priority support",
      ],
      cta: "Team নিন",
      highlight: false,
    },
  ];

  const handleSubscribe = async (tierName: string, interval: 'monthly' | 'yearly' = 'monthly') => {
    if (tierName === 'Free') return;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierName, interval }),
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
      }
    } catch (error) {
      console.error('checkout error:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">সাবস্ক্রিপশন প্ল্যান</h1>
        <p className="mt-4 text-lg text-neutral-600">
          আপনার প্রয়োজন অনুযায়ী প্ল্যান বেছে নিন
        </p>
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-2xl border p-8 ${
              tier.highlight
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-neutral-200"
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-sm font-medium text-white">
                জনপ্রিয়
              </div>
            )}
            <h2 className="text-2xl font-bold">{tier.name}</h2>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold">{tier.price}</span>
              <span className="text-neutral-500">{tier.period}</span>
            </div>
            {tier.yearly && (
              <p className="mt-2 text-sm text-green-600">{tier.yearly}</p>
            )}
            <ul className="mt-8 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(tier.name)}
              disabled={tier.name === "Free"}
              className={`mt-8 w-full rounded-lg px-4 py-3 font-medium transition ${
                tier.name === "Free"
                  ? "cursor-not-allowed bg-neutral-100 text-neutral-400"
                  : tier.highlight
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center text-sm text-neutral-500">
        <p>সকল প্ল্যানে ৭ দিনের ফ্রি ট্রায়াল। যেকোনো সময় বাতিল করুন।</p>
      </div>
    </main>
  );
}
