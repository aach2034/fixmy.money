import { expect, test } from '@playwright/test';

test.describe('business-only public offer', () => {
  test('shows two business plans and a matching comparison table', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: 'Start', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Grow', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Personal', exact: true })).toHaveCount(0);
    const table = page.getByRole('table');
    await expect(table.locator('thead th')).toHaveCount(3);
    await expect(table.locator('tbody tr').filter({ hasText: 'Client portal' }).getByRole('cell')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Business Use Policy' })).toHaveAttribute('href', '/business-use');
  });

  test('retires the individual offer without stranding existing customers', async ({ page }) => {
    await page.goto('/individuals');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('FixMy.Money is now business software.');
    await expect(page.getByRole('link', { name: 'Sign in to an existing account' })).toHaveAttribute('href', '/login');
    await expect(page.getByRole('button', { name: /reserve|subscribe|checkout/i })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('publishes business responsibilities without claiming verification', async ({ page }) => {
    await page.goto('/business-use');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Business Use Policy');
    await expect(page.getByText(/A signup declaration and email verification are not business verification/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'support@fixmy.money' })).toHaveAttribute('href', 'mailto:support@fixmy.money');
  });
});
