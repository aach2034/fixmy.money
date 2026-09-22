import { NextRequest, NextResponse } from 'next/server';
import { requireRecentPlatformAdmin } from '@/lib/admin/authorization';
import { getAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKS = ['formation', 'identifier', 'address', 'representative', 'license_or_exemption'] as const;
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store' },
});

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'forbidden' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 4096) return json({ error: 'invalid_request' }, 400);
  const session = await requireRecentPlatformAdmin('business_verification_review');
  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'invalid_request' }, 400);
    input = JSON.parse(raw);
    if (!input || Array.isArray(input) || typeof input !== 'object') return json({ error: 'invalid_request' }, 400);
  } catch { return json({ error: 'invalid_request' }, 400); }
  if (typeof input.workspaceId !== 'string' || !UUID.test(input.workspaceId) ||
    !['verified', 'rejected', 'manual_review', 'expired'].includes(String(input.status)) ||
    typeof input.reason !== 'string' || input.reason.trim().length < 10 || input.reason.length > 500) {
    return json({ error: 'invalid_request' }, 400);
  }
  const admin = getAdminClient();
  const { data: application, error: readError } = await admin.from('business_purchaser_verifications')
    .select('workspace_id,purchaser_user_id,status,attested_for_business')
    .eq('workspace_id', input.workspaceId).maybeSingle();
  if (readError || !application) return json({ error: 'not_found' }, 404);
  if (application.purchaser_user_id === session.user.id) return json({ error: 'independent_review_required' }, 403);
  const status = String(input.status);
  const checks = input.verificationChecks;
  const evidenceRef = typeof input.evidenceRef === 'string' && input.evidenceRef.length <= 300
    ? input.evidenceRef.trim() : null;
  const expires = typeof input.expiresAt === 'string' ? Date.parse(input.expiresAt) : NaN;
  if (status === 'verified' &&
    (!application.attested_for_business || !evidenceRef || !checks || typeof checks !== 'object' ||
      !CHECKS.every(key => (checks as Record<string, unknown>)[key] === true) ||
      !Number.isFinite(expires) || expires <= Date.now() || expires > Date.now() + 366 * 86_400_000)) {
    return json({ error: 'verification_evidence_required' }, 400);
  }
  const { data: updated, error: updateError } = await admin.from('business_purchaser_verifications').update({
    status,
    business_evidence_ref: status === 'verified' ? evidenceRef : null,
    verification_checks: status === 'verified' ? checks : {},
    reviewer_id: session.user.id,
    review_reason: input.reason.trim(),
    reviewed_at: new Date().toISOString(),
    expires_at: status === 'verified' ? new Date(expires).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('workspace_id', input.workspaceId).eq('status', application.status).select('workspace_id').maybeSingle();
  if (updateError || !updated) return json({ error: 'review_conflict_or_unavailable' }, 409);
  return json({ status, checkoutEnabled: false });
}
