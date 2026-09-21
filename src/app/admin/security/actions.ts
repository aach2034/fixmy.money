'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import {
  type DestructiveAdminAction,
  getAuthenticatedPlatformAdminRole,
  requirePlatformAdmin,
  requirePlatformAdminEnrollmentIdentity,
  requirePlatformAdminMfaBootstrap,
  requireOneTimePlatformAdmin,
  writeSecurityAudit,
} from '@/lib/admin/authorization';
import {
  ADMIN_DESTRUCTIVE_AUTH_COOKIE,
  ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS,
  ADMIN_STEP_UP_COOKIE,
  ADMIN_STEP_UP_MAX_AGE_SECONDS,
  type AdminActionMaterial,
  createAdminDestructiveAuthorizationToken,
  createAdminStepUpToken,
  hashAdminActionMaterial,
  hashAdminActionNonce,
} from '@/lib/admin/security';
import { hasRecentAuthenticationMethod } from '@/lib/auth/recent-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const TOTP_AUTHENTICATION_METHODS = new Set(['totp']);
const DESTRUCTIVE_ADMIN_ACTIONS = new Set<DestructiveAdminAction>([
  'administrator_factor_removal',
  'administrator_factor_recovery',
  'administrator_activation_change',
  'administrator_role_change',
  'administrator_session_revocation',
  'billing_change',
  'break_glass_restoration',
  'customer_deletion',
  'customer_data_deletion',
  'refund_issue',
  'subscription_change',
]);

function validateDestructiveIntent(
  action: DestructiveAdminAction,
  targetId: string,
  material: AdminActionMaterial
): void {
  if (!DESTRUCTIVE_ADMIN_ACTIONS.has(action)) throw new Error('Unsupported destructive administrator action.');
  if (!targetId || targetId.length > 500) throw new Error('A valid destructive-action target is required.');
  if (!material || Array.isArray(material) || typeof material !== 'object') {
    throw new Error('Destructive-action material parameters are required.');
  }
  for (const value of Object.values(material)) {
    if (
      value !== null &&
      (!['string', 'number', 'boolean'].includes(typeof value) ||
        (typeof value === 'number' && !Number.isFinite(value)))
    ) {
      throw new Error('Invalid destructive-action material parameter.');
    }
  }
}

export async function confirmAdminStepUp(): Promise<{ ok: true; activationPending: boolean }> {
  const { user, role, active, sessionId, accessToken, verifiedFactorIds, supabase } =
    await requirePlatformAdminMfaBootstrap();
  if (!hasRecentAuthenticationMethod(accessToken, TOTP_AUTHENTICATION_METHODS)) {
    await writeSecurityAudit(user.id, 'admin_step_up_denied', { reason: 'fresh_challenge_required' });
    throw new Error('A fresh authenticator challenge is required.');
  }

  if (!active) {
    await writeSecurityAudit(user.id, 'admin_mfa_enrollment_verified_pending_activation', {
      assurance: 'aal2',
      verified_factor_count: verifiedFactorIds.length,
    });
    return { ok: true, activationPending: true };
  }

  const { error: eligibilityError } = await getAdminClient().rpc(
    'confirm_platform_admin_mfa_factors',
    { p_user_id: user.id, p_factor_ids: verifiedFactorIds }
  );
  if (eligibilityError) {
    throw new Error('Administrator MFA eligibility could not be recorded.');
  }

  const authenticatedRole = await getAuthenticatedPlatformAdminRole(supabase, user.id);
  if (authenticatedRole !== role) {
    throw new Error('Administrator database eligibility could not be verified.');
  }

  const token = createAdminStepUpToken(
    { userId: user.id, sessionId, issuedAt: Math.floor(Date.now() / 1000) },
    process.env.ADMIN_STEP_UP_SECRET || ''
  );

  await writeSecurityAudit(user.id, 'admin_step_up_succeeded', {
    assurance: 'aal2',
    max_age_seconds: ADMIN_STEP_UP_MAX_AGE_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_STEP_UP_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_STEP_UP_MAX_AGE_SECONDS,
  });
  return { ok: true, activationPending: false };
}

export async function authorizeDestructiveAdminAction(
  action: DestructiveAdminAction,
  targetId: string,
  material: AdminActionMaterial
): Promise<{ ok: true }> {
  validateDestructiveIntent(action, targetId, material);
  const { user, sessionId, accessToken } = await requirePlatformAdmin();
  if (!hasRecentAuthenticationMethod(accessToken, TOTP_AUTHENTICATION_METHODS)) {
    await writeSecurityAudit(user.id, 'admin_destructive_step_up_denied', {
      reason: 'fresh_challenge_required',
      sensitive_action: action,
    });
    throw new Error('A fresh authenticator challenge is required.');
  }

  const nonce = randomBytes(32).toString('base64url');
  const materialHash = hashAdminActionMaterial(material);
  const { data, error } = await getAdminClient().rpc('issue_admin_destructive_authorization', {
    p_nonce_hash: hashAdminActionNonce(nonce),
    p_user_id: user.id,
    p_session_id: sessionId,
    p_action: action,
    p_target_id: targetId,
    p_material_hash: materialHash,
  });
  const issued = Array.isArray(data) ? data[0] : null;
  const issuedAt = Number(issued?.issued_at_epoch);
  const expiresAt = Number(issued?.expires_at_epoch);
  if (
    error ||
    !issued ||
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt)
  ) {
    throw new Error('Destructive administrator authorization could not be created.');
  }

  const token = createAdminDestructiveAuthorizationToken({
    userId: user.id,
    sessionId,
    action,
    targetId,
    materialHash,
    nonce,
    issuedAt,
    expiresAt,
  }, process.env.ADMIN_STEP_UP_SECRET || '');

  await writeSecurityAudit(user.id, 'admin_destructive_step_up_succeeded', {
    sensitive_action: action,
    max_age_seconds: ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS,
  });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_DESTRUCTIVE_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS,
  });
  return { ok: true };
}

const allowedEvents = new Set([
  'admin_mfa_enrollment_started',
  'admin_mfa_enrollment_failed',
  'admin_mfa_challenge_failed',
  'admin_mfa_sign_out_failed',
]);

export async function recordAdminSecurityEvent(action: string): Promise<void> {
  const { user } = await requirePlatformAdminEnrollmentIdentity();
  if (!allowedEvents.has(action)) throw new Error('Unsupported administrator security event.');
  await writeSecurityAudit(user.id, action);
}

export async function prepareAdminMfaEnrollment(): Promise<{ ok: true; cleared: number }> {
  const { user } = await requirePlatformAdminEnrollmentIdentity();
  const supabase = await createClient();
  const {
    data: { user: sessionUser },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !sessionUser || sessionUser.id !== user.id) {
    throw new Error('Administrator enrollment identity could not be verified.');
  }

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw new Error('Administrator factors could not be inspected.');
  const staleFactorIds = factors.all
    .filter((factor) => factor.factor_type === 'totp' && factor.status === 'unverified')
    .map((factor) => factor.id);
  for (const factorId of staleFactorIds) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw new Error('An incomplete administrator enrollment could not be cleared.');
  }
  if (staleFactorIds.length > 0) {
    await writeSecurityAudit(user.id, 'admin_mfa_incomplete_enrollment_cleared', {
      cleared_factor_count: staleFactorIds.length,
    });
  }
  return { ok: true, cleared: staleFactorIds.length };
}

async function revokeCurrentAdmin(userId: string, action: string): Promise<{ ok: true }> {
  const { error: revokeError } = await getAdminClient().rpc('revoke_platform_admin_sessions', {
    p_user_id: userId,
    p_action: action,
    p_metadata: { source: 'application' },
  });
  if (revokeError) throw new Error('Administrator session revocation could not be recorded.');

  const supabase = await createClient();
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) {
    await writeSecurityAudit(userId, 'admin_refresh_revocation_failed', { app_sessions_revoked: true });
    throw new Error('Administrator refresh-token revocation failed.');
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_STEP_UP_COOKIE);
  cookieStore.delete(ADMIN_DESTRUCTIVE_AUTH_COOKIE);
  return { ok: true };
}

export async function revokeAdminSessions(): Promise<{ ok: true }> {
  const { user } = await requireOneTimePlatformAdmin(
    'administrator_session_revocation',
    'self',
    { scope: 'global' }
  );
  return revokeCurrentAdmin(user.id, 'admin_sessions_revoked');
}

export async function removeAdminFactor(factorId: string): Promise<{ ok: true }> {
  if (!factorId) throw new Error('A factor is required.');
  const { user } = await requireOneTimePlatformAdmin(
    'administrator_factor_removal',
    factorId,
    { factorId }
  );
  const supabase = await createClient();
  const { error: removalError } = await supabase.auth.mfa.unenroll({ factorId });
  if (removalError) throw new Error('Administrator factor removal failed.');

  const { error: revocationError } = await getAdminClient().rpc(
    'revoke_platform_admin_factor',
    {
      p_user_id: user.id,
      p_factor_id: factorId,
      p_source: 'application_fallback',
      p_auth_audit_entry_id: null,
    }
  );
  if (revocationError) throw new Error('Administrator factor revocation could not be recorded.');

  // Supabase does not downgrade an already-issued AAL2 JWT until refresh. The
  // supported Auth-audit event path or the server fallback has already
  // deny-listed every known session at this point.
  await supabase.auth.refreshSession();
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) {
    await writeSecurityAudit(user.id, 'admin_mfa_sign_out_failed', {
      app_sessions_revoked: true,
    });
    throw new Error('Administrator refresh-token revocation failed.');
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_STEP_UP_COOKIE);
  cookieStore.delete(ADMIN_DESTRUCTIVE_AUTH_COOKIE);
  return { ok: true };
}
