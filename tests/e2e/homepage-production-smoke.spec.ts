import { expect, test, type Page } from '@playwright/test';

const protectedRoutes = [
  '/client-management',
  '/workflow-task-management',
  '/credit-report-import',
  '/disputes',
  '/dispute-letter-management',
  '/client-portal/login',
  '/dashboard',
  '/security',
];

const viewportCases = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 900 },
  { name: 'desktop', width: 1440, height: 1000 },
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    return documentElement.scrollWidth - documentElement.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
}

async function expectCleanHomepage(page: Page) {
  const failedAssets: string[] = [];
  const consoleErrors: string[] = [];

  page.on('response', (response) => {
    const url = response.url();
    const isHomepageAsset = /homepage-(individual|business)-credit\.png|fixmy-money/.test(url);
    if (isHomepageAsset && response.status() >= 400) {
      failedAssets.push(`${response.status()} ${url}`);
    }
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole('heading', { name: /Your credit report, organized/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Start \$1 trial/i }).first()).toBeVisible();
  await expect(page.getByText('Secure workspace')).toBeVisible();
  await expect(page.getByText('No raw report transmission to external AI')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(failedAssets).toEqual([]);
  expect(consoleErrors.filter((message) => !/favicon|ResizeObserver/i.test(message))).toEqual([]);
}

test.describe('production homepage smoke', () => {
  for (const viewport of viewportCases) {
    test(`loads cleanly at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectCleanHomepage(page);
    });
  }

  test('desktop CTAs route to the intended destinations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    await page.getByRole('link', { name: /FixMy\.Money home/i }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.locator('header').getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/');
    await page.getByRole('link', { name: /Start free audit/i }).click();
    await expect(page).toHaveURL(/\/signup\?plan=starter$/);

    await page.goto('/');
    await page.getByRole('link', { name: /See business software/i }).click();
    await expect(page).toHaveURL(/\/professionals$/);

    const planExpectations = [
      ['Starter', 'starter'],
      ['Pro', 'professional'],
      ['Agency', 'agency'],
    ] as const;

    for (const [planName, planId] of planExpectations) {
      await page.goto('/');
      await page.locator('article').filter({ has: page.getByRole('heading', { name: planName }) }).getByRole('link', { name: 'Get started' }).click();
      await expect(page).toHaveURL(new RegExp(`/signup\\?plan=${planId}$`));
    }
  });

  test('mobile navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const signIn = page.locator('header').getByRole('link', { name: 'Sign in' });
    await expect(signIn).toBeVisible();
    await signIn.click();
    await expect(page).toHaveURL(/\/login$/);
    await expectNoHorizontalOverflow(page);
  });

  test('homepage feature routes load or redirect appropriately while logged out', async ({ page }) => {
    for (const route of protectedRoutes) {
      const response = await page.goto(route);
      expect(response?.status() ?? 200).toBeLessThan(500);
      const path = new URL(page.url()).pathname;
      expect([route, '/login', '/sign-up-login-screen']).toContain(path);
    }
  });

  test('public nav routes load', async ({ page }) => {
    for (const route of ['/pricing', '/resources', '/about']) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
    }
  });
});
