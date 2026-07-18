import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'your-stripe-secret-key-here' || secretKey.trim() === '') {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  return new Stripe(secretKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 });
    const userId = user.id;
    const email = user.email;

    let stripe: Stripe;
    try {
      stripe = getStripeInstance();
    } catch {
      return NextResponse.json({ message: 'Payment system is not configured. Please contact support.' }, { status: 503 });
    }

    const supabaseAdmin = getAdminClient();

    let profile: { stripe_customer_id: string | null; email: string | null } | null = null;
    {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('stripe_customer_id, email')
        .eq('id', userId)
        .single();
      profile = data;
    }

    const lookupEmail = email || profile?.email;
    let customerId = profile?.stripe_customer_id || null;

    if (!customerId && lookupEmail) {
      const customers = await stripe.customers.list({ email: lookupEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      return NextResponse.json({ message: 'No payment record found for this account. Please complete checkout.' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });

    const activeSub = subscriptions.data.find(s =>
      ['trialing', 'active'].includes(s.status)
    );

    if (!activeSub) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 5,
      });
      const completedSession = sessions.data.find(s => s.payment_status === 'paid' || s.status === 'complete');

      if (!completedSession) {
        return NextResponse.json({ message: 'No completed payment found. Please complete checkout to activate your account.' });
      }

      await supabaseAdmin.from('user_profiles').update({
          stripe_customer_id: customerId,
          subscription_status: 'trial_active',
          paid_trial: true,
        }).eq('id', userId);

      return NextResponse.json({ activated: true, message: 'Account activated from payment record.' });
    }

    const plan = activeSub.metadata?.plan || 'starter';
    await supabaseAdmin.from('user_profiles').update({
        stripe_customer_id: customerId,
        subscription_status: activeSub.status === 'trialing' ? 'trial_active' : 'active',
        subscription_plan: plan,
        subscription_id: activeSub.id,
        trial_start: activeSub.trial_start ? new Date(activeSub.trial_start * 1000).toISOString() : null,
        trial_end: activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null,
        paid_trial: true,
      }).eq('id', userId);

    return NextResponse.json({ activated: true, message: 'Account activated successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to restore purchase';
    console.error('[Restore] Error:', message);
    return NextResponse.json({ message: 'Could not verify payment status. Please contact support.' }, { status: 500 });
  }
}
