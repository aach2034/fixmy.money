import { expect, test } from '@playwright/test';

test.describe('approved public offer', () => {
  test('shows the three approved plans and a matching comparison table', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: 'FixMy Credit', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'FixMy Pro', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'FixMy Scale', exact: true })).toHaveCount(1);
    const table = page.getByRole('table');
    await expect(table.locator('thead th')).toHaveCount(4);
    await expect(table.locator('tbody tr').filter({ hasText: 'Client portal' }).getByRole('cell')).toHaveCount(4);
    await expect(page.getByRole('link', { name: 'Business Use Policy' })).toHaveAttribute('href', '/business-use');
  });

  test('retires the individual offer without stranding existing customers', async ({ page }) => {
    await page.goto('/individuals');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('FixMy Credit · $39 per month');
    await expect(page.getByText(/New enrollment and billing are not yet available/)).toBeVisible();
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
