import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  createSupabaseDurableWebhookStore,
  runClaimedWebhookEvent,
} from '@/lib/stripe/durableWebhook';
import { getStripeServerClient } from '@/lib/stripe/server';
import {
  createWebhookBusinessDependencies,
  processStripeWebhookBusinessEvent,
} from '@/lib/stripe/webhookProcessor';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing stripe signature or webhook secret' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = await getStripeServerClient().webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      '[Webhook] Signature error:',
      error instanceof Error ? error.message : 'verification failed'
    );
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const durableStore = createSupabaseDurableWebhookStore(admin);

    // This durable insert is mandatory and occurs before any successful
    // acknowledgement or entitlement side effect.
    const persistence = await durableStore.persist(event);
    const dependencies = createWebhookBusinessDependencies(admin, durableStore);
    const result = await runClaimedWebhookEvent(
      durableStore,
      queuedEvent => processStripeWebhookBusinessEvent(queuedEvent, dependencies),
      event.id
    );

    if (result === 'deferred') {
      const durableStatus = await durableStore.status(event.id);
      if (durableStatus !== 'succeeded') {
        return NextResponse.json(
          { error: 'Webhook processing pending durable retry' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({
      received: true,
      duplicate: persistence === 'duplicate',
      queued: false,
    });
  } catch (error) {
    console.error(
      '[Webhook] Durable processing failed:',
      error instanceof Error ? error.message : 'unknown'
    );
    // Non-2xx makes Stripe retry. The durable inbox/dead-letter state also
    // permits controlled replay independently of Stripe's retry schedule.
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
