import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalEmail, formatDate, getPlanAmount } from '@/lib/email/emailService';

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'your-stripe-secret-key-here' || secretKey.trim() === '') {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  return new Stripe(secretKey);
}

function stripeObjectId(value: string | { id: string } | null | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.id;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  const periodEnds = subscription.items.data
    .map(item => item.current_period_end)
    .filter((value): value is number => typeof value === 'number');
  return periodEnds.length > 0 ? Math.max(...periodEnds) : null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  return stripeObjectId(invoice.parent?.subscription_details?.subscription);
}

function invoicePaymentIntentId(invoice: Stripe.Invoice): string | undefined {
  const invoicePayment = invoice.payments?.data.find(
    payment => payment.payment.type === 'payment_intent'
  );
  return stripeObjectId(invoicePayment?.payment.payment_intent);
}

async function getCustomerInfo(customerId: string): Promise<{ email: string; name: string }> {
  try {
    const stripe = getStripeInstance();
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return { email: '', name: '' };
    return {
      email: (customer as Stripe.Customer).email || '',
      name: (customer as Stripe.Customer).name || '',
    };
  } catch {
    return { email: '', name: '' };
  }
}

async function updateUserSubscription(
  customerId: string,
  data: {
    subscription_status?: string;
    subscription_plan?: string;
    trial_start?: number | null;
    trial_end?: number | null;
    subscription_id?: string;
    paid_trial?: boolean;
  }
) {
  try {
    const supabaseAdmin = getAdminClient();
    const updatePayload: Record<string, unknown> = { stripe_customer_id: customerId };
    if (data.subscription_status !== undefined) updatePayload.subscription_status = data.subscription_status;
    if (data.subscription_plan !== undefined) updatePayload.subscription_plan = data.subscription_plan;
    if (data.trial_start !== undefined) {
      updatePayload.trial_start = data.trial_start ? new Date(data.trial_start * 1000).toISOString() : null;
    }
    if (data.trial_end !== undefined) {
      updatePayload.trial_end = data.trial_end ? new Date(data.trial_end * 1000).toISOString() : null;
    }
    if (data.subscription_id !== undefined) updatePayload.subscription_id = data.subscription_id;
    if (data.paid_trial !== undefined) updatePayload.paid_trial = data.paid_trial;

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update(updatePayload)
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('[Webhook] Failed to update user_profiles:', error.message);
    }
  } catch (err) {
    console.error('[Webhook] Failed to update user subscription in Supabase:', err instanceof Error ? err.message : 'unknown error');
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeInstance();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('[Webhook] Signature error:', message);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  // ── Log billing event to audit table ──────────────────────────────────────
  // Uses ON CONFLICT DO NOTHING on stripe_event_id for idempotency.
  // Duplicate Stripe event IDs will be silently ignored.
  async function logBillingEvent(eventType: string, data: {
    stripeEventId?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripeInvoiceId?: string;
    stripePaymentIntentId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    errorState?: string;
    workspaceId?: string;
    stripeCreatedAt?: number;
  }) {
    try {
      const supabaseAdmin = getAdminClient();
      // Resolve workspace_id from stripe_customer_id (trusted server-side lookup)
      let workspaceId = data.workspaceId;
      if (!workspaceId && data.stripeCustomerId) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', data.stripeCustomerId)
          .single();
        if (profile?.id) {
          const { data: workspace } = await supabaseAdmin
            .from('workspaces')
            .select('id')
            .eq('owner_id', profile.id)
            .single();
          workspaceId = workspace?.id;
        }
      }
      if (!workspaceId) return;

      const eventId = data.stripeEventId || event.id;

      // Idempotency: if this stripe_event_id already exists, skip insert
      const { error: insertError } = await supabaseAdmin.from('billing_events').insert({
        workspace_id: workspaceId,
        event_type: eventType,
        stripe_event_id: eventId,
        stripe_customer_id: data.stripeCustomerId,
        stripe_subscription_id: data.stripeSubscriptionId,
        stripe_invoice_id: data.stripeInvoiceId,
        stripe_payment_intent_id: data.stripePaymentIntentId,
        amount: data.amount,
        currency: data.currency || 'usd',
        status: data.status || 'received',
        metadata: data.metadata,
        error_state: data.errorState,
        stripe_created_at: data.stripeCreatedAt
          ? new Date(data.stripeCreatedAt * 1000).toISOString()
          : null,
        processed_at: new Date().toISOString(),
      });

      // If unique constraint violation (duplicate event), that's expected — not an error
      if (insertError && insertError.code !== '23505') {
        console.error('[Webhook] Failed to log billing event:', insertError.message);
      }
    } catch (logErr) {
      // Non-blocking — log failure should not break webhook processing
      console.error('[Webhook] Failed to log billing event:', logErr instanceof Error ? logErr.message : 'unknown');
    }
  }

  // ── Log webhook failure to admin-visible table ─────────────────────────────
  async function logWebhookFailure(errorMessage: string) {
    try {
      const supabaseAdmin = getAdminClient();
      await supabaseAdmin.from('webhook_failures').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        error_message: errorMessage,
        // Do NOT store raw payload — may contain sensitive billing data
      });
    } catch {
      // Non-blocking
    }
  }

  try {
    const supabaseAdmin = getAdminClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.customer && session.mode === 'subscription' && session.payment_status === 'paid') {
          const customerId = session.customer as string;
          let plan = session.metadata?.plan || 'starter';
          const userId = session.metadata?.userId || '';

          let trialStart: number | null = null;
          let trialEnd: number | null = null;
          let subscriptionId = '';

          if (session.subscription) {
            try {
              const stripe = getStripeInstance();
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              trialStart = subscription.trial_start;
              trialEnd = subscription.trial_end;
              subscriptionId = subscription.id;

              await updateUserSubscription(customerId, {
                subscription_status: 'trial_active',
                subscription_plan: plan,
                trial_start: trialStart,
                trial_end: trialEnd,
                subscription_id: subscriptionId,
                paid_trial: true,
              });

              if (userId) {
                await supabaseAdmin.from('user_profiles').update({
                  stripe_customer_id: customerId,
                  subscription_status: 'trial_active',
                  subscription_plan: plan,
                  trial_start: trialStart ? new Date(trialStart * 1000).toISOString() : null,
                  trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
                  subscription_id: subscriptionId,
                  paid_trial: true,
                }).eq('id', userId);
              }
            } catch (subErr) {
              console.error('[Webhook] Failed to retrieve subscription:', subErr instanceof Error ? subErr.message : 'unknown');
              await updateUserSubscription(customerId, {
                subscription_status: 'trial_active',
                subscription_plan: plan,
                paid_trial: true,
              });
            }
          }

          await logBillingEvent('checkout.session.completed', {
            stripeCustomerId: customerId,
            stripeSubscriptionId: session.subscription as string || undefined,
            status: 'completed',
            stripeCreatedAt: event.created,
          });

          const { email, name } = await getCustomerInfo(customerId);
          if (email) {
            const trialEndDate = trialEnd ? formatDate(trialEnd) : '';
            await sendTransactionalEmail({
              type: 'trial_confirmation',
              to: email,
              name,
              plan,
              trialEndDate,
              amount: getPlanAmount(plan),
            });
          }
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        let plan = subscription.metadata?.plan || 'starter';
        const userId = subscription.metadata?.userId || '';
        const status = subscription.status === 'trialing' ? 'trial_active' : subscription.status;

        await updateUserSubscription(subscription.customer as string, {
          subscription_status: status,
          subscription_plan: plan,
          trial_start: subscription.trial_start,
          trial_end: subscription.trial_end,
          subscription_id: subscription.id,
          paid_trial: subscription.status === 'trialing',
        });

        if (userId) {
          await supabaseAdmin.from('user_profiles').update({
            stripe_customer_id: subscription.customer as string,
            subscription_status: status,
            subscription_plan: plan,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            subscription_id: subscription.id,
            paid_trial: subscription.status === 'trialing',
          }).eq('id', userId);
        }

        await logBillingEvent('customer.subscription.created', {
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        let plan = subscription.metadata?.plan || 'starter';
        const status = subscription.status === 'trialing' ? 'trial_active' : subscription.status;

        await updateUserSubscription(subscription.customer as string, {
          subscription_status: status,
          subscription_plan: plan,
          trial_start: subscription.trial_start,
          trial_end: subscription.trial_end,
          subscription_id: subscription.id,
        });

        await logBillingEvent('customer.subscription.updated', {
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          stripeCreatedAt: event.created,
        });

        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        const wasTrialing = previousAttributes?.status === 'trialing';
        const isNowActive = subscription.status === 'active';

        if (wasTrialing && isNowActive && subscription.customer) {
          const { email, name } = await getCustomerInfo(subscription.customer as string);
          if (email) {
            const periodEnd = subscriptionPeriodEnd(subscription);
            const renewalDate = periodEnd
              ? formatDate(periodEnd)
              : '';
            await sendTransactionalEmail({
              type: 'subscription_started',
              to: email,
              name,
              plan,
              renewalDate,
              amount: getPlanAmount(plan),
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateUserSubscription(subscription.customer as string, {
          subscription_status: 'canceled',
          subscription_plan: subscription.metadata?.plan || undefined,
          trial_end: null,
          paid_trial: false,
        });
        await logBillingEvent('customer.subscription.deleted', {
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: 'canceled',
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'invoice.created': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        await logBillingEvent('invoice.created', {
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subscriptionId,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status || 'draft',
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        await logBillingEvent('invoice.finalized', {
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subscriptionId,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'finalized',
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        const paymentIntentId = invoicePaymentIntentId(invoice);
        if (invoice.customer && subscriptionId) {
          await updateUserSubscription(invoice.customer as string, {
            subscription_status: 'active',
          });
        }
        await logBillingEvent('invoice.payment_succeeded', {
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subscriptionId,
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        const paymentIntentId = invoicePaymentIntentId(invoice);
        if (invoice.customer) {
          await updateUserSubscription(invoice.customer as string, {
            subscription_status: 'past_due',
          });
        }
        await logBillingEvent('invoice.payment_failed', {
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subscriptionId,
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'failed',
          errorState: 'Payment failed',
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await logBillingEvent('charge.refunded', {
          stripeCustomerId: charge.customer as string || undefined,
          stripePaymentIntentId: charge.payment_intent as string || undefined,
          amount: charge.amount_refunded,
          currency: charge.currency,
          status: 'refunded',
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await logBillingEvent('charge.dispute.created', {
          amount: dispute.amount,
          currency: dispute.currency,
          status: dispute.status,
          errorState: `Dispute created: ${dispute.reason}`,
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await logBillingEvent('charge.dispute.closed', {
          amount: dispute.amount,
          currency: dispute.currency,
          status: dispute.status,
          stripeCreatedAt: event.created,
        });
        break;
      }

      case 'invoice.upcoming': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (invoice.customer && subscriptionId) {
          const { email, name } = await getCustomerInfo(invoice.customer as string);
          if (email) {
            let plan = 'starter';
            try {
              const stripe = getStripeInstance();
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              plan = subscription.metadata?.plan || 'starter';
            } catch { /* non-blocking */ }

            const renewalDate = invoice.period_end ? formatDate(invoice.period_end) : '';
            const amountDue = invoice.amount_due
              ? (invoice.amount_due / 100).toFixed(0)
              : getPlanAmount(plan);

            await sendTransactionalEmail({
              type: 'renewal_reminder',
              to: email,
              name,
              plan,
              renewalDate,
              amount: amountDue,
            });
          }
        }
        break;
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook handler error';
    console.error('[Webhook] Handler error:', message);
    // Log failure to admin-visible table (non-blocking)
    await logWebhookFailure(message).catch(() => {});
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
