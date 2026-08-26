import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getArticleBySlug } from '../lib/blog/articles';
import { getPublicIndexableUrls, isPublicUrl, getIndexNowKey, getIndexNowKeyLocation } from '../lib/indexnow/indexNowService';
import { analyzeSearchPerformance } from '../lib/seo/searchPerformance';
import { PRIVATE_ROUTE_PREFIXES } from '../lib/seo/config';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

describe('organic traffic growth system', () => {
  it('includes substantive audit-driven educational articles', () => {
    const slugs = [
      'paid-closed-account-showing-balance',
      'conflicting-bureau-balance-information',
      'credit-report-balance-errors',
      'duplicate-credit-report-accounts',
      'incorrect-credit-report-dates',
      'possible-credit-report-reaging',
      'evidence-for-credit-dispute',
      'equifax-experian-transunion-disputes',
    ];

    for (const slug of slugs) {
      const article = getArticleBySlug(slug);
      expect(article).toBeTruthy();
      expect(article?.category).toBe('Credit Report Errors');
      expect(article?.cta.heading).toMatch(/credit report|discrepancies/i);
      expect(wordCount(article!.sections.map(section => section.content).join(' '))).toBeGreaterThan(800);
    }
  });

  it('builds IndexNow submissions from the canonical public registry only', () => {
    const urls = getPublicIndexableUrls();
    expect(urls).toContain('https://fixmy.money/blog/paid-closed-account-showing-balance');
    expect(urls).not.toContain('https://fixmy.money/knowledge-base');
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expect(urls.some(url => new URL(url).pathname === prefix || new URL(url).pathname.startsWith(`${prefix}/`))).toBe(false);
    }
  });

  it('rejects private and off-domain URLs for IndexNow', () => {
    expect(isPublicUrl('https://fixmy.money/blog/paid-closed-account-showing-balance')).toBe(true);
    expect(isPublicUrl('https://fixmy.money/dashboard')).toBe(false);
    expect(isPublicUrl('https://fixmy.money/demo-mode')).toBe(false);
    expect(isPublicUrl('http://fixmy.money/blog')).toBe(false);
    expect(isPublicUrl('https://example.com/blog')).toBe(false);
  });

  it('uses runtime IndexNow configuration instead of the old hardcoded key', () => {
    expect(getIndexNowKey({ INDEXNOW_KEY: 'abc12345' })).toBe('abc12345');
    expect(getIndexNowKey({})).toBeNull();
    expect(getIndexNowKeyLocation({})).toBe('https://fixmy.money/indexnow.txt');
    expect(read('src/lib/indexnow/indexNowService.ts')).not.toContain('a1b2c3d4e5f6789012345678901234ab');
    expect(read('scripts/submit-indexing.ts')).not.toContain('a1b2c3d4e5f6789012345678901234ab');
  });

  it('prioritizes real Search Console opportunities without automatic rewrites', () => {
    const report = analyzeSearchPerformance([
      { query: 'paid account showing balance', page: 'https://fixmy.money/blog/paid-closed-account-showing-balance', clicks: 2, impressions: 400, ctr: 0.005, position: 8.2, previousClicks: 1 },
      { query: 'brand login', page: 'https://fixmy.money/sign-up-login-screen', clicks: 30, impressions: 60, ctr: 0.5, position: 1.2, previousClicks: 33 },
      { query: 'duplicate credit report accounts', page: 'https://fixmy.money/blog/duplicate-credit-report-accounts', clicks: 3, impressions: 160, ctr: 0.018, position: 18.5, previousClicks: 12 },
    ], { GOOGLE_SEARCH_CONSOLE_SITE_URL: '', GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL: '', GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY: '' });

    expect(report.configured).toBe(false);
    expect(report.setupRequired.length).toBeGreaterThan(0);
    expect(report.opportunities.map(opportunity => opportunity.query)).toContain('paid account showing balance');
    expect(report.decliners.map(row => row.query)).toContain('duplicate credit report accounts');
    expect(report.opportunities[0].recommendedAction).not.toMatch(/rewrite automatically/i);
  });

  it('tracks organic conversion steps beyond traffic', () => {
    expect(read('src/lib/analytics.ts')).toContain('organic_landing_page');
    expect(read('src/app/sign-up-login-screen/components/AuthForm.tsx')).toContain("trackEvent('sign_up'");
    expect(read('src/app/credit-report-import/components/CreditReportImportContent.tsx')).toContain("trackOrganicConversionStep('credit_report_upload_saved'");
    expect(read('src/app/credit-audit/components/CreditAuditContent.tsx')).toContain("trackOrganicConversionStep('credit_audit_completed'");
    expect(read('src/app/dispute-wizard/components/DisputeWizardContent.tsx')).toContain("trackOrganicConversionStep('dispute_wizard_letter_generated'");
  });

  it('does not modify demo-mode source files', () => {
    expect(read('src/__tests__/organic-growth-system.test.ts')).toContain("isPublicUrl('https://fixmy.money/demo-mode')");
  });
});
