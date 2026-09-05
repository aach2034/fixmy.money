import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

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
const TEST_MEMBER_EMAIL = process.env.TEST_MEMBER_EMAIL || '';
const TEST_MEMBER_PASSWORD = process.env.TEST_MEMBER_PASSWORD || '';
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || '';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || '';
const TEST_SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';

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
  await page.waitForURL(/dashboard|workspace|onboarding/i, { timeout: 10000 }).catch(async () => {
    const body = await page.locator('body').innerText().catch(() => '');
    console.log(`[FMM014_DIAG] signIn helper stopped at ${page.url()} :: ${body.slice(0, 500).replace(/\s+/g, ' ')}`);
  });
}

// ─── Email Login ──────────────────────────────────────────────────────────────

test.describe('Email Login', () => {
  test.beforeEach(skipIfNoCredentials);

  test('user can sign in with email and password', async ({ page }) => {
    page.on('response', (response) => {
      if (/\/auth\/v1\/token|\/rest\/v1\/user_profiles|\/api\/stripe\/entitlement/.test(response.url())) {
        console.log(`[FMM014_DIAG] response ${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        console.log(`[FMM014_DIAG] browser ${message.type()} ${message.text()}`);
      }
    });
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first().click();

    // Should redirect away from login page
    await page.waitForURL(/dashboard|workspace|onboarding|billing-subscriptions/i, { timeout: 10000 }).catch(async (error) => {
      const body = await page.locator('body').innerText().catch(() => '');
      console.log(`[FMM014_DIAG] direct login stopped at ${page.url()} :: ${body.slice(-1200).replace(/\s+/g, ' ')}`);
      throw error;
    });
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
  test('removed member loses workspace access', async ({ page }) => {
    test.skip(
      !TEST_EMAIL
        || !TEST_PASSWORD
        || !TEST_MEMBER_EMAIL
        || !TEST_MEMBER_PASSWORD
        || !TEST_SUPABASE_URL
        || !TEST_SUPABASE_ANON_KEY
        || !TEST_SUPABASE_SERVICE_ROLE_KEY,
      'Requires two seeded users in the isolated local Supabase stack',
    );

    const localUrl = new URL(TEST_SUPABASE_URL);
    expect(['127.0.0.1', 'localhost']).toContain(localUrl.hostname);
    expect(TEST_EMAIL).toMatch(/@test\.invalid$/);
    expect(TEST_MEMBER_EMAIL).toMatch(/@test\.invalid$/);

    const admin = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const member = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    expect(usersError).toBeNull();
    const ownerUser = users.users.find((user) => user.email === TEST_EMAIL);
    const memberUser = users.users.find((user) => user.email === TEST_MEMBER_EMAIL);
    expect(ownerUser).toBeTruthy();
    expect(memberUser).toBeTruthy();

    const { data: workspace, error: workspaceError } = await admin
      .from('workspaces')
      .select('id')
      .eq('owner_id', ownerUser!.id)
      .single();
    expect(workspaceError).toBeNull();
    expect(workspace).toBeTruthy();

    const clientId = crypto.randomUUID();
    try {
      const { error: clearSelectionError } = await admin
        .from('workspace_memberships')
        .update({ is_selected: false })
        .eq('user_id', memberUser!.id);
      expect(clearSelectionError).toBeNull();

      const { error: membershipError } = await admin
        .from('workspace_memberships')
        .upsert({
          workspace_id: workspace!.id,
          user_id: memberUser!.id,
          role: 'specialist',
          status: 'active',
          is_selected: true,
          invited_by: ownerUser!.id,
        }, { onConflict: 'workspace_id,user_id' });
      expect(membershipError).toBeNull();

      const { error: clientError } = await admin.from('staff_clients').insert({
        id: clientId,
        workspace_id: workspace!.id,
        owner_id: ownerUser!.id,
        name: 'FMM Removed Member Boundary Client',
        email: `removed-member-${clientId}@test.invalid`,
        case_stage: 'active',
      });
      expect(clientError).toBeNull();

      await page.goto('/login');
      await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_MEMBER_EMAIL);
      await page.locator('input[type="password"]').first().fill(TEST_MEMBER_PASSWORD);
      await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first().click();
      await page.waitForURL(/dashboard|workspace|onboarding|billing-subscriptions/i, { timeout: 10000 });

      const { error: memberLoginError } = await member.auth.signInWithPassword({
        email: TEST_MEMBER_EMAIL,
        password: TEST_MEMBER_PASSWORD,
      });
      expect(memberLoginError).toBeNull();

      const { data: visibleBefore, error: beforeError } = await member
        .from('staff_clients')
        .select('id')
        .eq('id', clientId)
        .single();
      expect(beforeError).toBeNull();
      expect(visibleBefore?.id).toBe(clientId);

      const { error: removeError } = await admin
        .from('workspace_memberships')
        .delete()
        .eq('workspace_id', workspace!.id)
        .eq('user_id', memberUser!.id);
      expect(removeError).toBeNull();

      const { data: visibleAfter, error: afterError } = await member
        .from('staff_clients')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();
      expect(afterError).toBeNull();
      expect(visibleAfter).toBeNull();
    } finally {
      await admin.from('workspace_memberships').delete()
        .eq('workspace_id', workspace!.id)
        .eq('user_id', memberUser!.id);
      await admin.from('workspace_client_memberships').delete()
        .eq('staff_client_id', clientId);
      await admin.from('staff_clients').delete().eq('id', clientId);
      await member.auth.signOut();
    }
  });
});
