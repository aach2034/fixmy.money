import { expect, test } from '@playwright/test';

const exactHeadline = 'Your credit report, organized. See what matters. You take action.';
const exactSupportingText = 'Import your report, review organized bureau data, and investigate potential inconsistencies through a guided workflow.';

test.describe('organized credit-report homepage experience', () => {
  test('preserves the exact approved copy and explains the illustrative sequence', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByText('Structured credit-report review', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(exactHeadline);
    await expect(page.getByText(exactSupportingText, { exact: true })).toBeVisible();

    const preview = page.locator('[aria-label="Illustrative three-bureau credit report comparison"]');
    await expect(preview.getByText('Illustrative example').first()).toBeVisible();
    await expect(preview.getByText('Needs review', { exact: true }).first()).toBeVisible();
    await expect(preview).toContainText('Equifax');
    await expect(preview).toContainText('Experian');
    await expect(preview).toContainText('TransUnion');
    await expect(preview).toContainText('Imported');
    await expect(preview).toContainText('Organized');
    await expect(preview).toContainText('Ready to review');
    const mobileTextSizes = await preview.locator('.sm\\:hidden *').evaluateAll(elements => elements
      .filter(element => element.textContent?.trim() && getComputedStyle(element).display !== 'none')
      .map(element => Number.parseFloat(getComputedStyle(element).fontSize)));
    expect(Math.min(...mobileTextSizes)).toBeGreaterThanOrEqual(12);

    await expect(page.getByText('Software plans · Reopening September 30, 2026', { exact: true })).toBeVisible();
    await expect(page.getByText('per month', { exact: true })).toHaveCount(3);
    await expect(page.getByText(/most popular/i)).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('uses a privacy-safe copy-link fallback and records only the successful share action', async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as Window & { __copiedShareUrl?: string };
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (value: string) => { state.__copiedShareUrl = value; } },
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Share this checklist' }).click();
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();

    const evidence = await page.evaluate(() => {
      const state = window as Window & { __copiedShareUrl?: string };
      return {
        copiedUrl: state.__copiedShareUrl,
        events: (window.dataLayer ?? []).map(entry => Array.from(entry as ArrayLike<unknown>)),
      };
    });
    expect(evidence.copiedUrl).toBe(`${new URL(page.url()).origin}/#three-details-to-compare`);
    expect(evidence.events).toEqual(expect.arrayContaining([
      expect.arrayContaining([
        'event',
        'education_share_completed',
        expect.objectContaining({ content_id: 'three-credit-report-details', share_method: 'copy_link' }),
      ]),
    ]));
    expect(JSON.stringify(evidence)).not.toMatch(/report_contents|account_number|email|token/i);
  });

  test('prefers native sharing and routes the personal hero CTA', async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as Window & { __nativeShareData?: ShareData };
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => { state.__nativeShareData = data; },
      });
    });

    await page.goto('/');
    await page.evaluate(() => {
      const state = window as Window & { __capturedEvents?: unknown[][] };
      state.__capturedEvents = [];
      window.gtag = (...args) => { state.__capturedEvents?.push(args); };
    });
    await page.getByRole('button', { name: 'Share this checklist' }).click();
    await expect(page.getByRole('button', { name: 'Shared' })).toBeVisible();

    const hero = page.getByRole('heading', { level: 1 }).locator('xpath=ancestor::section[1]');
    const primaryCta = hero.getByRole('link', { name: /Review My Own Credit/ });
    await expect(primaryCta).toHaveAttribute('href', '/individuals');

    const evidence = await page.evaluate(() => {
      const state = window as Window & { __capturedEvents?: unknown[][]; __nativeShareData?: ShareData };
      return {
        share: state.__nativeShareData,
        events: state.__capturedEvents ?? [],
      };
    });
    expect(evidence.share).toEqual(expect.objectContaining({
      title: 'Three details to compare across your credit reports',
      url: `${new URL(page.url()).origin}/#three-details-to-compare`,
    }));
    expect(evidence.events).toEqual(expect.arrayContaining([
      expect.arrayContaining(['event', 'education_share_completed', expect.objectContaining({ share_method: 'native_share' })]),
    ]));
    await primaryCta.click();
    await expect(page).toHaveURL(/\/individuals$/);
  });
});
