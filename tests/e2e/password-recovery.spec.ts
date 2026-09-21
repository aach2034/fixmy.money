import { expect, test } from '@playwright/test';

test.describe('password recovery', () => {
  test('requires a server-verified recovery session before showing the form', async ({ page }) => {
    await page.route('**/api/auth/password-recovery', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ valid: false }),
    }));

    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'Reset link expired' })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0);
  });

  test('valid recovery shows the form and successful update leads to login', async ({ page }) => {
    await page.route('**/api/auth/password-recovery', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, redirectTo: '/login?password_reset=1' }),
      });
    });

    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill('Browser-safe-password-483!');
    await page.getByLabel('Confirm new password', { exact: true }).fill('Browser-safe-password-483!');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page).toHaveURL(/\/login\?password_reset=1$/);
    await expect(page.getByRole('status')).toContainText('Your password was updated');
  });
});
