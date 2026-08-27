import { describe, expect, it } from 'vitest';
import { PRIVATE_ROUTE_PREFIXES, PUBLIC_SEO_PAGES, SEO_PAGES, canonicalUrl, createSeoMetadata } from '@/lib/seo/config';
import { getSeoHealthReport } from '@/lib/seo/health';
import { softwareSchema } from '@/lib/seo/schema';
import sitemap from '@/app/sitemap';

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

  it('adds blog articles to the sitemap while excluding private routes', () => {
    const urls = sitemap().map(entry => entry.url);
    expect(urls).toContain('https://fixmy.money/blog/paid-closed-account-showing-balance');
    expect(urls).toContain('https://fixmy.money/blog/equifax-experian-transunion-disputes');
    expect(urls).toContain('https://fixmy.money/individuals');
    expect(urls).toContain('https://fixmy.money/professionals');
    expect(urls).toContain('https://fixmy.money/mortgage-partners');
    expect(urls).toContain('https://fixmy.money/affiliates');
    expect(urls).toContain('https://fixmy.money/tools');
    expect(urls).toContain('https://fixmy.money/credit-report-help/how-to-dispute-a-collection');
    expect(urls).toContain('https://fixmy.money/alternatives/credit-repair-cloud');
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expect(urls.some(url => new URL(url).pathname === prefix || new URL(url).pathname.startsWith(`${prefix}/`))).toBe(false);
    }
  });

  it('keeps acquisition pages software-positioned and free of outcome guarantees', () => {
    const pages = [
      SEO_PAGES['/individuals'],
      SEO_PAGES['/professionals'],
      SEO_PAGES['/mortgage-partners'],
      SEO_PAGES['/tools'],
      SEO_PAGES['/dispute-management-software'],
    ];
    const combined = pages.map(page => `${page.title} ${page.description}`).join(' ').toLowerCase();
    expect(combined).toContain('software');
    expect(combined).not.toContain('guaranteed score');
    expect(combined).not.toContain('delete collections instantly');
    expect(combined).not.toContain('repair credit in 30 days');
  });
});
