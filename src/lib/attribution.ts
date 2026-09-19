import { safeCampaignValue, safeReferrerHost, safeReferralSource, safeRoutePath } from './analytics/privacy';

export interface AttributionTouch {
  referral_code: string;
  referral_source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  landing_page: string;
  first_touch_at: string;
}

export interface AttributionState {
  firstTouch: AttributionTouch;
  lastTouch: AttributionTouch;
  anonymousId: string;
}

export const ATTRIBUTION_STORAGE_KEY = 'fixmy_attribution_v1';

function emptyTouch(now = new Date().toISOString()): AttributionTouch {
  return {
    referral_code: '',
    referral_source: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    landing_page: '',
    first_touch_at: now,
  };
}

function anonymousId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeAttributionValue(value: string | null | undefined): string {
  return safeCampaignValue(value);
}

function safeTouch(value: unknown): AttributionTouch | null {
  if (!value || typeof value !== 'object') return null;
  const touch = value as Record<string, unknown>;
  const campaign = (key: string) => safeCampaignValue(typeof touch[key] === 'string' ? touch[key] : null);
  const timestamp = typeof touch.first_touch_at === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(touch.first_touch_at)
    ? touch.first_touch_at : '';
  return {
    referral_code: campaign('referral_code'),
    referral_source: safeReferralSource(typeof touch.referral_source === 'string' ? touch.referral_source : null),
    utm_source: campaign('utm_source'),
    utm_medium: campaign('utm_medium'),
    utm_campaign: campaign('utm_campaign'),
    utm_content: campaign('utm_content'),
    utm_term: campaign('utm_term'),
    landing_page: safeRoutePath(typeof touch.landing_page === 'string' ? touch.landing_page : '/'),
    first_touch_at: timestamp,
  };
}

function safeState(value: unknown): AttributionState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Record<string, unknown>;
  const firstTouch = safeTouch(state.firstTouch);
  const lastTouch = safeTouch(state.lastTouch);
  if (!firstTouch || !lastTouch) return null;
  return {
    firstTouch,
    lastTouch,
    anonymousId: typeof state.anonymousId === 'string' && /^[a-z0-9_-]{1,80}$/i.test(state.anonymousId)
      ? state.anonymousId : anonymousId(),
  };
}

export function getStoredAttribution(): AttributionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const safe = stored ? safeState(JSON.parse(stored)) : null;
    if (stored && safe && stored !== JSON.stringify(safe)) window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(safe));
    if (stored && !safe) window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
    return safe;
  } catch {
    return null;
  }
}

export function captureCurrentAttribution(): AttributionState | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const now = new Date().toISOString();
  const stored = getStoredAttribution();
  const landingPage = safeRoutePath(url.pathname);
  const referrer = safeReferrerHost(document.referrer);

  const touch: AttributionTouch = {
    ...emptyTouch(now),
    referral_code: sanitizeAttributionValue(url.searchParams.get('ref')),
    referral_source: safeReferralSource(url.searchParams.get('ref_source')) || referrer,
    utm_source: sanitizeAttributionValue(url.searchParams.get('utm_source')),
    utm_medium: sanitizeAttributionValue(url.searchParams.get('utm_medium')),
    utm_campaign: sanitizeAttributionValue(url.searchParams.get('utm_campaign')),
    utm_content: sanitizeAttributionValue(url.searchParams.get('utm_content')),
    utm_term: sanitizeAttributionValue(url.searchParams.get('utm_term')),
    landing_page: landingPage,
    first_touch_at: now,
  };
  const hasCampaignSignal = Object.entries(touch).some(([key, value]) => key !== 'landing_page' && key !== 'first_touch_at' && Boolean(value));

  const next: AttributionState = {
    firstTouch: stored?.firstTouch?.landing_page ? stored.firstTouch : touch,
    lastTouch: hasCampaignSignal || !stored?.lastTouch?.landing_page ? touch : {
      ...stored.lastTouch,
      landing_page: landingPage,
    },
    anonymousId: stored?.anonymousId || anonymousId(),
  };

  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Attribution storage must never block navigation or signup.
  }
  return next;
}

export function attributionEventParams(state = getStoredAttribution()): Record<string, string> {
  const safe = safeState(state);
  if (!safe) return {};
  return {
    anonymous_id: safe.anonymousId,
    referral_code: safe.firstTouch.referral_code,
    referral_source: safe.firstTouch.referral_source,
    utm_source: safe.firstTouch.utm_source,
    utm_medium: safe.firstTouch.utm_medium,
    utm_campaign: safe.firstTouch.utm_campaign,
    utm_content: safe.firstTouch.utm_content,
    utm_term: safe.firstTouch.utm_term,
    landing_page: safe.firstTouch.landing_page,
    first_touch_at: safe.firstTouch.first_touch_at,
    last_utm_source: safe.lastTouch.utm_source,
    last_utm_medium: safe.lastTouch.utm_medium,
    last_utm_campaign: safe.lastTouch.utm_campaign,
    last_landing_page: safe.lastTouch.landing_page,
  };
}

export function appendAttributionToHref(href: string, state = getStoredAttribution()): string {
  const safe = safeState(state);
  if (!safe || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return href;
  const [path, hash = ''] = href.split('#');
  const url = new URL(path, 'https://fixmy.money');
  const first = safe.firstTouch;
  const values: Record<string, string> = {
    ref: first.referral_code,
    utm_source: first.utm_source,
    utm_medium: first.utm_medium,
    utm_campaign: first.utm_campaign,
    utm_content: first.utm_content,
    utm_term: first.utm_term,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${hash ? `#${hash}` : ''}`;
}
