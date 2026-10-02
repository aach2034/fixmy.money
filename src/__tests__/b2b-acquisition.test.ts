import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { BUSINESS_USE_POLICY_VERSION } from '@/lib/signup/business-policy';
import { BUSINESS_PLAN_IDS, isBusinessPlan, PLANS, PLANS_LIST } from '@/lib/stripe/plans';
import { PUBLIC_SEO_PAGES } from '@/lib/seo/config';

const { signUp, isOpen } = vi.hoisted(() => ({ signUp: vi.fn(), isOpen: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { signUp } }) }));
vi.mock('@/lib/signup/closure', () => ({
  isPublicSignupOpen: isOpen,
  signupClosedPayload: () => ({ code: 'SIGNUPS_CLOSED' }),
}));
vi.mock('@/lib/supabase/public-config', () => ({
  getSupabasePublicConfig: () => ({ url: 'https://example.supabase.co', publishableKey: 'test-key' }),
}));

import { POST } from '@/app/api/auth/signup/route';

const valid = {
  adminName: 'Business Owner', companyName: 'Example Agency',
  email: 'owner@example.com', password: 'test-password-not-real',
  plan: 'professional', termsAccepted: true, businessUseAccepted: true,
  businessPolicyVersion: BUSINESS_USE_POLICY_VERSION,
};
const submit = (payload: unknown) => POST(new NextRequest('https://fixmy.money/api/auth/signup', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
}));

describe('business-only acquisition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpen.mockReturnValue(true);
    signUp.mockResolvedValue({ error: null });
  });

  it('publishes the approved catalog while limiting new acquisition to business plans', () => {
    expect(PLANS_LIST.map(plan => plan.id)).toEqual(['starter', ...BUSINESS_PLAN_IDS]);
    expect(PLANS.starter).toMatchObject({ name: 'FixMy Credit', monthlyPrice: 39, maxClients: 3, stripeAmountCents: 3900 });
    expect(isBusinessPlan('starter')).toBe(false);
    expect(PUBLIC_SEO_PAGES.some(page => page.path === '/individuals')).toBe(false);
    expect(PUBLIC_SEO_PAGES.some(page => page.path === '/business-use')).toBe(true);
  });

  it.each(['starter', 'personal', 'enterprise', 'growth', '', null, undefined])('rejects new %s selections without creating an identity or silently upgrading', async plan => {
    const response = await submit({ ...valid, plan });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'BUSINESS_PLAN_REQUIRED' });
    expect(signUp).not.toHaveBeenCalled();
  });

  it.each([
    { businessUseAccepted: false }, { businessUseAccepted: 'true' },
    { termsAccepted: false }, { termsAccepted: undefined },
    { businessPolicyVersion: 'stale' }, { businessPolicyVersion: undefined },
  ])('requires explicit current declarations: %j', async override => {
    const response = await submit({ ...valid, ...override });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'BUSINESS_DECLARATION_REQUIRED' });
    expect(signUp).not.toHaveBeenCalled();
  });

  it.each([...BUSINESS_PLAN_IDS])('accepts %s declarations without claiming verification or paid entitlement', async plan => {
    expect((await submit({ ...valid, plan })).status).toBe(202);
    const call = signUp.mock.calls[0][0];
    expect(call.options.data).toMatchObject({
      plan, business_use_declaration: { version: BUSINESS_USE_POLICY_VERSION, terms_accepted: true },
    });
    expect(call.options.data.business_verified).toBeUndefined();
    expect(call.options.data.subscription_status).toBeUndefined();
    expect(call.options.emailRedirectTo).toContain(`type=signup&plan=${plan}`);
  });

  it.each([null, [], 'invalid'])('rejects malformed payload %j', async payload => {
    expect((await submit(payload)).status).toBe(400);
    expect(signUp).not.toHaveBeenCalled();
  });

  it('preserves the release hold even with valid business declarations', async () => {
    isOpen.mockReturnValue(false);
    expect((await submit(valid)).status).toBe(403);
    expect(signUp).not.toHaveBeenCalled();
  });

  it('does not route old signup links to a substituted business plan', () => {
    const callback = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');
    expect(callback).toContain('isBusinessPlan(requestedPlan)');
    expect(callback).toContain(": '/onboarding'");
    expect(callback).not.toContain("new Set(['starter'");
  });
});
