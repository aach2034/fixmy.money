'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const ATTRIBUTION_KEY = 'fixmy_organic_attribution';
const SEARCH_REFERRERS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'ecosia.', 'search.brave.', 'yandex.'];

function getStoredAttribution(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(ATTRIBUTION_KEY);
    return stored ? JSON.parse(stored) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function persistOrganicAttribution(pagePath: string, searchParams: URLSearchParams) {
  if (typeof window === 'undefined') return {};

  const referrer = document.referrer;
  let referrerHost = '';
  try {
    referrerHost = referrer ? new URL(referrer).host.toLowerCase() : '';
  } catch {
    referrerHost = '';
  }
  const utmSource = searchParams.get('utm_source') ?? '';
  const utmMedium = searchParams.get('utm_medium') ?? '';
  const isSearchReferrer = SEARCH_REFERRERS.some(host => referrerHost.includes(host));
  const isOrganicUtm = utmMedium.toLowerCase() === 'organic' || utmSource.toLowerCase() === 'organic';

  if (!isSearchReferrer && !isOrganicUtm) return getStoredAttribution();

  const attribution = {
    acquisition_channel: 'organic',
    organic_landing_page: pagePath,
    organic_referrer: referrer,
    organic_utm_source: utmSource,
    organic_utm_medium: utmMedium,
    organic_utm_campaign: searchParams.get('utm_campaign') ?? '',
    organic_first_seen_at: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Analytics attribution should never block the application.
  }
  return attribution;
}

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '');
    const attribution = persistOrganicAttribution(pathname, searchParams);
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: url,
        page_title: document.title,
        ...attribution,
      });
    }
  }, [pathname, searchParams]);
}

export function trackEvent(eventName: string, eventParams: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, { ...getStoredAttribution(), ...eventParams });
  }
}

export function trackOrganicConversionStep(step: string, eventParams: Record<string, unknown> = {}) {
  trackEvent('organic_conversion_step', {
    event_category: 'conversion',
    conversion_step: step,
    ...eventParams,
  });
}

// ─── Conversion Events ────────────────────────────────────────────────────────

/**
 * Fired when a user clicks any trial CTA.
 * @param plan - The plan name/id (e.g. 'starter', 'professional', 'agency')
 * @param location - Where on the page the CTA was clicked (e.g. 'hero', 'pricing', 'sticky_bar', 'footer_cta')
 */
export function trackTrialSignup(plan: string = 'starter', location: string = 'unknown') {
  trackEvent('trial_start_click', {
    event_category: 'conversion',
    event_label: `trial_start_${plan}`,
    plan_name: plan,
    cta_location: location,
    currency: 'USD',
  });
  trackEvent('begin_checkout', {
    event_category: 'conversion',
    event_label: `trial_signup_${plan}`,
    plan_name: plan,
    cta_location: location,
    currency: 'USD',
  });
}

/**
 * Fired when a user submits the demo booking form.
 * @param teamSize - The team size selected in the form
 */
export function trackDemoRequest(teamSize: string = '') {
  trackEvent('book_demo_click', {
    event_category: 'conversion',
    event_label: 'demo_request',
    lead_type: 'demo_booking',
    team_size: teamSize,
  });
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
  trackEvent('starter_kit_submit', {
    event_category: 'conversion',
    event_label: offer,
    lead_type: 'lead_magnet',
    offer_name: offer,
    cta_location: location,
  });
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
