import { expect, test } from '@playwright/test';

test.describe('temporary signup shutdown', () => {
  test('homepage announces the reopening and collects only an email', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Reserve your first month free' })).toBeVisible();
    await expect(page.getByText('Reopening · October 25, 2026')).toBeVisible();
    await expect(page.getByText(/one full month of FixMy\.Money free/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(/No payment, trial, subscription, or account is created/i)).toBeVisible();
  });

  test('/signup is a reopening-list page rather than account creation', async ({ page }) => {
    const response = await page.goto('/signup');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: 'Reserve your first month free' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'RESERVE MY FREE MONTH' })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Existing customer sign in' })).toHaveAttribute('href', '/login');
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

  test('shows Turnstile only when challenged and resubmits once with its token', async ({ page }) => {
    const submissions: Array<Record<string, unknown>> = [];

    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', async route => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `window.turnstile = {
          render: (element, options) => {
            window.__turnstileTestCallback = options.callback;
            element.textContent = 'Test security verification';
            return 'test-widget';
          },
          remove: () => {}
        };`,
      });
    });

    await page.route('**/api/reopening-waitlist', async route => {
      submissions.push(route.request().postDataJSON() as Record<string, unknown>);
      if (submissions.length === 1) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Additional verification required.',
            code: 'CHALLENGE_REQUIRED',
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, reopeningDate: '2026-10-25', offer: 'one_month_free' }),
      });
    });

    await page.goto('/signup');
    await page.getByRole('textbox', { name: 'Email address' }).fill('shared-network@example.invalid');
    await page.getByRole('button', { name: 'RESERVE MY FREE MONTH' }).click();

    await expect(page.getByText('Complete the security verification to continue.')).toBeVisible();
    await expect(page.getByLabel('Security verification')).toContainText('Test security verification');
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).not.toHaveProperty('challengeToken');

    await page.evaluate(() => {
      const callback = (window as typeof window & {
        __turnstileTestCallback?: (token: string) => void;
      }).__turnstileTestCallback;
      callback?.('single-use-test-token');
    });

    await expect(page.getByRole('status')).toContainText('You’re on the reopening list.');
    expect(submissions).toHaveLength(2);
    expect(submissions[1]).toMatchObject({ challengeToken: 'single-use-test-token' });
  });
});
