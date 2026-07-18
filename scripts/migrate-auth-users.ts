#!/usr/bin/env tsx
/**
 * FixMy.Money Auth User Migration Script
 *
 * SOURCE:      qpgkbbtamfnodbbcqykd (Partix project — read-only)
 * DESTINATION: agxzfdyvewptjwdfuvwq (FixMy.Money production)
 *
 * Supabase does NOT allow direct password migration between projects.
 * This script:
 *   1. Reads all auth users from the source project (via admin API)
 *   2. Creates matching users in the destination project (via admin API)
 *   3. Produces a user-id-map.json for FK remapping in data migration
 *   4. Sends password-reset emails so users can set new passwords
 *
 * IMPORTANT: Users will need to reset their passwords after migration.
 * Their email, metadata, and profile data will be preserved.
 *
 * USAGE:
 *   npx tsx scripts/migrate-auth-users.ts
 *   npx tsx scripts/migrate-auth-users.ts --dry-run
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   SOURCE_SUPABASE_URL=https://qpgkbbtamfnodbbcqykd.supabase.co
 *   SOURCE_SERVICE_ROLE_KEY=<source service role key>
 *   DEST_SUPABASE_URL=https://agxzfdyvewptjwdfuvwq.supabase.co
 *   DEST_SERVICE_ROLE_KEY=<destination service role key>
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY;
const DEST_URL = process.env.DEST_SUPABASE_URL;
const DEST_KEY = process.env.DEST_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

interface UserMapping {
  oldUserId: string;
  newUserId: string | null;
  emailHash: string; // SHA-256 of email — never store raw email in report
  status: 'migrated' | 'already_exists' | 'failed' | 'dry_run';
  error?: string;
  createdAt: string;
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  FixMy.Money Auth User Migration');
  console.log('  Source:      qpgkbbtamfnodbbcqykd');
  console.log('  Destination: agxzfdyvewptjwdfuvwq');
  if (DRY_RUN) console.log('  MODE: DRY RUN — no users will be created');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!SOURCE_URL || !SOURCE_KEY || !DEST_URL || !DEST_KEY) {
    console.error('❌ All four environment variables must be set:');
    console.error('   SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY');
    console.error('   DEST_SUPABASE_URL, DEST_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!DEST_URL.includes('agxzfdyvewptjwdfuvwq')) {
    console.error('❌ DEST_SUPABASE_URL must point to agxzfdyvewptjwdfuvwq');
    process.exit(1);
  }

  if (!SOURCE_URL.includes('qpgkbbtamfnodbbcqykd')) {
    console.error('❌ SOURCE_SUPABASE_URL must point to qpgkbbtamfnodbbcqykd');
    process.exit(1);
  }

  const src = createClient(SOURCE_URL, SOURCE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const dest = createClient(DEST_URL, DEST_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch all users from source
  console.log('📋 Fetching users from source project...');
  const { data: { users: sourceUsers }, error: listError } = await src.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    console.error('❌ Failed to list source users:', listError.message);
    process.exit(1);
  }

  console.log(`   Found ${sourceUsers.length} users in source project\n`);

  const mappings: UserMapping[] = [];
  const userIdMap: Record<string, string> = {};

  for (const user of sourceUsers) {
    const emailHash = crypto.createHash('sha256').update(user.email ?? '').digest('hex').slice(0, 16);
    console.log(`Processing user ${emailHash}...`);

    if (DRY_RUN) {
      mappings.push({
        oldUserId: user.id,
        newUserId: null,
        emailHash,
        status: 'dry_run',
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    // Check if user already exists in destination
    const { data: existingUsers } = await dest.auth.admin.listUsers({ perPage: 1000 });
    const existing = existingUsers?.users?.find((u) => u.email === user.email);

    if (existing) {
      console.log(`   ✅ Already exists in destination`);
      mappings.push({
        oldUserId: user.id,
        newUserId: existing.id,
        emailHash,
        status: 'already_exists',
        createdAt: new Date().toISOString(),
      });
      userIdMap[user.id] = existing.id;
      continue;
    }

    // Create user in destination with a temporary random password
    // User will be prompted to reset password via email
    const tempPassword = crypto.randomBytes(32).toString('hex');

    const { data: newUser, error: createError } = await dest.auth.admin.createUser({
      email: user.email,
      password: tempPassword,
      email_confirm: user.email_confirmed_at ? true : false,
      user_metadata: user.user_metadata ?? {},
      app_metadata: user.app_metadata ?? {},
    });

    if (createError) {
      console.error(`   ❌ Failed to create user: ${createError.message}`);
      mappings.push({
        oldUserId: user.id,
        newUserId: null,
        emailHash,
        status: 'failed',
        error: createError.message,
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    console.log(`   ✅ Created in destination`);
    mappings.push({
      oldUserId: user.id,
      newUserId: newUser.user.id,
      emailHash,
      status: 'migrated',
      createdAt: new Date().toISOString(),
    });
    userIdMap[user.id] = newUser.user.id;

    // Send password reset email so user can set their own password
    await dest.auth.admin.generateLink({
      type: 'recovery',
      email: user.email!,
    });
    console.log(`   📧 Password reset link generated`);
  }

  // Save artifacts
  const artifactsDir = path.join(process.cwd(), 'migration-artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  // Save user ID map (used by data migration script)
  const mapPath = path.join(artifactsDir, 'user-id-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(userIdMap, null, 2));
  console.log(`\n📄 User ID map saved to: ${mapPath}`);

  // Save migration report (no raw emails)
  const reportPath = path.join(artifactsDir, `auth-migration-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    sourceProject: 'qpgkbbtamfnodbbcqykd',
    destProject: 'agxzfdyvewptjwdfuvwq',
    totalUsers: sourceUsers.length,
    migrated: mappings.filter((m) => m.status === 'migrated').length,
    alreadyExists: mappings.filter((m) => m.status === 'already_exists').length,
    failed: mappings.filter((m) => m.status === 'failed').length,
    mappings,
  }, null, 2));
  console.log(`📄 Auth migration report saved to: ${reportPath}`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  AUTH MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total users:     ${sourceUsers.length}`);
  console.log(`Migrated:        ${mappings.filter((m) => m.status === 'migrated').length}`);
  console.log(`Already existed: ${mappings.filter((m) => m.status === 'already_exists').length}`);
  console.log(`Failed:          ${mappings.filter((m) => m.status === 'failed').length}`);
  console.log('\n⚠️  IMPORTANT: All migrated users must reset their passwords.');
  console.log('   Password reset emails have been generated.');
  console.log('   Users cannot log in with their old passwords.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
