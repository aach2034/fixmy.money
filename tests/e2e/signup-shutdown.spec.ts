import { expect, test } from '@playwright/test';

test.describe('temporary signup shutdown', () => {
  test('homepage announces the reopening and collects only an email', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'We’re Improving FixMy.Money' })).toBeVisible();
    await expect(page.getByText('Grand Opening on October 25, 2026')).toBeVisible();
    await expect(page.getByText(/one full month of FixMy\.Money free/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(/No payment, trial, subscription, or account is created/i)).toBeVisible();
  });

  test('/signup is a reopening-list page rather than account creation', async ({ page }) => {
    const response = await page.goto('/signup');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: 'We’re Improving FixMy.Money' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'GET MY FREE MONTH' })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'SIGN IN' })).toHaveAttribute('href', '/login');
  });

  test('existing-customer login and password reset remain available', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join the reopening list' })).toHaveAttribute('href', '/#reopening-list');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  });

  test('direct application signup is blocked before user or payment creation', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: { email: 'new-user@example.com', password: 'not-created' },
    });
    expect(response.status()).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: 'SIGNUPS_CLOSED',
      reopeningDate: '2026-10-25',
    });
  });
});
