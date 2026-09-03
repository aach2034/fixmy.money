import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAN_CATALOG_VERSION, PLANS } from '@/lib/stripe/plans';
import { evaluatePlanAuthorization } from '@/lib/subscription/planEnforcement';

const active = { canAccess: true, state: 'active', reason: 'active_subscription' } as const;
const denied = { canAccess: false, state: 'expired', reason: 'subscription_canceled' } as const;
const usage = { clients: 0, seats: 0, storageBytes: 0 };

describe('FMM-009 plan entitlement enforcement', () => {
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

  it.each(['active', 'trial', 'grace'] as const)('accepts a current FMM-004 %s decision', state => {
    expect(evaluatePlanAuthorization({ planId: 'professional', entitlement: { canAccess: true, state, reason: state === 'grace' ? 'payment_grace' : state === 'trial' ? 'active_trial' : 'active_subscription' } }).allowed).toBe(true);
  });

  it('enforces catalog and limits again in the database to prevent browser bypass', () => {
    const migration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260903224837_fmm_009_plan_entitlement_enforcement.sql'), 'utf8');
    expect(migration).toContain('CREATE TABLE private.plan_catalog');
    expect(migration).toContain('workspace_entitlements_plan_catalog_fkey');
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
});
