import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getStripeServerClient } from '@/lib/stripe/server';
import { isBusinessPlan, PLANS, getStripePriceId } from '@/lib/stripe/plans';
import { validateCheckoutPrice, type CheckoutPriceSnapshot } from '@/lib/stripe/priceValidation';
import { bindStripeCustomerToWorkspace, getSelectedWorkspaceContext, getWorkspaceEntitlementDecision } from '@/lib/subscription/server';
import { isBusinessPurchaserVerified, type BusinessVerification } from '@/lib/billing/completedService';

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

/**
 * New paid checkout is independently held unless the release-controlled flag
 * is enabled. The free trial never calls this route and never creates billing.
 */
export async function POST(request: NextRequest) {
  if (process.env.NEW_PAID_CHECKOUT_ENABLED !== 'true') {
    return noStore({
      code: 'NEW_PAID_CHECKOUT_ON_HOLD',
      error: 'New paid activation is unavailable pending billing and legal review. Existing subscriptions are unaffected.',
    }, 503);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return noStore({ error: 'Authentication required.' }, 401);
    const payload = await request.json().catch(() => null) as { plan?: unknown; requestId?: unknown } | null;
    if (!payload || !isBusinessPlan(payload.plan)) {
      return noStore({ error: 'Select FixMy Pro or FixMy Scale.', code: 'BUSINESS_PLAN_REQUIRED' }, 400);
    }
    if (typeof payload.requestId !== 'string' || !REQUEST_ID_PATTERN.test(payload.requestId)) {
      return noStore({ error: 'Invalid checkout request.' }, 400);
    }

    const workspace = await getSelectedWorkspaceContext(supabase);
    if (!workspace || workspace.workspace_owner_id !== user.id || workspace.member_role !== 'owner') {
      return noStore({ error: 'Only the workspace owner can start billing.' }, 403);
    }
    if (!workspace.onboarding_completed) {
      return noStore({ error: 'Complete onboarding before subscribing.', code: 'ONBOARDING_REQUIRED' }, 409);
    }

    const entitlement = await getWorkspaceEntitlementDecision({ workspaceId: workspace.workspace_id, forceReconcile: true });
    if (entitlement.row.stripe_status === 'active' && entitlement.decision.canAccess) {
      return noStore({ alreadyActive: true, redirectTo: '/dashboard' }, 200);
    }

    const admin = getAdminClient();
    const { data: verificationRow, error: verificationError } = await admin
      .from('business_purchaser_verifications')
      .select('workspace_id,purchaser_user_id,status,plan_ids,attested_for_business,verification_checks,business_evidence_ref,reviewer_id,review_reason,reviewed_at,expires_at')
      .eq('workspace_id', workspace.workspace_id)
      .maybeSingle();
    if (verificationError) {
      return noStore({ error: 'Business verification could not be checked.', code: 'BUSINESS_VERIFICATION_UNAVAILABLE' }, 503);
    }
    const verification = verificationRow ? {
      workspaceId: verificationRow.workspace_id,
      purchaserUserId: verificationRow.purchaser_user_id,
      status: verificationRow.status,
      planIds: verificationRow.plan_ids,
      attestedForBusiness: verificationRow.attested_for_business,
      verificationChecks: verificationRow.verification_checks,
      evidenceRef: verificationRow.business_evidence_ref,
      reviewerId: verificationRow.reviewer_id,
      reason: verificationRow.review_reason,
      verifiedAt: verificationRow.reviewed_at,
      expiresAt: verificationRow.expires_at,
    } as BusinessVerification : null;
    if (!isBusinessPurchaserVerified(
      verification,
      workspace.workspace_id,
      user.id,
      payload.plan,
    )) {
      return noStore({
        error: 'Independent business verification is required before paid activation.',
        code: 'BUSINESS_VERIFICATION_REQUIRED',
      }, 409);
    }

    const plan = payload.plan;
    const planConfig = PLANS[plan];
    const priceId = getStripePriceId(plan);
    if (!priceId) return noStore({ error: 'This plan is not available yet.', code: 'CHECKOUT_PRICE_NOT_CONFIGURED' }, 503);
    const stripe = getStripeServerClient();
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const priceError = validateCheckoutPrice(price as unknown as CheckoutPriceSnapshot, planConfig);
    if (priceError) return noStore({ error: 'This plan is temporarily unavailable.', code: priceError }, 503);

    let customerId = entitlement.row.stripe_customer_id;
    if (!customerId) {
      const { data: profile } = await admin.from('user_profiles')
        .select('full_name,email').eq('id', user.id).single();
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        name: profile?.full_name || undefined,
        metadata: { userId: user.id, workspaceId: workspace.workspace_id },
      }, { idempotencyKey: `fmm_customer_${workspace.workspace_id}` });
      customerId = customer.id;
      await bindStripeCustomerToWorkspace({ workspaceId: workspace.workspace_id, stripeCustomerId: customerId });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fixmy.money';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { plan, userId: user.id, workspaceId: workspace.workspace_id } },
      metadata: { plan, userId: user.id, workspaceId: workspace.workspace_id },
      success_url: `${siteUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?plan=${plan}&cancelled=1`,
      custom_text: { submit: { message: `$${planConfig.monthlyPrice}/month. Billing begins only after you confirm.` } },
    }, { idempotencyKey: `fmm_checkout_${workspace.workspace_id}_${payload.requestId}` });
    return noStore({ url: session.url, sessionId: session.id }, 200);
  } catch (error) {
    console.error('[Stripe] Checkout error:', error instanceof Stripe.errors.StripeError ? error.type : 'unknown');
    return noStore({ error: 'Unable to continue. No access change was made.', code: 'CHECKOUT_FAILED' }, 500);
  }
}
