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

async function gotoReady(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.locator('body').waitFor({ state: 'visible' });
  return response;
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
  await expect(page.getByRole('heading', {
    name: /Your credit report, organized\. See what matters\. You take action\./i,
  })).toBeVisible();
  await expect(page.getByRole('link', { name: /Review My Own Credit/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Three-Bureau Comparison' }).first()).toBeVisible();
  await expect(page.getByText('No raw report transmission to external AI')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(failedAssets).toEqual([]);
  expect(consoleErrors.filter((message) =>
    !/favicon|ResizeObserver|Refused to load https:\/\/fixmy\.money\/manifest\.webmanifest/i.test(message)
  )).toEqual([]);
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

    await page.locator('header').getByRole('link', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await gotoReady(page, '/');
    await page.getByRole('link', { name: /Reserve My Free Month/i }).first().click();
    await expect(page).toHaveURL(/\/reopen$/);

    await gotoReady(page, '/');
    await page.getByRole('link', { name: /Review My Own Credit/i }).click();
    await expect(page).toHaveURL(/\/individuals$/);
    await page.getByRole('link', { name: /Reserve One Month Free/i }).first().click();
    await expect(page).toHaveURL(/\/reopen$/);

    await gotoReady(page, '/');
    await page.getByRole('link', { name: /Run My Credit Business/i }).click();
    await expect(page).toHaveURL(/\/professionals$/);
    await page.getByRole('link', { name: /Reserve One Month Free/i }).first().click();
    await expect(page).toHaveURL(/\/reopen$/);

    const planExpectations = ['Personal', 'Start', 'Grow'] as const;

    for (const planName of planExpectations) {
      await gotoReady(page, '/');
      await page.locator('article').filter({ has: page.getByRole('heading', { name: planName }) }).getByRole('link', { name: 'Reserve one month free' }).click();
      await expect(page).toHaveURL(/\/reopen$/);
    }
  });

  test('mobile navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoReady(page, '/');
    const signIn = page.locator('header').getByRole('link', { name: 'Sign In' });
    await expect(signIn).toBeVisible();
    await signIn.click();
    await expect(page).toHaveURL(/\/login$/);
    await expectNoHorizontalOverflow(page);
  });

  test('blog is available from desktop and mobile navigation', async ({ page }) => {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoReady(page, '/');
      if (width === 375) await page.locator('header summary').click();
      await expect(page.getByRole('link', { name: 'Blog', exact: true }).first()).toBeVisible();
      await page.getByRole('link', { name: 'Blog', exact: true }).first().click();
      await expect(page).toHaveURL(/\/blog$/);
      await expect(page.getByRole('heading', { name: 'Credit Repair Agency Resources' })).toBeVisible();
    }
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
