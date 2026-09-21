'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { attributionEventParams, captureCurrentAttribution } from './attribution';
import { safeCampaignValue, safeReferrerHost, safeRoutePath, sanitizeAnalyticsPayload } from './analytics/privacy';

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
    if (!stored) return {};
    const raw = JSON.parse(stored) as Record<string, unknown>;
    if (raw.acquisition_channel !== 'organic') {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
      return {};
    }
    const safe = sanitizeAnalyticsPayload({
      acquisition_channel: 'organic',
      organic_landing_page: raw.organic_landing_page,
      organic_referrer: raw.organic_referrer,
      organic_utm_source: raw.organic_utm_source,
      organic_utm_medium: raw.organic_utm_medium,
      organic_utm_campaign: raw.organic_utm_campaign,
      organic_first_seen_at: typeof raw.organic_first_seen_at === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(raw.organic_first_seen_at)
        ? raw.organic_first_seen_at : '',
    });
    if (stored !== JSON.stringify(safe)) window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(safe));
    return safe;
  } catch {
    return {};
  }
}

function runtimeEventContext(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  const width = window.innerWidth;
  return {
    page_path: safeRoutePath(window.location.pathname),
    device_type: width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
  };
}

const SERVER_ANALYTICS_EVENTS = new Set([
  'onboarding_started',
  'onboarding_completed',
  'credit_report_import_started',
  'credit_report_import_completed',
  'credit_audit_viewed',
  'dispute_wizard_started',
  'dispute_created',
  'letter_generated',
  'checkout_started',
]);

function persistAuthenticatedEvent(eventName: string, eventParams: Record<string, unknown>) {
  if (typeof window === 'undefined' || eventParams.authenticated !== true || !SERVER_ANALYTICS_EVENTS.has(eventName)) return;
  const eventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({ event_name: eventName, properties: eventParams, event_id: eventId }),
  }).catch(() => undefined);
}

function persistOrganicAttribution(pagePath: string, searchParams: URLSearchParams) {
  if (typeof window === 'undefined') return {};

  const referrerHost = safeReferrerHost(document.referrer);
  const utmSource = safeCampaignValue(searchParams.get('utm_source'));
  const utmMedium = safeCampaignValue(searchParams.get('utm_medium'));
  const isSearchReferrer = SEARCH_REFERRERS.some(host => referrerHost.includes(host));
  const isOrganicUtm = utmMedium.toLowerCase() === 'organic' || utmSource.toLowerCase() === 'organic';

  if (!isSearchReferrer && !isOrganicUtm) return getStoredAttribution();

  const attribution = {
    acquisition_channel: 'organic',
    organic_landing_page: safeRoutePath(pagePath),
    organic_referrer: referrerHost,
    organic_utm_source: utmSource,
    organic_utm_medium: utmMedium,
    organic_utm_campaign: safeCampaignValue(searchParams.get('utm_campaign')),
    organic_first_seen_at: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(sanitizeAnalyticsPayload(attribution)));
  } catch {
    // Analytics attribution should never block the application.
  }
  return sanitizeAnalyticsPayload(attribution);
}

function emitGoogleEvent(eventName: string, properties: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, sanitizeAnalyticsPayload(properties));
  }
}

export function useGoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pagePath = safeRoutePath(pathname);
    const acquisitionAttribution = captureCurrentAttribution();
    const attribution = persistOrganicAttribution(pathname, searchParams);
    if (typeof window.gtag !== 'function') return;
    emitGoogleEvent('page_view', {
      page_location: pagePath,
      page_path: pagePath,
      page_title: 'FixMy.Money',
      event_name: 'landing_page_view',
      ...attribution,
      ...attributionEventParams(acquisitionAttribution),
    });
    emitGoogleEvent('landing_page_view', {
      page_location: pagePath,
      page_path: pagePath,
      page_title: 'FixMy.Money',
      ...attributionEventParams(acquisitionAttribution),
    });
    if (pathname === '/') {
      trackEvent('homepage_view', { authenticated: false });
    }
    if (pathname === '/pricing') {
      trackEvent('pricing_view', {
        page_location: pagePath,
        page_path: pagePath,
        authenticated: false,
        ...attributionEventParams(acquisitionAttribution),
      });
    }
  }, [pathname, searchParams]);
}

export function trackEvent(eventName: string, eventParams: Record<string, unknown> = {}) {
  const normalizedParams = sanitizeAnalyticsPayload({
    ...runtimeEventContext(),
    ...getStoredAttribution(),
    ...attributionEventParams(),
    ...eventParams,
  });
  emitGoogleEvent(eventName, normalizedParams);
  persistAuthenticatedEvent(eventName, normalizedParams);
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
export function getPlanAudience(plan: string): 'individual' | 'business' | 'unknown' {
  if (plan === 'starter') return 'individual';
  if (plan === 'professional' || plan === 'agency') return 'business';
  return 'unknown';
}

export function trackTrialSignup(plan: string = 'starter', location: string = 'unknown') {
  trackEvent('trial_start_click', {
    event_category: 'conversion',
    event_label: `trial_start_${plan}`,
    plan_name: plan,
    audience: getPlanAudience(plan),
    cta_location: location,
    source_page: 'homepage',
    currency: 'USD',
  });
}

export function trackToolStarted(toolName: string, location = 'tools') {
  trackEvent('tool_started', {
    event_category: 'engagement',
    tool_name: toolName,
    cta_location: location,
  });
}

export function trackToolCompleted(toolName: string, location = 'tools') {
  trackEvent('tool_completed', {
    event_category: 'conversion',
    tool_name: toolName,
    cta_location: location,
  });
}

export function trackLead(eventName: 'professional_lead' | 'mortgage_partner_lead' | 'affiliate_referral', eventParams: Record<string, unknown> = {}) {
  trackEvent(eventName, {
    event_category: 'lead',
    ...eventParams,
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
 * Historical event name for a CTA after watching the demo video.
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
