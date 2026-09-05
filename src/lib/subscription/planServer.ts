import { getAdminClient } from '@/lib/supabase/admin';
import { getWorkspaceEntitlementDecision } from './server';
import {
  evaluatePlanAuthorization,
  PlanAuthorizationError,
  type PlanLimitKind,
} from './planEnforcement';
import type { PlanFeatureId } from '@/lib/stripe/plans';

async function loadUsage(workspaceId: string) {
  const admin = getAdminClient();
  const [clients, seats, documents] = await Promise.all([
    admin.from('staff_clients').select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).not('case_stage', 'in', '(completed,churned)'),
    admin.from('workspace_memberships').select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).in('status', ['active', 'invited']),
    admin.from('client_documents').select('file_size')
      .eq('workspace_id', workspaceId).in('doc_status', ['pending', 'uploaded']),
  ]);
  if (clients.error || seats.error || documents.error) throw new PlanAuthorizationError('USAGE_UNAVAILABLE', 503);
  return {
    clients: clients.count ?? 0,
    seats: seats.count ?? 0,
    storageBytes: (documents.data ?? []).reduce((sum, row) => sum + Math.max(0, row.file_size ?? 0), 0),
  };
}

export async function authorizeWorkspacePlanOperation(input: {
  workspaceId: string;
  feature?: PlanFeatureId;
  limit?: PlanLimitKind;
  increment?: number;
}) {
  const entitlement = await getWorkspaceEntitlementDecision({ workspaceId: input.workspaceId });
  const usage = input.limit ? await loadUsage(input.workspaceId) : undefined;
  const decision = evaluatePlanAuthorization({
    planId: entitlement.row.plan_id,
    catalogVersion: entitlement.row.plan_catalog_version,
    entitlement: entitlement.decision,
    feature: input.feature,
    limit: input.limit,
    currentUsage: usage,
    increment: input.increment,
  });
  if (!decision.allowed) throw new PlanAuthorizationError(decision.reason, decision.reason.endsWith('_LIMIT_REACHED') ? 409 : 403);
  return decision;
}
