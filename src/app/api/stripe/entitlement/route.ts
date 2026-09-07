import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  EntitlementReconciliationError,
  getSelectedWorkspaceContext,
  getWorkspaceEntitlementDecision,
} from '@/lib/subscription/server';

function publicEntitlement(
  result: Awaited<ReturnType<typeof getWorkspaceEntitlementDecision>>
) {
  return {
    canAccess: result.decision.canAccess,
    state: result.decision.state,
    reason: result.decision.reason,
    planId: result.row.plan_id,
    stripeStatus: result.row.stripe_status,
    trialEndsAt: result.row.trial_ends_at,
    currentPeriodEndsAt: result.row.current_period_ends_at,
    graceEndsAt: result.row.grace_ends_at,
    verifiedAt: result.row.last_verified_at,
    hasBillingAccount: Boolean(result.row.stripe_customer_id),
  };
}

async function entitlementResponse(forceReconcile: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const workspace = await getSelectedWorkspaceContext(supabase);
    if (!workspace) {
      return NextResponse.json({ error: 'No active workspace is selected.' }, { status: 403 });
    }

    const result = await getWorkspaceEntitlementDecision({
      workspaceId: workspace.workspace_id,
      forceReconcile,
    });
    return NextResponse.json(publicEntitlement(result), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const code = error instanceof EntitlementReconciliationError ? error.code : 'ENTITLEMENT_CHECK_FAILED';
    const status = code === 'AMBIGUOUS_STRIPE_SUBSCRIPTIONS' || code === 'STRIPE_CUSTOMER_MISMATCH'
      ? 409
      : 503;
    console.error('[Entitlement] Verification failed:', code);
    return NextResponse.json(
      { error: 'Subscription access could not be verified. No access was granted.', code },
      { status, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}

export async function GET() {
  return entitlementResponse(false);
}

export async function POST() {
  return entitlementResponse(true);
}
