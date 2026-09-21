import { NextResponse } from 'next/server';

/**
 * New paid checkout is held for every plan. Personal is consumer-facing and
 * Start/Grow do not yet have a server-verified business-purchaser boundary.
 * This route intentionally makes no Stripe call, collects no payment method,
 * and does not alter existing subscriptions or entitlements.
 */
export async function POST() {
  return NextResponse.json(
    {
      code: 'NEW_PAID_CHECKOUT_ON_HOLD',
      error: 'New paid activation is unavailable pending billing and legal review. Existing subscriptions are unaffected.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
