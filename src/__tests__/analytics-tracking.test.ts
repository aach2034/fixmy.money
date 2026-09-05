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
    const analytics = read('src/lib/analytics.ts');
    const checkout = read('src/app/checkout/components/CheckoutContent.tsx');
    const dashboard = read('src/app/dashboard/page.tsx');
    const checkoutRoute = read('src/app/api/stripe/create-checkout/route.ts');
    const trialSignupBody = analytics.split('export function trackTrialSignup')[1].split('export function trackToolStarted')[0];
    expect(trialSignupBody).not.toContain("trackEvent('begin_checkout'");
    expect(checkout).toContain("trackEvent('begin_checkout'");
    expect(checkoutRoute).toContain('session_id={CHECKOUT_SESSION_ID}');
    expect(dashboard).toContain("trackEvent('purchase'");
    expect(dashboard).toContain('ga_purchase_');
  });

  it('tracks each registration and checkout-return funnel milestone', () => {
    const authForm = read('src/app/sign-up-login-screen/components/AuthForm.tsx');
    const authCallback = read('src/app/auth/callback/route.ts');
    const checkout = read('src/app/checkout/components/CheckoutContent.tsx');

    expect(authForm).toContain("trackEvent('signup_started'");
    expect(authForm).toContain("trackEvent('sign_up'");
    expect(authForm).toContain('email_confirmation_required: Boolean(needsEmailConfirmation)');
    expect(authForm).toContain("trackEvent('email_verification_required'");
    expect(authCallback).toContain('&verified=1');
    expect(checkout).toContain("trackEvent('email_verified'");
    expect(checkout).toContain("searchParams.get('cancelled') === '1'");
    expect(checkout).toContain("trackEvent('checkout_cancelled'");
  });

  it('keeps homepage CTA properties distinct and free of signup completion events', () => {
    const analytics = read('src/lib/analytics.ts');
    const trialSignupBody = analytics.split('export function trackTrialSignup')[1].split('export function trackToolStarted')[0];

    expect(trialSignupBody).toContain("trackEvent('trial_start_click'");
    expect(trialSignupBody).toContain('plan_name: plan');
    expect(trialSignupBody).toContain('audience: getPlanAudience(plan)');
    expect(trialSignupBody).toContain('cta_location: location');
    expect(trialSignupBody).toContain("source_page: 'homepage'");
    expect(trialSignupBody).not.toContain("trackEvent('signup_started'");
    expect(trialSignupBody).not.toContain("trackEvent('sign_up'");
  });

  it('preserves acquisition attribution through signup and checkout', () => {
    const attribution = read('src/lib/attribution.ts');
    const authForm = read('src/app/sign-up-login-screen/components/AuthForm.tsx');
    const checkout = read('src/app/checkout/components/CheckoutContent.tsx');
    const checkoutRoute = read('src/app/api/stripe/create-checkout/route.ts');
    const migration = read('supabase/migrations/20260829213754_product_acquisition_analytics.sql');

    expect(attribution).toContain('ATTRIBUTION_STORAGE_KEY');
    expect(attribution).toContain('firstTouch');
    expect(attribution).toContain('lastTouch');
    expect(authForm).toContain('attribution: attributionEventParams');
    expect(checkout).toContain('attribution: attributionEventParams');
    expect(checkoutRoute).toContain('...attribution');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS referral_code');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS last_utm_campaign');
    expect(migration).toContain('INSERT INTO public.workspaces');
    expect(migration).toContain('product_analytics_events');
    expect(migration).toContain('REVOKE ALL ON TABLE public.product_analytics_events FROM anon, authenticated');
  });

  it('persists authenticated activation events through a protected server route', () => {
    const analytics = read('src/lib/analytics.ts');
    const route = read('src/app/api/analytics/events/route.ts');
    const server = read('src/lib/analytics/server.ts');
    expect(analytics).toContain("fetch('/api/analytics/events'");
    expect(analytics).toContain('eventParams.authenticated !== true');
    expect(route).toContain('supabase.auth.getUser()');
    expect(route).toContain('CLIENT_EVENT_NAMES');
    expect(server).toContain('ALLOWED_PROPERTY_KEYS');
    expect(server).not.toContain('credit_report_content');
    expect(server).not.toContain('account_number');
    expect(server).not.toContain('ssn');
  });

  it('records authoritative subscription lifecycle events from signed Stripe webhooks', () => {
    const webhook = read('src/app/api/stripe/webhook/route.ts');
    const processor = read('src/lib/stripe/webhookProcessor.ts');
    expect(webhook).toContain('processStripeWebhookBusinessEvent');
    expect(processor).toContain("eventName: 'trial_started'");
    expect(processor).toContain("eventName: 'subscription_started'");
    expect(processor).toContain("eventName: 'subscription_upgraded'");
    expect(processor).toContain("eventName: 'subscription_cancelled'");
    expect(processor).toContain('logProductAnalyticsEvent');
  });

  it('defines the requested funnel events without adding another analytics vendor', () => {
    const analytics = [
      read('src/lib/analytics.ts'),
      read('src/app/credit-report-import/components/CreditReportImportContent.tsx'),
      read('src/app/api/stripe/webhook/route.ts'),
      read('src/lib/stripe/webhookProcessor.ts'),
      read('src/app/sign-up-login-screen/components/AuthForm.tsx'),
      read('src/app/checkout/components/CheckoutContent.tsx'),
      read('src/app/onboarding/components/OnboardingContent.tsx'),
      read('src/app/credit-audit/components/CreditAuditContent.tsx'),
      read('src/app/dispute-wizard/components/DisputeWizardContent.tsx'),
      read('src/app/clients/[clientId]/negative-items/components/NegativeItemsContent.tsx'),
      read('src/app/dashboard/page.tsx'),
    ].join('\n');
    for (const eventName of [
      'landing_page_view',
      'homepage_view',
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
      'onboarding_started',
      'onboarding_completed',
      'credit_report_import_started',
      'credit_report_import_completed',
      'credit_audit_viewed',
      'dispute_wizard_started',
      'dispute_created',
      'letter_generated',
      'professional_lead',
      'mortgage_partner_lead',
      'affiliate_referral',
    ]) {
      expect(analytics).toContain(eventName);
    }
    expect(analytics).not.toContain('mixpanel');
    expect(analytics).not.toContain('segment');
  });

  it('adds page and device context without tracking client identifiers', () => {
    const analytics = read('src/lib/analytics.ts');
    const directFunnelSources = [
      read('src/app/credit-audit/components/CreditAuditContent.tsx'),
      read('src/app/dispute-wizard/components/DisputeWizardContent.tsx'),
      read('src/app/clients/[clientId]/negative-items/components/NegativeItemsContent.tsx'),
    ].join('\n');
    expect(analytics).toContain('page_path');
    expect(analytics).toContain('device_type');
    expect(directFunnelSources).not.toMatch(/trackEvent\([^)]*client_id/s);
  });

  it('tracks organic funnel milestones after signup', () => {
    expect(read('src/app/credit-report-import/components/CreditReportImportContent.tsx')).toContain("trackOrganicConversionStep('credit_report_upload_saved'");
    expect(read('src/app/credit-audit/components/CreditAuditContent.tsx')).toContain("trackOrganicConversionStep('credit_audit_completed'");
    expect(read('src/app/dispute-wizard/components/DisputeWizardContent.tsx')).toContain("trackOrganicConversionStep('dispute_wizard_letter_generated'");
  });
});
