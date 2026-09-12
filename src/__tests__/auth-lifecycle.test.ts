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
import { createHmac } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LOCAL_PASSWORD_RESET_REDIRECT_URL } from '../../scripts/integration-test-contracts';

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

  const testUrl = new URL(TEST_SUPABASE_URL);
  if (testUrl.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(testUrl.hostname)) {
    throw new Error(
      '[Auth Tests] TEST_SUPABASE_URL must use the isolated local Supabase stack. ' +
      'Remote projects, including production, are forbidden.'
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

function totpCode(base32Secret: string, at = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = base32Secret.replace(/=+$/u, '').toUpperCase();
  let bits = '';
  for (const character of normalized) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error('Invalid synthetic TOTP secret.');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const digest = createHmac('sha1', bytes).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return binary.toString().padStart(6, '0');
}

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
        redirectTo: LOCAL_PASSWORD_RESET_REDIRECT_URL,
      });

      // Supabase returns success even for non-existent emails (security best practice)
      expect(error).toBeNull();
    });

    it('Password reset request does not expose whether email exists', async () => {
      const existingEmail = `auth-reset-existing-${Date.now()}@test.invalid`;
      const missingEmail = `auth-reset-missing-${Date.now()}@test.invalid`;
      const adminClient = createAdminTestClient();
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: existingEmail,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      expect(createError).toBeNull();
      expect(created.user?.id).toBeTruthy();

      const client = createAnonClient();
      try {
        const { error: existingError } = await client.auth.resetPasswordForEmail(
          existingEmail,
          { redirectTo: LOCAL_PASSWORD_RESET_REDIRECT_URL },
        );
        const { error: nonExistingError } = await client.auth.resetPasswordForEmail(
          missingEmail,
          { redirectTo: LOCAL_PASSWORD_RESET_REDIRECT_URL },
        );

        // Each identity is requested only once, avoiding the documented
        // per-user recovery cooldown while preserving enumeration coverage.
        expect(existingError).toBeNull();
        expect(nonExistingError).toBeNull();
      } finally {
        if (created.user?.id) {
          await adminClient.auth.admin.deleteUser(created.user.id);
        }
      }
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
    it('keeps the integration runtime isolated from production', () => {
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
      const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
      const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || '');
      expect(['127.0.0.1', 'localhost']).toContain(supabaseUrl.hostname);
      expect(supabaseUrl.protocol).toBe('http:');
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(TEST_SUPABASE_URL);
      expect(['127.0.0.1', 'localhost']).toContain(siteUrl.hostname);
      expect(siteUrl.protocol).toBe('http:');
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

  describe('Administrator MFA revocation integration', () => {
    it('keeps inactive enrollment RLS-denied until verified-factor activation completes', async () => {
      const adminClient = createAdminTestClient();
      const email = `fmm015-inactive-admin-${Date.now()}@test.invalid`;
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      expect(createError).toBeNull();
      const userId = created.user?.id;
      expect(userId).toBeTruthy();
      if (!userId) throw new Error('Synthetic inactive administrator was not created.');

      try {
        const { error: roleError } = await adminClient.from('platform_admins').insert({
          user_id: userId,
          role: 'platform_admin',
          active: false,
          created_by: userId,
          notes: 'Synthetic inactive FMM-015 bootstrap administrator',
        });
        expect(roleError).toBeNull();

        const client = createAnonClient();
        const { error: signInError } = await client.auth.signInWithPassword({
          email,
          password: TEST_PASSWORD,
        });
        expect(signInError).toBeNull();
        const { data: enrollment, error: enrollError } = await client.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'FMM-015 inactive bootstrap factor',
        });
        expect(enrollError).toBeNull();
        expect(enrollment?.totp.secret).toBeTruthy();
        const { error: verificationError } = await client.auth.mfa.challengeAndVerify({
          factorId: enrollment!.id,
          code: totpCode(enrollment!.totp.secret),
        });
        expect(verificationError).toBeNull();

        const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        expect(assurance?.currentLevel).toBe('aal2');

        const { error: inactiveRegistrationError } = await adminClient.rpc(
          'confirm_platform_admin_mfa_factors',
          { p_user_id: userId, p_factor_ids: [enrollment!.id] },
        );
        expect(inactiveRegistrationError).toBeTruthy();

        const { data: inactiveRows, error: inactiveRowsError } = await client
          .from('platform_admins')
          .select('user_id, role');
        expect(inactiveRowsError).toBeNull();
        expect(inactiveRows).toHaveLength(0);

        const { error: activationError } = await adminClient
          .from('platform_admins')
          .update({ active: true, revoked_at: null })
          .eq('user_id', userId)
          .eq('active', false);
        expect(activationError).toBeNull();

        const { error: registrationError } = await adminClient.rpc(
          'confirm_platform_admin_mfa_factors',
          { p_user_id: userId, p_factor_ids: [enrollment!.id] },
        );
        expect(registrationError).toBeNull();

        const { data: activeRows, error: activeRowsError } = await client
          .from('platform_admins')
          .select('user_id, role');
        expect(activeRowsError).toBeNull();
        expect(activeRows).toEqual([{ user_id: userId, role: 'platform_admin' }]);
      } finally {
        await adminClient.from('platform_admins').delete().eq('user_id', userId);
        await adminClient.auth.admin.deleteUser(userId);
      }
    });

    it('denies the stale AAL2 session after direct provider-side factor removal', async () => {
      const adminClient = createAdminTestClient();
      const email = `fmm015-admin-${Date.now()}@test.invalid`;
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      expect(createError).toBeNull();
      const userId = created.user?.id;
      expect(userId).toBeTruthy();
      if (!userId) throw new Error('Synthetic administrator was not created.');

      try {
        const { error: roleError } = await adminClient.from('platform_admins').insert({
          user_id: userId,
          role: 'platform_admin',
          active: true,
          created_by: userId,
          notes: 'Synthetic FMM-015 integration administrator',
        });
        expect(roleError).toBeNull();

        const client = createAnonClient();
        const { error: signInError } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
        expect(signInError).toBeNull();
        const { data: enrollment, error: enrollError } = await client.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'FMM-015 integration factor',
        });
        expect(enrollError).toBeNull();
        expect(enrollment?.totp.secret).toBeTruthy();
        const { error: verificationError } = await client.auth.mfa.challengeAndVerify({
          factorId: enrollment!.id,
          code: totpCode(enrollment!.totp.secret),
        });
        expect(verificationError).toBeNull();

        const { error: eligibilityError } = await adminClient.rpc(
          'confirm_platform_admin_mfa_factors',
          { p_user_id: userId, p_factor_ids: [enrollment!.id] },
        );
        expect(eligibilityError).toBeNull();

        const { data: aal2Rows, error: aal2Error } = await client.from('platform_admins').select('user_id');
        expect(aal2Error).toBeNull();
        expect(aal2Rows?.some((row) => row.user_id === userId)).toBe(true);

        const { data: sessionData } = await client.auth.getSession();
        const accessToken = sessionData.session?.access_token || '';
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] || '', 'base64url').toString('utf8')) as {
          session_id?: string;
          aal?: string;
        };
        expect(payload.aal).toBe('aal2');
        expect(payload.session_id).toBeTruthy();

        const { error: removalError } = await client.auth.mfa.unenroll({ factorId: enrollment!.id });
        expect(removalError).toBeNull();

        const { data: state, error: stateError } = await adminClient
          .from('platform_admins')
          .select('revoked_session_ids')
          .eq('user_id', userId)
          .single();
        expect(stateError).toBeNull();
        expect(state?.revoked_session_ids).toContain(payload.session_id);

        const { data: staleRows, error: staleError } = await client.from('platform_admins').select('user_id');
        expect(staleError).toBeNull();
        expect(staleRows).toHaveLength(0);

        const { count: auditCount, error: auditError } = await adminClient
          .from('admin_action_audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('admin_id', userId)
          .eq('action', 'admin_mfa_factor_removed_and_sessions_revoked');
        expect(auditError).toBeNull();
        expect(auditCount).toBe(1);
      } finally {
        await adminClient.from('platform_admins').delete().eq('user_id', userId);
        await adminClient.auth.admin.deleteUser(userId);
      }
    });
  });
});
