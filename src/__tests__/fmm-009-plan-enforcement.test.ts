import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAN_CATALOG_VERSION, PLANS } from '@/lib/stripe/plans';
import { evaluatePlanAuthorization, resolveCanonicalPlanId } from '@/lib/subscription/planEnforcement';
import { buildVerifiedEntitlementRow } from '@/lib/subscription/server';
import { resolveAIPlanLimits } from '@/lib/ai/gateway';

const active = { canAccess: true, state: 'active', reason: 'active_subscription' } as const;
const denied = { canAccess: false, state: 'expired', reason: 'subscription_canceled' } as const;
const usage = { clients: 0, seats: 0, storageBytes: 0 };

describe('FMM-009 plan entitlement enforcement', () => {
  const signupCompatibilityMigration = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260904001500_fmm_009_signup_entitlement_order.sql'),
    'utf8',
  );
  const signupMigration = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260903024321_fmm_007_tenant_constraints_and_policies.sql'),
    'utf8',
  );
  const authTriggerMigration = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260603162244_workspaces.sql'),
    'utf8',
  );

  it('uses one immutable catalog version and exact resource limits', () => {
    expect(PLAN_CATALOG_VERSION).toBe('2026-09-03.v1');
    expect(PLANS.starter).toMatchObject({ maxClients: 3, maxTeamMembers: 1, storageGb: 5 });
    expect(PLANS.professional).toMatchObject({ maxClients: 300, maxTeamMembers: 3, storageGb: 25 });
    expect(PLANS.agency).toMatchObject({ maxClients: 600, maxTeamMembers: 6, storageGb: 100 });
  });

  it('fails closed for expired, canceled, unknown, or unavailable entitlement state', () => {
    expect(evaluatePlanAuthorization({ planId: 'starter', entitlement: denied }).allowed).toBe(false);
    expect(evaluatePlanAuthorization({ planId: 'retired', entitlement: active }).allowed).toBe(false);
    expect(evaluatePlanAuthorization({ planId: 'starter', catalogVersion: 'old', entitlement: active })).toMatchObject({ allowed: false, reason: 'PLAN_CATALOG_MISMATCH' });
    expect(evaluatePlanAuthorization({ planId: 'starter', entitlement: active, limit: 'clients' })).toMatchObject({ allowed: false, reason: 'USAGE_UNAVAILABLE' });
  });

  it.each([
    ['clients', { ...usage, clients: 3 }, 1, 'CLIENTS_LIMIT_REACHED'],
    ['seats', { ...usage, seats: 1 }, 1, 'SEATS_LIMIT_REACHED'],
    ['storage_bytes', { ...usage, storageBytes: 5 * 1024 ** 3 }, 1, 'STORAGE_BYTES_LIMIT_REACHED'],
  ] as const)('denies starter %s allocation over its limit', (limit, currentUsage, increment, reason) => {
    expect(evaluatePlanAuthorization({ planId: 'starter', entitlement: active, limit, currentUsage, increment }))
      .toMatchObject({ allowed: false, reason });
  });

  it('allows the final in-limit allocation and denies invalid increments', () => {
    expect(evaluatePlanAuthorization({ planId: 'starter', entitlement: active, limit: 'clients', currentUsage: { ...usage, clients: 2 } }).allowed).toBe(true);
    expect(evaluatePlanAuthorization({ planId: 'starter', entitlement: active, limit: 'clients', currentUsage: usage, increment: -1 })).toMatchObject({ allowed: false, reason: 'INVALID_INCREMENT' });
  });

  it('denies unauthorized plan features while allowing included features', () => {
    expect(evaluatePlanAuthorization({ planId: 'starter', entitlement: active, feature: 'data_export' })).toMatchObject({ allowed: false, reason: 'FEATURE_NOT_INCLUDED' });
    expect(evaluatePlanAuthorization({ planId: 'starter', entitlement: active, feature: 'ai_assistant' }).allowed).toBe(true);
  });

  it('resolves legacy growth to professional for limits, features, and AI usage', () => {
    expect(resolveCanonicalPlanId('growth')).toBe('professional');
    expect(evaluatePlanAuthorization({ planId: 'growth', entitlement: active, limit: 'clients', currentUsage: { ...usage, clients: 299 } }))
      .toMatchObject({ allowed: true, planId: 'professional' });
    expect(evaluatePlanAuthorization({ planId: 'growth', entitlement: active, limit: 'clients', currentUsage: { ...usage, clients: 300 } }))
      .toMatchObject({ allowed: false, reason: 'CLIENTS_LIMIT_REACHED' });
    expect(evaluatePlanAuthorization({ planId: 'growth', entitlement: active, feature: 'team_access' })).toMatchObject({ allowed: true, planId: 'professional' });
    expect(evaluatePlanAuthorization({ planId: 'growth', entitlement: active, feature: 'data_export' })).toMatchObject({ allowed: false, reason: 'FEATURE_NOT_INCLUDED' });
    expect(resolveAIPlanLimits(resolveCanonicalPlanId('growth'))).toEqual(resolveAIPlanLimits('professional'));
  });

  it('preserves growth during active, downgrade, cancellation, and grace reconciliation', () => {
    const existing = {
      workspace_id: 'workspace-growth', stripe_customer_id: 'cus_growth', stripe_subscription_id: 'sub_growth',
      stripe_status: 'active', access_state: 'active', plan_id: 'growth', trial_ends_at: null,
      current_period_ends_at: '2026-10-03T00:00:00.000Z', grace_ends_at: null,
      last_verified_at: '2026-09-03T00:00:00.000Z', last_stripe_event_created_at: null,
      last_reconciliation_error: null,
    } as const;
    const subscription = (status: 'active' | 'past_due' | 'canceled', plan = 'professional') => ({
      id: 'sub_growth', customer: 'cus_growth', status, trial_start: null, trial_end: null,
      metadata: { plan }, items: { data: [{ current_period_end: 1790985600 }] },
    });
    const activeRow = buildVerifiedEntitlementRow({ existing, subscription: subscription('active'), stripeCustomerId: 'cus_growth', verifiedAt: new Date('2026-09-03T12:00:00Z') });
    const graceRow = buildVerifiedEntitlementRow({ existing: activeRow, subscription: subscription('past_due'), stripeCustomerId: 'cus_growth', verifiedAt: new Date('2026-09-03T13:00:00Z') });
    const canceledRow = buildVerifiedEntitlementRow({ existing: graceRow, subscription: subscription('canceled'), stripeCustomerId: 'cus_growth', verifiedAt: new Date('2026-09-03T14:00:00Z') });
    expect([activeRow.plan_id, graceRow.plan_id, canceledRow.plan_id]).toEqual(['growth', 'growth', 'growth']);
    expect(graceRow.access_state).toBe('grace');
    expect(canceledRow.access_state).toBe('expired');
    const upgraded = buildVerifiedEntitlementRow({ existing: activeRow, subscription: subscription('active', 'agency'), stripeCustomerId: 'cus_growth', verifiedAt: new Date('2026-09-03T15:00:00Z') });
    expect(upgraded.plan_id).toBe('agency');
  });

  it.each(['active', 'trial', 'grace'] as const)('accepts a current FMM-004 %s decision', state => {
    expect(evaluatePlanAuthorization({ planId: 'professional', entitlement: { canAccess: true, state, reason: state === 'grace' ? 'payment_grace' : state === 'trial' ? 'active_trial' : 'active_subscription' } }).allowed).toBe(true);
  });

  it('enforces catalog and limits again in the database to prevent browser bypass', () => {
    const migration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260903224837_fmm_009_plan_entitlement_enforcement.sql'), 'utf8');
    expect(migration).toContain('CREATE TABLE private.plan_catalog');
    expect(migration).toContain('CREATE TABLE private.plan_catalog_aliases');
    expect(migration).toContain("VALUES ('2026-09-03.v1', 'growth', 'professional')");
    expect(migration).not.toMatch(/UPDATE public\.workspace_entitlements[\s\S]*plan_id\s*=/i);
    expect(migration).toContain('staff_clients_enforce_plan_limit');
    expect(migration).toContain('workspace_memberships_enforce_plan_limit');
    expect(migration).toContain('client_documents_enforce_plan_limit');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain("MESSAGE = 'PLAN_ENTITLEMENT_REQUIRED'");
    expect(migration).toContain('REVOKE ALL ON FUNCTION private.enforce_workspace_plan_allocation()');
  });

  it('routes client creation, storage, and AI through the centralized server guard', () => {
    const clientRoute = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/clients/route.ts'), 'utf8');
    const uploadRoute = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/client-portal/documents/route.ts'), 'utf8');
    const aiServer = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/ai/server.ts'), 'utf8');
    for (const source of [clientRoute, uploadRoute, aiServer]) expect(source).toContain('authorizeWorkspacePlanOperation');
  });

  it('creates the initial fail-closed entitlement before the owner membership', () => {
    const entitlementInsert = signupCompatibilityMigration.indexOf('INSERT INTO public.workspace_entitlements (workspace_id)');
    const membershipInsert = signupCompatibilityMigration.indexOf('INSERT INTO public.workspace_memberships');
    expect(entitlementInsert).toBeGreaterThan(-1);
    expect(membershipInsert).toBeGreaterThan(entitlementInsert);
    expect(signupCompatibilityMigration).toContain('VALUES (NEW.id)');
  });

  it('keeps profile, workspace, entitlement, and membership creation in the auth signup transaction', () => {
    expect(signupMigration).toContain('CREATE OR REPLACE FUNCTION public.handle_new_user()');
    expect(signupMigration).toContain('INSERT INTO public.user_profiles');
    expect(signupMigration).toContain('INSERT INTO public.workspaces');
    expect(authTriggerMigration).toContain('AFTER INSERT ON auth.users');
    expect(signupCompatibilityMigration).toContain('RETURNS trigger');
    expect(signupCompatibilityMigration).not.toMatch(/\bCOMMIT\b/);
  });

  it('makes signup retry idempotent without overwriting verified entitlement state', () => {
    const entitlementStatement = signupCompatibilityMigration.match(
      /INSERT INTO public\.workspace_entitlements \(workspace_id\)[\s\S]*?ON CONFLICT \(workspace_id\) DO NOTHING;/,
    )?.[0];
    expect(entitlementStatement).toBeDefined();
    expect(entitlementStatement).not.toContain('DO UPDATE');
  });

  it('permits only the authoritative workspace owner before paid entitlement verification', () => {
    expect(signupCompatibilityMigration).toContain("TG_TABLE_NAME = 'workspace_memberships' AND NEW.role = 'owner'");
    expect(signupCompatibilityMigration).toContain('workspace.owner_id = NEW.user_id');
    expect(signupCompatibilityMigration).toContain("MESSAGE = 'WORKSPACE_OWNER_REQUIRED'");
  });

  it('keeps the initial entitlement expired and unable to grant application access', () => {
    expect(signupCompatibilityMigration).toMatch(
      /INSERT INTO public\.workspace_entitlements \(workspace_id\)\s+VALUES \(NEW\.id\)\s+ON CONFLICT \(workspace_id\) DO NOTHING;/,
    );
    expect(signupCompatibilityMigration).toContain("MESSAGE = 'PLAN_ENTITLEMENT_REQUIRED'");
  });

  it('preserves unsupported-plan and concurrency enforcement for non-owner allocations', () => {
    expect(signupCompatibilityMigration).toContain("MESSAGE = 'PLAN_NOT_CONFIGURED'");
    expect(signupCompatibilityMigration).toContain('pg_advisory_xact_lock');
    expect(signupCompatibilityMigration).toContain("MESSAGE = 'SEATS_LIMIT_REACHED'");
  });

  it('is non-destructive for existing users and entitlements', () => {
    expect(signupCompatibilityMigration).not.toMatch(/\b(DELETE|TRUNCATE)\b/i);
    expect(signupCompatibilityMigration).not.toMatch(/UPDATE public\.(user_profiles|workspace_entitlements|workspaces)\b/i);
  });
});
