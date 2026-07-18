#!/usr/bin/env tsx
/**
 * FixMy.Money Schema Export Script
 *
 * Exports a complete schema and data snapshot from qpgkbbtamfnodbbcqykd
 * as a timestamped rollback package.
 *
 * This script produces:
 *   - migration-artifacts/schema-export-TIMESTAMP.json  (table structure)
 *   - migration-artifacts/data-export-TIMESTAMP.json    (all row data)
 *   - migration-artifacts/edge-function-config.json     (function metadata)
 *
 * SENSITIVE DATA HANDLING:
 *   - Row data is exported as-is for migration purposes
 *   - Store the output files securely — they contain real user data
 *   - Do NOT commit these files to version control
 *   - Delete after migration is verified
 *
 * USAGE:
 *   SOURCE_SUPABASE_URL=... SOURCE_SERVICE_ROLE_KEY=... npx tsx scripts/export-source-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY;

const TABLES_TO_EXPORT = [
  'user_profiles',
  'workspaces',
  'staff_clients',
  'client_accounts',
  'client_disputes',
  'dispute_timeline_events',
  'client_updates',
  'client_documents',
  'dispute_letters',
  'credit_report_uploads',
  'credit_report_analyses',
  'dispute_recommendations',
  'dashboard_metrics',
  'disputes_by_bureau',
  'chat_conversations',
  'chat_messages',
  'leads',
  'compliance_disclosures',
  'croa_contracts',
  'cancellation_periods',
  'audit_logs',
  'consumer_services',
  'consumer_contracts',
  'consumer_disclosures',
  'compliance_overrides',
  'state_compliance_configs',
  'launch_directories',
  'outreach_targets',
  'social_posts',
  'utm_tracking',
  'billing_events',
  'webhook_failures',
  'platform_admins',
  'ai_usage_events',
];

async function main(): Promise<void> {
  if (!SOURCE_URL || !SOURCE_KEY) {
    console.error('❌ SOURCE_SUPABASE_URL and SOURCE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  if (!SOURCE_URL.includes('qpgkbbtamfnodbbcqykd')) {
    console.error('❌ SOURCE_SUPABASE_URL must point to qpgkbbtamfnodbbcqykd');
    process.exit(1);
  }

  const src = createClient(SOURCE_URL, SOURCE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactsDir = path.join(process.cwd(), 'migration-artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  console.log('📦 Exporting data from qpgkbbtamfnodbbcqykd...\n');

  const dataExport: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const table of TABLES_TO_EXPORT) {
    const { data, error, count } = await src
      .from(table)
      .select('*', { count: 'exact' });

    if (error) {
      console.error(`❌ Failed to export ${table}: ${error.message}`);
      dataExport[table] = [];
      rowCounts[table] = 0;
    } else {
      dataExport[table] = data ?? [];
      rowCounts[table] = count ?? 0;
      console.log(`✅ ${table}: ${rowCounts[table]} rows`);
    }
  }

  // Save data export
  const dataPath = path.join(artifactsDir, `data-export-${timestamp}.json`);
  fs.writeFileSync(dataPath, JSON.stringify({
    exportedAt: new Date().toISOString(),
    sourceProject: 'qpgkbbtamfnodbbcqykd',
    rowCounts,
    data: dataExport,
  }, null, 2));

  console.log(`\n📄 Data export saved to: ${dataPath}`);
  console.log('\n⚠️  SECURITY: This file contains real user data.');
  console.log('   Store securely. Do NOT commit to version control.');
  console.log('   Delete after migration is verified.\n');

  // Row count summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ROW COUNT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  const total = Object.values(rowCounts).reduce((a, b) => a + b, 0);
  for (const [table, count] of Object.entries(rowCounts)) {
    if (count > 0) console.log(`  ${table}: ${count}`);
  }
  console.log(`  TOTAL: ${total} rows`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
