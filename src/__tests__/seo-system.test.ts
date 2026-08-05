import { describe, expect, it } from 'vitest';
import { PRIVATE_ROUTE_PREFIXES, PUBLIC_SEO_PAGES, SEO_PAGES, canonicalUrl, createSeoMetadata } from '@/lib/seo/config';
import { getSeoHealthReport } from '@/lib/seo/health';
import { softwareSchema } from '@/lib/seo/schema';

describe('central SEO system', () => {
  it('generates canonical and social metadata from one route registry', () => {
    const metadata = createSeoMetadata('/pricing');
    expect(metadata.alternates?.canonical).toBe('https://fixmy.money/pricing');
    expect(metadata.openGraph?.title).toContain('FixMy.Money');
    expect(metadata.twitter).toBeTruthy();
  });

  it('never exposes private application routes in the public registry', () => {
    for (const page of PUBLIC_SEO_PAGES) expect(PRIVATE_ROUTE_PREFIXES.some(prefix => page.path === prefix || page.path.startsWith(`${prefix}/`))).toBe(false);
    expect(SEO_PAGES['/demo-mode']).toBeUndefined();
  });

  it('uses the visible paid trial and centralized live pricing in Product offers', () => {
    const schema = softwareSchema();
    expect(schema.offers.map(offer => offer.price)).toEqual([39, 99, 199]);
    expect(schema.offers.every(offer => offer.description.includes('$1 paid trial for 14 days'))).toBe(true);
  });

  it('has no blocking metadata registry issues', () => {
    expect(getSeoHealthReport().errorCount).toBe(0);
    expect(canonicalUrl('/pricing')).toBe('https://fixmy.money/pricing');
  });
});
