import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  formatDate,
  getPlanAmount,
  type SendEmailOptions,
} from '@/lib/email/emailService';
import { logProductAnalyticsEvent } from '@/lib/analytics/server';
import { PLANS, type PlanId } from '@/lib/stripe/plans';
import { getStripeServerClient } from '@/lib/stripe/server';
import type { DurableWebhookStore } from '@/lib/stripe/durableWebhook';
import {
  applyStripeSubscriptionEntitlement,
  createSupabaseEntitlementStore,
  type StripeSubscriptionLike,
} from '@/lib/subscription/server';

interface BillingEventInput {
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
}

export interface WebhookBusinessDependencies {
  applySubscription(subscription: Stripe.Subscription, event: Stripe.Event): Promise<unknown | null>;
  currentPlan(customerId: string): Promise<string>;
  customerInfo(customerId: string): Promise<{ email: string; name: string }>;
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
  logBillingEvent(event: Stripe.Event, eventType: string, data: BillingEventInput): Promise<void>;
  enqueueEmail(eventId: string, dedupeKey: string, email: SendEmailOptions): Promise<void>;
  logAnalytics(input: Parameters<typeof logProductAnalyticsEvent>[0]): Promise<void>;
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

function requireEntitlement(result: unknown | null, event: Stripe.Event): void {
  if (!result) {
    throw new Error(`ENTITLEMENT_BINDING_NOT_FOUND:${event.id}`);
  }
}

export function createWebhookBusinessDependencies(
  admin: SupabaseClient,
  durableStore: DurableWebhookStore
): WebhookBusinessDependencies {
  const entitlementStore = createSupabaseEntitlementStore(admin);

  return {
    async applySubscription(subscription, event) {
      return await applyStripeSubscriptionEntitlement({
        subscription: subscription as unknown as StripeSubscriptionLike,
        stripeEventCreatedAt: new Date(event.created * 1000),
        store: entitlementStore,
      });
    },

    async currentPlan(customerId) {
      const { data, error } = await admin
        .from('workspace_entitlements')
        .select('plan_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      if (error) throw new Error(`ENTITLEMENT_PLAN_LOOKUP_FAILED:${error.message}`);
      return String(data?.plan_id || '');
    },

    async customerInfo(customerId) {
      const customer = await getStripeServerClient().customers.retrieve(customerId);
      if (customer.deleted) return { email: '', name: '' };
      return { email: customer.email || '', name: customer.name || '' };
    },

    async retrieveSubscription(subscriptionId) {
      return await getStripeServerClient().subscriptions.retrieve(subscriptionId);
    },

    async logBillingEvent(event, eventType, data) {
      let workspaceId = data.workspaceId;
      if (!workspaceId && data.stripeCustomerId) {
        const { data: entitlement, error } = await admin
          .from('workspace_entitlements')
          .select('workspace_id')
          .eq('stripe_customer_id', data.stripeCustomerId)
          .maybeSingle();
        if (error) throw new Error(`BILLING_WORKSPACE_LOOKUP_FAILED:${error.message}`);
        workspaceId = entitlement?.workspace_id;
      }

      // Events without a resolvable customer (for example some dispute payloads)
      // remain durable in the inbox. Customer-scoped events must never look handled
      // unless their tenant-scoped audit entry was committed.
      if (!workspaceId) {
        if (data.stripeCustomerId) {
          throw new Error(`BILLING_WORKSPACE_NOT_FOUND:${data.stripeCustomerId}`);
        }
        return;
      }

      const { error } = await admin.from('billing_events').insert({
        workspace_id: workspaceId,
        event_type: eventType,
        stripe_event_id: data.stripeEventId || event.id,
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
      if (error && error.code !== '23505') {
        throw new Error(`BILLING_AUDIT_WRITE_FAILED:${error.message}`);
      }
    },

    async enqueueEmail(eventId, dedupeKey, email) {
      await durableStore.enqueueEmail(eventId, dedupeKey, email);
    },

    async logAnalytics(input) {
      try {
        await logProductAnalyticsEvent(input);
      } catch (error) {
        console.error(
          '[Webhook] Product analytics write failed:',
          error instanceof Error ? error.message : 'unknown'
        );
      }
    },
  };
}

export async function processStripeWebhookBusinessEvent(
  event: Stripe.Event,
  dependencies: WebhookBusinessDependencies
): Promise<void> {
  const applyRequiredSubscription = async (subscription: Stripe.Subscription) => {
    requireEntitlement(await dependencies.applySubscription(subscription, event), event);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer && session.mode === 'subscription' && session.payment_status === 'paid') {
        const customerId = session.customer as string;
        const subscriptionId = stripeObjectId(session.subscription);
        if (!subscriptionId) throw new Error(`CHECKOUT_SUBSCRIPTION_MISSING:${event.id}`);

        const subscription = await dependencies.retrieveSubscription(subscriptionId);
        const plan = subscription.metadata?.plan || session.metadata?.plan || 'starter';
        await applyRequiredSubscription(subscription);

        await dependencies.logBillingEvent(event, 'checkout.session.completed', {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: 'completed',
          stripeCreatedAt: event.created,
          metadata: session.metadata ?? undefined,
        });
        await dependencies.logBillingEvent(event, 'trial_started', {
          stripeEventId: `${event.id}_trial_started`,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: 'trial_active',
          stripeCreatedAt: event.created,
          metadata: session.metadata ?? undefined,
        });
        await dependencies.logAnalytics({
          eventName: 'trial_started',
          userId: session.metadata?.userId || null,
          stripeCustomerId: customerId,
          properties: { plan },
          dedupeKey: `stripe:${event.id}:trial_started`,
          occurredAt: new Date(event.created * 1000).toISOString(),
        });

        const { email, name } = await dependencies.customerInfo(customerId);
        if (email) {
          await dependencies.enqueueEmail(event.id, `${event.id}:trial_confirmation`, {
            type: 'trial_confirmation',
            to: email,
            name,
            plan,
            trialEndDate: subscription.trial_end ? formatDate(subscription.trial_end) : '',
            amount: getPlanAmount(plan),
          });
        }
      }
      break;
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = subscription.metadata?.plan || 'starter';
      await applyRequiredSubscription(subscription);
      await dependencies.logBillingEvent(event, event.type, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        stripeCreatedAt: event.created,
        metadata: subscription.metadata ?? undefined,
      });
      if (subscription.status === 'active') {
        await dependencies.logAnalytics({
          eventName: 'subscription_started',
          userId: subscription.metadata?.userId || null,
          stripeCustomerId: subscription.customer as string,
          properties: { plan },
          dedupeKey: `stripe:${event.id}:subscription_started`,
          occurredAt: new Date(event.created * 1000).toISOString(),
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = subscription.metadata?.plan || 'starter';
      const previousPlan = await dependencies.currentPlan(subscription.customer as string);
      await applyRequiredSubscription(subscription);
      await dependencies.logBillingEvent(event, event.type, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        stripeCreatedAt: event.created,
        metadata: subscription.metadata ?? undefined,
      });

      const previous = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
      if (previous?.status === 'trialing' && subscription.status === 'active') {
        await dependencies.logBillingEvent(event, 'subscription_started', {
          stripeEventId: `${event.id}_subscription_started`,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: 'active',
          stripeCreatedAt: event.created,
          metadata: subscription.metadata ?? undefined,
        });
        await dependencies.logAnalytics({
          eventName: 'subscription_started',
          userId: subscription.metadata?.userId || null,
          stripeCustomerId: subscription.customer as string,
          properties: { plan },
          dedupeKey: `stripe:${event.id}:subscription_started`,
          occurredAt: new Date(event.created * 1000).toISOString(),
        });

        const { email, name } = await dependencies.customerInfo(subscription.customer as string);
        if (email) {
          const periodEnd = subscriptionPeriodEnd(subscription);
          await dependencies.enqueueEmail(event.id, `${event.id}:subscription_started`, {
            type: 'subscription_started',
            to: email,
            name,
            plan,
            renewalDate: periodEnd ? formatDate(periodEnd) : '',
            amount: getPlanAmount(plan),
          });
        }
      }

      const previousPrice = PLANS[previousPlan as PlanId]?.monthlyPrice;
      const currentPrice = PLANS[plan as PlanId]?.monthlyPrice;
      if (previousPlan && previousPlan !== plan && previousPrice != null && currentPrice != null && currentPrice > previousPrice) {
        await dependencies.logAnalytics({
          eventName: 'subscription_upgraded',
          userId: subscription.metadata?.userId || null,
          stripeCustomerId: subscription.customer as string,
          properties: { plan, previous_plan: previousPlan },
          dedupeKey: `stripe:${event.id}:subscription_upgraded`,
          occurredAt: new Date(event.created * 1000).toISOString(),
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await applyRequiredSubscription(subscription);
      await dependencies.logBillingEvent(event, event.type, {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        status: 'canceled',
        stripeCreatedAt: event.created,
      });
      await dependencies.logAnalytics({
        eventName: 'subscription_cancelled',
        userId: subscription.metadata?.userId || null,
        stripeCustomerId: subscription.customer as string,
        properties: { plan: subscription.metadata?.plan || '' },
        dedupeKey: `stripe:${event.id}:subscription_cancelled`,
        occurredAt: new Date(event.created * 1000).toISOString(),
      });
      break;
    }

    case 'invoice.created':
    case 'invoice.finalized': {
      const invoice = event.data.object as Stripe.Invoice;
      await dependencies.logBillingEvent(event, event.type, {
        stripeCustomerId: invoice.customer as string,
        stripeSubscriptionId: invoiceSubscriptionId(invoice),
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: event.type === 'invoice.finalized' ? 'finalized' : invoice.status || 'draft',
        stripeCreatedAt: event.created,
      });
      break;
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (invoice.customer && subscriptionId) {
        await applyRequiredSubscription(await dependencies.retrieveSubscription(subscriptionId));
      }
      const failed = event.type === 'invoice.payment_failed';
      await dependencies.logBillingEvent(event, event.type, {
        stripeCustomerId: invoice.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoicePaymentIntentId(invoice),
        amount: failed ? invoice.amount_due : invoice.amount_paid,
        currency: invoice.currency,
        status: failed ? 'failed' : 'succeeded',
        errorState: failed ? 'Payment failed' : undefined,
        stripeCreatedAt: event.created,
      });
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await dependencies.logBillingEvent(event, event.type, {
        stripeCustomerId: charge.customer as string || undefined,
        stripePaymentIntentId: charge.payment_intent as string || undefined,
        amount: charge.amount_refunded,
        currency: charge.currency,
        status: 'refunded',
        stripeCreatedAt: event.created,
      });
      break;
    }

    case 'charge.dispute.created':
    case 'charge.dispute.closed': {
      const dispute = event.data.object as Stripe.Dispute;
      await dependencies.logBillingEvent(event, event.type, {
        amount: dispute.amount,
        currency: dispute.currency,
        status: dispute.status,
        errorState: event.type === 'charge.dispute.created'
          ? `Dispute created: ${dispute.reason}`
          : undefined,
        stripeCreatedAt: event.created,
      });
      break;
    }

    case 'invoice.upcoming': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (invoice.customer && subscriptionId) {
        const customerId = invoice.customer as string;
        const subscription = await dependencies.retrieveSubscription(subscriptionId);
        const plan = subscription.metadata?.plan || 'starter';
        const { email, name } = await dependencies.customerInfo(customerId);
        if (email) {
          await dependencies.enqueueEmail(event.id, `${event.id}:renewal_reminder`, {
            type: 'renewal_reminder',
            to: email,
            name,
            plan,
            renewalDate: invoice.period_end ? formatDate(invoice.period_end) : '',
            amount: invoice.amount_due
              ? (invoice.amount_due / 100).toFixed(0)
              : getPlanAmount(plan),
          });
        }
      }
      break;
    }

    default:
      // Unknown signed events are still durably recorded and marked complete.
      break;
  }
}
