import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EntitlementReconciliationError,
  applyStripeSubscriptionEntitlement,
  bindStripeCustomerToWorkspace,
  buildVerifiedEntitlementRow,
  getWorkspaceEntitlementDecision,
  reconcileWorkspaceEntitlement,
  type StripeSubscriptionGateway,
  type StripeSubscriptionLike,
  type WorkspaceEntitlementRow,
  type WorkspaceEntitlementStore,
} from '@/lib/subscription/server';

const NOW = new Date('2026-09-03T18:00:00.000Z');
const FUTURE = Math.floor(Date.parse('2026-10-03T18:00:00.000Z') / 1000);

function row(overrides: Partial<WorkspaceEntitlementRow> = {}): WorkspaceEntitlementRow {
  return {
    workspace_id: 'workspace-a',
    stripe_customer_id: 'cus_a',
    stripe_subscription_id: 'sub_a',
    stripe_status: 'none',
    access_state: 'expired',
    plan_id: 'starter',
    trial_ends_at: null,
    current_period_ends_at: null,
    grace_ends_at: null,
    last_verified_at: null,
    last_stripe_event_created_at: null,
    last_reconciliation_error: null,
    ...overrides,
  };
}

function subscription(overrides: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike {
  return {
    id: 'sub_a',
    customer: 'cus_a',
    status: 'active',
    created: Math.floor(NOW.getTime() / 1000),
    trial_start: null,
    trial_end: null,
    metadata: { plan: 'starter' },
    items: { data: [{ current_period_end: FUTURE }] },
    ...overrides,
  };
}

function memoryStore(initial: WorkspaceEntitlementRow[]): WorkspaceEntitlementStore & {
  rows: Map<string, WorkspaceEntitlementRow>;
  saves: WorkspaceEntitlementRow[];
} {
  const rows = new Map(initial.map(item => [item.workspace_id, { ...item }]));
  const saves: WorkspaceEntitlementRow[] = [];
  return {
    rows,
    saves,
    async findByWorkspaceId(workspaceId) {
      return rows.get(workspaceId) || null;
    },
    async findByStripeCustomerId(customerId) {
      return [...rows.values()].find(item => item.stripe_customer_id === customerId) || null;
    },
    async save(item) {
      const saved = { ...item };
      rows.set(item.workspace_id, saved);
      saves.push(saved);
      return saved;
    },
  };
}

function gateway(input: {
  listed?: StripeSubscriptionLike[];
} = {}): StripeSubscriptionGateway {
  return {
    async list() {
      return input.listed || [];
    },
  };
}

describe('FMM-004 workspace entitlement authority', () => {
  it('maps current Stripe active and trialing subscriptions to bounded access', () => {
    const active = buildVerifiedEntitlementRow({
      existing: row(), subscription: subscription(), stripeCustomerId: 'cus_a', verifiedAt: NOW,
    });
    expect(active).toMatchObject({ stripe_status: 'active', access_state: 'active' });
    expect(active.current_period_ends_at).toBe('2026-10-03T18:00:00.000Z');

    const trial = buildVerifiedEntitlementRow({
      existing: row(),
      subscription: subscription({ status: 'trialing', trial_end: FUTURE }),
      stripeCustomerId: 'cus_a',
      verifiedAt: NOW,
    });
    expect(trial).toMatchObject({ stripe_status: 'trialing', access_state: 'trial' });
  });

  it('expires canceled access immediately', async () => {
    const store = memoryStore([row({ access_state: 'active', stripe_status: 'active' })]);
    const result = await applyStripeSubscriptionEntitlement({
      subscription: subscription({ status: 'canceled', items: { data: [] } }),
      stripeEventCreatedAt: NOW,
      store,
      now: NOW,
    });
    expect(result).toMatchObject({ stripe_status: 'canceled', access_state: 'expired' });
  });

  it('anchors past_due grace once and never extends it during later verification', () => {
    const first = buildVerifiedEntitlementRow({
      existing: row({ stripe_status: 'active', access_state: 'active' }),
      subscription: subscription({ status: 'past_due', items: { data: [] } }),
      stripeCustomerId: 'cus_a',
      verifiedAt: NOW,
      stripeEventCreatedAt: NOW,
    });
    const later = buildVerifiedEntitlementRow({
      existing: first,
      subscription: subscription({ status: 'past_due', items: { data: [] } }),
      stripeCustomerId: 'cus_a',
      verifiedAt: new Date(NOW.getTime() + 86_400_000),
    });
    expect(first.grace_ends_at).toBe('2026-09-06T18:00:00.000Z');
    expect(later.grace_ends_at).toBe(first.grace_ends_at);
  });

  it('repairs a missing stored subscription only when Stripe has one unambiguous candidate', async () => {
    const store = memoryStore([row()]);
    const result = await reconcileWorkspaceEntitlement({
      workspaceId: 'workspace-a',
      store,
      gateway: gateway({
        listed: [subscription({ id: 'sub_recovered' })],
      }),
      now: NOW,
    });
    expect(result).toMatchObject({ stripe_subscription_id: 'sub_recovered', access_state: 'active' });
  });

  it('selects the one live subscription when production-shaped history also contains a canceled subscription', async () => {
    const store = memoryStore([row({ stripe_subscription_id: 'sub_canceled' })]);
    const result = await reconcileWorkspaceEntitlement({
      workspaceId: 'workspace-a',
      store,
      gateway: gateway({
        listed: [
          subscription({ id: 'sub_canceled', status: 'canceled', items: { data: [] } }),
          subscription({ id: 'sub_live', status: 'active' }),
        ],
      }),
      now: NOW,
    });
    expect(result).toMatchObject({ stripe_subscription_id: 'sub_live', access_state: 'active' });
  });

  it('fails closed when multiple access-relevant subscriptions are bound to one customer', async () => {
    const store = memoryStore([row({ stripe_subscription_id: null })]);
    await expect(reconcileWorkspaceEntitlement({
      workspaceId: 'workspace-a',
      store,
      gateway: gateway({ listed: [subscription(), subscription({ id: 'sub_b', status: 'trialing', trial_end: FUTURE })] }),
      now: NOW,
    })).rejects.toMatchObject({ code: 'AMBIGUOUS_STRIPE_SUBSCRIPTIONS' });
    expect(store.rows.get('workspace-a')).toMatchObject({
      access_state: 'expired',
      last_verified_at: null,
      last_reconciliation_error: 'AMBIGUOUS_STRIPE_SUBSCRIPTIONS',
    });
  });

  it('rejects a subscription owned by another Stripe customer and revokes cached authority', async () => {
    const store = memoryStore([row({
      stripe_status: 'active',
      access_state: 'active',
      current_period_ends_at: '2026-10-03T18:00:00.000Z',
      last_verified_at: '2026-09-03T17:30:00.000Z',
    })]);
    await expect(reconcileWorkspaceEntitlement({
      workspaceId: 'workspace-a',
      store,
      gateway: gateway({ listed: [subscription({ customer: 'cus_other' })] }),
      now: NOW,
    })).rejects.toBeInstanceOf(EntitlementReconciliationError);
    expect(store.rows.get('workspace-a')).toMatchObject({
      access_state: 'expired',
      last_verified_at: null,
      last_reconciliation_error: 'STRIPE_CUSTOMER_MISMATCH',
    });
  });

  it('ignores out-of-order Stripe events so an old active event cannot undo cancellation', async () => {
    const store = memoryStore([row({
      stripe_status: 'canceled',
      access_state: 'expired',
      last_stripe_event_created_at: '2026-09-03T18:00:00.000Z',
    })]);
    const result = await applyStripeSubscriptionEntitlement({
      subscription: subscription({ status: 'active' }),
      stripeEventCreatedAt: new Date('2026-09-03T17:59:59.000Z'),
      store,
      now: NOW,
    });
    expect(result).toMatchObject({ stripe_status: 'canceled', access_state: 'expired' });
    expect(store.saves).toHaveLength(0);
  });

  it('resolves equal-second webhook conflicts toward the state that denies or limits access', async () => {
    const eventAt = new Date('2026-09-03T18:00:00.000Z');
    const store = memoryStore([row({
      stripe_status: 'active',
      access_state: 'active',
      current_period_ends_at: '2026-10-03T18:00:00.000Z',
      last_stripe_event_created_at: eventAt.toISOString(),
    })]);
    await applyStripeSubscriptionEntitlement({
      subscription: subscription({ status: 'canceled', items: { data: [] } }),
      stripeEventCreatedAt: eventAt,
      store,
      now: NOW,
    });
    await applyStripeSubscriptionEntitlement({
      subscription: subscription({ status: 'active' }),
      stripeEventCreatedAt: eventAt,
      store,
      now: NOW,
    });
    expect(store.rows.get('workspace-a')).toMatchObject({
      stripe_status: 'canceled',
      access_state: 'expired',
    });
    expect(store.saves).toHaveLength(1);
  });

  it('fails closed during a stale-state Stripe outage without overwriting prior billing evidence', async () => {
    const store = memoryStore([row({
      stripe_status: 'active',
      access_state: 'active',
      current_period_ends_at: '2026-10-03T18:00:00.000Z',
      last_verified_at: '2026-09-03T16:00:00.000Z',
    })]);
    await expect(getWorkspaceEntitlementDecision({
      workspaceId: 'workspace-a',
      store,
      gateway: { async list() { throw new Error('simulated outage'); } },
      now: NOW,
    })).rejects.toMatchObject({ code: 'STRIPE_RECONCILIATION_UNAVAILABLE' });
    expect(store.rows.get('workspace-a')).toMatchObject({
      stripe_status: 'active',
      access_state: 'active',
      last_verified_at: '2026-09-03T16:00:00.000Z',
    });
    expect(store.saves).toHaveLength(0);
  });

  it('prevents one Stripe customer from being bound to two workspaces', async () => {
    const store = memoryStore([
      row(),
      row({ workspace_id: 'workspace-b', stripe_customer_id: null, stripe_subscription_id: null }),
    ]);
    await expect(bindStripeCustomerToWorkspace({
      workspaceId: 'workspace-b', stripeCustomerId: 'cus_a', store,
    })).rejects.toMatchObject({ code: 'STRIPE_CUSTOMER_MISMATCH' });
  });

  it('replaces a missing customer binding only when the exact prior binding is supplied', async () => {
    const store = memoryStore([row({ stripe_customer_id: 'cus_missing' })]);
    await expect(bindStripeCustomerToWorkspace({
      workspaceId: 'workspace-a', stripeCustomerId: 'cus_new', store,
    })).rejects.toMatchObject({ code: 'STRIPE_CUSTOMER_MISMATCH' });

    const rebound = await bindStripeCustomerToWorkspace({
      workspaceId: 'workspace-a',
      stripeCustomerId: 'cus_new',
      expectedPreviousCustomerId: 'cus_missing',
      store,
    });
    expect(rebound).toMatchObject({
      stripe_customer_id: 'cus_new',
      stripe_subscription_id: null,
      stripe_status: 'none',
      access_state: 'expired',
      last_verified_at: null,
    });
  });

  it('contains no email-based customer claiming or historical purchase restoration', () => {
    const checkout = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/stripe/create-checkout/route.ts'), 'utf8');
    const restoration = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/stripe/restore-purchase/route.ts'), 'utf8');
    const migration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260903170000_fmm_004_workspace_entitlements.sql'), 'utf8');
    const contextCutover = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260903173000_fmm_004_entitlement_context_cutover.sql'), 'utf8');
    const analytics = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/analytics/server.ts'), 'utf8');
    const reconciliation = fs.readFileSync(path.resolve(process.cwd(), 'scripts/reconcile-fmm-004-entitlements.ts'), 'utf8');

    expect(checkout).not.toContain('customers.list');
    expect(checkout).not.toMatch(/\.list\(\{\s*email/);
    expect(restoration).toContain("status: 410");
    expect(restoration).not.toMatch(/Stripe|checkout\.sessions|subscriptions\.list|getAdminClient/);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b|\bDROP\s+TABLE\b|\bUPDATE\s+public\.user_profiles\b/i);
    expect(migration).toContain("'expired'");
    expect(contextCutover).toContain('LEFT JOIN public.workspace_entitlements');
    expect(contextCutover).not.toContain('owner_profile.subscription_status');
    expect(analytics).not.toMatch(/from\('user_profiles'\)[\s\S]{0,300}eq\('stripe_customer_id'/);
    expect(reconciliation).toContain("process.argv.includes('--apply')");
    expect(reconciliation).toContain("mode: apply ? 'apply' : 'dry-run'");
  });

  it('keeps billing changes owner-only at both checkout and portal boundaries', () => {
    for (const relativePath of [
      'src/app/api/stripe/create-checkout/route.ts',
      'src/app/api/stripe/billing-portal/route.ts',
    ]) {
      const source = fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
      expect(source).toMatch(/workspace\.workspace_owner_id !== user(?:\.id|Id)/);
      expect(source).toContain("workspace.member_role !== 'owner'");
    }
  });
});
