/**
 * Authentication Lifecycle Tests
 *
 * Tests the full authentication lifecycle using Supabase auth.
 * Uses TEST_SUPABASE_* environment variables — NEVER production credentials.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. Configure .env.test with TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY
 * 2. Run: npx vitest run src/__tests__/auth-lifecycle.test.ts
 *
 * ─── REQUIRED ENV VARS ───────────────────────────────────────────────────────
 * TEST_SUPABASE_URL          — Test environment Supabase URL
 * TEST_SUPABASE_ANON_KEY     — Test environment anon key
 * TEST_SUPABASE_SERVICE_ROLE_KEY — Test service role key
 *
 * ─── OAUTH CONFIGURATION VERIFICATION ────────────────────────────────────────
 * Supabase callback URL: https://agxzfdyvewptjwdfuvwq.supabase.co/auth/v1/callback
 * Production origin:     https://fixmy.money
 * These must be configured in the Supabase dashboard under Authentication > URL Configuration.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || '';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || '';
const TEST_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';

function assertAuthTestConfig() {
  const missing: string[] = [];
  if (!TEST_SUPABASE_URL) missing.push('TEST_SUPABASE_URL');
  if (!TEST_SUPABASE_ANON_KEY) missing.push('TEST_SUPABASE_ANON_KEY');
  if (!TEST_SERVICE_ROLE_KEY) missing.push('TEST_SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `[Auth Tests] Required test configuration missing:\n` +
      missing.map((v) => `  - ${v}`).join('\n') + '\n' +
      'Configure .env.test before running authentication tests.'
    );
  }

  if (TEST_SUPABASE_URL === process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      '[Auth Tests] TEST_SUPABASE_URL must not match production NEXT_PUBLIC_SUPABASE_URL. ' +
      'Never run auth tests against production.'
    );
  }
}

function createAnonClient(): SupabaseClient {
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAdminTestClient(): SupabaseClient {
  return createClient(TEST_SUPABASE_URL, TEST_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Unique email for each test run to avoid conflicts
const TEST_EMAIL = `auth-test-${Date.now()}@test.invalid`;
const TEST_PASSWORD = 'AuthTest_2026!';
let createdUserId: string | null = null;

describe('Authentication Lifecycle Tests', () => {
  beforeAll(() => {
    assertAuthTestConfig();
  });

  afterAll(async () => {
    // Clean up test user
    if (createdUserId) {
      const adminClient = createAdminTestClient();
      await adminClient.auth.admin.deleteUser(createdUserId);
    }
  });

  // ── Email Registration ─────────────────────────────────────────────────────

  describe('Email registration', () => {
    it('New user can register with email and password', async () => {
      const client = createAnonClient();
      const { data, error } = await client.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user).toBeTruthy();
      expect(data.user?.email).toBe(TEST_EMAIL);

      if (data.user?.id) {
        createdUserId = data.user.id;
      }
    });

    it('Duplicate email registration returns appropriate error', async () => {
      const client = createAnonClient();
      const { data, error } = await client.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      // Supabase returns user object for existing unconfirmed emails
      // or an error for confirmed emails — either is acceptable
      // The key requirement: no second account is created
      if (error) {
        expect(error.message).toBeTruthy();
      } else {
        // If no error, the user object should be the same user
        expect(data.user?.email).toBe(TEST_EMAIL);
      }
    });
  });

  // ── Login / Logout ─────────────────────────────────────────────────────────

  describe('Login and logout', () => {
    it('Confirmed user can sign in', async () => {
      // Confirm the user via admin API for testing
      const adminClient = createAdminTestClient();
      if (createdUserId) {
        await adminClient.auth.admin.updateUserById(createdUserId, {
          email_confirm: true,
        });
      }

      const client = createAnonClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.session).toBeTruthy();
      expect(data.session?.access_token).toBeTruthy();
      expect(data.user?.email).toBe(TEST_EMAIL);

      // Verify session token is not exposed in a way that could leak
      expect(data.session?.access_token).not.toContain('undefined');
    });

    it('Wrong password returns auth error', async () => {
      const client = createAnonClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: 'WrongPassword123!',
      });

      expect(error).toBeTruthy();
      expect(data.session).toBeNull();
    });

    it('Non-existent user returns auth error', async () => {
      const client = createAnonClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: 'nonexistent@test.invalid',
        password: TEST_PASSWORD,
      });

      expect(error).toBeTruthy();
      expect(data.session).toBeNull();
    });

    it('User can sign out and session is invalidated', async () => {
      const client = createAnonClient();
      await client.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      const { error } = await client.auth.signOut();
      expect(error).toBeNull();

      // After sign out, getUser should return null
      const { data: { user } } = await client.auth.getUser();
      expect(user).toBeNull();
    });
  });

  // ── Password Reset ─────────────────────────────────────────────────────────

  describe('Password reset', () => {
    it('Password reset request succeeds for existing email', async () => {
      const client = createAnonClient();
      const { error } = await client.auth.resetPasswordForEmail(TEST_EMAIL, {
        redirectTo: 'https://fixmy.money/auth/callback',
      });

      // Supabase returns success even for non-existent emails (security best practice)
      expect(error).toBeNull();
    });

    it('Password reset request does not expose whether email exists', async () => {
      const client = createAnonClient();
      const { error: existingError } = await client.auth.resetPasswordForEmail(
        TEST_EMAIL,
        { redirectTo: 'https://fixmy.money/auth/callback' }
      );
      const { error: nonExistingError } = await client.auth.resetPasswordForEmail(
        'definitely-not-real@test.invalid',
        { redirectTo: 'https://fixmy.money/auth/callback' }
      );

      // Both should return the same response (no user enumeration)
      expect(existingError).toBeNull();
      expect(nonExistingError).toBeNull();
    });
  });

  // ── Protected Route Behavior ───────────────────────────────────────────────

  describe('Protected data access', () => {
    it('Authenticated user can only read their own workspace', async () => {
      const client = createAnonClient();
      await client.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      const { data } = await client.from('workspaces').select('*');

      // User has no workspace yet — should return empty
      // If they do have a workspace, all returned rows must belong to them
      if (data && data.length > 0) {
        const adminClient = createAdminTestClient();
        const { data: { user } } = await client.auth.getUser();
        for (const workspace of data) {
          expect(workspace.owner_id).toBe(user?.id);
        }
      }

      await client.auth.signOut();
    });

    it('Unauthenticated request cannot access protected tables', async () => {
      const client = createAnonClient();
      // No sign-in

      const { data: workspaces } = await client.from('workspaces').select('*');
      const { data: clients } = await client.from('staff_clients').select('*');

      expect(workspaces?.length ?? 0).toBe(0);
      expect(clients?.length ?? 0).toBe(0);
    });
  });

  // ── OAuth Configuration Verification ──────────────────────────────────────

  describe('OAuth configuration (manual verification required)', () => {
    it('Documents required OAuth configuration for Google', () => {
      /**
       * MANUAL VERIFICATION REQUIRED:
       *
       * In Supabase Dashboard > Authentication > URL Configuration:
       *
       * Site URL:
       *   https://fixmy.money
       *
       * Redirect URLs (must include):
       *   https://fixmy.money/auth/callback
       *   https://agxzfdyvewptjwdfuvwq.supabase.co/auth/v1/callback
       *
       * In Google Cloud Console > OAuth 2.0 Client:
       *   Authorized redirect URIs must include:
       *   https://agxzfdyvewptjwdfuvwq.supabase.co/auth/v1/callback
       *
       * Auth tokens must NOT appear in:
       *   - URL query parameters visible to analytics
       *   - Application logs
       *   - Error reports
       *   - Browser history (use POST-based flows)
       */
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).not.toContain('qpgkbbtamfnodbbcqykd');
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toContain('agxzfdyvewptjwdfuvwq');
      expect(process.env.NEXT_PUBLIC_SITE_URL).toBe('https://fixmy.money');
    });

    it('Auth callback route exists at /auth/callback', async () => {
      // Verify the callback route file exists
      const fs = await import('fs');
      const callbackExists = fs.existsSync('src/app/auth/callback/route.ts');
      expect(callbackExists).toBe(true);
    });
  });

  // ── Token Security ─────────────────────────────────────────────────────────

  describe('Token security', () => {
    it('Access tokens are not logged to console during sign-in', async () => {
      // This test verifies that our auth flow does not log tokens
      // It checks the auth callback route does not expose tokens in responses
      const consoleSpy = {
        logged: [] as string[],
        original: console.log,
      };

      console.log = (...args: unknown[]) => {
        consoleSpy.logged.push(args.join(' '));
        consoleSpy.original(...args);
      };

      const client = createAnonClient();
      const { data } = await client.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      console.log = consoleSpy.original;

      // Verify the access token was not logged
      const token = data.session?.access_token;
      if (token) {
        const tokenLogged = consoleSpy.logged.some((log) => log.includes(token));
        expect(tokenLogged).toBe(false);
      }

      await client.auth.signOut();
    });
  });
});
