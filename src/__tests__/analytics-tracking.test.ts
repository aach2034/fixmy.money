import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Google Analytics funnel tracking', () => {
  it('uses one GA initializer and disables its automatic page view', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).not.toContain('GTM-PQQ9V4XT');
    expect(layout).toContain("gtag('config', 'G-8MPF8KLDVG', { send_page_view: false })");
    expect(layout).toContain('<GoogleAnalytics />');
  });

  it('tracks SPA page views with useful page context', () => {
    const analytics = read('src/lib/analytics.ts');
    expect(analytics).toContain("window.gtag('event', 'page_view'");
    expect(analytics).toContain("window.gtag('event', 'landing_page_view'");
    expect(analytics).toContain('page_location: window.location.href');
    expect(analytics).toContain('organic_landing_page');
    expect(analytics).toContain('attributionEventParams');
    expect(analytics).not.toContain("document.createElement('script')");
  });

  it('tracks actual checkout starts and deduplicated purchases', () => {
    const checkout = read('src/app/checkout/components/CheckoutContent.tsx');
    const dashboard = read('src/app/dashboard/page.tsx');
    const checkoutRoute = read('src/app/api/stripe/create-checkout/route.ts');
    expect(checkout).toContain("trackEvent('begin_checkout'");
    expect(checkoutRoute).toContain('session_id={CHECKOUT_SESSION_ID}');
    expect(dashboard).toContain("trackEvent('purchase'");
    expect(dashboard).toContain('ga_purchase_');
  });

  it('preserves acquisition attribution through signup and checkout', () => {
    const attribution = read('src/lib/attribution.ts');
    const authForm = read('src/app/sign-up-login-screen/components/AuthForm.tsx');
    const checkout = read('src/app/checkout/components/CheckoutContent.tsx');
    const checkoutRoute = read('src/app/api/stripe/create-checkout/route.ts');
    const migration = read('supabase/migrations/20260827090000_acquisition_attribution.sql');

    expect(attribution).toContain('ATTRIBUTION_STORAGE_KEY');
    expect(attribution).toContain('firstTouch');
    expect(attribution).toContain('lastTouch');
    expect(authForm).toContain('attribution: attributionEventParams');
    expect(checkout).toContain('attribution: attributionEventParams');
    expect(checkoutRoute).toContain('...attribution');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS referral_code');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS last_utm_campaign');
  });

  it('defines the requested funnel events without adding another analytics vendor', () => {
    const analytics = [
      read('src/lib/analytics.ts'),
      read('src/app/credit-report-import/components/CreditReportImportContent.tsx'),
      read('src/app/api/stripe/webhook/route.ts'),
      read('src/app/sign-up-login-screen/components/AuthForm.tsx'),
      read('src/app/checkout/components/CheckoutContent.tsx'),
    ].join('\n');
    for (const eventName of [
      'landing_page_view',
      'pricing_view',
      'tool_started',
      'tool_completed',
      'report_upload_started',
      'report_upload_completed',
      'signup_started',
      'signup_completed',
      'trial_started',
      'checkout_started',
      'subscription_started',
      'professional_lead',
      'mortgage_partner_lead',
      'affiliate_referral',
    ]) {
      expect(analytics).toContain(eventName);
    }
    expect(analytics).not.toContain('mixpanel');
    expect(analytics).not.toContain('segment');
  });

  it('tracks organic funnel milestones after signup', () => {
    expect(read('src/app/credit-report-import/components/CreditReportImportContent.tsx')).toContain("trackOrganicConversionStep('credit_report_upload_saved'");
    expect(read('src/app/credit-audit/components/CreditAuditContent.tsx')).toContain("trackOrganicConversionStep('credit_audit_completed'");
    expect(read('src/app/dispute-wizard/components/DisputeWizardContent.tsx')).toContain("trackOrganicConversionStep('dispute_wizard_letter_generated'");
  });
});
