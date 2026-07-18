import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { PLANS, CHECKOUT_PLANS, getStripePriceId, TRIAL_CONFIG, type PlanId } from '@/lib/stripe/plans';

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'your-stripe-secret-key-here' || secretKey.trim() === '') {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  return new Stripe(secretKey);
}

const ACTIVE_STATUSES = ['trialing', 'active', 'trial_active'];

/** Validate that the requested plan is a self-serve checkout plan */
function isValidCheckoutPlan(plan: string): plan is PlanId {
  return CHECKOUT_PLANS.some(p => p.id === plan);
}

export async function POST(req: NextRequest) {
  let stripe: Stripe;
  try {
    stripe = getStripeInstance();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe is not configured';
    console.error('[Stripe] Configuration error:', message);
    return NextResponse.json(
      { error: 'Payment system is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in before starting checkout.' }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();
    const { plan, name } = await req.json();
    const userId = user.id;
    const email = user.email;

    // Validate plan against the single source of truth
    if (!plan || !isValidCheckoutPlan(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    const planConfig = PLANS[plan as PlanId];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money';

    // ── DUPLICATE PAYMENT GUARD ──────────────────────────────────────────────
    {
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('subscription_status, subscription_plan, stripe_customer_id')
        .eq('id', userId)
        .single();

      if (existingProfile && ACTIVE_STATUSES.includes(existingProfile.subscription_status || '')) {
        console.log('[Stripe] User already has active subscription. Skipping checkout.');
        return NextResponse.json({ alreadyActive: true, redirectTo: '/dashboard' });
      }
    }

    // Look up existing Stripe customer ID from Supabase
    let existingCustomerId: string | null = null;
    {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('stripe_customer_id, email')
        .eq('id', userId)
        .single();
      if (profile?.stripe_customer_id) {
        existingCustomerId = profile.stripe_customer_id;
      }
    }

    let customer: Stripe.Customer | null = null;

    if (existingCustomerId) {
      try {
        const existing = await stripe.customers.retrieve(existingCustomerId);
        if (!existing.deleted) {
          customer = existing as Stripe.Customer;
        }
      } catch {
        existingCustomerId = null;
      }
    }

    if (!customer) {
      const lookupEmail = email || undefined;
      if (lookupEmail) {
        const existingCustomers = await stripe.customers.list({ email: lookupEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];

          const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 5 });
          const activeSub = subs.data.find(s => ['trialing', 'active'].includes(s.status));
          if (activeSub) {
            await supabaseAdmin.from('user_profiles').update({
                stripe_customer_id: customer.id,
                subscription_status: activeSub.status === 'trialing' ? 'trial_active' : 'active',
                subscription_plan: plan,
                subscription_id: activeSub.id,
                trial_start: activeSub.trial_start ? new Date(activeSub.trial_start * 1000).toISOString() : null,
                trial_end: activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null,
              }).eq('id', userId);
            return NextResponse.json({ alreadyActive: true, redirectTo: '/dashboard' });
          }
        }
      }
      if (!customer) {
        customer = await stripe.customers.create({
          email: email || undefined,
          name: name || undefined,
          metadata: { plan, userId },
        });
      }
    }

    if (customer.id) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
    }

    const priceId = getStripePriceId(plan as PlanId);
    const monthlyAmount = planConfig.stripeAmountCents!;

    // Build line items — use Stripe price ID if configured, otherwise use price_data
    const subscriptionLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${planConfig.name} Plan`,
                description: `${planConfig.name} — ${planConfig.description}`,
              },
              unit_amount: monthlyAmount,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ];

    // A one-time $1 trial charge is invoiced immediately. The recurring plan
    // remains at $0 until the 14-day trial ends, then renews at its normal rate.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      ...subscriptionLineItems,
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${TRIAL_CONFIG.durationDays}-day paid trial`,
            description: `$1 today, then $${monthlyAmount / 100}/month after the trial`,
          },
          unit_amount: TRIAL_CONFIG.chargeCents,
        },
        quantity: 1,
      },
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      subscription_data: {
        // Recurring plan begins after the $1 paid trial.
        trial_period_days: TRIAL_CONFIG.durationDays,
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' },
        },
        metadata: { plan, userId },
      },
      payment_method_collection: 'always',
      success_url: `${siteUrl}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${siteUrl}/checkout?plan=${plan}&cancelled=1`,
      metadata: { plan, userId },
      custom_text: {
        submit: {
          message: `$${TRIAL_CONFIG.chargeCents / 100} today for ${TRIAL_CONFIG.durationDays} days. Then $${monthlyAmount / 100}/month unless canceled.`,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('[Stripe] Checkout session created for plan:', plan, '| trial days:', TRIAL_CONFIG.durationDays);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const isStripeError = error instanceof Stripe.errors.StripeError;
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';

    console.error('[Stripe] Checkout error:', {
      type: isStripeError ? (error as Stripe.errors.StripeError).type : 'unknown',
      message,
    });

    let friendlyMessage = 'Unable to start checkout. Please try again.';
    if (isStripeError) {
      const stripeErr = error as Stripe.errors.StripeError;
      if (stripeErr.type === 'StripeAuthenticationError') {
        friendlyMessage = 'Payment system configuration error. Please contact support.';
      } else if (stripeErr.type === 'StripeInvalidRequestError') {
        friendlyMessage = 'Invalid payment request. Please check your plan selection and try again.';
      } else if (stripeErr.type === 'StripeConnectionError') {
        friendlyMessage = 'Could not connect to payment processor. Please check your internet connection.';
      }
    }

    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
