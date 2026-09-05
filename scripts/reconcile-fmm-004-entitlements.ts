import {
  EntitlementReconciliationError,
  createStripeSubscriptionGateway,
  createSupabaseEntitlementStore,
  reconcileWorkspaceEntitlement,
  type WorkspaceEntitlementRow,
  type WorkspaceEntitlementStore,
} from '../src/lib/subscription/server';
import { getStripeServerClient } from '../src/lib/stripe/server';
import { getAdminClient } from '../src/lib/supabase/admin';

const apply = process.argv.includes('--apply');
const admin = getAdminClient();
const persistentStore = createSupabaseEntitlementStore(admin);
const gateway = createStripeSubscriptionGateway(getStripeServerClient());

const { data, error } = await admin
  .from('workspace_entitlements')
  .select('workspace_id')
  .not('stripe_customer_id', 'is', null)
  .order('workspace_id');

if (error) throw new Error(`FMM004_RECONCILIATION_LIST_FAILED:${error.message}`);

const previewStore: WorkspaceEntitlementStore = {
  findByWorkspaceId: persistentStore.findByWorkspaceId,
  findByStripeCustomerId: persistentStore.findByStripeCustomerId,
  async save(row: WorkspaceEntitlementRow) {
    return row;
  },
};

const summary = {
  mode: apply ? 'apply' : 'dry-run',
  scanned: 0,
  active: 0,
  trial: 0,
  grace: 0,
  expired: 0,
  errors: {} as Record<string, number>,
};

for (const item of data ?? []) {
  summary.scanned += 1;
  try {
    const entitlement = await reconcileWorkspaceEntitlement({
      workspaceId: item.workspace_id,
      store: apply ? persistentStore : previewStore,
      gateway,
    });
    summary[entitlement.access_state] += 1;
  } catch (caught) {
    const code = caught instanceof EntitlementReconciliationError
      ? caught.code
      : 'UNEXPECTED_RECONCILIATION_ERROR';
    summary.errors[code] = (summary.errors[code] ?? 0) + 1;
  }
}

console.log(JSON.stringify(summary, null, 2));
if (Object.keys(summary.errors).length > 0) process.exitCode = 1;
