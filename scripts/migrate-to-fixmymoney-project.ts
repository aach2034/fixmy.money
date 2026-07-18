#!/usr/bin/env tsx
/**
 * FixMy.Money Data Migration Script
 *
 * SOURCE (Partix project — DO NOT MODIFY):  qpgkbbtamfnodbbcqykd
 * DESTINATION (FixMy.Money production):     agxzfdyvewptjwdfuvwq
 *
 * This script migrates all FixMy.Money-owned data from the Partix project
 * to the correct FixMy.Money production project.
 *
 * PREREQUISITES:
 *   1. Set SOURCE_SUPABASE_URL and SOURCE_SERVICE_ROLE_KEY in environment
 *   2. Set DEST_SUPABASE_URL and DEST_SERVICE_ROLE_KEY in environment
 *   3. Apply all migrations to destination project first:
 *      supabase db push --project-ref agxzfdyvewptjwdfuvwq
 *   4. Run auth user migration first (see migrate-auth-users.ts)
 *   5. Have user ID mapping file ready (see output of migrate-auth-users.ts)
 *
 * USAGE:
 *   npx tsx scripts/migrate-to-fixmymoney-project.ts
 *   npx tsx scripts/migrate-to-fixmymoney-project.ts --dry-run
 *   npx tsx scripts/migrate-to-fixmymoney-project.ts --table=staff_clients
 *
 * SAFETY:
 *   - Read-only access to source project
 *   - Idempotent: uses ON CONFLICT DO NOTHING
 *   - Dry-run mode available
 *   - Does NOT delete source data
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ──────────────────────────────────────────────────────────

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY;
const DEST_URL = process.env.DEST_SUPABASE_URL;
const DEST_KEY = process.env.DEST_SERVICE_ROLE_KEY;

const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_TABLE = process.argv.find((a) => a.startsWith('--table='))?.split('=')[1];

// ─── User ID Mapping ─────────────────────────────────────────────────────────
// After auth users are migrated, load the mapping file produced by migrate-auth-users.ts
// Format: { "old_uuid": "new_uuid", ... }

let userIdMap: Record<string, string> = {};

function loadUserIdMap(): void {
  const mapPath = path.join(process.cwd(), 'migration-artifacts', 'user-id-map.json');
  if (fs.existsSync(mapPath)) {
    userIdMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    console.log(`✅ Loaded ${Object.keys(userIdMap).length} user ID mappings`);
  } else {
    console.warn('⚠️  No user-id-map.json found. User ID remapping will be skipped.');
    console.warn('   Run migrate-auth-users.ts first, then re-run this script.');
  }
}

function remapUserId(oldId: string | null | undefined): string | null {
  if (!oldId) return null;
  return userIdMap[oldId] ?? oldId; // Fall back to original if no mapping
}

// ─── Migration Result Tracking ───────────────────────────────────────────────

interface TableResult {
  table: string;
  sourceRows: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const results: TableResult[] = [];

function logResult(r: TableResult): void {
  const status = r.failed > 0 ? '❌' : r.skipped > 0 ? '⚠️ ' : '✅';
  console.log(
    `${status} ${r.table}: source=${r.sourceRows} migrated=${r.migrated} skipped=${r.skipped} failed=${r.failed}`
  );
  if (r.errors.length > 0) {
    r.errors.forEach((e) => console.error(`   Error: ${e}`));
  }
}

// ─── Generic Table Migration ─────────────────────────────────────────────────

async function migrateTable(
  src: SupabaseClient,
  dest: SupabaseClient,
  tableName: string,
  userIdFields: string[] = [],
  batchSize = 100
): Promise<TableResult> {
  const result: TableResult = {
    table: tableName,
    sourceRows: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log(`\n📦 Migrating ${tableName}...`);

  // Count source rows
  const { count } = await src.from(tableName).select('*', { count: 'exact', head: true });
  result.sourceRows = count ?? 0;

  if (result.sourceRows === 0) {
    console.log(`   (empty — skipping)`);
    return result;
  }

  // Paginate through source
  let offset = 0;
  while (offset < result.sourceRows) {
    const { data, error } = await src
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error) {
      result.errors.push(`Read error at offset ${offset}: ${error.message}`);
      result.failed += batchSize;
      offset += batchSize;
      continue;
    }

    if (!data || data.length === 0) break;

    // Remap user IDs
    const remapped = data.map((row: Record<string, unknown>) => {
      const r = { ...row };
      for (const field of userIdFields) {
        if (r[field]) {
          r[field] = remapUserId(r[field] as string);
        }
      }
      return r;
    });

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would insert ${remapped.length} rows`);
      result.migrated += remapped.length;
    } else {
      const { error: insertError, data: inserted } = await dest
        .from(tableName)
        .upsert(remapped, { onConflict: 'id', ignoreDuplicates: true })
        .select();

      if (insertError) {
        result.errors.push(`Insert error at offset ${offset}: ${insertError.message}`);
        result.failed += remapped.length;
      } else {
        result.migrated += inserted?.length ?? 0;
        result.skipped += remapped.length - (inserted?.length ?? 0);
      }
    }

    offset += batchSize;
  }

  return result;
}

// ─── Main Migration ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  FixMy.Money Data Migration');
  console.log('  Source:      qpgkbbtamfnodbbcqykd (Partix project)');
  console.log('  Destination: agxzfdyvewptjwdfuvwq (FixMy.Money production)');
  if (DRY_RUN) console.log('  MODE: DRY RUN — no data will be written');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Validate environment
  if (!SOURCE_URL || !SOURCE_KEY) {
    console.error('❌ SOURCE_SUPABASE_URL and SOURCE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }
  if (!DEST_URL || !DEST_KEY) {
    console.error('❌ DEST_SUPABASE_URL and DEST_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  // Safety check: destination must be agxzfdyvewptjwdfuvwq
  if (!DEST_URL.includes('agxzfdyvewptjwdfuvwq')) {
    console.error('❌ DEST_SUPABASE_URL does not point to agxzfdyvewptjwdfuvwq');
    console.error('   This script will only write to the confirmed FixMy.Money project.');
    process.exit(1);
  }

  // Safety check: source must be qpgkbbtamfnodbbcqykd
  if (!SOURCE_URL.includes('qpgkbbtamfnodbbcqykd')) {
    console.error('❌ SOURCE_SUPABASE_URL does not point to qpgkbbtamfnodbbcqykd');
    process.exit(1);
  }

  const src = createClient(SOURCE_URL, SOURCE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const dest = createClient(DEST_URL, DEST_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  loadUserIdMap();

  // ─── Migration order (respects foreign key dependencies) ──────────────────

  const tables: Array<{ name: string; userIdFields: string[] }> = [
    // 1. user_profiles — must come first (referenced by everything)
    { name: 'user_profiles', userIdFields: ['id'] },
    // 2. workspaces
    { name: 'workspaces', userIdFields: ['owner_id'] },
    // 3. state_compliance_configs (seed data, no user FKs)
    { name: 'state_compliance_configs', userIdFields: [] },
    // 4. staff_clients
    { name: 'staff_clients', userIdFields: ['owner_id'] },
    // 5. client_accounts
    { name: 'client_accounts', userIdFields: [] },
    // 6. credit_report_uploads
    { name: 'credit_report_uploads', userIdFields: ['user_id'] },
    // 7. credit_report_analyses
    { name: 'credit_report_analyses', userIdFields: ['user_id'] },
    // 8. dispute_letters
    { name: 'dispute_letters', userIdFields: ['owner_id'] },
    // 9. client_disputes
    { name: 'client_disputes', userIdFields: ['owner_id'] },
    // 10. dispute_timeline_events
    { name: 'dispute_timeline_events', userIdFields: [] },
    // 11. client_updates
    { name: 'client_updates', userIdFields: [] },
    // 12. client_documents
    { name: 'client_documents', userIdFields: [] },
    // 13. dispute_recommendations
    { name: 'dispute_recommendations', userIdFields: ['user_id'] },
    // 14. dashboard_metrics
    { name: 'dashboard_metrics', userIdFields: ['owner_id'] },
    // 15. disputes_by_bureau
    { name: 'disputes_by_bureau', userIdFields: ['owner_id'] },
    // 16. chat_conversations
    { name: 'chat_conversations', userIdFields: ['specialist_id'] },
    // 17. chat_messages
    { name: 'chat_messages', userIdFields: [] },
    // 18. leads
    { name: 'leads', userIdFields: ['owner_id'] },
    // 19. compliance_disclosures
    { name: 'compliance_disclosures', userIdFields: ['owner_id'] },
    // 20. croa_contracts
    { name: 'croa_contracts', userIdFields: ['owner_id'] },
    // 21. cancellation_periods
    { name: 'cancellation_periods', userIdFields: ['owner_id'] },
    // 22. audit_logs
    { name: 'audit_logs', userIdFields: ['owner_id'] },
    // 23. consumer_services
    { name: 'consumer_services', userIdFields: ['owner_id'] },
    // 24. consumer_contracts
    { name: 'consumer_contracts', userIdFields: ['owner_id'] },
    // 25. consumer_disclosures
    { name: 'consumer_disclosures', userIdFields: ['owner_id'] },
    // 26. compliance_overrides
    { name: 'compliance_overrides', userIdFields: ['owner_id'] },
    // 27. launch_directories
    { name: 'launch_directories', userIdFields: ['user_id'] },
    // 28. outreach_targets
    { name: 'outreach_targets', userIdFields: ['user_id'] },
    // 29. social_posts
    { name: 'social_posts', userIdFields: ['user_id'] },
    // 30. utm_tracking
    { name: 'utm_tracking', userIdFields: ['user_id'] },
    // 31. billing_events (empty — migrate for completeness)
    { name: 'billing_events', userIdFields: [] },
  ];

  const tablesToRun = SINGLE_TABLE
    ? tables.filter((t) => t.name === SINGLE_TABLE)
    : tables;

  if (SINGLE_TABLE && tablesToRun.length === 0) {
    console.error(`❌ Table "${SINGLE_TABLE}" not found in migration list`);
    process.exit(1);
  }

  for (const { name, userIdFields } of tablesToRun) {
    const result = await migrateTable(src, dest, name, userIdFields);
    results.push(result);
    logResult(result);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  let totalSource = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const r of results) {
    totalSource += r.sourceRows;
    totalMigrated += r.migrated;
    totalSkipped += r.skipped;
    totalFailed += r.failed;
  }

  console.log(`Total source rows:  ${totalSource}`);
  console.log(`Total migrated:     ${totalMigrated}`);
  console.log(`Total skipped:      ${totalSkipped}`);
  console.log(`Total failed:       ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\n❌ Migration completed with errors. Review failed rows above.');
    process.exit(1);
  } else {
    console.log('\n✅ Migration completed successfully.');
    if (DRY_RUN) {
      console.log('   This was a dry run. Re-run without --dry-run to apply changes.');
    }
  }

  // Save results to file
  const artifactsDir = path.join(process.cwd(), 'migration-artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  const reportPath = path.join(artifactsDir, `migration-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), dryRun: DRY_RUN, results }, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
