import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackCtaClick, trackEvent } from '@/lib/analytics';
import { ATTRIBUTION_STORAGE_KEY, attributionEventParams, captureCurrentAttribution, getStoredAttribution } from '@/lib/attribution';
import { safeCampaignValue, safeRoutePath, sanitizeAnalyticsPayload } from '@/lib/analytics/privacy';
import { sanitizeProductAnalyticsProperties } from '@/lib/analytics/server';

function browserAt(url: string, referrer = '') {
  const values = new Map<string, string>();
  const calls: unknown[][] = [];
  vi.stubGlobal('window', {
    location: new URL(url),
    innerWidth: 390,
    gtag: (...args: unknown[]) => { calls.push(args); },
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
  });
  vi.stubGlobal('document', { referrer });
  return { calls, values };
}

afterEach(() => vi.unstubAllGlobals());

describe('analytics privacy boundary', () => {
  it('emits pathname-only CTA and reservation payloads without URL PII', () => {
    const { calls } = browserAt('https://fixmy.money/reopen?email=person@example.com&first_name=Taylor&token=secret#private');
    const attribution = attributionEventParams(captureCurrentAttribution());
    trackCtaClick('Reserve My Free Month', '/reopen?email=person@example.com#private', 'homepage_nav');
    trackEvent('reopening_waitlist_joined', { offer: 'one_month_free', attribution, email: 'person@example.com', name: 'Taylor' });
    const serialized = JSON.stringify(calls);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[2]).toMatchObject({ page_path: '/reopen', destination: '/reopen' });
    expect(calls[1]?.[2]).toMatchObject({ page_path: '/reopen', offer: 'one_month_free' });
    expect(serialized).not.toMatch(/person@example\.com|Taylor|secret|first_name|email|token|#private/i);
  });

  it('decodes encoded PII for rejection and removes fragments and credentials', () => {
    expect(safeRoutePath('https://user:pass@fixmy.money/reopen?access_token=secret#private')).toBe('/reopen');
    expect(safeRoutePath('/reopen?email=person%40example.com#private')).toBe('/reopen');
    expect(safeCampaignValue('person%2540example.com')).toBe('');
    expect(safeCampaignValue('555-123-4567')).toBe('');
    expect(safeCampaignValue('https%3A%2F%2Fexample.com%2Ftoken')).toBe('');
    expect(safeCampaignValue('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0')).toBe('');
    expect(safeCampaignValue('123-45-6789')).toBe('');
  });

  it('keeps safe allowlisted campaigns while omitting unsafe values and raw referrer URLs', () => {
    const { values } = browserAt('https://fixmy.money/reopen?utm_source=google&utm_campaign=fall_launch&utm_term=person%40example.com&ref=partner_42', 'https://www.google.com/search?q=person%40example.com');
    const state = captureCurrentAttribution();
    const payload = attributionEventParams(state);
    expect(payload).toMatchObject({ landing_page: '/reopen', utm_source: 'google', utm_campaign: 'fall_launch', referral_code: 'partner_42', referral_source: 'www.google.com' });
    expect(payload.utm_term).toBe('');
    expect(JSON.stringify([...values.values()])).not.toContain('person@example.com');
    expect(JSON.stringify([...values.values()])).not.toContain('person%40example.com');
  });

  it('sanitizes legacy stored attribution before reuse', () => {
    const { values } = browserAt('https://fixmy.money/reopen');
    values.set(ATTRIBUTION_STORAGE_KEY, JSON.stringify({
      firstTouch: { landing_page: '/reopen?email=person@example.com', utm_source: 'person@example.com', referral_source: 'https://example.com/?token=secret' },
      lastTouch: { landing_page: '/reopen#secret', utm_campaign: 'safe_launch' },
      anonymousId: 'anon_safe',
    }));
    const state = getStoredAttribution();
    expect(state?.firstTouch.landing_page).toBe('/reopen');
    expect(state?.firstTouch.utm_source).toBe('');
    expect(attributionEventParams(state).last_landing_page).toBe('/reopen');
    expect(values.get(ATTRIBUTION_STORAGE_KEY)).not.toMatch(/person@example\.com|token=secret|#secret/);
  });

  it('rewrites legacy organic attribution before sending an event', () => {
    const { calls, values } = browserAt('https://fixmy.money/reopen');
    values.set('fixmy_organic_attribution', JSON.stringify({
      acquisition_channel: 'organic',
      organic_landing_page: '/reopen?email=person@example.com',
      organic_referrer: 'https://www.google.com/search?q=person%40example.com',
      organic_utm_source: 'person%40example.com',
      organic_utm_medium: 'organic',
      organic_first_seen_at: '2026-09-17T12:00:00.000Z',
    }));
    trackEvent('reopening_waitlist_joined', { offer: 'one_month_free' });
    expect(calls[0]?.[2]).toMatchObject({ page_path: '/reopen', organic_landing_page: '/reopen', organic_referrer: 'www.google.com' });
    expect(JSON.stringify(calls)).not.toMatch(/person@example\.com|person%40example.com|\/search\?/);
    expect(values.get('fixmy_organic_attribution')).not.toMatch(/person@example\.com|person%40example.com|\/search\?/);
  });

  it('removes unsafe nested fields from the final serialized payload', () => {
    const payload = sanitizeAnalyticsPayload({
      page_path: '/reopen?email=person@example.com',
      attribution: { utm_campaign: 'safe_launch', utm_content: 'person%40example.com' },
      items: [{ item_name: 'Personal', email: 'person@example.com', clientName: 'Taylor' }],
      destination: 'https://user:pass@fixmy.money/reopen?token=secret#private',
    });
    expect(payload).toMatchObject({ page_path: '/reopen', destination: '/reopen', attribution: { utm_campaign: 'safe_launch' } });
    expect(JSON.stringify(payload)).not.toMatch(/person@example|Taylor|secret|user:pass|%40|#private/i);
  });

  it('applies the same boundary at the authenticated analytics endpoint', () => {
    const properties = sanitizeProductAnalyticsProperties({
      page_path: '/reopen?email=person@example.com',
      landing_page: 'https://fixmy.money/reopen?token=secret',
      campaign: 'person%40example.com',
      source: 'google',
      destination: '/reopen#private',
    });
    expect(properties).toEqual({ page_path: '/reopen', landing_page: '/reopen', source: 'google', destination: '/reopen' });
  });
});
