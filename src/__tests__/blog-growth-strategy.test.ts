import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getAllSlugs, getArticleBySlug } from '../lib/blog/articles';
import { getPublicIndexableUrls } from '../lib/indexnow/indexNowService';

const PRIORITY_SLUGS = ['croa-compliance-guide', 'dispute-letter-best-practices'] as const;

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

describe('analytics-led blog growth batch', () => {
  it('restores both Search Console priority URLs as substantive canonical articles', () => {
    const slugs = getAllSlugs();

    for (const slug of PRIORITY_SLUGS) {
      const article = getArticleBySlug(slug);
      expect(article).toBeTruthy();
      expect(article?.canonicalUrl).toBe(`https://fixmy.money/blog/${slug}`);
      expect(article?.publishedDate).toBe('September 15, 2026');
      expect(article?.updatedDate).toBe('September 15, 2026');
      expect(article?.disclaimer).toMatch(/not legal advice|does not constitute legal/i);
      expect(wordCount(article!.sections.map((section) => section.content).join(' '))).toBeGreaterThan(900);
      expect(slugs.filter((candidate) => candidate === slug)).toHaveLength(1);
    }
  });

  it('keeps the new articles source-grounded and free of raw markdown links', () => {
    const croa = getArticleBySlug('croa-compliance-guide')!;
    const dispute = getArticleBySlug('dispute-letter-best-practices')!;
    const croaText = croa.sections.map((section) => section.content).join('\n');
    const disputeText = dispute.sections.map((section) => section.content).join('\n');

    expect(croaText).toContain('15 U.S.C. §§ 1679–1679j');
    expect(croaText).toContain('Federal Trade Commission');
    expect(croaText).toContain('Consumer Financial Protection Bureau');
    expect(disputeText).toContain('Consumer Financial Protection Bureau');
    expect(disputeText).toContain('Federal Trade Commission');
    expect(disputeText).toContain('Fair Credit Reporting Act');
    expect(`${croaText}\n${disputeText}`).not.toMatch(/\[[^\]]+\]\(https?:\/\//);
  });

  it('keeps bureau facts, provenance, masking, and enclosure guidance explicit', () => {
    const article = getArticleBySlug('dispute-letter-best-practices')!;
    const content = article.sections.map((section) => section.content).join('\n').toLowerCase();

    expect(content).toContain('recipient bureau');
    expect(content).toContain('source evidence identifier');
    expect(content).toContain('reported value');
    expect(content).toContain('human review required');
    expect(content).toContain('enclosure section should be omitted');
    expect(content).toContain('account ending in 1234');
    expect(content).toContain('tenant boundaries');
    expect(content).not.toMatch(/guarantee(?:d)? (?:a )?(?:deletion|removal|score|outcome)/i);
  });

  it('keeps every priority related-article link inside the canonical registry', () => {
    for (const slug of PRIORITY_SLUGS) {
      const article = getArticleBySlug(slug)!;
      for (const relatedSlug of article.relatedSlugs) {
        expect(getArticleBySlug(relatedSlug), `${slug} -> ${relatedSlug}`).toBeTruthy();
      }
    }
  });

  it('publishes both restored pages through the existing public indexing registry', () => {
    const urls = getPublicIndexableUrls();
    for (const slug of PRIORITY_SLUGS) {
      expect(urls).toContain(`https://fixmy.money/blog/${slug}`);
    }
  });

  it('tracks all five blog waitlist CTA placements without changing their destination', () => {
    const indexPage = read('src/app/blog/page.tsx');
    const articlePage = read('src/app/blog/[slug]/page.tsx');

    expect(indexPage).toContain("import TrackedLink from '@/components/marketing/TrackedLink'");
    expect(indexPage).toContain('eventLocation="blog_index_nav"');
    expect(indexPage).toContain('eventLocation="blog_index_footer"');
    expect(articlePage).toContain("import TrackedLink from '@/components/marketing/TrackedLink'");
    expect(articlePage).toContain('blog_article_nav:');
    expect(articlePage).toContain('blog_article_sidebar:');
    expect(articlePage).toContain('blog_article_body:');
    expect(`${indexPage}\n${articlePage}`).not.toContain('<Link href="/#reopening-list"');
    expect(indexPage.match(/href="\/#reopening-list"/g)).toHaveLength(2);
    expect(articlePage).toContain("const primaryCtaHref = '/#reopening-list'");
    expect(articlePage).not.toContain('article.cta.body');
  });

  it('keeps signup shutdown messaging on the rendered article CTA', () => {
    const articlePage = read('src/app/blog/[slug]/page.tsx');
    expect(articlePage).toContain('Join the reopening list');
    expect(articlePage).toContain('when you activate after reopening');
    expect(articlePage).not.toContain('Try FixMy.Money for 14 days for $1');
  });
});
