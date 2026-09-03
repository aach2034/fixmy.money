import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';
import { getStripeServerClient } from '@/lib/stripe/server';
import {
  ENTITLEMENT_VERIFICATION_TTL_MS,
  PAYMENT_FAILURE_GRACE_MS,
  evaluateWorkspaceEntitlement,
  type StripeSubscriptionStatus,
  type WorkspaceEntitlementDecision,
  type WorkspaceEntitlementSnapshot,
  type WorkspaceEntitlementState,
} from './access';

export interface WorkspaceEntitlementRow {
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: StripeSubscriptionStatus;
  access_state: WorkspaceEntitlementState;
  plan_id: string | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  grace_ends_at: string | null;
  last_verified_at: string | null;
  last_stripe_event_created_at: string | null;
  last_reconciliation_error: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StripeSubscriptionLike {
  id: string;
  customer: string | { id: string } | null;
  status: Stripe.Subscription.Status;
  created?: number;
  trial_start: number | null;
  trial_end: number | null;
  metadata: Record<string, string>;
  items: { data: Array<{ current_period_end?: number | null }> };
}

export interface WorkspaceEntitlementStore {
  findByWorkspaceId(workspaceId: string): Promise<WorkspaceEntitlementRow | null>;
  findByStripeCustomerId(customerId: string): Promise<WorkspaceEntitlementRow | null>;
  save(row: WorkspaceEntitlementRow): Promise<WorkspaceEntitlementRow>;
}

export interface StripeSubscriptionGateway {
  list(customerId: string): Promise<StripeSubscriptionLike[]>;
}

export class EntitlementReconciliationError extends Error {
  constructor(
    readonly code:
      | 'ENTITLEMENT_NOT_CONFIGURED'
      | 'STRIPE_SUBSCRIPTION_NOT_FOUND'
      | 'STRIPE_CUSTOMER_MISMATCH'
      | 'AMBIGUOUS_STRIPE_SUBSCRIPTIONS'
      | 'STRIPE_RECONCILIATION_UNAVAILABLE',
    message: string
  ) {
    super(message);
    this.name = 'EntitlementReconciliationError';
  }
}

function isoFromUnix(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

function customerId(subscription: StripeSubscriptionLike): string | null {
  if (typeof subscription.customer === 'string') return subscription.customer;
  return subscription.customer?.id || null;
}

function currentPeriodEnd(subscription: StripeSubscriptionLike): string | null {
  const ends = subscription.items.data
    .map(item => item.current_period_end)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return ends.length > 0 ? isoFromUnix(Math.max(...ends)) : null;
}

function normalizeStripeStatus(status: string): StripeSubscriptionStatus {
  const allowed = new Set<StripeSubscriptionStatus>([
    'trialing', 'active', 'past_due', 'unpaid', 'paused', 'canceled',
    'incomplete', 'incomplete_expired',
  ]);
  return allowed.has(status as StripeSubscriptionStatus)
    ? status as StripeSubscriptionStatus
    : 'none';
}

function eventAuthorityRank(status: StripeSubscriptionStatus): number {
  if (['canceled', 'unpaid', 'paused', 'incomplete', 'incomplete_expired', 'none'].includes(status)) {
    return 3;
  }
  if (status === 'past_due') return 2;
  return 1;
}

function defaultRow(workspaceId: string): WorkspaceEntitlementRow {
  return {
    workspace_id: workspaceId,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_status: 'none',
    access_state: 'expired',
    plan_id: null,
    trial_ends_at: null,
    current_period_ends_at: null,
    grace_ends_at: null,
    last_verified_at: null,
    last_stripe_event_created_at: null,
    last_reconciliation_error: null,
  };
}

export function toEntitlementSnapshot(row: WorkspaceEntitlementRow): WorkspaceEntitlementSnapshot {
  return {
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeStatus: row.stripe_status,
    accessState: row.access_state,
    planId: row.plan_id,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEndsAt: row.current_period_ends_at,
    graceEndsAt: row.grace_ends_at,
    lastVerifiedAt: row.last_verified_at,
  };
}

export function createSupabaseEntitlementStore(admin: SupabaseClient): WorkspaceEntitlementStore {
  const selection = [
    'workspace_id',
    'stripe_customer_id',
    'stripe_subscription_id',
    'stripe_status',
    'access_state',
    'plan_id',
    'trial_ends_at',
    'current_period_ends_at',
    'grace_ends_at',
    'last_verified_at',
    'last_stripe_event_created_at',
    'last_reconciliation_error',
    'created_at',
    'updated_at',
  ].join(',');

  return {
    async findByWorkspaceId(workspaceId) {
      const { data, error } = await admin
        .from('workspace_entitlements')
        .select(selection)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw new Error(`ENTITLEMENT_STORE_READ_FAILED:${error.message}`);
      return data as unknown as WorkspaceEntitlementRow | null;
    },
    async findByStripeCustomerId(stripeCustomerId) {
      const { data, error } = await admin
        .from('workspace_entitlements')
        .select(selection)
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle();
      if (error) throw new Error(`ENTITLEMENT_STORE_CUSTOMER_LOOKUP_FAILED:${error.message}`);
      return data as unknown as WorkspaceEntitlementRow | null;
    },
    async save(row) {
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from('workspace_entitlements')
        .upsert({ ...row, updated_at: now }, { onConflict: 'workspace_id' })
        .select(selection)
        .single();
      if (error) throw new Error(`ENTITLEMENT_STORE_WRITE_FAILED:${error.message}`);
      return data as unknown as WorkspaceEntitlementRow;
    },
  };
}

export function createStripeSubscriptionGateway(stripe: Stripe): StripeSubscriptionGateway {
  return {
    async list(stripeCustomerId) {
      const subscriptions = stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 100,
      });
      return await subscriptions.autoPagingToArray({ limit: 100 }) as unknown as StripeSubscriptionLike[];
    },
  };
}

function selectListedSubscription(
  subscriptions: StripeSubscriptionLike[],
  expectedSubscriptionId: string | null
): StripeSubscriptionLike | null {
  const accessRelevant = subscriptions.filter(subscription =>
    ['active', 'trialing', 'past_due'].includes(subscription.status)
  );
  if (accessRelevant.length > 1) {
    throw new EntitlementReconciliationError(
      'AMBIGUOUS_STRIPE_SUBSCRIPTIONS',
      'More than one access-relevant Stripe subscription is bound to this billing customer.'
    );
  }
  if (accessRelevant.length === 1) return accessRelevant[0];
  const exact = expectedSubscriptionId
    ? subscriptions.find(subscription => subscription.id === expectedSubscriptionId)
    : null;
  if (exact) return exact;
  return [...subscriptions].sort((a, b) => (b.created || 0) - (a.created || 0))[0] || null;
}

export function buildVerifiedEntitlementRow(input: {
  existing: WorkspaceEntitlementRow;
  subscription: StripeSubscriptionLike | null;
  stripeCustomerId: string;
  verifiedAt: Date;
  stripeEventCreatedAt?: Date | null;
}): WorkspaceEntitlementRow {
  const { existing, subscription, stripeCustomerId, verifiedAt } = input;
  const verifiedIso = verifiedAt.toISOString();

  if (!subscription) {
    return {
      ...existing,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: null,
      stripe_status: 'none',
      access_state: 'expired',
      trial_ends_at: null,
      current_period_ends_at: null,
      grace_ends_at: null,
      last_verified_at: verifiedIso,
      last_stripe_event_created_at: input.stripeEventCreatedAt?.toISOString()
        || existing.last_stripe_event_created_at,
      last_reconciliation_error: null,
    };
  }

  const actualCustomerId = customerId(subscription);
  if (!actualCustomerId || actualCustomerId !== stripeCustomerId) {
    throw new EntitlementReconciliationError(
      'STRIPE_CUSTOMER_MISMATCH',
      'The Stripe subscription does not belong to the workspace billing customer.'
    );
  }

  const stripeStatus = normalizeStripeStatus(subscription.status);
  const trialEndsAt = isoFromUnix(subscription.trial_end);
  const periodEndsAt = currentPeriodEnd(subscription);
  let accessState: WorkspaceEntitlementState = 'expired';
  let graceEndsAt: string | null = null;

  if (
    stripeStatus === 'active'
    && periodEndsAt
    && Date.parse(periodEndsAt) > verifiedAt.getTime()
  ) {
    accessState = 'active';
  } else if (
    stripeStatus === 'trialing'
    && trialEndsAt
    && Date.parse(trialEndsAt) > verifiedAt.getTime()
  ) {
    accessState = 'trial';
  } else if (stripeStatus === 'past_due') {
    const existingGrace = existing.stripe_status === 'past_due' && existing.grace_ends_at
      ? existing.grace_ends_at
      : null;
    const graceAnchor = input.stripeEventCreatedAt || verifiedAt;
    graceEndsAt = existingGrace
      || new Date(graceAnchor.getTime() + PAYMENT_FAILURE_GRACE_MS).toISOString();
    accessState = Date.parse(graceEndsAt) > verifiedAt.getTime() ? 'grace' : 'expired';
  }

  const planId = subscription.metadata?.plan?.trim() || existing.plan_id;
  return {
    ...existing,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    stripe_status: stripeStatus,
    access_state: accessState,
    plan_id: planId || null,
    trial_ends_at: trialEndsAt,
    current_period_ends_at: periodEndsAt,
    grace_ends_at: graceEndsAt,
    last_verified_at: verifiedIso,
    last_stripe_event_created_at: input.stripeEventCreatedAt?.toISOString()
      || existing.last_stripe_event_created_at,
    last_reconciliation_error: null,
  };
}

async function loadSubscriptionForRow(
  row: WorkspaceEntitlementRow,
  gateway: StripeSubscriptionGateway
): Promise<StripeSubscriptionLike | null> {
  const stripeCustomerId = row.stripe_customer_id;
  if (!stripeCustomerId) return null;

  try {
    const selected = selectListedSubscription(
      await gateway.list(stripeCustomerId),
      row.stripe_subscription_id
    );
    if (selected && customerId(selected) !== stripeCustomerId) {
      throw new EntitlementReconciliationError(
        'STRIPE_CUSTOMER_MISMATCH',
        'The Stripe subscription does not belong to the workspace billing customer.'
      );
    }
    return selected;
  } catch (error) {
    if (error instanceof EntitlementReconciliationError) throw error;
    throw new EntitlementReconciliationError(
      'STRIPE_RECONCILIATION_UNAVAILABLE',
      'Stripe subscription verification is temporarily unavailable.'
    );
  }
}

export async function reconcileWorkspaceEntitlement(input: {
  workspaceId: string;
  store: WorkspaceEntitlementStore;
  gateway: StripeSubscriptionGateway;
  now?: Date;
}): Promise<WorkspaceEntitlementRow> {
  const now = input.now || new Date();
  const existing = await input.store.findByWorkspaceId(input.workspaceId) || defaultRow(input.workspaceId);
  if (!existing.stripe_customer_id) return existing;

  try {
    const subscription = await loadSubscriptionForRow(existing, input.gateway);
    return await input.store.save(buildVerifiedEntitlementRow({
      existing,
      subscription,
      stripeCustomerId: existing.stripe_customer_id,
      verifiedAt: now,
    }));
  } catch (error) {
    if (
      error instanceof EntitlementReconciliationError
      && ['STRIPE_CUSTOMER_MISMATCH', 'AMBIGUOUS_STRIPE_SUBSCRIPTIONS'].includes(error.code)
    ) {
      await input.store.save({
        ...existing,
        access_state: 'expired',
        last_verified_at: null,
        last_reconciliation_error: error.code,
      });
    }
    throw error;
  }
}

export async function applyStripeSubscriptionEntitlement(input: {
  subscription: StripeSubscriptionLike;
  stripeEventCreatedAt: Date;
  store: WorkspaceEntitlementStore;
  now?: Date;
}): Promise<WorkspaceEntitlementRow | null> {
  const stripeCustomerId = customerId(input.subscription);
  if (!stripeCustomerId) {
    throw new EntitlementReconciliationError(
      'STRIPE_CUSTOMER_MISMATCH',
      'Stripe subscription did not include a customer identifier.'
    );
  }

  const existing = await input.store.findByStripeCustomerId(stripeCustomerId);
  if (!existing) return null;

  const priorEventAt = existing.last_stripe_event_created_at
    ? Date.parse(existing.last_stripe_event_created_at)
    : null;
  if (priorEventAt !== null) {
    const incomingEventAt = input.stripeEventCreatedAt.getTime();
    const incomingStatus = normalizeStripeStatus(input.subscription.status);
    const isOlder = priorEventAt > incomingEventAt;
    const isEqualButLessAuthoritative = priorEventAt === incomingEventAt
      && eventAuthorityRank(existing.stripe_status) >= eventAuthorityRank(incomingStatus);
    if (isOlder || isEqualButLessAuthoritative) return existing;
  }

  const row = buildVerifiedEntitlementRow({
    existing,
    subscription: input.subscription,
    stripeCustomerId,
    verifiedAt: input.now || new Date(),
    stripeEventCreatedAt: input.stripeEventCreatedAt,
  });
  return await input.store.save(row);
}

export async function getWorkspaceEntitlementDecision(input: {
  workspaceId: string;
  forceReconcile?: boolean;
  now?: Date;
  store?: WorkspaceEntitlementStore;
  gateway?: StripeSubscriptionGateway;
}): Promise<{ row: WorkspaceEntitlementRow; decision: WorkspaceEntitlementDecision }> {
  const now = input.now || new Date();
  const store = input.store || createSupabaseEntitlementStore(getAdminClient());
  let row = await store.findByWorkspaceId(input.workspaceId) || defaultRow(input.workspaceId);
  let decision = evaluateWorkspaceEntitlement(toEntitlementSnapshot(row), now.getTime());

  if (row.stripe_customer_id && (input.forceReconcile || decision.needsReconciliation)) {
    const gateway = input.gateway || createStripeSubscriptionGateway(getStripeServerClient());
    row = await reconcileWorkspaceEntitlement({ workspaceId: input.workspaceId, store, gateway, now });
    decision = evaluateWorkspaceEntitlement(
      toEntitlementSnapshot(row),
      now.getTime(),
      ENTITLEMENT_VERIFICATION_TTL_MS
    );
  }

  return { row, decision };
}

export async function bindStripeCustomerToWorkspace(input: {
  workspaceId: string;
  stripeCustomerId: string;
  expectedPreviousCustomerId?: string | null;
  store?: WorkspaceEntitlementStore;
}): Promise<WorkspaceEntitlementRow> {
  const store = input.store || createSupabaseEntitlementStore(getAdminClient());
  const existing = await store.findByWorkspaceId(input.workspaceId) || defaultRow(input.workspaceId);
  if (
    existing.stripe_customer_id
    && existing.stripe_customer_id !== input.stripeCustomerId
    && existing.stripe_customer_id !== input.expectedPreviousCustomerId
  ) {
    throw new EntitlementReconciliationError(
      'STRIPE_CUSTOMER_MISMATCH',
      'The workspace is already bound to a different Stripe customer.'
    );
  }
  const otherWorkspace = await store.findByStripeCustomerId(input.stripeCustomerId);
  if (otherWorkspace && otherWorkspace.workspace_id !== input.workspaceId) {
    throw new EntitlementReconciliationError(
      'STRIPE_CUSTOMER_MISMATCH',
      'The Stripe customer is already bound to another workspace.'
    );
  }
  const replacingMissingCustomer = Boolean(
    existing.stripe_customer_id
    && existing.stripe_customer_id === input.expectedPreviousCustomerId
    && existing.stripe_customer_id !== input.stripeCustomerId
  );
  return await store.save({
    ...existing,
    stripe_customer_id: input.stripeCustomerId,
    ...(replacingMissingCustomer ? {
      stripe_subscription_id: null,
      stripe_status: 'none' as const,
      access_state: 'expired' as const,
      trial_ends_at: null,
      current_period_ends_at: null,
      grace_ends_at: null,
      last_verified_at: null,
      last_reconciliation_error: null,
    } : {}),
  });
}

export interface SelectedWorkspaceContext {
  workspace_id: string;
  workspace_owner_id: string;
  member_role: string;
  onboarding_completed: boolean;
}

export async function getSelectedWorkspaceContext(
  supabase: SupabaseClient
): Promise<SelectedWorkspaceContext | null> {
  const { data, error } = await supabase.rpc('current_workspace_context');
  if (error) throw new Error(`WORKSPACE_CONTEXT_FAILED:${error.message}`);
  return (data?.[0] || null) as SelectedWorkspaceContext | null;
}
