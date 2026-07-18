#!/usr/bin/env tsx
/**
 * Test Fixture Seeding Script
 *
 * Provisions deterministic test data for cross-tenant security tests.
 * Uses TEST_SUPABASE_* environment variables — NEVER production credentials.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 * Seed:     npx tsx scripts/seed-test-fixtures.ts
 * Teardown: npx tsx scripts/seed-test-fixtures.ts --teardown
 *
 * ─── REQUIRED ENV VARS ───────────────────────────────────────────────────────
 * TEST_SUPABASE_URL                — Test Supabase project URL
 * TEST_SUPABASE_SERVICE_ROLE_KEY   — Test service role key (NOT production)
 *
 * ─── OUTPUT ──────────────────────────────────────────────────────────────────
 * Prints TEST_WORKSPACE_A_ID, TEST_WORKSPACE_B_ID, and all test user credentials.
 * Copy these into your .env.test file before running the security tests.
 *
 * ─── SAFETY ──────────────────────────────────────────────────────────────────
 * This script refuses to run if TEST_SUPABASE_URL matches NEXT_PUBLIC_SUPABASE_URL.
 * It only creates users with @test.invalid email addresses.
 * All seeded data is tagged with the prefix 'test_fixture_' for easy cleanup.
 */

import { createClient } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const TEST_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const PRODUCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ─── Safety checks ────────────────────────────────────────────────────────────

if (!TEST_SUPABASE_URL || !TEST_SERVICE_ROLE_KEY) {
  console.error('ERROR: TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('These must point to a TEST environment, not production.');
  process.exit(1);
}

if (TEST_SUPABASE_URL === PRODUCTION_URL) {
  console.error('ERROR: TEST_SUPABASE_URL matches NEXT_PUBLIC_SUPABASE_URL (production).');
  console.error('Refusing to seed test fixtures into the production database.');
  process.exit(1);
}

const adminClient = createClient(TEST_SUPABASE_URL, TEST_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Fixture definitions ──────────────────────────────────────────────────────

const TEST_PASSWORD = 'TestFixture_2026!';

const FIXTURES = {
  ownerA: { email: 'owner-a@test.invalid', password: TEST_PASSWORD },
  ownerB: { email: 'owner-b@test.invalid', password: TEST_PASSWORD },
  staffA: { email: 'staff-a@test.invalid', password: TEST_PASSWORD },
  staffB: { email: 'staff-b@test.invalid', password: TEST_PASSWORD },
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding test fixtures...\n');

  const userIds: Record<string, string> = {};

  // Create test users
  for (const [key, fixture] of Object.entries(FIXTURES)) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: fixture.email,
      password: fixture.password,
      email_confirm: true,
    });

    if (error && error.message.includes('already registered')) {
      // User exists — look up their ID
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === fixture.email);
      if (existing) {
        userIds[key] = existing.id;
        console.log(`  ✓ User exists: ${fixture.email} (${existing.id})`);
      }
    } else if (error) {
      console.error(`  ✗ Failed to create ${fixture.email}:`, error.message);
      process.exit(1);
    } else if (data?.user) {
      userIds[key] = data.user.id;
      console.log(`  ✓ Created user: ${fixture.email} (${data.user.id})`);
    }
  }

  // Create workspaces
  const workspaceAName = 'test_fixture_workspace_a';
  const workspaceBName = 'test_fixture_workspace_b';

  let workspaceAId: string | null = null;
  let workspaceBId: string | null = null;

  // Workspace A
  const { data: existingA } = await adminClient
    .from('workspaces')
    .select('id')
    .eq('name', workspaceAName)
    .maybeSingle();

  if (existingA) {
    workspaceAId = existingA.id;
    console.log(`  ✓ Workspace A exists: ${workspaceAId}`);
  } else {
    const { data: wsA, error: wsAErr } = await adminClient
      .from('workspaces')
      .insert({ name: workspaceAName, owner_id: userIds.ownerA })
      .select('id')
      .single();

    if (wsAErr || !wsA) {
      console.error('  ✗ Failed to create Workspace A:', wsAErr?.message);
      process.exit(1);
    }
    workspaceAId = wsA.id;
    console.log(`  ✓ Created Workspace A: ${workspaceAId}`);
  }

  // Workspace B
  const { data: existingB } = await adminClient
    .from('workspaces')
    .select('id')
    .eq('name', workspaceBName)
    .maybeSingle();

  if (existingB) {
    workspaceBId = existingB.id;
    console.log(`  ✓ Workspace B exists: ${workspaceBId}`);
  } else {
    const { data: wsB, error: wsBErr } = await adminClient
      .from('workspaces')
      .insert({ name: workspaceBName, owner_id: userIds.ownerB })
      .select('id')
      .single();

    if (wsBErr || !wsB) {
      console.error('  ✗ Failed to create Workspace B:', wsBErr?.message);
      process.exit(1);
    }
    workspaceBId = wsB.id;
    console.log(`  ✓ Created Workspace B: ${workspaceBId}`);
  }

  // Seed clients for each workspace
  const clientsA = [
    { first_name: 'Test', last_name: 'Client_A1', email: 'client-a1@test.invalid', workspace_id: workspaceAId, owner_id: userIds.ownerA },
    { first_name: 'Test', last_name: 'Client_A2', email: 'client-a2@test.invalid', workspace_id: workspaceAId, owner_id: userIds.ownerA },
  ];
  const clientsB = [
    { first_name: 'Test', last_name: 'Client_B1', email: 'client-b1@test.invalid', workspace_id: workspaceBId, owner_id: userIds.ownerB },
    { first_name: 'Test', last_name: 'Client_B2', email: 'client-b2@test.invalid', workspace_id: workspaceBId, owner_id: userIds.ownerB },
  ];

  for (const client of [...clientsA, ...clientsB]) {
    const { error } = await adminClient
      .from('staff_clients')
      .upsert(client, { onConflict: 'email' });
    if (error) {
      console.warn(`  ⚠ Could not seed client ${client.email}: ${error.message}`);
    } else {
      console.log(`  ✓ Seeded client: ${client.email}`);
    }
  }

  // Seed audit log entries
  for (const wsId of [workspaceAId, workspaceBId]) {
    const { error } = await adminClient.from('audit_logs').insert({
      workspace_id: wsId,
      action: 'test_fixture_event',
      user_id: wsId === workspaceAId ? userIds.ownerA : userIds.ownerB,
      details: { test: true },
    });
    if (error) {
      console.warn(`  ⚠ Could not seed audit log for workspace ${wsId}: ${error.message}`);
    }
  }

  // Seed billing events
  for (const wsId of [workspaceAId, workspaceBId]) {
    const { error } = await adminClient.from('billing_events').insert({
      workspace_id: wsId,
      event_type: 'test.fixture',
      stripe_event_id: `test_evt_fixture_${wsId}_${Date.now()}`,
      status: 'received',
    });
    if (error) {
      console.warn(`  ⚠ Could not seed billing event for workspace ${wsId}: ${error.message}`);
    }
  }

  console.log('\n─── Test Environment Variables ──────────────────────────────');
  console.log('Add these to your .env.test file:\n');
  console.log(`TEST_SUPABASE_URL=${TEST_SUPABASE_URL}`);
  console.log(`TEST_SUPABASE_ANON_KEY=<your-test-anon-key>`);
  console.log(`TEST_SUPABASE_SERVICE_ROLE_KEY=<your-test-service-role-key>`);
  console.log(`TEST_OWNER_A_EMAIL=${FIXTURES.ownerA.email}`);
  console.log(`TEST_OWNER_A_PASSWORD=${TEST_PASSWORD}`);
  console.log(`TEST_OWNER_B_EMAIL=${FIXTURES.ownerB.email}`);
  console.log(`TEST_OWNER_B_PASSWORD=${TEST_PASSWORD}`);
  console.log(`TEST_STAFF_A_EMAIL=${FIXTURES.staffA.email}`);
  console.log(`TEST_STAFF_A_PASSWORD=${TEST_PASSWORD}`);
  console.log(`TEST_WORKSPACE_A_ID=${workspaceAId}`);
  console.log(`TEST_WORKSPACE_B_ID=${workspaceBId}`);
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('\nSeeding complete. Run tests with:');
  console.log('  npx vitest run src/__tests__/cross-tenant-security.test.ts\n');
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

async function teardown() {
  console.log('Removing test fixtures...\n');

  // Remove test clients
  const { error: clientsErr } = await adminClient
    .from('staff_clients')
    .delete()
    .like('email', '%@test.invalid');
  if (clientsErr) console.warn('  ⚠ Could not remove test clients:', clientsErr.message);
  else console.log('  ✓ Removed test clients');

  // Remove test billing events
  const { error: billingErr } = await adminClient
    .from('billing_events')
    .delete()
    .like('stripe_event_id', 'test_evt_%');
  if (billingErr) console.warn('  ⚠ Could not remove test billing events:', billingErr.message);
  else console.log('  ✓ Removed test billing events');

  // Remove test workspaces
  const { error: wsErr } = await adminClient
    .from('workspaces')
    .delete()
    .like('name', 'test_fixture_%');
  if (wsErr) console.warn('  ⚠ Could not remove test workspaces:', wsErr.message);
  else console.log('  ✓ Removed test workspaces');

  // Remove test users
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const testUsers = (listData?.users || []).filter((u) => u.email?.endsWith('@test.invalid'));

  for (const user of testUsers) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) console.warn(`  ⚠ Could not remove user ${user.email}:`, error.message);
    else console.log(`  ✓ Removed user: ${user.email}`);
  }

  console.log('\nTeardown complete.\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const isTeardown = process.argv.includes('--teardown');

if (isTeardown) {
  teardown().catch((err) => {
    console.error('Teardown failed:', err);
    process.exit(1);
  });
} else {
  seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
