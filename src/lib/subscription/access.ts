export const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'trial_active',
]);

export const ENTITLEMENT_VERIFICATION_TTL_MS = 60 * 60 * 1000;
export const PAYMENT_FAILURE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export type StripeSubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'paused'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';

export type WorkspaceEntitlementState = 'active' | 'trial' | 'grace' | 'expired';

export interface WorkspaceEntitlementSnapshot {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeStatus: StripeSubscriptionStatus;
  accessState: WorkspaceEntitlementState;
  planId: string | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  graceEndsAt: string | null;
  lastVerifiedAt: string | null;
}

export type EntitlementDecisionReason =
  | 'active'
  | 'trial'
  | 'payment_grace'
  | 'no_billing_account'
  | 'not_verified'
  | 'verification_stale'
  | 'billing_period_ended'
  | 'trial_ended'
  | 'payment_grace_ended'
  | 'subscription_inactive';

export interface WorkspaceEntitlementDecision {
  canAccess: boolean;
  state: WorkspaceEntitlementState;
  reason: EntitlementDecisionReason;
  needsReconciliation: boolean;
}

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Evaluates an already persisted Stripe verification result. This function is
 * deliberately strict: an unverified, stale, or internally inconsistent row
 * never grants workspace access.
 */
export function evaluateWorkspaceEntitlement(
  snapshot: WorkspaceEntitlementSnapshot,
  nowMs = Date.now(),
  verificationTtlMs = ENTITLEMENT_VERIFICATION_TTL_MS
): WorkspaceEntitlementDecision {
  if (!snapshot.stripeCustomerId) {
    return {
      canAccess: false,
      state: 'expired',
      reason: 'no_billing_account',
      needsReconciliation: false,
    };
  }

  const verifiedAt = timestamp(snapshot.lastVerifiedAt);
  if (verifiedAt === null) {
    return {
      canAccess: false,
      state: 'expired',
      reason: 'not_verified',
      needsReconciliation: true,
    };
  }

  if (verifiedAt > nowMs + 5 * 60 * 1000 || nowMs - verifiedAt >= verificationTtlMs) {
    return {
      canAccess: false,
      state: 'expired',
      reason: 'verification_stale',
      needsReconciliation: true,
    };
  }

  if (snapshot.stripeStatus === 'active' && snapshot.accessState === 'active') {
    const periodEnd = timestamp(snapshot.currentPeriodEndsAt);
    if (periodEnd === null || periodEnd <= nowMs) {
      return {
        canAccess: false,
        state: 'expired',
        reason: 'billing_period_ended',
        needsReconciliation: true,
      };
    }
    return { canAccess: true, state: 'active', reason: 'active', needsReconciliation: false };
  }

  if (snapshot.stripeStatus === 'trialing' && snapshot.accessState === 'trial') {
    const trialEnd = timestamp(snapshot.trialEndsAt);
    if (trialEnd === null || trialEnd <= nowMs) {
      return {
        canAccess: false,
        state: 'expired',
        reason: 'trial_ended',
        needsReconciliation: true,
      };
    }
    return { canAccess: true, state: 'trial', reason: 'trial', needsReconciliation: false };
  }

  if (snapshot.stripeStatus === 'past_due' && snapshot.accessState === 'grace') {
    const graceEnd = timestamp(snapshot.graceEndsAt);
    if (graceEnd === null || graceEnd <= nowMs) {
      return {
        canAccess: false,
        state: 'expired',
        reason: 'payment_grace_ended',
        needsReconciliation: false,
      };
    }
    return {
      canAccess: true,
      state: 'grace',
      reason: 'payment_grace',
      needsReconciliation: false,
    };
  }

  return {
    canAccess: false,
    state: 'expired',
    reason: 'subscription_inactive',
    needsReconciliation: false,
  };
}

export function hasActiveSubscription(status: string | null | undefined): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has((status || '').toLowerCase());
}
