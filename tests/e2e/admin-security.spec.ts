import { expect, test } from '@playwright/test';

const ADMIN_PATHS = [
  '/admin',
  '/admin/acquisition',
  '/admin/customers',
  '/admin/health',
  '/admin/parser-debugger',
  '/admin/security',
  '/admin/seo',
];

test.describe('FMM-015 administrator browser boundary', () => {
  for (const path of ADMIN_PATHS) {
    test(`an unauthenticated visitor cannot reach ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?redirect=/);
      await expect(page.getByRole('heading', { name: 'Administrator verification' })).toHaveCount(0);
    });
  }

  test('recent-auth redirect explains that billing has not changed', async ({ page }) => {
    await page.goto('/login?force_reauth=1&redirect=%2Fbilling-subscriptions');
    await expect(page.getByText(/Sign in again to confirm this security-sensitive action/i)).toBeVisible();
    await expect(page.getByText(/billing account has not been changed/i)).toBeVisible();
  });
});
