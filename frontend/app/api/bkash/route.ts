// frontend/app/api/bkash/route.ts
// Mock bKash payment — replace with real bKash integration in production

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier, interval, amount } = body;

    const payment = {
      id: `bkash_mock_${Date.now()}`,
      tier,
      interval,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // TODO: Phase 10.4 production — replace with real bKash:
    // 1. Get token: POST https://checkout.pay.bka.sh/v1.2.0-beta/checkout/token/grant
    // 2. Create payment: POST https://checkout.pay.bka.sh/v1.2.0-beta/checkout/create
    // 3. Execute payment: POST https://checkout.pay.bka.sh/v1.2.0-beta/checkout/execute

    return NextResponse.json({
      paymentId: payment.id,
      paymentUrl: `/checkout?payment=${payment.id}&method=bkash&tier=${tier}&interval=${interval}`,
    });
  } catch (error) {
    console.error('bkash error:', error);
    return NextResponse.json(
      { error: 'bKash payment failed' },
      { status: 500 }
    );
  }
}
