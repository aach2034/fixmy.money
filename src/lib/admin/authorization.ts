import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import {
  ADMIN_DESTRUCTIVE_AUTH_COOKIE,
  ADMIN_STEP_UP_COOKIE,
  type AdminActionMaterial,
  hashAdminActionNonce,
  readSessionId,
  verifyAdminDestructiveAuthorizationToken,
  verifyAdminStepUpToken,
} from '@/lib/admin/security';
import {
  isAuthenticationAfterRevocation,
  readPrimaryAuthenticationTime,
} from '@/lib/auth/recent-auth';

export type PlatformAdminRole = 'platform_admin' | 'platform_superadmin';

export type ReusableSensitiveAdminAction =
  | 'customer_classification_update'
  | 'customer_retention_update'
  | 'business_verification_review';

export type DestructiveAdminAction =
  | 'administrator_factor_removal'
  | 'administrator_factor_recovery'
  | 'administrator_activation_change'
  | 'administrator_role_change'
  | 'administrator_session_revocation'
  | 'billing_change'
  | 'break_glass_restoration'
  | 'customer_deletion'
  | 'customer_data_deletion'
  | 'refund_issue'
  | 'subscription_change';

export type SensitiveAdminAction = ReusableSensitiveAdminAction | DestructiveAdminAction;

export type PlatformAdminSession = {
  user: User;
  role: PlatformAdminRole;
  sessionId: string;
  accessToken: string;
};

export type PlatformAdminEnrollmentSession = PlatformAdminSession & {
  active: boolean;
};

export type VerifiedPlatformAdminSession = PlatformAdminSession & {
  verifiedFactorIds: string[];
};

type AdminAuthClient = Awaited<ReturnType<typeof createClient>>;

type PlatformAdminEnrollment = {
  role: PlatformAdminRole;
  active: boolean;
};

export async function getPlatformAdminRole(userId: string): Promise<PlatformAdminRole | null> {
  const { data, error } = await getAdminClient()
    .from('platform_admins')
    .select('role, active')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data.role === 'platform_admin' || data.role === 'platform_superadmin' ? data.role : null;
}

/**
 * Resolve only whether a verified Auth user has been pre-provisioned for the
 * administrator MFA enrollment screen. This result must never authorize an
 * administrator page or mutation.
 */
export async function getPlatformAdminEnrollment(
  userId: string
): Promise<PlatformAdminEnrollment | null> {
  const { data, error } = await getAdminClient()
    .from('platform_admins')
    .select('role, active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.role !== 'platform_admin' && data.role !== 'platform_superadmin') return null;
  return { role: data.role, active: data.active === true };
}

/**
 * Resolve an active administrator through the caller's authenticated database
 * session. FMM-015 RLS is the final authority for role, AAL2, app-owned factor
 * state, and session revocation.
 */
export async function getAuthenticatedPlatformAdminRole(
  supabase: AdminAuthClient,
  userId: string
): Promise<PlatformAdminRole | null> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('role, active')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;
  if (data.role === 'platform_superadmin') return 'platform_superadmin';
  return data.role === 'platform_admin' ? 'platform_admin' : null;
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  return (await getPlatformAdminRole(userId)) !== null;
}

async function writeSecurityAudit(
  adminId: string,
  action: string,
  metadata: Record<string, string | number | boolean | null> = {}
): Promise<void> {
  const { error } = await getAdminClient().from('admin_action_audit_logs').insert({
    admin_id: adminId,
    customer_id: null,
    action,
    metadata,
  });
  if (error) throw new Error('Administrator security audit recording failed.');
}

async function getAdminIdentity(
  allowInactive = false
): Promise<PlatformAdminEnrollmentSession & { supabase: AdminAuthClient }> {
  const supabase = await createClient();
  const {
    data: { user }, error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect('/login');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const accessToken = session?.access_token || '';
  const sessionId = readSessionId(accessToken);
  const primaryAuthenticatedAt = readPrimaryAuthenticationTime(accessToken);
  if (sessionError || !sessionId || primaryAuthenticatedAt === null) {
    redirect('/login');
  }

  const { data: adminRecord, error: adminError } = await getAdminClient()
    .from('platform_admins')
    .select('role, active, sessions_revoked_after, revoked_session_ids')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = adminRecord?.role;
  if (
    adminError ||
    !adminRecord ||
    (!allowInactive && adminRecord.active !== true) ||
    (role !== 'platform_admin' && role !== 'platform_superadmin')
  ) {
    redirect('/dashboard');
  }

  const revokedAfter = adminRecord.sessions_revoked_after
    ? Math.floor(new Date(adminRecord.sessions_revoked_after).getTime() / 1000)
    : 0;
  const revokedSessionIds = Array.isArray(adminRecord.revoked_session_ids)
    ? adminRecord.revoked_session_ids.filter((value): value is string => typeof value === 'string')
    : [];
  if (revokedSessionIds.includes(sessionId) || !isAuthenticationAfterRevocation(accessToken, revokedAfter)) {
    await writeSecurityAudit(user.id, 'admin_session_denied', { reason: 'session_revoked' });
    redirect('/login');
  }

  return { user, role, active: adminRecord.active === true, sessionId, accessToken, supabase };
}

export async function requirePlatformAdminIdentity(): Promise<PlatformAdminSession> {
  const { user, role, sessionId, accessToken } = await getAdminIdentity();
  return { user, role, sessionId, accessToken };
}

export async function requirePlatformAdminEnrollmentIdentity(): Promise<PlatformAdminEnrollmentSession> {
  const { user, role, active, sessionId, accessToken } = await getAdminIdentity(true);
  return { user, role, active, sessionId, accessToken };
}

async function requireVerifiedPlatformAdminMfa(
  allowInactive = false
): Promise<VerifiedPlatformAdminSession & { active: boolean; supabase: AdminAuthClient }> {
  const { user, role, active, sessionId, accessToken, supabase } = await getAdminIdentity(allowInactive);
  const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

  if (assuranceError || factorsError) {
    await writeSecurityAudit(user.id, 'admin_mfa_denied', { reason: 'assurance_unavailable' });
    redirect('/admin/security?reason=unavailable');
  }

  const verifiedFactorIds = factors.totp
    .filter((factor) => factor.status === 'verified')
    .map((factor) => factor.id);
  if (verifiedFactorIds.length === 0) {
    await writeSecurityAudit(user.id, 'admin_mfa_denied', { reason: 'enrollment_required' });
    redirect('/admin/security?reason=enroll');
  }

  if (assurance.currentLevel !== 'aal2') {
    await writeSecurityAudit(user.id, 'admin_mfa_denied', { reason: 'challenge_required' });
    redirect('/admin/security?reason=challenge');
  }

  return { user, role, active, sessionId, accessToken, verifiedFactorIds, supabase };
}

/**
 * Enrollment bootstrap requires a real verified TOTP/AAL2 session but does not
 * itself grant administrator access. Inactive pre-provisioned administrators
 * remain inactive and receive no step-up cookie.
 */
export async function requirePlatformAdminMfaBootstrap(): Promise<
  VerifiedPlatformAdminSession & { active: boolean; supabase: AdminAuthClient }
> {
  return requireVerifiedPlatformAdminMfa(true);
}

export async function requirePlatformAdmin(): Promise<VerifiedPlatformAdminSession> {
  const session = await requireVerifiedPlatformAdminMfa();
  const authenticatedRole = await getAuthenticatedPlatformAdminRole(
    session.supabase,
    session.user.id
  );
  if (authenticatedRole !== session.role) {
    await writeSecurityAudit(session.user.id, 'admin_mfa_denied', {
      reason: 'database_eligibility_denied',
    });
    redirect('/admin/security?reason=eligibility');
  }

  const { user, role, sessionId, accessToken, verifiedFactorIds } = session;
  return { user, role, sessionId, accessToken, verifiedFactorIds };
}

export async function requireRecentPlatformAdmin(action: ReusableSensitiveAdminAction): Promise<PlatformAdminSession> {
  const session = await requirePlatformAdmin();
  const cookieStore = await cookies();
  const binding = verifyAdminStepUpToken({
    token: cookieStore.get(ADMIN_STEP_UP_COOKIE)?.value,
    secret: process.env.ADMIN_STEP_UP_SECRET || '',
    userId: session.user.id,
    sessionId: session.sessionId,
  });
  if (!binding) {
    await writeSecurityAudit(session.user.id, 'admin_step_up_denied', {
      reason: 'missing_or_expired',
      sensitive_action: action,
    });
    redirect('/admin/security?reason=recent-auth');
  }
  return session;
}

export async function requireOneTimePlatformAdmin(
  action: DestructiveAdminAction,
  targetId: string,
  material: AdminActionMaterial
): Promise<PlatformAdminSession> {
  const session = await requirePlatformAdmin();
  const cookieStore = await cookies();
  const binding = verifyAdminDestructiveAuthorizationToken({
    token: cookieStore.get(ADMIN_DESTRUCTIVE_AUTH_COOKIE)?.value,
    secret: process.env.ADMIN_STEP_UP_SECRET || '',
    userId: session.user.id,
    sessionId: session.sessionId,
    action,
    targetId,
    material,
  });
  if (!binding) {
    await writeSecurityAudit(session.user.id, 'admin_destructive_step_up_denied', {
      reason: 'missing_expired_or_intent_mismatch',
      sensitive_action: action,
    });
    redirect('/admin/security?reason=recent-auth');
  }

  const { data: consumed, error } = await getAdminClient().rpc(
    'consume_admin_destructive_authorization',
    {
      p_nonce_hash: hashAdminActionNonce(binding.nonce),
      p_user_id: session.user.id,
      p_session_id: session.sessionId,
      p_action: action,
      p_target_id: targetId,
      p_material_hash: binding.materialHash,
    }
  );
  if (error || consumed !== true) {
    await writeSecurityAudit(session.user.id, 'admin_destructive_step_up_denied', {
      reason: 'already_used_or_revoked',
      sensitive_action: action,
    });
    redirect('/admin/security?reason=recent-auth');
  }

  cookieStore.delete(ADMIN_DESTRUCTIVE_AUTH_COOKIE);
  return session;
}

export { writeSecurityAudit };
