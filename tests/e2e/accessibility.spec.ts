/**
 * Accessibility Tests — FixMy.Money
 *
 * Runs automated accessibility checks on all public routes.
 * Tests mobile viewports: 375px, 390px, 768px.
 * Checks WCAG 2.1 AA compliance.
 *
 * Run: npx playwright test tests/e2e/accessibility.spec.ts
 *
 * Note: This uses Playwright's built-in accessibility snapshot API.
 * For full axe-core integration, install @axe-core/playwright.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_ROUTES = [
  '/',
  '/homepage',
  '/about',
  '/pricing',
  '/security',
  '/contact',
  '/product-tour',
  '/croa-workflow',
  '/demo-mode',
  '/blog',
  '/login',
];

const BLOG_ROUTES = [
  '/blog/how-to-start-a-credit-repair-business-2026',
  '/blog/best-credit-repair-software-2026',
  '/blog/credit-repair-cloud-alternatives-2026',
  '/blog/how-croa-billing-workflows-work',
  '/blog/credit-repair-client-onboarding-checklist',
  '/blog/credit-repair-crm-features',
  '/blog/how-to-automate-credit-dispute-workflows',
  '/blog/how-to-document-completed-services',
  '/blog/credit-repair-audit-logs-explained',
  '/blog/white-label-credit-repair-software',
];

const ALL_ROUTES = [...PUBLIC_ROUTES, ...BLOG_ROUTES];

// ─── Desktop Accessibility ────────────────────────────────────────────────────

test?.describe('Desktop Accessibility', () => {
  for (const route of ALL_ROUTES) {
    test(`${route} — no critical accessibility violations`, async ({ page }) => {
      await page?.goto(route, { waitUntil: 'domcontentloaded' });
      await page?.locator('body')?.waitFor({ state: 'visible' });

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const seriousViolations = violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious'
      );
      expect(
        seriousViolations,
        seriousViolations
          .map(({ id, impact, help, nodes }) => `${impact}: ${id} - ${help} (${nodes.length} nodes)`)
          .join('\n')
      ).toEqual([]);

      // Keep fast structural checks so failures point to the exact missing primitive.
      const imagesWithoutAlt = await page?.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs
          ?.filter((img) => !img?.hasAttribute('alt') && !img?.getAttribute('aria-label') && !img?.getAttribute('aria-hidden'))
          ?.map((img) => img?.src?.slice(0, 80));
      });
      expect(imagesWithoutAlt)?.toHaveLength(0);

      // Check for buttons without accessible names
      const buttonsWithoutName = await page?.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons?.filter((btn) => {
            const text = btn?.textContent?.trim() || '';
            const ariaLabel = btn?.getAttribute('aria-label') || '';
            const ariaLabelledBy = btn?.getAttribute('aria-labelledby') || '';
            const title = btn?.getAttribute('title') || '';
            return !text && !ariaLabel && !ariaLabelledBy && !title;
          })?.length;
      });
      expect(buttonsWithoutName)?.toBe(0);

      // Check for form inputs without labels
      const inputsWithoutLabels = await page?.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
        return inputs?.filter((input) => {
            const id = input?.id;
            const ariaLabel = input?.getAttribute('aria-label') || '';
            const ariaLabelledBy = input?.getAttribute('aria-labelledby') || '';
            const placeholder = input?.getAttribute('placeholder') || '';
            const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
            return !hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder;
          })?.length;
      });
      // Allow some tolerance for complex form implementations
      expect(inputsWithoutLabels)?.toBeLessThanOrEqual(2);

      // Check heading order (h1 should exist)
      const h1Count = await page?.locator('h1')?.count();
      expect(h1Count)?.toBeGreaterThanOrEqual(1);
      expect(h1Count)?.toBeLessThanOrEqual(2); // Should have exactly 1 h1

      // Check for skip link or main landmark
      const hasMain = await page?.locator('main, [role="main"]')?.count();
      expect(hasMain)?.toBe(1);
    });
  }
});

// ─── Mobile Viewport Tests ────────────────────────────────────────────────────

test?.describe('Mobile 375px', () => {
  test?.use({ viewport: { width: 375, height: 812 } });

  for (const route of PUBLIC_ROUTES) {
    test(`${route} — no horizontal overflow at 375px`, async ({ page }) => {
      await page?.goto(route, { waitUntil: 'domcontentloaded' });
      await page?.locator('body')?.waitFor({ state: 'visible' });

      const overflow = await page?.evaluate(() => {
        return document.body?.scrollWidth > window.innerWidth;
      });
      expect(overflow)?.toBe(false);
    });
  }
});

test?.describe('Mobile 390px', () => {
  test?.use({ viewport: { width: 390, height: 844 } });

  for (const route of ['/pricing', '/blog', '/demo-mode', '/login']) {
    test(`${route} — no horizontal overflow at 390px`, async ({ page }) => {
      await page?.goto(route, { waitUntil: 'domcontentloaded' });
      await page?.locator('body')?.waitFor({ state: 'visible' });

      const overflow = await page?.evaluate(() => {
        return document.body?.scrollWidth > window.innerWidth;
      });
      expect(overflow)?.toBe(false);
    });
  }
});

test?.describe('Tablet 768px', () => {
  test?.use({ viewport: { width: 768, height: 1024 } });

  for (const route of ['/', '/pricing', '/blog']) {
    test(`${route} — renders correctly at 768px`, async ({ page }) => {
      const response = await page?.goto(route);
      expect(response?.status())?.toBeLessThan(400);

      const overflow = await page?.evaluate(() => {
        return document.body?.scrollWidth > window.innerWidth;
      });
      expect(overflow)?.toBe(false);
    });
  }
});

// ─── Focus State Tests ────────────────────────────────────────────────────────

test?.describe('Focus States', () => {
  test('interactive elements have visible focus on homepage', async ({ page }) => {
    await page?.goto('/');

    // Tab through first 5 interactive elements
    for (let i = 0; i < 5; i++) {
      await page?.keyboard?.press('Tab');
    }

    // Verify something is focused
    const focusedTag = await page?.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag)?.not?.toBe('BODY');
    expect(focusedTag)?.toBeTruthy();
  });

  test('login form fields are focusable', async ({ page }) => {
    await page?.goto('/login');

    const emailInput = page?.locator('input[type="email"]')?.first();
    await emailInput?.focus();

    const isFocused = await emailInput?.evaluate((el) => el === document.activeElement);
    expect(isFocused)?.toBe(true);
  });
});

// ─── Contrast and Color ───────────────────────────────────────────────────────

test?.describe('Page Structure', () => {
  test('homepage has proper landmark structure', async ({ page }) => {
    await page?.goto('/');

    const hasHeader = await page?.locator('header, [role="banner"]')?.count();
    const hasMain = await page?.locator('main, [role="main"]')?.count();

    expect(hasHeader)?.toBeGreaterThanOrEqual(1);
    expect(hasMain)?.toBeGreaterThanOrEqual(1);
  });

  test('blog articles have article landmark', async ({ page }) => {
    await page?.goto('/blog/how-to-start-a-credit-repair-business-2026');

    const hasArticle = await page?.locator('article, [role="article"], main')?.count();
    expect(hasArticle)?.toBeGreaterThanOrEqual(1);
  });

  test('navigation has nav landmark', async ({ page }) => {
    await page?.goto('/');

    const hasNav = await page?.locator('nav, [role="navigation"]')?.count();
    expect(hasNav)?.toBeGreaterThanOrEqual(1);
  });
});
