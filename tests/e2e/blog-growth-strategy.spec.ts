import { expect, test } from '@playwright/test';

const priorityArticles = [
  {
    slug: 'croa-compliance-guide',
    heading: 'CROA Compliance Workflow Guide for Credit Repair Agencies',
  },
  {
    slug: 'dispute-letter-best-practices',
    heading: 'Dispute Letter Best Practices: Evidence, Bureau Isolation, and Human Review',
  },
] as const;

test.describe('analytics-led blog growth batch', () => {
  test('lists both restored Search Console pages first', async ({ page }) => {
    const response = await page.goto('/blog');
    expect(response?.status()).toBe(200);

    const articleLinks = page.locator('article h2 a');
    await expect(articleLinks.nth(0)).toHaveAttribute('href', '/blog/croa-compliance-guide');
    await expect(articleLinks.nth(1)).toHaveAttribute('href', '/blog/dispute-letter-best-practices');
    await expect(page.getByRole('link', { name: 'Reserve One Month Free' }).first()).toHaveAttribute(
      'href',
      '/#reopening-list',
    );
  });

  for (const article of priorityArticles) {
    test(`${article.slug} is canonical, substantive, and mobile-safe`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const response = await page.goto(`/blog/${article.slug}`);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: article.heading, level: 1 })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://fixmy.money/blog/${article.slug}`,
      );
      await expect(page.locator('article')).toContainText(/not legal advice|does not constitute legal/i);
      await expect(page.getByRole('link', { name: 'Reserve One Month Free' }).first()).toHaveAttribute(
        'href',
        '/#reopening-list',
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});
