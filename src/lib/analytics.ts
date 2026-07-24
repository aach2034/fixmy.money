'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!measurementId || measurementId === 'your-google-analytics-id-here') return;

    if (!window.dataLayer) {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;
      document.head.appendChild(script);
      window.dataLayer = [];
      window.gtag = function (...args: unknown[]) {
        window.dataLayer.push(args);
      };
      window.gtag('js', new Date());
      window.gtag('config', measurementId);
    }

    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '');
    if (window.gtag) {
      window.gtag('event', 'page_view', { page_path: url });
    }
  }, [pathname, searchParams]);
}

export function trackEvent(eventName: string, eventParams: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

// ─── Conversion Events ────────────────────────────────────────────────────────

/**
 * Fired when a user clicks any "Start Agency Trial" button.
 * @param plan - The plan name/id (e.g. 'starter', 'professional', 'agency')
 * @param location - Where on the page the CTA was clicked (e.g. 'hero', 'pricing', 'sticky_bar', 'footer_cta')
 */
export function trackTrialSignup(plan: string = 'professional', location: string = 'unknown') {
  trackEvent('begin_checkout', {
    event_category: 'conversion',
    event_label: `trial_signup_${plan}`,
    plan_name: plan,
    cta_location: location,
    currency: 'USD',
  });
  // Also fire GA4 recommended conversion event
  trackEvent('sign_up', {
    method: 'trial',
    plan_name: plan,
    cta_location: location,
  });
}

/**
 * Fired when a user submits the demo booking form.
 * @param teamSize - The team size selected in the form
 */
export function trackDemoRequest(teamSize: string = '') {
  trackEvent('generate_lead', {
    event_category: 'conversion',
    event_label: 'demo_request',
    lead_type: 'demo_booking',
    team_size: teamSize,
  });
}

export function trackLeadMagnetSignup(
  offer: string = 'evidence-first-agency-starter-kit',
  location: string = 'homepage_lead_capture'
) {
  trackEvent('generate_lead', {
    event_category: 'conversion',
    event_label: offer,
    lead_type: 'lead_magnet',
    offer_name: offer,
    cta_location: location,
  });
}

/**
 * Fired when a user clicks on a pricing plan CTA (before navigating to sign-up).
 * @param planName - The plan name (e.g. 'Starter', 'Professional', 'Agency')
 * @param planPrice - The plan price in USD
 * @param location - Where the pricing card is shown (e.g. 'homepage_pricing', 'pricing_page')
 */
export function trackPricingPlanSelect(planName: string, planPrice: number, location: string = 'homepage_pricing') {
  trackEvent('select_item', {
    event_category: 'conversion',
    event_label: `pricing_plan_${planName.toLowerCase()}`,
    item_list_name: 'pricing_plans',
    items: [
      {
        item_id: planName.toLowerCase(),
        item_name: `FixMy.Money ${planName}`,
        price: planPrice,
        currency: 'USD',
        quantity: 1,
      },
    ],
    cta_location: location,
  });
}

/**
 * Fired for generic CTA clicks that don't fit the above categories.
 * @param ctaLabel - Human-readable label for the CTA (e.g. 'Book Demo Nav', 'Hero Book Demo')
 * @param destination - The href/destination of the CTA
 * @param location - Where on the page the CTA lives
 */
export function trackCtaClick(ctaLabel: string, destination: string, location: string = 'unknown') {
  trackEvent('cta_click', {
    event_category: 'engagement',
    event_label: ctaLabel,
    destination,
    cta_location: location,
  });
}

/**
 * Fired when a user clicks "Start $1 Trial" after watching the demo video.
 * @param placement - Where the video is placed (e.g. 'hero', 'features', 'business_owner', 'pricing')
 */
export function trackTrialClickAfterVideo(placement: string = 'unknown') {
  trackEvent('trial_click_after_video', {
    event_category: 'conversion',
    event_label: `trial_after_video_${placement}`,
    video_placement: placement,
  });
}

/**
 * Fired when a user clicks "Book Demo" after watching the demo video.
 * @param placement - Where the video is placed (e.g. 'hero', 'features', 'business_owner', 'pricing')
 */
export function trackDemoClickAfterVideo(placement: string = 'unknown') {
  trackEvent('demo_click_after_video', {
    event_category: 'conversion',
    event_label: `demo_after_video_${placement}`,
    video_placement: placement,
  });
}
