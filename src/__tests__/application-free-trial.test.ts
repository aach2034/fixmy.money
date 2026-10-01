import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { trialDaysRemaining, trialEndForDisplay } from '@/lib/subscription/display';

const migration = fs.readFileSync(
  'supabase/migrations/20261001120000_application_free_trial.sql',
  'utf8',
);
const checkout = fs.readFileSync('src/app/api/stripe/create-checkout/route.ts', 'utf8');
const proxy = fs.readFileSync('src/proxy.ts', 'utf8');

describe('30-day application trial contract', () => {
  it('is server-only, exactly 30 days, business-plan scoped, and one-time per owner/workspace', () => {
    expect(migration).toContain("started_at + interval '30 days'");
    expect(migration).toContain("p_plan_id NOT IN ('professional', 'agency')");
    expect(migration).toContain('email_confirmed_at IS NOT NULL');
    expect(migration).toContain('profile.onboarding_completed IS TRUE');
    expect(migration).toContain('user_id uuid PRIMARY KEY');
    expect(migration).toContain('workspace_id uuid NOT NULL UNIQUE');
    expect(migration).toContain('FREE_TRIAL_ALREADY_CLAIMED');
    expect(migration).toContain('FREE_TRIAL_IMMUTABLE');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.activate_workspace_free_trial_server');
    expect(migration).not.toContain('GRANT EXECUTE ON FUNCTION public.activate_workspace_free_trial_server(uuid, uuid, text)\n  TO authenticated');
  });

  it('keeps paid Checkout separate and opt-in with no automatic Stripe trial', () => {
    expect(checkout).toContain("process.env.NEW_PAID_CHECKOUT_ENABLED !== 'true'");
    expect(checkout).toContain("payment_method_collection: 'always'");
    expect(checkout).not.toContain('trial_period_days');
    expect(checkout).not.toContain('payment_method_collection: \'if_required\'');
  });

  it('denies direct feature APIs when the server entitlement expires', () => {
    for (const prefix of [
      '/api/ai/', '/api/clients', '/api/credit-report/', '/api/dispute-letters/',
      '/api/mailings/', '/api/workspaces/client-invitations',
    ]) expect(proxy).toContain(`'${prefix}'`);
    expect(proxy).toContain('isSubscriptionGatedApi');
    expect(proxy).toContain("code: entitlement.decision.reason");
  });

  it('displays a current application trial and rounds remaining partial days up', () => {
    const now = new Date('2026-10-01T12:00:00.000Z');
    const end = '2026-10-03T00:00:00.000Z';
    expect(trialEndForDisplay({
      state: 'trial', stripeStatus: 'none', trialSource: 'application', trialEndsAt: end,
    }, now)).toBe(end);
    expect(trialDaysRemaining(end, now)).toBe(2);
    expect(trialDaysRemaining(end, new Date(end))).toBeNull();
  });
});
