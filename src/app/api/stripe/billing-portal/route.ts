import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';


function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'your-stripe-secret-key-here' || secretKey.trim() === '') {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  return new Stripe(secretKey);
}

export async function POST(req: NextRequest) {
  let stripe: Stripe;
  try {
    stripe = getStripeInstance();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe is not configured';
    console.error('[Stripe] Billing portal configuration error:', message);
    return NextResponse.json(
      { error: 'Payment system is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to manage billing.' }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    const customerId = profile?.stripe_customer_id;
    if (!customerId) return NextResponse.json({ error: 'No billing account was found.' }, { status: 404 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/billing-subscriptions`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const isStripeError = error instanceof Stripe.errors.StripeError;
    const message = error instanceof Error ? error.message : 'Failed to create billing portal session';

    console.error('[Stripe] Billing portal error:', {
      type: isStripeError ? (error as Stripe.errors.StripeError).type : 'unknown',
      message,
    });

    let friendlyMessage = 'Unable to open billing portal. Please try again.';
    if (isStripeError) {
      const stripeErr = error as Stripe.errors.StripeError;
      if (stripeErr.type === 'StripeAuthenticationError') {
        friendlyMessage = 'Payment system configuration error. Please contact support.';
      } else if (stripeErr.type === 'StripeInvalidRequestError') {
        friendlyMessage = 'Invalid request. Please try again or contact support.';
      }
    }

    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
