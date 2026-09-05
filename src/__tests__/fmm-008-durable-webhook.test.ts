import fs from 'node:fs';
import path from 'node:path';
import type Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import type { SendEmailOptions } from '@/lib/email/emailService';
import {
  runClaimedEmail,
  runClaimedWebhookEvent,
  stripeEventRouting,
  type BillingEmailOutboxItem,
  type DurableWebhookStore,
  type StoredStripeWebhookEvent,
} from '@/lib/stripe/durableWebhook';
import {
  processStripeWebhookBusinessEvent,
  type WebhookBusinessDependencies,
} from '@/lib/stripe/webhookProcessor';
import {
  applyStripeSubscriptionEntitlement,
  type StripeSubscriptionLike,
  type WorkspaceEntitlementRow,
  type WorkspaceEntitlementStore,
} from '@/lib/subscription/server';

const CUSTOMER_ID = 'cus_fmm008_fixture';
const SUBSCRIPTION_ID = 'sub_fmm008_fixture';

function subscription(status: Stripe.Subscription.Status = 'active'): Stripe.Subscription {
  return {
    id: SUBSCRIPTION_ID,
    object: 'subscription',
    customer: CUSTOMER_ID,
    status,
    created: 1_788_454_800,
    trial_start: null,
    trial_end: null,
    metadata: { plan: 'starter' },
    items: { data: [{ current_period_end: 1_791_046_800 }] },
  } as unknown as Stripe.Subscription;
}

function stripeFixture(
  id: string,
  created: number,
  status: Stripe.Subscription.Status = 'active'
): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: '2026-08-27.basil',
    created,
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'customer.subscription.updated',
    data: { object: subscription(status) },
  } as unknown as Stripe.Event;
}

class MemoryDurableStore implements DurableWebhookStore {
  events = new Map<string, StoredStripeWebhookEvent>();
  emails = new Map<string, BillingEmailOutboxItem>();
  trace: string[] = [];

  async persist(event: Stripe.Event) {
    this.trace.push(`persist:${event.id}`);
    if (this.events.has(event.id)) return 'duplicate' as const;
    this.events.set(event.id, {
      stripe_event_id: event.id,
      payload: event,
      status: 'pending',
      attempt_count: 0,
      max_attempts: 2,
    });
    return 'inserted' as const;
  }

  async claim(eventId?: string) {
    const event = eventId
      ? this.events.get(eventId)
      : [...this.events.values()].find(item => ['pending', 'retry'].includes(item.status));
    if (!event || !['pending', 'retry'].includes(event.status)) return null;
    event.status = 'processing';
    event.attempt_count += 1;
    this.trace.push(`claim:${event.stripe_event_id}`);
    return event;
  }

  async status(eventId: string) {
    return this.events.get(eventId)?.status || null;
  }

  async complete(eventId: string) {
    this.events.get(eventId)!.status = 'succeeded';
    this.trace.push(`complete:${eventId}`);
  }

  async fail(eventId: string) {
    const event = this.events.get(eventId)!;
    event.status = event.attempt_count >= event.max_attempts ? 'dead_letter' : 'retry';
    this.trace.push(`fail:${eventId}:${event.status}`);
    return event.status;
  }

  async replay(eventId: string) {
    const event = this.events.get(eventId)!;
    if (!['retry', 'dead_letter'].includes(event.status)) throw new Error('not replayable');
    event.status = 'pending';
    event.attempt_count = 0;
  }

  async enqueueEmail(eventId: string, dedupeKey: string, email: SendEmailOptions) {
    if ([...this.emails.values()].some(item => item.dedupe_key === dedupeKey)) return;
    const id = `email-${this.emails.size + 1}`;
    this.emails.set(id, {
      id,
      dedupe_key: dedupeKey,
      email_type: email.type,
      recipient: email.to,
      payload: email,
      status: 'pending',
      attempt_count: 0,
      max_attempts: 2,
    });
    expect(this.events.has(eventId)).toBe(true);
  }

  async claimEmail(outboxId?: string) {
    const email = outboxId
      ? this.emails.get(outboxId)
      : [...this.emails.values()].find(item => ['pending', 'retry'].includes(item.status));
    if (!email || !['pending', 'retry'].includes(email.status)) return null;
    email.status = 'processing';
    email.attempt_count += 1;
    return email;
  }

  async completeEmail(outboxId: string) {
    this.emails.get(outboxId)!.status = 'sent';
  }

  async failEmail(outboxId: string) {
    const email = this.emails.get(outboxId)!;
    email.status = email.attempt_count >= email.max_attempts ? 'dead_letter' : 'retry';
    return email.status;
  }
}

function businessDependencies(
  overrides: Partial<WebhookBusinessDependencies> = {}
): WebhookBusinessDependencies {
  return {
    applySubscription: vi.fn(async () => ({})),
    currentPlan: vi.fn(async () => 'starter'),
    customerInfo: vi.fn(async () => ({ email: '', name: '' })),
    retrieveSubscription: vi.fn(async () => subscription()),
    logBillingEvent: vi.fn(async () => undefined),
    enqueueEmail: vi.fn(async () => undefined),
    logAnalytics: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('FMM-008 durable Stripe webhook processing', () => {
  it('fails closed when the retry worker has no authorization secret', async () => {
    const original = process.env.STRIPE_WEBHOOK_WORKER_SECRET;
    delete process.env.STRIPE_WEBHOOK_WORKER_SECRET;
    try {
      const { POST } = await import('@/app/api/internal/stripe/webhook-jobs/route');
      const response = await POST(new NextRequest(
        'http://localhost/api/internal/stripe/webhook-jobs',
        { method: 'POST' }
      ));
      expect(response.status).toBe(401);
    } finally {
      if (original === undefined) delete process.env.STRIPE_WEBHOOK_WORKER_SECRET;
      else process.env.STRIPE_WEBHOOK_WORKER_SECRET = original;
    }
  });

  it('persists before processing and treats concurrent duplicate delivery idempotently', async () => {
    const store = new MemoryDurableStore();
    const event = stripeFixture('evt_fmm008_duplicate', 1_788_454_800);
    expect(stripeEventRouting(event)).toMatchObject({ stripeCustomerId: CUSTOMER_ID });
    expect(await store.persist(event)).toBe('inserted');
    expect(await store.persist(event)).toBe('duplicate');

    const process = vi.fn(async () => { store.trace.push(`process:${event.id}`); });
    const results = await Promise.all([
      runClaimedWebhookEvent(store, process, event.id),
      runClaimedWebhookEvent(store, process, event.id),
    ]);

    expect(results.sort()).toEqual(['deferred', 'succeeded']);
    expect(process).toHaveBeenCalledTimes(1);
    expect(store.trace.indexOf(`persist:${event.id}`)).toBeLessThan(
      store.trace.indexOf(`process:${event.id}`)
    );
  });

  it('retries failures, dead-letters at the attempt bound, and supports controlled replay', async () => {
    const store = new MemoryDurableStore();
    const event = stripeFixture('evt_fmm008_replay', 1_788_454_801);
    await store.persist(event);
    const failure = async () => { throw new Error('isolated entitlement write failure'); };

    await expect(runClaimedWebhookEvent(store, failure, event.id)).rejects.toThrow('entitlement');
    expect(store.events.get(event.id)?.status).toBe('retry');
    await expect(runClaimedWebhookEvent(store, failure, event.id)).rejects.toThrow('entitlement');
    expect(store.events.get(event.id)?.status).toBe('dead_letter');

    await store.replay(event.id);
    await expect(runClaimedWebhookEvent(store, async () => undefined, event.id)).resolves.toBe('succeeded');
  });

  it('fails the event when a required entitlement transaction has no tenant binding', async () => {
    const dependencies = businessDependencies({
      applySubscription: vi.fn(async () => null),
    });
    await expect(processStripeWebhookBusinessEvent(
      stripeFixture('evt_fmm008_missing_binding', 1_788_454_802),
      dependencies
    )).rejects.toThrow('ENTITLEMENT_BINDING_NOT_FOUND');
    expect(dependencies.logBillingEvent).not.toHaveBeenCalled();
  });

  it('deduplicates email outbox entries and retries failed delivery before marking sent', async () => {
    const store = new MemoryDurableStore();
    const event = stripeFixture('evt_fmm008_email', 1_788_454_803);
    await store.persist(event);
    const email: SendEmailOptions = {
      type: 'subscription_started',
      to: 'fixture@example.test',
      plan: 'starter',
    };
    await store.enqueueEmail(event.id, `${event.id}:subscription_started`, email);
    await store.enqueueEmail(event.id, `${event.id}:subscription_started`, email);
    expect(store.emails).toHaveLength(1);

    await expect(runClaimedEmail(store, async () => false)).rejects.toThrow('EMAIL_DELIVERY_FAILED');
    expect([...store.emails.values()][0].status).toBe('retry');
    await expect(runClaimedEmail(store, async () => true)).resolves.toBe('succeeded');
    expect([...store.emails.values()][0].status).toBe('sent');
  });

  it('keeps the newer restrictive entitlement when isolated fixtures arrive out of order', async () => {
    const saved: WorkspaceEntitlementRow[] = [];
    let current: WorkspaceEntitlementRow = {
      workspace_id: 'workspace-fmm008',
      stripe_customer_id: CUSTOMER_ID,
      stripe_subscription_id: SUBSCRIPTION_ID,
      stripe_status: 'active',
      access_state: 'active',
      plan_id: 'starter',
      trial_ends_at: null,
      current_period_ends_at: '2026-10-03T18:00:00.000Z',
      grace_ends_at: null,
      last_verified_at: '2026-09-03T20:00:00.000Z',
      last_stripe_event_created_at: null,
      last_reconciliation_error: null,
    };
    const entitlementStore: WorkspaceEntitlementStore = {
      async findByWorkspaceId() { return current; },
      async findByStripeCustomerId() { return current; },
      async save(row) { current = { ...row }; saved.push(current); return current; },
    };
    const canceled = subscription('canceled') as unknown as StripeSubscriptionLike;
    const active = subscription('active') as unknown as StripeSubscriptionLike;

    await applyStripeSubscriptionEntitlement({
      subscription: canceled,
      stripeEventCreatedAt: new Date('2026-09-03T20:00:02.000Z'),
      store: entitlementStore,
      now: new Date('2026-09-03T20:00:02.000Z'),
    });
    await applyStripeSubscriptionEntitlement({
      subscription: active,
      stripeEventCreatedAt: new Date('2026-09-03T20:00:01.000Z'),
      store: entitlementStore,
      now: new Date('2026-09-03T20:00:03.000Z'),
    });

    expect(current).toMatchObject({ stripe_status: 'canceled', access_state: 'expired' });
    expect(saved).toHaveLength(1);
  });

  it('defines service-only durable queues, leases, backoff, dead-letter visibility, and replay', () => {
    const migration = fs.readFileSync(path.join(
      process.cwd(),
      'supabase/migrations/20260903205959_fmm_008_durable_stripe_webhooks.sql'
    ), 'utf8');
    expect(migration).toContain('CREATE TABLE public.stripe_webhook_events');
    expect(migration).toContain('CREATE TABLE public.billing_email_outbox');
    expect(migration).toContain('FOR UPDATE SKIP LOCKED');
    expect(migration).toContain('stripe_webhook_customer_locks');
    expect(migration).toContain("'dead_letter'");
    expect(migration).toContain('power(2');
    expect(migration).toContain('replay_stripe_webhook_event');
    expect(migration).toContain('webhook_failures_select_platform_admins');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');

    const worker = fs.readFileSync(path.join(
      process.cwd(),
      'src/app/api/internal/stripe/webhook-jobs/route.ts'
    ), 'utf8');
    const health = fs.readFileSync(path.join(
      process.cwd(),
      'src/app/admin/health/components/AdminHealthContent.tsx'
    ), 'utf8');
    expect(worker).toContain('STRIPE_WEBHOOK_WORKER_SECRET');
    expect(worker).toContain('status: webhookFailed + emailFailed > 0 ? 503 : 200');
    const webhook = fs.readFileSync(path.join(
      process.cwd(),
      'src/app/api/stripe/webhook/route.ts'
    ), 'utf8');
    expect(webhook).toContain("durableStatus !== 'succeeded'");
    expect(webhook).toContain('{ status: 503 }');
    expect(health).toContain('Webhook Processing');
    expect(health).toContain('dead-letter');
  });
});
