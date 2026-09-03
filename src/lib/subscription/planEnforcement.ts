import type { WorkspaceEntitlementDecision } from './access';
import {
  PLAN_CATALOG_VERSION,
  PLANS,
  type PlanFeatureId,
  type PlanId,
} from '@/lib/stripe/plans';

export type PlanLimitKind = 'clients' | 'seats' | 'storage_bytes';

export interface PlanUsageSnapshot {
  clients: number;
  seats: number;
  storageBytes: number;
}

export interface PlanAuthorizationInput {
  planId: string | null;
  catalogVersion?: string | null;
  entitlement: WorkspaceEntitlementDecision;
  feature?: PlanFeatureId;
  limit?: PlanLimitKind;
  currentUsage?: PlanUsageSnapshot;
  increment?: number;
}

export type PlanAuthorizationDecision =
  | { allowed: true; catalogVersion: typeof PLAN_CATALOG_VERSION; planId: PlanId }
  | { allowed: false; catalogVersion: typeof PLAN_CATALOG_VERSION; reason: string };

export class PlanAuthorizationError extends Error {
  constructor(readonly code: string, readonly status = 403) {
    super(code);
    this.name = 'PlanAuthorizationError';
  }
}

export function evaluatePlanAuthorization(input: PlanAuthorizationInput): PlanAuthorizationDecision {
  if (!input.entitlement.canAccess) {
    return { allowed: false, catalogVersion: PLAN_CATALOG_VERSION, reason: 'ENTITLEMENT_REQUIRED' };
  }
  if (!input.planId || !(input.planId in PLANS)) {
    return { allowed: false, catalogVersion: PLAN_CATALOG_VERSION, reason: 'PLAN_NOT_CONFIGURED' };
  }
  if (input.catalogVersion !== undefined && input.catalogVersion !== PLAN_CATALOG_VERSION) {
    return { allowed: false, catalogVersion: PLAN_CATALOG_VERSION, reason: 'PLAN_CATALOG_MISMATCH' };
  }

  const planId = input.planId as PlanId;
  const plan = PLANS[planId];
  if (input.feature && !plan.enabledFeatures.includes(input.feature)) {
    return { allowed: false, catalogVersion: PLAN_CATALOG_VERSION, reason: 'FEATURE_NOT_INCLUDED' };
  }

  if (input.limit) {
    if (!input.currentUsage) {
      return { allowed: false, catalogVersion: PLAN_CATALOG_VERSION, reason: 'USAGE_UNAVAILABLE' };
    }
    const increment = input.increment ?? 1;
    if (!Number.isSafeInteger(increment) || increment < 0) {
      return { allowed: false, catalogVersion: PLAN_CATALOG_VERSION, reason: 'INVALID_INCREMENT' };
    }
    const limits = {
      clients: plan.maxClients,
      seats: plan.maxTeamMembers,
      storage_bytes: plan.storageGb === null ? null : plan.storageGb * 1024 * 1024 * 1024,
    } as const;
    const usage = {
      clients: input.currentUsage.clients,
      seats: input.currentUsage.seats,
      storage_bytes: input.currentUsage.storageBytes,
    } as const;
    const limit = limits[input.limit];
    if (limit !== null && usage[input.limit] + increment > limit) {
      return { allowed: false, catalogVersion: PLAN_CATALOG_VERSION, reason: `${input.limit.toUpperCase()}_LIMIT_REACHED` };
    }
  }

  return { allowed: true, catalogVersion: PLAN_CATALOG_VERSION, planId };
}
