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
const ATTRIBUTION_QUERY_KEYS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

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
  return (value ?? '').trim().slice(0, 160).replace(/[<>"']/g, '');
}

export function getStoredAttribution(): AttributionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) as AttributionState : null;
  } catch {
    return null;
  }
}

export function captureCurrentAttribution(): AttributionState | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const now = new Date().toISOString();
  const stored = getStoredAttribution();
  const landingPage = `${url.pathname}${url.search}`;
  const referrer = sanitizeAttributionValue(document.referrer);
  const hasCampaignSignal = ATTRIBUTION_QUERY_KEYS.some(key => url.searchParams.has(key));

  const touch: AttributionTouch = {
    ...emptyTouch(now),
    referral_code: sanitizeAttributionValue(url.searchParams.get('ref')),
    referral_source: sanitizeAttributionValue(url.searchParams.get('ref_source') || referrer),
    utm_source: sanitizeAttributionValue(url.searchParams.get('utm_source')),
    utm_medium: sanitizeAttributionValue(url.searchParams.get('utm_medium')),
    utm_campaign: sanitizeAttributionValue(url.searchParams.get('utm_campaign')),
    utm_content: sanitizeAttributionValue(url.searchParams.get('utm_content')),
    utm_term: sanitizeAttributionValue(url.searchParams.get('utm_term')),
    landing_page: landingPage,
    first_touch_at: now,
  };

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
  if (!state) return {};
  return {
    anonymous_id: state.anonymousId,
    referral_code: state.firstTouch.referral_code,
    referral_source: state.firstTouch.referral_source,
    utm_source: state.firstTouch.utm_source,
    utm_medium: state.firstTouch.utm_medium,
    utm_campaign: state.firstTouch.utm_campaign,
    utm_content: state.firstTouch.utm_content,
    utm_term: state.firstTouch.utm_term,
    landing_page: state.firstTouch.landing_page,
    first_touch_at: state.firstTouch.first_touch_at,
    last_utm_source: state.lastTouch.utm_source,
    last_utm_medium: state.lastTouch.utm_medium,
    last_utm_campaign: state.lastTouch.utm_campaign,
    last_landing_page: state.lastTouch.landing_page,
  };
}

export function appendAttributionToHref(href: string, state = getStoredAttribution()): string {
  if (!state || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return href;
  const [path, hash = ''] = href.split('#');
  const url = new URL(path, 'https://fixmy.money');
  const first = state.firstTouch;
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
