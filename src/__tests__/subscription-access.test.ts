import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  ENTITLEMENT_VERIFICATION_TTL_MS,
  evaluateWorkspaceEntitlement,
  hasActiveSubscription,
  type WorkspaceEntitlementSnapshot,
} from '@/lib/subscription/access';

const NOW = Date.parse('2026-09-03T18:00:00.000Z');

function snapshot(overrides: Partial<WorkspaceEntitlementSnapshot> = {}): WorkspaceEntitlementSnapshot {
  return {
    stripeCustomerId: 'cus_fixture',
    stripeSubscriptionId: 'sub_fixture',
    stripeStatus: 'active',
    accessState: 'active',
    planId: 'starter',
    trialEndsAt: null,
    currentPeriodEndsAt: '2026-10-03T18:00:00.000Z',
    graceEndsAt: null,
    lastVerifiedAt: '2026-09-03T17:30:00.000Z',
    ...overrides,
  };
}

describe('subscription access status', () => {
  it.each(['active', 'trialing', 'trial_active'])(
    'allows the full workspace for %s',
    (status) => {
      expect(hasActiveSubscription(status)).toBe(true);
    }
  );

  it.each([null, undefined, '', 'none', 'inactive', 'canceled', 'past_due'])(
    'keeps protected navigation hidden for %s',
    (status) => {
      expect(hasActiveSubscription(status)).toBe(false);
    }
  );

  it('keeps the shared server and sidebar status set explicit', () => {
    expect([...ACTIVE_SUBSCRIPTION_STATUSES]).toEqual(['active', 'trialing', 'trial_active']);
  });

  it('grants only a fresh, internally consistent active subscription', () => {
    expect(evaluateWorkspaceEntitlement(snapshot(), NOW)).toMatchObject({
      canAccess: true,
      state: 'active',
      needsReconciliation: false,
    });
    expect(evaluateWorkspaceEntitlement(snapshot({ accessState: 'expired' }), NOW).canAccess).toBe(false);
    expect(evaluateWorkspaceEntitlement(snapshot({ currentPeriodEndsAt: null }), NOW)).toMatchObject({
      canAccess: false,
      reason: 'billing_period_ended',
      needsReconciliation: true,
    });
  });

  it('expires stale local state instead of granting indefinite access', () => {
    const decision = evaluateWorkspaceEntitlement(snapshot({
      lastVerifiedAt: new Date(NOW - ENTITLEMENT_VERIFICATION_TTL_MS).toISOString(),
    }), NOW);
    expect(decision).toMatchObject({
      canAccess: false,
      reason: 'verification_stale',
      needsReconciliation: true,
    });
  });

  it('requires a future Stripe trial end', () => {
    expect(evaluateWorkspaceEntitlement(snapshot({
      stripeStatus: 'trialing',
      accessState: 'trial',
      trialEndsAt: '2026-09-04T18:00:00.000Z',
      currentPeriodEndsAt: null,
    }), NOW).canAccess).toBe(true);
    expect(evaluateWorkspaceEntitlement(snapshot({
      stripeStatus: 'trialing',
      accessState: 'trial',
      trialEndsAt: '2026-09-03T17:59:59.000Z',
      currentPeriodEndsAt: null,
    }), NOW)).toMatchObject({ canAccess: false, reason: 'trial_ended' });
  });

  it('allows past_due only inside the fixed grace window', () => {
    expect(evaluateWorkspaceEntitlement(snapshot({
      stripeStatus: 'past_due',
      accessState: 'grace',
      currentPeriodEndsAt: null,
      graceEndsAt: '2026-09-04T18:00:00.000Z',
    }), NOW)).toMatchObject({ canAccess: true, state: 'grace' });
    expect(evaluateWorkspaceEntitlement(snapshot({
      stripeStatus: 'past_due',
      accessState: 'grace',
      currentPeriodEndsAt: null,
      graceEndsAt: '2026-09-03T18:00:00.000Z',
    }), NOW)).toMatchObject({ canAccess: false, reason: 'payment_grace_ended' });
  });

  it.each(['canceled', 'unpaid', 'paused', 'incomplete', 'incomplete_expired'] as const)(
    'denies Stripe %s without a grace path',
    (stripeStatus) => {
      expect(evaluateWorkspaceEntitlement(snapshot({
        stripeStatus,
        accessState: 'expired',
        currentPeriodEndsAt: null,
      }), NOW).canAccess).toBe(false);
    }
  );
});
