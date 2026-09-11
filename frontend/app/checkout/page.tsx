// frontend/app/checkout/page.tsx
// Checkout page — mock Stripe integration

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const session = searchParams.get('session');
  const tier = searchParams.get('tier') ?? 'Premium';
  const interval = searchParams.get('interval') ?? 'monthly';

  const prices: Record<string, { monthly: string; yearly: string }> = {
    Premium: { monthly: '১৯৯৳', yearly: '১৯৯০৳' },
    Team: { monthly: '৯৯৯৳', yearly: '৯৯৯০৳' },
  };

  const price = prices[tier]?.[interval] ?? '১৯৯৳';

  const handlePayment = () => {
    // Mock payment — replace with real Stripe in production
    alert(`Mock payment: ${tier} (${interval}) — ${price}\n\nProduction-এ Stripe checkout এখানে আসবে।`);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <div className="mt-8 rounded-lg border p-6">
        <div className="flex justify-between">
          <span className="text-neutral-600">Plan:</span>
          <span className="font-medium">{tier}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-neutral-600">Billing:</span>
          <span className="font-medium">{interval === 'monthly' ? 'মাসিক' : 'বার্ষিক'}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-neutral-600">Amount:</span>
          <span className="text-2xl font-bold">{price}</span>
        </div>
        <button
          onClick={handlePayment}
          className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600"
        >
          Pay Now (Mock)
        </button>
        <p className="mt-4 text-center text-sm text-neutral-500">
          Session: {session?.slice(0, 20)}...
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
