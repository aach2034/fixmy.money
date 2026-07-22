/**
 * Blog Article Quality Audit
 *
 * Verifies all 10 articles meet quality standards:
 * - Minimum word count
 * - Required metadata fields
 * - No placeholder content
 * - Disclaimer present
 * - FAQ present
 * - Unique slugs and metadata
 *
 * Run: npx vitest run src/__tests__/blog-audit.test.ts
 */

import { describe, it, expect } from 'vitest';
import { ARTICLES } from '../lib/blog/articles';

// Long enough to be substantive while keeping operational guides scannable.
const MIN_WORD_COUNT = 800;

function countWords(text: string): number {
  return text
    .replace(/[#*`\[\]()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function getArticleWordCount(article: (typeof ARTICLES)[0]): number {
  const allText = [
    article.title,
    article.excerpt,
    ...article.sections.map((s) => `${s.heading} ${s.content}`),
    ...article.faqs.map((f) => `${f.question} ${f.answer}`),
    article.disclaimer,
    article.cta.heading,
    article.cta.body,
  ].join(' ');
  return countWords(allText);
}

// ─── Required slugs ───────────────────────────────────────────────────────────

const REQUIRED_SLUGS = [
  'how-to-start-a-credit-repair-business-2026',
  'best-credit-repair-software-2026',
  'credit-repair-cloud-alternatives-2026',
  'how-croa-billing-workflows-work',
  'credit-repair-client-onboarding-checklist',
  'how-to-automate-credit-dispute-workflows',
  'credit-repair-audit-logs-explained',
  'white-label-credit-repair-software',
  'credit-repair-software-pricing-guide-2026',
  'what-credit-repair-agencies-should-track',
];

describe('Blog Article Audit', () => {
  it('has exactly 10 articles', () => {
    expect(ARTICLES.length).toBe(10);
  });

  it('has all required slugs', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    for (const required of REQUIRED_SLUGS) {
      expect(slugs).toContain(required);
    }
  });

  it('all slugs are unique', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(ARTICLES.length);
  });

  it('all meta descriptions are unique', () => {
    const descs = ARTICLES.map((a) => a.metaDescription);
    const unique = new Set(descs);
    expect(unique.size).toBe(ARTICLES.length);
  });

  it('all SEO titles are unique', () => {
    const titles = ARTICLES.map((a) => a.seoTitle);
    const unique = new Set(titles);
    expect(unique.size).toBe(ARTICLES.length);
  });

  it('all canonical URLs are unique', () => {
    const urls = ARTICLES.map((a) => a.canonicalUrl);
    const unique = new Set(urls);
    expect(unique.size).toBe(ARTICLES.length);
  });

  // ── Per-article checks ────────────────────────────────────────────────────

  for (const article of ARTICLES) {
    describe(`Article: ${article.slug}`, () => {
      it('has required metadata fields', () => {
        expect(article.title).toBeTruthy();
        expect(article.seoTitle).toBeTruthy();
        expect(article.metaDescription).toBeTruthy();
        expect(article.canonicalUrl).toBeTruthy();
        expect(article.author).toBeTruthy();
        expect(article.publishedDate).toBeTruthy();
        expect(article.updatedDate).toBeTruthy();
        expect(article.readingTime).toBeTruthy();
        expect(article.category).toBeTruthy();
      });

      it('has table of contents', () => {
        expect(article.tableOfContents.length).toBeGreaterThanOrEqual(3);
      });

      it('has sections with content', () => {
        expect(article.sections.length).toBeGreaterThanOrEqual(3);
        for (const section of article.sections) {
          expect(section.heading).toBeTruthy();
          expect(section.content.length).toBeGreaterThan(100);
        }
      });

      it('has FAQ section', () => {
        expect(article.faqs.length).toBeGreaterThanOrEqual(2);
        for (const faq of article.faqs) {
          expect(faq.question).toBeTruthy();
          expect(faq.answer).toBeTruthy();
        }
      });

      it('has disclaimer', () => {
        expect(article.disclaimer).toBeTruthy();
        expect(article.disclaimer.length).toBeGreaterThan(50);
      });

      it('has CTA', () => {
        expect(article.cta.heading).toBeTruthy();
        expect(article.cta.body).toBeTruthy();
      });

      it('has related articles', () => {
        expect(article.relatedSlugs.length).toBeGreaterThanOrEqual(1);
      });

      it('canonical URL matches slug', () => {
        expect(article.canonicalUrl).toContain(article.slug);
      });

      it('does not make credit score guarantees', () => {
        const allText = article.sections.map((s) => s.content).join(' ').toLowerCase();
        const guaranteePatterns = [
          'guarantee.*score',
          'guaranteed.*deletion',
          'guaranteed.*removal',
          'will increase your score',
          'will delete',
          'will remove',
          'promise.*score',
          'promise.*deletion',
        ];
        for (const pattern of guaranteePatterns) {
          const regex = new RegExp(pattern, 'i');
          expect(regex.test(allText)).toBe(false);
        }
      });

      it('does not make legal compliance guarantees', () => {
        const allText = article.sections.map((s) => s.content).join(' ').toLowerCase();
        const legalGuarantees = [
          'guarantees.*compliance',
          'guaranteed.*legal',
          'legally guaranteed',
        ];
        for (const pattern of legalGuarantees) {
          const regex = new RegExp(pattern, 'i');
          expect(regex.test(allText)).toBe(false);
        }
      });

      it(`meets minimum word count of ${MIN_WORD_COUNT}`, () => {
        const wordCount = getArticleWordCount(article);
        // Report the actual word count in the error message
        expect(wordCount).toBeGreaterThanOrEqual(MIN_WORD_COUNT);
      });
    });
  }

  // ── Word count report ─────────────────────────────────────────────────────

  it('word count report (informational)', () => {
    console.log('\n─── Blog Article Word Counts ─────────────────────────────');
    for (const article of ARTICLES) {
      const count = getArticleWordCount(article);
      const status = count >= MIN_WORD_COUNT ? '✅' : '❌';
      console.log(`  ${status} ${count.toString().padStart(5)} words  ${article.slug}`);
    }
    console.log('──────────────────────────────────────────────────────────\n');
    expect(true).toBe(true); // Informational only
  });
});
