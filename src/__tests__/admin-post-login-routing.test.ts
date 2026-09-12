import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getAuthenticatedPlatformAdminRole: vi.fn(),
  getPlatformAdminEnrollment: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@/lib/admin/authorization', () => ({
  getAuthenticatedPlatformAdminRole: mocks.getAuthenticatedPlatformAdminRole,
  getPlatformAdminEnrollment: mocks.getPlatformAdminEnrollment,
}));

import { GET as getAdministratorDestinationRoute } from '@/app/api/auth/administrator-destination/route';
import {
  getAdministratorDestination,
  resolvePostLoginDestination,
} from '@/lib/auth/post-login';

describe('administrator post-login routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedPlatformAdminRole.mockResolvedValue(null);
    mocks.getPlatformAdminEnrollment.mockResolvedValue(null);
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'verified-administrator' } },
          error: null,
        }),
      },
    });
  });

  it('routes an active superadministrator such as Adam directly to /admin', async () => {
    mocks.getAuthenticatedPlatformAdminRole.mockResolvedValue('platform_superadmin');

    const response = await getAdministratorDestinationRoute();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ destination: '/admin' });
    expect(mocks.getAuthenticatedPlatformAdminRole).toHaveBeenCalledWith(
      expect.objectContaining({ auth: expect.any(Object) }),
      'verified-administrator'
    );
    expect(mocks.getPlatformAdminEnrollment).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('routes an active standard administrator directly to /admin', async () => {
    mocks.getAuthenticatedPlatformAdminRole.mockResolvedValue('platform_admin');

    const response = await getAdministratorDestinationRoute();

    await expect(response.json()).resolves.toEqual({ destination: '/admin' });
  });

  it('routes a pre-provisioned inactive administrator only to MFA enrollment', async () => {
    mocks.getPlatformAdminEnrollment.mockResolvedValue({ role: 'platform_admin', active: false });

    const response = await getAdministratorDestinationRoute();

    await expect(response.json()).resolves.toEqual({ destination: '/admin/security' });
  });

  it('routes an active AAL1 administrator to MFA enrollment instead of privileged pages', async () => {
    mocks.getPlatformAdminEnrollment.mockResolvedValue({ role: 'platform_superadmin', active: true });

    const response = await getAdministratorDestinationRoute();

    await expect(response.json()).resolves.toEqual({ destination: '/admin/security' });
  });

  it('fails closed for an ordinary user', async () => {

    const response = await getAdministratorDestinationRoute();

    await expect(response.json()).resolves.toEqual({ destination: null });
  });

  it('does not resolve administrator state without a verified Auth identity', async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('missing') }),
      },
    });

    const response = await getAdministratorDestinationRoute();

    expect(response.status).toBe(401);
    expect(mocks.getAuthenticatedPlatformAdminRole).not.toHaveBeenCalled();
    expect(mocks.getPlatformAdminEnrollment).not.toHaveBeenCalled();
  });

  it('does not call profile, entitlement, subscription, or Stripe paths for an administrator', async () => {
    const getProfile = vi.fn();
    const getEntitlement = vi.fn();

    const destination = await resolvePostLoginDestination({
      redirectTo: '/dashboard',
      getAdministratorDestination: vi.fn().mockResolvedValue('/admin'),
      getProfile,
      getEntitlement,
    });

    expect(destination).toBe('/admin');
    expect(getProfile).not.toHaveBeenCalled();
    expect(getEntitlement).not.toHaveBeenCalled();
  });

  it('does not call customer routing for an administrator who needs MFA enrollment', async () => {
    const getProfile = vi.fn();
    const getEntitlement = vi.fn();

    const destination = await resolvePostLoginDestination({
      redirectTo: '/dashboard',
      getAdministratorDestination: vi.fn().mockResolvedValue('/admin/security'),
      getProfile,
      getEntitlement,
    });

    expect(destination).toBe('/admin/security');
    expect(getProfile).not.toHaveBeenCalled();
    expect(getEntitlement).not.toHaveBeenCalled();
  });

  it('preserves ordinary-user entitlement and onboarding routing', async () => {
    const activeCustomer = await resolvePostLoginDestination({
      redirectTo: '',
      getAdministratorDestination: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue({ onboarding_completed: true }),
      getEntitlement: vi.fn().mockResolvedValue({ canAccess: true }),
    });
    const onboardingCustomer = await resolvePostLoginDestination({
      redirectTo: '',
      getAdministratorDestination: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue({ onboarding_completed: false }),
      getEntitlement: vi.fn().mockResolvedValue({ canAccess: true }),
    });
    const customerWithoutEntitlement = await resolvePostLoginDestination({
      redirectTo: '',
      getAdministratorDestination: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue({ onboarding_completed: true }),
      getEntitlement: vi.fn().mockResolvedValue({ canAccess: false }),
    });

    expect(activeCustomer).toBe('/dashboard');
    expect(onboardingCustomer).toBe('/onboarding');
    expect(customerWithoutEntitlement).toBe('/billing-subscriptions');
  });

  it('accepts only exact server-issued administrator destinations', async () => {
    const enrollmentFetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ destination: '/admin/security' }), { status: 200 })
    );
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ destination: 'https://attacker.example' }), { status: 200 })
    );

    await expect(getAdministratorDestination(enrollmentFetcher)).resolves.toBe('/admin/security');
    await expect(getAdministratorDestination(fetcher)).resolves.toBeNull();
  });
});
