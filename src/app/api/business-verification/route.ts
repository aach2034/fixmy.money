import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getSelectedWorkspaceContext } from '@/lib/subscription/server';

const textField = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= max
    ? value.trim() : null;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'forbidden' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 4096) return json({ error: 'invalid_request' }, 400);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'authentication_required' }, 401);
  const workspace = await getSelectedWorkspaceContext(supabase);
  if (!workspace || workspace.workspace_owner_id !== user.id || workspace.member_role !== 'owner') {
    return json({ error: 'workspace_owner_required' }, 403);
  }
  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'invalid_request' }, 400);
    input = JSON.parse(raw);
    if (!input || Array.isArray(input) || typeof input !== 'object') return json({ error: 'invalid_request' }, 400);
  } catch { return json({ error: 'invalid_request' }, 400); }
  const legalName = textField(input.legalBusinessName, 160);
  const businessType = textField(input.businessType, 60);
  const jurisdiction = textField(input.formationJurisdiction, 80);
  const address = textField(input.businessAddress, 240);
  const representative = textField(input.authorizedRepresentative, 120);
  const intendedUse = textField(input.intendedBusinessUse, 400);
  const identifierType = textField(input.identifierType, 40);
  const identifierLastFour = typeof input.identifierLastFour === 'string' && /^\d{4}$/.test(input.identifierLastFour)
    ? input.identifierLastFour : null;
  const website = input.website === '' || input.website === null || input.website === undefined
    ? null : textField(input.website, 250);
  const plan = input.planId;
  if (!legalName || !businessType || !jurisdiction || !address || !representative || !intendedUse ||
    !identifierType || !identifierLastFour || input.attestedForBusiness !== true ||
    (plan !== 'professional' && plan !== 'agency') ||
    (website && !/^https:\/\//i.test(website))) return json({ error: 'invalid_request' }, 400);
  const admin = getAdminClient();
  const { error } = await admin.from('business_purchaser_verifications').upsert({
    workspace_id: workspace.workspace_id,
    purchaser_user_id: user.id,
    legal_business_name: legalName,
    business_type: businessType,
    formation_jurisdiction: jurisdiction,
    business_address_summary: address,
    authorized_representative_name: representative,
    website,
    intended_business_use: intendedUse,
    identifier_type: identifierType,
    identifier_last_four: identifierLastFour,
    attested_for_business: true,
    plan_ids: [plan],
    status: 'manual_review',
    reviewer_id: null,
    business_evidence_ref: null,
    verification_checks: {},
    review_reason: null,
    reviewed_at: null,
    expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id' });
  if (error) return json({ error: 'verification_unavailable' }, 503);
  return json({ status: 'manual_review', checkoutEnabled: false }, 202);
}
