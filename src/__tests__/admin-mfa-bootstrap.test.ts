import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requirePlatformAdminMfaBootstrap: vi.fn(),
  getAuthenticatedPlatformAdminRole: vi.fn(),
  writeSecurityAudit: vi.fn(),
  hasRecentAuthenticationMethod: vi.fn(),
  adminRpc: vi.fn(),
  cookieSet: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock('@/lib/admin/authorization', () => ({
  getAuthenticatedPlatformAdminRole: mocks.getAuthenticatedPlatformAdminRole,
  requirePlatformAdmin: vi.fn(),
  requirePlatformAdminEnrollmentIdentity: vi.fn(),
  requirePlatformAdminMfaBootstrap: mocks.requirePlatformAdminMfaBootstrap,
  requireOneTimePlatformAdmin: vi.fn(),
  writeSecurityAudit: mocks.writeSecurityAudit,
}));

vi.mock('@/lib/admin/security', () => ({
  ADMIN_DESTRUCTIVE_AUTH_COOKIE: 'admin-destructive-auth',
  ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS: 900,
  ADMIN_STEP_UP_COOKIE: 'admin-step-up',
  ADMIN_STEP_UP_MAX_AGE_SECONDS: 900,
  createAdminDestructiveAuthorizationToken: vi.fn(),
  createAdminStepUpToken: vi.fn().mockReturnValue('signed-step-up'),
  hashAdminActionMaterial: vi.fn(),
  hashAdminActionNonce: vi.fn(),
}));

vi.mock('@/lib/auth/recent-auth', () => ({
  hasRecentAuthenticationMethod: mocks.hasRecentAuthenticationMethod,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ rpc: mocks.adminRpc }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}));

import { confirmAdminStepUp } from '@/app/admin/security/actions';

const bootstrapSession = {
  user: { id: 'preprovisioned-admin' },
  role: 'platform_admin' as const,
  sessionId: 'session-id',
  accessToken: 'access-token',
  verifiedFactorIds: ['factor-id'],
  supabase: { from: vi.fn() },
};

describe('administrator MFA bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasRecentAuthenticationMethod.mockReturnValue(true);
    mocks.cookies.mockResolvedValue({ set: mocks.cookieSet });
    mocks.adminRpc.mockResolvedValue({ error: null });
  });

  it('keeps an inactive pre-provisioned administrator pending after verified TOTP', async () => {
    mocks.requirePlatformAdminMfaBootstrap.mockResolvedValue({
      ...bootstrapSession,
      active: false,
    });

    await expect(confirmAdminStepUp()).resolves.toEqual({
      ok: true,
      activationPending: true,
    });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(mocks.getAuthenticatedPlatformAdminRole).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.writeSecurityAudit).toHaveBeenCalledWith(
      'preprovisioned-admin',
      'admin_mfa_enrollment_verified_pending_activation',
      expect.objectContaining({ assurance: 'aal2' })
    );
  });

  it('registers app-owned factors and issues step-up only after authenticated RLS succeeds', async () => {
    mocks.requirePlatformAdminMfaBootstrap.mockResolvedValue({
      ...bootstrapSession,
      active: true,
    });
    mocks.getAuthenticatedPlatformAdminRole.mockResolvedValue('platform_admin');

    await expect(confirmAdminStepUp()).resolves.toEqual({
      ok: true,
      activationPending: false,
    });
    expect(mocks.adminRpc).toHaveBeenCalledWith('confirm_platform_admin_mfa_factors', {
      p_user_id: 'preprovisioned-admin',
      p_factor_ids: ['factor-id'],
    });
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      'admin-step-up',
      'signed-step-up',
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict' })
    );
  });

  it('fails closed and issues no cookie when authenticated RLS denies eligibility', async () => {
    mocks.requirePlatformAdminMfaBootstrap.mockResolvedValue({
      ...bootstrapSession,
      active: true,
    });
    mocks.getAuthenticatedPlatformAdminRole.mockResolvedValue(null);

    await expect(confirmAdminStepUp()).rejects.toThrow(
      'Administrator database eligibility could not be verified.'
    );
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
