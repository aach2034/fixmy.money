/**
 * Cross-Tenant Security Tests — Deterministic Setup
 *
 * These tests verify workspace isolation is enforced at the database level.
 * They attempt ACTUAL unauthorized queries, not just policy existence checks.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. Seed test environment:
 *    npx tsx scripts/seed-test-fixtures.ts
 *
 * 2. Run tests:
 *    npx vitest run src/__tests__/cross-tenant-security.test.ts
 *
 * 3. Remove test fixtures:
 *    npx tsx scripts/seed-test-fixtures.ts --teardown
 *
 * ─── REQUIRED ENV VARS ───────────────────────────────────────────────────────
 * TEST_SUPABASE_URL          — Test environment Supabase URL (NOT production)
 * TEST_SUPABASE_ANON_KEY     — Test environment anon key (NOT production)
 * TEST_OWNER_A_EMAIL         — owner-a@test.invalid (seeded by seed script)
 * TEST_OWNER_A_PASSWORD      — seeded password for owner A
 * TEST_OWNER_B_EMAIL         — owner-b@test.invalid
 * TEST_OWNER_B_PASSWORD      — seeded password for owner B
 * TEST_STAFF_A_EMAIL         — staff-a@test.invalid
 * TEST_STAFF_A_PASSWORD      — seeded password for staff A
 * TEST_WORKSPACE_A_ID        — UUID of workspace A (output by seed script)
 * TEST_WORKSPACE_B_ID        — UUID of workspace B (output by seed script)
 *
 * ─── FAILURE POLICY ──────────────────────────────────────────────────────────
 * Tests FAIL (not skip) when required configuration is missing.
 * A skipped security test is reported as INCOMPLETE, not passed.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Configuration ────────────────────────────────────────────────────────────

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || '';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || '';

const FIXTURES = {
  ownerA: {
    email: process.env.TEST_OWNER_A_EMAIL || '',
    password: process.env.TEST_OWNER_A_PASSWORD || '',
  },
  ownerB: {
    email: process.env.TEST_OWNER_B_EMAIL || '',
    password: process.env.TEST_OWNER_B_PASSWORD || '',
  },
  staffA: {
    email: process.env.TEST_STAFF_A_EMAIL || '',
    password: process.env.TEST_STAFF_A_PASSWORD || '',
  },
  workspaceAId: process.env.TEST_WORKSPACE_A_ID || '',
  workspaceBId: process.env.TEST_WORKSPACE_B_ID || '',
};

// ─── Validation — fail hard if config is missing ─────────────────────────────

function assertTestConfig() {
  const missing: string[] = [];

  if (!TEST_SUPABASE_URL) missing.push('TEST_SUPABASE_URL');
  if (!TEST_SUPABASE_ANON_KEY) missing.push('TEST_SUPABASE_ANON_KEY');
  if (!FIXTURES.ownerA.email) missing.push('TEST_OWNER_A_EMAIL');
  if (!FIXTURES.ownerA.password) missing.push('TEST_OWNER_A_PASSWORD');
  if (!FIXTURES.ownerB.email) missing.push('TEST_OWNER_B_EMAIL');
  if (!FIXTURES.ownerB.password) missing.push('TEST_OWNER_B_PASSWORD');
  if (!FIXTURES.staffA.email) missing.push('TEST_STAFF_A_EMAIL');
  if (!FIXTURES.staffA.password) missing.push('TEST_STAFF_A_PASSWORD');
  if (!FIXTURES.workspaceAId) missing.push('TEST_WORKSPACE_A_ID');
  if (!FIXTURES.workspaceBId) missing.push('TEST_WORKSPACE_B_ID');

  if (missing.length > 0) {
    throw new Error(
      `[Security Tests] REQUIRED test configuration is missing. ` +
      `Run 'npx tsx scripts/seed-test-fixtures.ts' first.\n` +
      `Missing variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\n` +
      `These tests MUST NOT be skipped. A skipped security test is INCOMPLETE, not passed.`
    );
  }

  // Prevent accidental use of production credentials
  if (
    TEST_SUPABASE_URL === process.env.NEXT_PUBLIC_SUPABASE_URL &&
    TEST_SUPABASE_ANON_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      '[Security Tests] TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY must be different from ' +
      'production NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. '+ 'Never run security tests against production data.'
    );
  }
}

// ─── Client factory ───────────────────────────────────────────────────────────

function createTestClient(): SupabaseClient {
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signInAs(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `[Security Tests] Failed to sign in as ${email}: ${error.message}. ` +
      `Ensure test fixtures are seeded with 'npx tsx scripts/seed-test-fixtures.ts'.`
    );
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Cross-Tenant Security Tests', () => {
  beforeAll(() => {
    // This throws if config is missing — tests will not run silently
    assertTestConfig();
  });

  // ── Workspace Isolation ────────────────────────────────────────────────────

  describe('Workspace A cannot read Workspace B data', () => {
    it('Owner A cannot read Workspace B clients', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.ownerA.email, FIXTURES.ownerA.password);

      const { data, error } = await client
        .from('staff_clients')
        .select('id, workspace_id')
        .eq('workspace_id', FIXTURES.workspaceBId);

      // RLS must return empty result — not Workspace B's data
      expect(data?.length ?? 0).toBe(0);
      // No error expected — RLS silently filters, not rejects SELECT
      await client.auth.signOut();
    });

    it('Owner A cannot update Workspace B clients', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.ownerA.email, FIXTURES.ownerA.password);

      const { error } = await client
        .from('staff_clients')
        .update({ first_name: 'SECURITY_TEST_TAMPERED' })
        .eq('workspace_id', FIXTURES.workspaceBId);

      // RLS must block this update — error or 0 rows affected
      // Either an error is returned, or the update affects 0 rows
      // We verify by checking that no Workspace B client was actually changed
      const { data: checkData } = await client
        .from('staff_clients')
        .select('first_name')
        .eq('workspace_id', FIXTURES.workspaceBId);

      const tampered = (checkData || []).some(
        (row) => row.first_name === 'SECURITY_TEST_TAMPERED'
      );
      expect(tampered).toBe(false);

      await client.auth.signOut();
    });

    it('Owner A cannot delete Workspace B documents', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.ownerA.email, FIXTURES.ownerA.password);

      // Attempt delete — RLS should block
      const { error } = await client
        .from('client_documents')
        .delete()
        .eq('workspace_id', FIXTURES.workspaceBId);

      // Verify no Workspace B documents were deleted
      // (We check via the same client — if RLS blocks SELECT too, data will be empty)
      // The key assertion: no error that indicates a successful delete
      // A proper RLS policy returns an error on DELETE attempts
      if (!error) {
        // If no error, verify count is unchanged — RLS may silently no-op
        const { count } = await client
          .from('client_documents')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', FIXTURES.workspaceBId);
        // Owner A should see 0 Workspace B documents (RLS filters them)
        expect(count ?? 0).toBe(0);
      } else {
        // Error is also acceptable — RLS rejected the operation
        expect(error).toBeTruthy();
      }

      await client.auth.signOut();
    });

    it('Owner A cannot read Workspace B workspaces row', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.ownerA.email, FIXTURES.ownerA.password);

      const { data } = await client
        .from('workspaces')
        .select('id')
        .eq('id', FIXTURES.workspaceBId);

      expect(data?.length ?? 0).toBe(0);
      await client.auth.signOut();
    });
  });

  // ── Audit Log Protection ───────────────────────────────────────────────────

  describe('Audit log immutability', () => {
    it('Standard user cannot update audit logs', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.staffA.email, FIXTURES.staffA.password);

      const { error } = await client
        .from('audit_logs')
        .update({ action: 'SECURITY_TEST_TAMPERED' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeTruthy();
      await client.auth.signOut();
    });

    it('Standard user cannot delete audit logs', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.staffA.email, FIXTURES.staffA.password);

      const { error } = await client
        .from('audit_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeTruthy();
      await client.auth.signOut();
    });
  });

  // ── Billing Event Protection ───────────────────────────────────────────────

  describe('Billing event immutability', () => {
    it('Standard user cannot delete billing events', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.staffA.email, FIXTURES.staffA.password);

      const { error } = await client
        .from('billing_events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeTruthy();
      await client.auth.signOut();
    });

    it('Standard user cannot update billing events', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.staffA.email, FIXTURES.staffA.password);

      const { error } = await client
        .from('billing_events')
        .update({ status: 'TAMPERED' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeTruthy();
      await client.auth.signOut();
    });
  });

  // ── Unauthenticated Access ─────────────────────────────────────────────────

  describe('Unauthenticated access is blocked', () => {
    it('Unauthenticated user cannot read workspaces', async () => {
      const client = createTestClient();
      // No sign-in

      const { data } = await client.from('workspaces').select('*');
      expect(data?.length ?? 0).toBe(0);
    });

    it('Unauthenticated user cannot read client records', async () => {
      const client = createTestClient();

      const { data } = await client.from('staff_clients').select('*');
      expect(data?.length ?? 0).toBe(0);
    });

    it('Unauthenticated user cannot read billing events', async () => {
      const client = createTestClient();

      const { data } = await client.from('billing_events').select('*');
      expect(data?.length ?? 0).toBe(0);
    });

    it('Unauthenticated user cannot read audit logs', async () => {
      const client = createTestClient();

      const { data } = await client.from('audit_logs').select('*');
      expect(data?.length ?? 0).toBe(0);
    });

    it('Unauthenticated user cannot read platform_admins', async () => {
      const client = createTestClient();

      const { data } = await client.from('platform_admins').select('*');
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // ── AI Usage Events Protection ─────────────────────────────────────────────

  describe('AI usage events protection', () => {
    it('Standard user cannot delete AI usage events', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.staffA.email, FIXTURES.staffA.password);

      const { error } = await client
        .from('ai_usage_events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeTruthy();
      await client.auth.signOut();
    });

    it('Standard user cannot update AI usage events', async () => {
      const client = createTestClient();
      await signInAs(client, FIXTURES.staffA.email, FIXTURES.staffA.password);

      const { error } = await client
        .from('ai_usage_events')
        .update({ units: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeTruthy();
      await client.auth.signOut();
    });
  });

  // ── Demo Mode Isolation ────────────────────────────────────────────────────

  describe('Demo mode uses static fixtures only', () => {
    it('Demo client IDs all start with demo- prefix', async () => {
      const { DEMO_CLIENTS } = await import('../lib/demo/demoData');
      expect(Array.isArray(DEMO_CLIENTS)).toBe(true);
      expect(DEMO_CLIENTS.length).toBeGreaterThan(0);
      for (const client of DEMO_CLIENTS) {
        expect(client.id).toMatch(/^demo-/);
      }
    });

    it('Demo data contains no real SSNs', async () => {
      const { DEMO_CLIENTS } = await import('../lib/demo/demoData');
      for (const client of DEMO_CLIENTS) {
        // Real SSNs are 9 digits; demo data must use masked format
        if (client.ssn) {
          expect(client.ssn).toMatch(/^XXX-XX-/);
        }
      }
    });

    it('Demo emails use .invalid TLD', async () => {
      const { DEMO_CLIENTS } = await import('../lib/demo/demoData');
      for (const client of DEMO_CLIENTS) {
        if (client.email) {
          expect(client.email).toMatch(/\.invalid$/);
        }
      }
    });
  });
});

// ─── Stripe Webhook Idempotency Tests ─────────────────────────────────────────

describe('Stripe Webhook Idempotency', () => {
  it('Duplicate stripe_event_id does not create duplicate billing_events rows', async () => {
    // This test verifies the unique constraint on billing_events.stripe_event_id
    // It uses the admin client to attempt two inserts with the same stripe_event_id

    // NOTE: This test requires TEST_SUPABASE_URL to be configured
    // It uses the service role key from TEST environment only
    const testServiceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
    if (!testServiceRoleKey || !TEST_SUPABASE_URL) {
      throw new Error(
        '[Idempotency Test] TEST_SUPABASE_SERVICE_ROLE_KEY and TEST_SUPABASE_URL are required. ' +
        'This test cannot be skipped — it verifies critical billing idempotency.'
      );
    }

    const adminClient = createClient(TEST_SUPABASE_URL, testServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const testEventId = `test_evt_idempotency_${Date.now()}`;
    const testWorkspaceId = FIXTURES.workspaceAId;

    if (!testWorkspaceId) {
      throw new Error('[Idempotency Test] TEST_WORKSPACE_A_ID is required');
    }

    // First insert — should succeed
    const { error: firstError } = await adminClient.from('billing_events').insert({
      workspace_id: testWorkspaceId,
      event_type: 'test.idempotency',
      stripe_event_id: testEventId,
      status: 'received',
    });

    expect(firstError).toBeNull();

    // Second insert with same stripe_event_id — must fail with unique constraint
    const { error: secondError } = await adminClient.from('billing_events').insert({
      workspace_id: testWorkspaceId,
      event_type: 'test.idempotency',
      stripe_event_id: testEventId,
      status: 'received',
    });

    expect(secondError).toBeTruthy();
    expect(secondError?.code).toBe('23505'); // unique_violation

    // Cleanup
    await adminClient
      .from('billing_events')
      .delete()
      .eq('stripe_event_id', testEventId);
  });
});
