import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import type { SendEmailOptions } from '@/lib/email/emailService';

export type WebhookRunResult = 'succeeded' | 'deferred';

export interface StoredStripeWebhookEvent {
  stripe_event_id: string;
  payload: Stripe.Event;
  status: 'pending' | 'processing' | 'retry' | 'succeeded' | 'dead_letter';
  attempt_count: number;
  max_attempts: number;
}

export interface BillingEmailOutboxItem {
  id: string;
  dedupe_key: string;
  email_type: SendEmailOptions['type'];
  recipient: string;
  payload: SendEmailOptions;
  status: 'pending' | 'processing' | 'retry' | 'sent' | 'dead_letter';
  attempt_count: number;
  max_attempts: number;
}

export interface DurableWebhookStore {
  persist(event: Stripe.Event): Promise<'inserted' | 'duplicate'>;
  status(eventId: string): Promise<StoredStripeWebhookEvent['status'] | null>;
  claim(eventId?: string): Promise<StoredStripeWebhookEvent | null>;
  complete(eventId: string): Promise<void>;
  fail(eventId: string, message: string): Promise<'retry' | 'dead_letter'>;
  replay(eventId: string): Promise<void>;
  enqueueEmail(eventId: string, dedupeKey: string, email: SendEmailOptions): Promise<void>;
  claimEmail(outboxId?: string): Promise<BillingEmailOutboxItem | null>;
  completeEmail(outboxId: string): Promise<void>;
  failEmail(outboxId: string, message: string): Promise<'retry' | 'dead_letter'>;
}

function stripeObjectId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' && id.trim() ? id : null;
  }
  return null;
}

export function stripeEventRouting(event: Stripe.Event): {
  stripeCustomerId: string | null;
  objectKey: string;
} {
  const object = event.data.object as unknown as Record<string, unknown>;
  const customer = stripeObjectId(object.customer);
  const objectId = stripeObjectId(object) || event.id;
  return {
    stripeCustomerId: customer,
    objectKey: `${event.type}:${objectId}`,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown durable webhook processing failure';
}

function rpcRow<T>(data: T[] | T | null): T | null {
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

export function createSupabaseDurableWebhookStore(admin: SupabaseClient): DurableWebhookStore {
  return {
    async persist(event) {
      const routing = stripeEventRouting(event);
      const { error } = await admin.from('stripe_webhook_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        object_key: routing.objectKey,
        stripe_customer_id: routing.stripeCustomerId,
        stripe_created_at: new Date(event.created * 1000).toISOString(),
        payload: event,
      });
      if (!error) return 'inserted';
      if (error.code === '23505') return 'duplicate';
      throw new Error(`WEBHOOK_PERSIST_FAILED:${error.message}`);
    },

    async status(eventId) {
      const { data, error } = await admin
        .from('stripe_webhook_events')
        .select('status')
        .eq('stripe_event_id', eventId)
        .maybeSingle();
      if (error) throw new Error(`WEBHOOK_STATUS_FAILED:${error.message}`);
      return (data?.status as StoredStripeWebhookEvent['status'] | undefined) || null;
    },

    async claim(eventId) {
      const { data, error } = await admin.rpc('claim_stripe_webhook_event', {
        requested_event_id: eventId || null,
        lease_seconds: 120,
      });
      if (error) throw new Error(`WEBHOOK_CLAIM_FAILED:${error.message}`);
      return rpcRow(data as StoredStripeWebhookEvent[] | null);
    },

    async complete(eventId) {
      const { error } = await admin.rpc('complete_stripe_webhook_event', {
        completed_event_id: eventId,
      });
      if (error) throw new Error(`WEBHOOK_COMPLETE_FAILED:${error.message}`);
    },

    async fail(eventId, message) {
      const { data, error } = await admin.rpc('fail_stripe_webhook_event', {
        failed_event_id: eventId,
        failure_message: message,
      });
      if (error) throw new Error(`WEBHOOK_FAILURE_RECORD_FAILED:${error.message}`);
      if (data !== 'retry' && data !== 'dead_letter') {
        throw new Error('WEBHOOK_FAILURE_RECORD_INVALID_STATE');
      }
      return data;
    },

    async replay(eventId) {
      const { error } = await admin.rpc('replay_stripe_webhook_event', {
        replay_event_id: eventId,
      });
      if (error) throw new Error(`WEBHOOK_REPLAY_FAILED:${error.message}`);
    },

    async enqueueEmail(eventId, dedupeKey, email) {
      const { error } = await admin.from('billing_email_outbox').insert({
        source_stripe_event_id: eventId,
        dedupe_key: dedupeKey,
        email_type: email.type,
        recipient: email.to,
        payload: email,
      });
      if (error && error.code !== '23505') {
        throw new Error(`EMAIL_OUTBOX_PERSIST_FAILED:${error.message}`);
      }
    },

    async claimEmail(outboxId) {
      const { data, error } = await admin.rpc('claim_billing_email_outbox', {
        requested_outbox_id: outboxId || null,
        lease_seconds: 120,
      });
      if (error) throw new Error(`EMAIL_OUTBOX_CLAIM_FAILED:${error.message}`);
      return rpcRow(data as BillingEmailOutboxItem[] | null);
    },

    async completeEmail(outboxId) {
      const { error } = await admin.rpc('complete_billing_email_outbox', {
        completed_outbox_id: outboxId,
      });
      if (error) throw new Error(`EMAIL_OUTBOX_COMPLETE_FAILED:${error.message}`);
    },

    async failEmail(outboxId, message) {
      const { data, error } = await admin.rpc('fail_billing_email_outbox', {
        failed_outbox_id: outboxId,
        failure_message: message,
      });
      if (error) throw new Error(`EMAIL_OUTBOX_FAILURE_RECORD_FAILED:${error.message}`);
      if (data !== 'retry' && data !== 'dead_letter') {
        throw new Error('EMAIL_OUTBOX_FAILURE_RECORD_INVALID_STATE');
      }
      return data;
    },
  };
}

export async function runClaimedWebhookEvent(
  store: DurableWebhookStore,
  process: (event: Stripe.Event) => Promise<void>,
  eventId?: string
): Promise<WebhookRunResult> {
  const claimed = await store.claim(eventId);
  if (!claimed) return 'deferred';

  try {
    await process(claimed.payload);
    await store.complete(claimed.stripe_event_id);
    return 'succeeded';
  } catch (error) {
    await store.fail(claimed.stripe_event_id, errorMessage(error));
    throw error;
  }
}

export async function runClaimedEmail(
  store: DurableWebhookStore,
  send: (email: SendEmailOptions) => Promise<boolean>,
  outboxId?: string
): Promise<WebhookRunResult> {
  const claimed = await store.claimEmail(outboxId);
  if (!claimed) return 'deferred';

  try {
    const sent = await send(claimed.payload);
    if (!sent) throw new Error('EMAIL_DELIVERY_FAILED');
    await store.completeEmail(claimed.id);
    return 'succeeded';
  } catch (error) {
    await store.failEmail(claimed.id, errorMessage(error));
    throw error;
  }
}
