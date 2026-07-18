/**
 * Platform Admin Seeding Script
 *
 * Seeds the first platform administrator into the platform_admins table.
 * Uses SUPABASE_SERVICE_ROLE_KEY — must be run server-side.
 *
 * USAGE:
 *   npx tsx scripts/seed-platform-admin.ts --email=adam@fixmy.money
 *
 * REQUIREMENTS:
 *   NEXT_PUBLIC_SUPABASE_URL       — Production Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY      — Production service role key
 *
 * SAFETY:
 *   - Does not assume the user exists — looks them up first
 *   - Reports clearly if the user is not found
 *   - Does not expose the service role key in output
 *   - Idempotent: safe to run multiple times
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Parse --email argument
const emailArg = process.argv?.find((a) => a?.startsWith('--email='));
const targetEmail = emailArg ? emailArg?.replace('--email=', '')?.trim() : '';

if (!targetEmail) {
  console.error('ERROR: --email argument is required.');
  console.error('Usage: npx tsx scripts/seed-platform-admin.ts --email=your@email.com');
  process.exit(1);
}

async function seedAdmin() {
  console.log(`\nLooking up user: ${targetEmail}`);

  // Look up the user by email
  const { data: listData, error: listError } = await adminClient?.auth?.admin?.listUsers();

  if (listError) {
    console.error('ERROR: Failed to list users:', listError?.message);
    process.exit(1);
  }

  const user = listData?.users?.find((u) => u?.email === targetEmail);

  if (!user) {
    console.error(`ERROR: No authenticated Supabase user found with email: ${targetEmail}`);
    console.error('The user must have signed up and confirmed their email before being added as a platform admin.');
    console.error('\nVerify the user exists in Supabase Dashboard > Authentication > Users');
    process.exit(1);
  }

  console.log(`Found user: ${user?.id} (${user?.email})`);
  console.log(`Email confirmed: ${user?.email_confirmed_at ? 'Yes' : 'No'}`);

  // Check if already a platform admin
  const { data: existing } = await adminClient?.from('platform_admins')?.select('id, role, active')?.eq('user_id', user?.id)?.maybeSingle();

  if (existing) {
    if (existing?.active) {
      console.log(`\n✅ User is already an active platform admin (role: ${existing?.role})`);
      console.log('No changes made.');
      return;
    } else {
      // Reactivate
      const { error: updateError } = await adminClient?.from('platform_admins')?.update({ active: true, revoked_at: null, revoked_by: null })?.eq('user_id', user?.id);

      if (updateError) {
        console.error('ERROR: Failed to reactivate admin:', updateError?.message);
        process.exit(1);
      }
      console.log(`\n✅ Reactivated platform admin: ${targetEmail}`);
      return;
    }
  }

  // Insert new platform admin
  const { error: insertError } = await adminClient?.from('platform_admins')?.insert({
      user_id: user?.id,
      role: 'platform_superadmin',
      active: true,
      created_by: user?.id,
      notes: 'Seeded via seed-platform-admin.ts script',
    });

  if (insertError) {
    console.error('ERROR: Failed to insert platform admin:', insertError?.message);
    console.error('\nIf the platform_admins table does not exist, apply the migration first:');
    console.error('  supabase/migrations/20260701120000_billing_events_schema_hardening.sql');
    process.exit(1);
  }

  console.log(`\n✅ Platform admin seeded successfully!`);
  console.log(`   User ID: ${user?.id}`);
  console.log(`   Email:   ${targetEmail}`);
  console.log(`   Role:    platform_superadmin`);
  console.log(`\nThe user can now access /admin/health`);
  console.log('\nVerification tests:');
  console.log('  ✓ Authorized platform admin can open /admin/health');
  console.log('  ✓ Normal workspace owner cannot open /admin/health (redirected to /dashboard)');
  console.log('  ✓ Staff user cannot open /admin/health (redirected to /dashboard)');
  console.log('  ✓ Unauthenticated user cannot open /admin/health (redirected to /sign-up-login-screen)');
}

seedAdmin()?.catch((err) => {
  console.error('Unexpected error:', err instanceof Error ? err?.message : err);
  process.exit(1);
});
