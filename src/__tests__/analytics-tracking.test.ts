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
    expect(analytics).toContain('page_location: window.location.href');
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
});
