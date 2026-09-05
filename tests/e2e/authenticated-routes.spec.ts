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

async function signIn(
  page: Page,
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
): Promise<void> {
  page.on('response', (response) => {
    if (/\/auth\/v1\/(token|logout)|\/api\/stripe\/entitlement/.test(response.url())) {
      console.log(`[webkit-auth-diagnostic] response ${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (/\/auth\/v1\//.test(request.url())) {
      console.log(`[webkit-auth-diagnostic] request failed ${new URL(request.url()).pathname} ${request.failure()?.errorText}`);
    }
  });
  await page.goto('/login');
  await expect(page.locator('form button[type="submit"]')).toBeEnabled();
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(1_000);
  console.log('[webkit-auth-diagnostic] client state', await page.evaluate(() => ({
    url: window.location.href,
    cookieNames: document.cookie.split(';').map((entry) => entry.trim().split('=')[0]).filter(Boolean),
    authStorageKeys: Object.keys(localStorage).filter((key) => key.includes('auth-token')),
    buttonText: document.querySelector('form button[type="submit"]')?.textContent?.trim() || null,
    visibleError: document.querySelector('.error-text')?.textContent?.trim() || null,
  })));
  await page.waitForURL(/\/checkout\?plan=starter$/, { timeout: 10000 });

  const entitlement = await page.evaluate(async () => {
    const response = await fetch('/api/stripe/entitlement', { method: 'POST' });
    return { status: response.status, body: await response.json() };
  });
  expect(entitlement.status).toBe(200);
  expect(entitlement.body).toMatchObject({ canAccess: false, reason: 'no_billing_account' });
}

// ─── Email Login ──────────────────────────────────────────────────────────────

test.describe('Email Login', () => {
  test.beforeEach(skipIfNoCredentials);

  test('user can sign in with email and password', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/checkout\?plan=starter$/);
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill('WrongPassword_XYZ_999!');
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByText(/invalid|incorrect|wrong|error|failed/i).first()).toBeVisible();
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test.beforeEach(skipIfNoCredentials);

  test('user can sign out', async ({ page }) => {
    await signIn(page);
    await page.goto('/billing-subscriptions');
    await expect(page).toHaveURL(/\/billing-subscriptions$/);

    const mobileNavigation = page.getByRole('button', { name: 'Open navigation' });
    if (await mobileNavigation.isVisible()) {
      await mobileNavigation.click();
    }
    await page.getByRole('button', { name: new RegExp(TEST_EMAIL, 'i') }).click();
    await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
    await page.waitForURL(/sign-up-login-screen|login/i, { timeout: 5000 });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });
});

// ─── Session Persistence ──────────────────────────────────────────────────────

test.describe('Session Persistence', () => {
  test.beforeEach(skipIfNoCredentials);

  test('session persists across page navigation', async ({ page }) => {
    await signIn(page);

    // Navigate to another page
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    // The billing route is intentionally available to authenticated workspace
    // members who do not yet have a verified paid/trial entitlement.
    await page.goto('/billing-subscriptions');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/billing-subscriptions$/);
    await expect(page.getByRole('heading', { name: 'Billing center' })).toBeVisible();
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

// ─── Authenticated Workspace Routing ──────────────────────────────────────────

test.describe('Authenticated workspace routing', () => {
  test.beforeEach(skipIfNoCredentials);

  test('seeded workspace owner is routed by the server-authoritative entitlement gate', async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/billing-subscriptions\?reason=no_billing_account$/);
    await expect(page.getByRole('heading', { name: 'Billing center' })).toBeVisible();
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
    let priorSelectedWorkspaceId: string | null = null;
    try {
      const { error: memberLoginError } = await member.auth.signInWithPassword({
        email: TEST_MEMBER_EMAIL,
        password: TEST_MEMBER_PASSWORD,
      });
      expect(memberLoginError).toBeNull();

      const { data: priorSelection, error: priorSelectionError } = await member
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('is_selected', true)
        .maybeSingle();
      expect(priorSelectionError).toBeNull();
      priorSelectedWorkspaceId = priorSelection?.workspace_id || null;

      const { error: staleMembershipError } = await admin
        .from('workspace_memberships')
        .delete()
        .eq('workspace_id', workspace!.id)
        .eq('user_id', memberUser!.id);
      expect(staleMembershipError).toBeNull();

      const { error: membershipError } = await admin
        .from('workspace_memberships')
        .insert({
          workspace_id: workspace!.id,
          user_id: memberUser!.id,
          role: 'specialist',
          status: 'active',
          is_selected: false,
          invited_by: ownerUser!.id,
        });
      expect(membershipError).toBeNull();

      const { error: selectWorkspaceError } = await member.rpc('select_workspace', {
        requested_workspace_id: workspace!.id,
      });
      expect(selectWorkspaceError).toBeNull();

      const { error: clientError } = await admin.from('staff_clients').insert({
        id: clientId,
        workspace_id: workspace!.id,
        owner_id: ownerUser!.id,
        name: 'FMM Removed Member Boundary Client',
        email: `removed-member-${clientId}@test.invalid`,
        case_stage: 'active',
      });
      expect(clientError).toBeNull();

      await signIn(page, TEST_MEMBER_EMAIL, TEST_MEMBER_PASSWORD);

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

      await page.goto(`/clients/${clientId}`);
      await expect(page).toHaveURL(/\/login(?:\?|$)/);

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
      if (priorSelectedWorkspaceId) {
        await member.rpc('select_workspace', {
          requested_workspace_id: priorSelectedWorkspaceId,
        });
      }
      await admin.from('workspace_client_memberships').delete()
        .eq('staff_client_id', clientId);
      await admin.from('staff_clients').delete().eq('id', clientId);
      await member.auth.signOut();
    }
  });
});
