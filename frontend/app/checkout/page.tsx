'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useClientLocale } from '@/lib/use-client-locale';

const COPY = {
  bn: {
    billingMonthly: 'মাসিক', billingYearly: 'বার্ষিক', method: 'পেমেন্ট পদ্ধতি', amount: 'পরিমাণ', plan: 'প্ল্যান', billing: 'বিলিং',
    card: 'ক্রেডিট/ডেবিট কার্ড (Stripe)', cardTypes: 'Visa, Mastercard, American Express', mobile: 'মোবাইল পেমেন্ট (বাংলাদেশ)',
    pay: 'পেমেন্ট করুন', mock: 'ডেমো', stripeAlert: 'ডেমো Stripe পেমেন্ট', bkashAlert: 'ডেমো bKash পেমেন্ট',
    noLive: 'এটি ডেমো চেকআউট; এখানে কোনো পেমেন্ট নেওয়া হয় না।', loading: 'লোড হচ্ছে…',
  },
  en: {
    billingMonthly: 'Monthly', billingYearly: 'Yearly', method: 'Payment method', amount: 'Amount', plan: 'Plan', billing: 'Billing',
    card: 'Credit/debit card (Stripe)', cardTypes: 'Visa, Mastercard, American Express', mobile: 'Mobile payment (Bangladesh)',
    pay: 'Continue', mock: 'Demo', stripeAlert: 'Demo Stripe payment', bkashAlert: 'Demo bKash payment',
    noLive: 'This is a demo checkout; no payment is collected here.', loading: 'Loading…',
  },
} as const;

function CheckoutContent() {
  const locale = useClientLocale();
  const copy = COPY[locale];
  const searchParams = useSearchParams();
  const session = searchParams.get('session');
  const payment = searchParams.get('payment');
  const method = searchParams.get('method') ?? 'stripe';
  const tier = searchParams.get('tier') ?? 'Premium';
  const interval = searchParams.get('interval') ?? 'monthly';
  const prices: Record<string, { monthly: string; yearly: string }> = {
    Premium: { monthly: locale === 'en' ? 'BDT 199' : '১৯৯৳', yearly: locale === 'en' ? 'BDT 1,990' : '১৯৯০৳' },
    Team: { monthly: locale === 'en' ? 'BDT 999' : '৯৯৯৳', yearly: locale === 'en' ? 'BDT 9,990' : '৯৯৯০৳' },
  };
  const price = prices[tier]?.[interval === 'yearly' ? 'yearly' : 'monthly'] ?? (locale === 'en' ? 'BDT 199' : '১৯৯৳');
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'bkash'>(method === 'bkash' ? 'bkash' : 'stripe');

  const handlePayment = () => {
    const provider = selectedMethod === 'stripe' ? 'Stripe' : 'bKash';
    window.alert(`${locale === 'en' ? copy.stripeAlert.replace('Stripe', provider) : copy.bkashAlert.replace('bKash', provider)}: ${tier} (${interval}) — ${price}\n\n${copy.noLive}`);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <div className="mt-8 rounded-lg border p-6">
        <div className="flex justify-between"><span className="text-neutral-600">{copy.plan}:</span><span className="font-medium">{tier}</span></div>
        <div className="mt-2 flex justify-between"><span className="text-neutral-600">{copy.billing}:</span><span className="font-medium">{interval === 'monthly' ? copy.billingMonthly : copy.billingYearly}</span></div>
        <div className="mt-2 flex justify-between"><span className="text-neutral-600">{copy.amount}:</span><span className="text-2xl font-bold">{price}</span></div>
        <div className="mt-6">
          <label className="text-sm font-medium text-neutral-700">{copy.method}:</label>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-neutral-50">
              <input type="radio" name="payment" value="stripe" checked={selectedMethod === 'stripe'} onChange={() => setSelectedMethod('stripe')} className="h-4 w-4" />
              <div><div className="font-medium">{copy.card}</div><div className="text-sm text-neutral-500">{copy.cardTypes}</div></div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-neutral-50">
              <input type="radio" name="payment" value="bkash" checked={selectedMethod === 'bkash'} onChange={() => setSelectedMethod('bkash')} className="h-4 w-4" />
              <div><div className="font-medium">bKash</div><div className="text-sm text-neutral-500">{copy.mobile}</div></div>
            </label>
          </div>
        </div>
        <button onClick={handlePayment} className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600">
          {copy.pay} ({copy.mock} — {selectedMethod === 'stripe' ? 'Stripe' : 'bKash'})
        </button>
        <p className="mt-3 text-center text-xs text-neutral-500">{copy.noLive}</p>
        <p className="mt-4 text-center text-sm text-neutral-500">
          {session ? `Session: ${session.slice(0, 20)}…` : payment ? `Payment: ${payment.slice(0, 20)}…` : ''}
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<div>লোড হচ্ছে… / Loading…</div>}><CheckoutContent /></Suspense>;
}
