// frontend/app/checkout/page.tsx
// Checkout page — mock Stripe + bKash integration

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const session = searchParams.get('session');
  const payment = searchParams.get('payment');
  const method = searchParams.get('method') ?? 'stripe';
  const tier = searchParams.get('tier') ?? 'Premium';
  const interval = searchParams.get('interval') ?? 'monthly';

  const prices: Record<string, { monthly: string; yearly: string }> = {
    Premium: { monthly: '১৯৯৳', yearly: '১৯৯০৳' },
    Team: { monthly: '৯৯৯৳', yearly: '৯৯৯০৳' },
  };

  const price = prices[tier]?.[interval] ?? '১৯৯৳';
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'bkash'>(method as 'stripe' | 'bkash');

  const handlePayment = () => {
    if (selectedMethod === 'stripe') {
      alert(`Mock Stripe payment: ${tier} (${interval}) — ${price}\n\nProduction-এ Stripe checkout এখানে আসবে।`);
    } else {
      alert(`Mock bKash payment: ${tier} (${interval}) — ${price}\n\nProduction-এ bKash payment gateway এখানে আসবে।\n\nbKash mobile app-এ payment screen আসবে।`);
    }
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

        <div className="mt-6">
          <label className="text-sm font-medium text-neutral-700">Payment Method:</label>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-neutral-50">
              <input
                type="radio"
                name="payment"
                value="stripe"
                checked={selectedMethod === 'stripe'}
                onChange={(e) => setSelectedMethod(e.target.value as 'stripe' | 'bkash')}
                className="h-4 w-4"
              />
              <div>
                <div className="font-medium">Credit/Debit Card (Stripe)</div>
                <div className="text-sm text-neutral-500">Visa, Mastercard, American Express</div>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-neutral-50">
              <input
                type="radio"
                name="payment"
                value="bkash"
                checked={selectedMethod === 'bkash'}
                onChange={(e) => setSelectedMethod(e.target.value as 'stripe' | 'bkash')}
                className="h-4 w-4"
              />
              <div>
                <div className="font-medium">bKash</div>
                <div className="text-sm text-neutral-500">Mobile payment (Bangladesh)</div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={handlePayment}
          className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-3 font-medium text-white hover:bg-blue-600"
        >
          Pay Now (Mock — {selectedMethod === 'stripe' ? 'Stripe' : 'bKash'})
        </button>
        <p className="mt-4 text-center text-sm text-neutral-500">
          {session ? `Session: ${session.slice(0, 20)}...` : payment ? `Payment: ${payment.slice(0, 20)}...` : ''}
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
