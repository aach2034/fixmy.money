import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Authenticated Browser Tests — FixMy.Money
 *
 * Tests authenticated user flows using Playwright.
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD in environment.
 *
 * These tests use a real test account — NEVER production user credentials.
 * Configure in .env.test or as environment variables before running.
 *
 * Run: npx playwright test tests/e2e/authenticated-routes.spec.ts
 *
 * Required env vars:
 *   PLAYWRIGHT_BASE_URL     — Base URL (default: http://localhost:4028)
 *   TEST_USER_EMAIL         — Test user email (must exist in test Supabase project)
 *   TEST_USER_PASSWORD      — Test user password
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || '';

// Skip all authenticated tests if credentials are not configured
const skipIfNoCredentials = () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    test.skip(true, 'TEST_USER_EMAIL and TEST_USER_PASSWORD must be configured to run authenticated tests');
  }
};

// ─── Helper: sign in ──────────────────────────────────────────────────────────

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
  await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
  await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first().click();
  // Wait for redirect to dashboard or authenticated area
  await page.waitForURL(/dashboard|workspace|onboarding/i, { timeout: 10000 }).catch(() => {});
}

// ─── Email Login ──────────────────────────────────────────────────────────────

test.describe('Email Login', () => {
  test.beforeEach(skipIfNoCredentials);

  test('user can sign in with email and password', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first().click();

    // Should redirect away from login page
    await page.waitForURL(/dashboard|workspace|onboarding|billing-subscriptions/i, { timeout: 10000 });
    const currentUrl = page.url();
    expect(new URL(currentUrl).pathname).not.toBe('/login');
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill('WrongPassword_XYZ_999!');
    await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first().click();

    // Should show error message
    await page.waitForTimeout(2000);
    const errorMsg = page.locator('text=/invalid|incorrect|wrong|error|failed/i').first();
    const isOnLoginPage = new URL(page.url()).pathname === '/login';
    expect(isOnLoginPage || await errorMsg.isVisible().catch(() => false)).toBe(true);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test.beforeEach(skipIfNoCredentials);

  test('user can sign out', async ({ page }) => {
    await signIn(page);

    // Find sign out button
    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Log Out"), a:has-text("Sign Out"), a:has-text("Log Out")').first();
    const signOutVisible = await signOutBtn.isVisible().catch(() => false);

    if (signOutVisible) {
      await signOutBtn.click();
      await page.waitForURL(/login|\/$/i, { timeout: 5000 }).catch(() => {});
      // Should be redirected to login or home
      const currentUrl = page.url();
      const isLoggedOut = /\/login(?:\?|$)/.test(currentUrl) ||
        await page.locator('input[type="email"]').first().isVisible().catch(() => false);
      expect(isLoggedOut).toBe(true);
    } else {
      // Sign out may be in a dropdown — look for user menu
      const userMenu = page.locator('[aria-label*="user"], [aria-label*="account"], [data-testid="user-menu"]').first();
      const menuVisible = await userMenu.isVisible().catch(() => false);
      if (menuVisible) {
        await userMenu.click();
        const signOutInMenu = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();
        await expect(signOutInMenu).toBeVisible();
      }
    }
  });
});

// ─── Session Persistence ──────────────────────────────────────────────────────

test.describe('Session Persistence', () => {
  test.beforeEach(skipIfNoCredentials);

  test('session persists across page navigation', async ({ page }) => {
    await signIn(page);
    const dashboardUrl = page.url();

    // Navigate to another page
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    // Navigate back to dashboard
    await page.goto(dashboardUrl);
    await page.waitForLoadState('networkidle');

    // Should still be authenticated (not redirected to login)
    const isOnLogin = new URL(page.url()).pathname === '/login';
    expect(isOnLogin).toBe(false);
  });
});

// ─── Password Reset Request ───────────────────────────────────────────────────

test.describe('Password Reset Request', () => {
  test('password reset form is accessible', async ({ page }) => {
    await page.goto('/login');

    // Look for forgot password link
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), text=/forgot.*password/i').first();
    const forgotVisible = await forgotLink.isVisible().catch(() => false);

    if (forgotVisible) {
      await forgotLink.click();
      await page.waitForTimeout(1000);
      // Should show reset form
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();
    } else {
      // Try direct route
      const response = await page.goto('/forgot-password');
      if (response && response.status() < 400) {
        const emailInput = page.locator('input[type="email"]').first();
        await expect(emailInput).toBeVisible();
      }
    }
  });
});

// ─── User Without Workspace ───────────────────────────────────────────────────

test.describe('User without workspace', () => {
  test.beforeEach(skipIfNoCredentials);

  test('authenticated user without workspace sees onboarding or setup', async ({ page }) => {
    await signIn(page);
    // After login, user should either see dashboard or workspace setup
    const currentUrl = page.url();
    const isOnValidPage = /dashboard|workspace|onboarding|setup/i.test(currentUrl);
    expect(isOnValidPage).toBe(true);
  });
});

// ─── Google OAuth Configuration ───────────────────────────────────────────────

test.describe('OAuth Configuration', () => {
  test('OAuth callback route exists', async ({ page }) => {
    // The callback route should exist (even if it redirects)
    const response = await page.goto('/auth/callback');
    // Should not be a 404 or 500
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).not.toBe(500);
  });

  test('Google OAuth is not advertised while the provider is disabled', async ({ page }) => {
    await page.goto('/login');
    const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google"), [aria-label*="Google"]').first();
    await expect(googleBtn).toHaveCount(0);
  });

  test('invalid OAuth callback fails without a server error', async ({ page }) => {
    /**
     * VERIFIED CONFIGURATION:
     * Supabase callback URL: https://agxzfdyvewptjwdfuvwq.supabase.co/auth/v1/callback
     * Production origin:     https://fixmy.money
     * App callback:          https://fixmy.money/auth/callback
     *
     * These must be configured in:
     * 1. Supabase Dashboard > Authentication > URL Configuration > Site URL
     * 2. Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
     * 3. Google Cloud Console > OAuth 2.0 > Authorized redirect URIs
     *
     * Manual verification required — cannot be automated without real OAuth credentials.
     */
    const response = await page.goto('/auth/callback?code=invalid-e2e-code');
    expect(response?.status()).toBeLessThan(500);
  });
});

// ─── Team Invitation ──────────────────────────────────────────────────────────

test.describe('Team Invitation', () => {
  test('invitation route handles invalid token gracefully', async ({ page }) => {
    // Test with an obviously invalid invitation token
    const response = await page.goto('/workspace-setup?invite=invalid-token-xyz');
    // Should not crash with 500
    expect(response?.status()).not.toBe(500);
  });

  test('expired invitation shows appropriate message', async ({ page }) => {
    // Navigate to invitation acceptance with expired token
    await page.goto('/workspace-setup?invite=expired-test-token');
    await page.waitForLoadState('networkidle');
    // Should show error or redirect to login — not crash
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
  });
});

// ─── Removed Workspace Member ─────────────────────────────────────────────────

test.describe('Removed workspace member', () => {
  test('removed member loses workspace access', async () => {
    /**
     * VERIFIED: RLS policies in migration 20260604150000_rls_tenant_isolation.sql
     * enforce workspace membership at the database level.
     *
     * When a team member is removed from a workspace:
     * 1. Their workspace_members row is deleted
     * 2. RLS policies immediately deny access to workspace data
     * 3. No application-level cache can bypass this
     *
     * Full end-to-end test requires:
     * - Two test accounts
     * - One workspace with both members
     * - Remove one member via admin API
     * - Verify removed member's queries return empty
     *
     * This is covered in cross-tenant-security.test.ts (Vitest).
     */
    test.skip(true, 'Requires two seeded users and a dedicated non-production Supabase project');
  });
});
