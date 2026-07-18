-- ============================================================
-- FIXMY.MONEY CLEANUP SCRIPT FOR qpgkbbtamfnodbbcqykd (Partix project)
-- Generated: 2026-07-01
-- 
-- ⚠️  DO NOT EXECUTE THIS SCRIPT AUTOMATICALLY.
-- ⚠️  PREREQUISITES BEFORE RUNNING:
--     1. FixMy.Money is fully verified on agxzfdyvewptjwdfuvwq
--     2. All data has been migrated and row counts verified
--     3. Full schema + data backup of qpgkbbtamfnodbbcqykd exists
--     4. Partix regression tests pass (confirming Partix does not use these tables)
--     5. Auth users have been migrated and can log in on new project
--     6. Stripe webhooks are writing to agxzfdyvewptjwdfuvwq
--     7. Edge function send-email is deployed on agxzfdyvewptjwdfuvwq
--
-- ROLLBACK: Restore from backup taken in step 3 above.
-- ============================================================

-- ─── STEP 1: Verify this is the correct project ────────────────────────────
-- Run this SELECT first. If it returns rows, you are on the wrong project.
-- Expected: 0 rows (no Partix automotive tables should exist)
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('vehicles', 'parts', 'garage', 'vin_lookups', 'shops', 'orders')
-- ORDER BY table_name;

-- ─── STEP 2: Verify FixMy.Money data has been migrated ─────────────────────
-- Run these SELECTs before dropping. Confirm destination counts match.
-- SELECT 'user_profiles' AS tbl, COUNT(*) FROM public.user_profiles
-- UNION ALL SELECT 'staff_clients', COUNT(*) FROM public.staff_clients
-- UNION ALL SELECT 'dispute_letters', COUNT(*) FROM public.dispute_letters
-- UNION ALL SELECT 'client_accounts', COUNT(*) FROM public.client_accounts
-- UNION ALL SELECT 'client_disputes', COUNT(*) FROM public.client_disputes;

-- ─── STEP 3: Drop tables in reverse dependency order ───────────────────────

-- Tier 5: Leaf tables (no dependents)
DROP TABLE IF EXISTS public.ai_usage_events CASCADE;
-- Evidence: FixMy.Money-owned (AI usage tracking). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.platform_admins CASCADE;
-- Evidence: FixMy.Money-owned (admin auth). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.webhook_failures CASCADE;
-- Evidence: FixMy.Money-owned (Stripe webhook failures). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.billing_events CASCADE;
-- Evidence: FixMy.Money-owned (Stripe billing). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.compliance_overrides CASCADE;
-- Evidence: FixMy.Money-owned (CROA compliance). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.consumer_disclosures CASCADE;
-- Evidence: FixMy.Money-owned (CROA disclosures). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.consumer_contracts CASCADE;
-- Evidence: FixMy.Money-owned (CROA contracts). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.consumer_services CASCADE;
-- Evidence: FixMy.Money-owned (CROA services). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.state_compliance_configs CASCADE;
-- Evidence: FixMy.Money-owned (state compliance seed data). Row count: 6. No Partix dependency.

DROP TABLE IF EXISTS public.utm_tracking CASCADE;
-- Evidence: FixMy.Money-owned (UTM analytics). Row count: 15. No Partix dependency.

DROP TABLE IF EXISTS public.social_posts CASCADE;
-- Evidence: FixMy.Money-owned (social media). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.outreach_targets CASCADE;
-- Evidence: FixMy.Money-owned (PR outreach). Row count: 20. No Partix dependency.

DROP TABLE IF EXISTS public.launch_directories CASCADE;
-- Evidence: FixMy.Money-owned (launch directories). Row count: 37. No Partix dependency.

DROP TABLE IF EXISTS public.audit_logs CASCADE;
-- Evidence: FixMy.Money-owned (CROA audit trail). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.cancellation_periods CASCADE;
-- Evidence: FixMy.Money-owned (CROA cancellation). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.croa_contracts CASCADE;
-- Evidence: FixMy.Money-owned (CROA contracts). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.compliance_disclosures CASCADE;
-- Evidence: FixMy.Money-owned (CROA disclosures). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.leads CASCADE;
-- Evidence: FixMy.Money-owned (CRM leads). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.chat_messages CASCADE;
-- Evidence: FixMy.Money-owned (live chat). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.chat_conversations CASCADE;
-- Evidence: FixMy.Money-owned (live chat). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.dispute_recommendations CASCADE;
-- Evidence: FixMy.Money-owned (AI dispute recommendations). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.client_documents CASCADE;
-- Evidence: FixMy.Money-owned (client documents). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.client_updates CASCADE;
-- Evidence: FixMy.Money-owned (client updates). Row count: 3. Verify migrated.

DROP TABLE IF EXISTS public.dispute_timeline_events CASCADE;
-- Evidence: FixMy.Money-owned (dispute timeline). Row count: 7. Verify migrated.

DROP TABLE IF EXISTS public.disputes_by_bureau CASCADE;
-- Evidence: FixMy.Money-owned (bureau analytics). Row count: 6. Verify migrated.

DROP TABLE IF EXISTS public.dashboard_metrics CASCADE;
-- Evidence: FixMy.Money-owned (dashboard). Row count: 1. Verify migrated.

DROP TABLE IF EXISTS public.credit_report_analyses CASCADE;
-- Evidence: FixMy.Money-owned (AI analysis). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.credit_report_uploads CASCADE;
-- Evidence: FixMy.Money-owned (credit reports). Row count: 1. Verify migrated.

DROP TABLE IF EXISTS public.client_disputes CASCADE;
-- Evidence: FixMy.Money-owned (disputes). Row count: 2. Verify migrated.

DROP TABLE IF EXISTS public.client_accounts CASCADE;
-- Evidence: FixMy.Money-owned (client portal). Row count: 1. Verify migrated.

DROP TABLE IF EXISTS public.dispute_letters CASCADE;
-- Evidence: FixMy.Money-owned (dispute letters). Row count: 12. Verify migrated.

DROP TABLE IF EXISTS public.staff_clients CASCADE;
-- Evidence: FixMy.Money-owned (CRM clients). Row count: 15. Verify migrated.

DROP TABLE IF EXISTS public.workspaces CASCADE;
-- Evidence: FixMy.Money-owned (workspace management). Row count: 0. No Partix dependency.

DROP TABLE IF EXISTS public.user_profiles CASCADE;
-- Evidence: FixMy.Money-owned (user profiles). Row count: 12. Verify migrated.

-- ─── STEP 4: Drop custom ENUMs ─────────────────────────────────────────────

DROP TYPE IF EXISTS public.dispute_status CASCADE;
DROP TYPE IF EXISTS public.document_status CASCADE;
DROP TYPE IF EXISTS public.case_stage CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;
DROP TYPE IF EXISTS public.croa_pipeline_stage CASCADE;
DROP TYPE IF EXISTS public.upload_status CASCADE;
DROP TYPE IF EXISTS public.letter_status CASCADE;
DROP TYPE IF EXISTS public.negative_item_type CASCADE;
DROP TYPE IF EXISTS public.dispute_priority CASCADE;
DROP TYPE IF EXISTS public.directory_category CASCADE;
DROP TYPE IF EXISTS public.directory_status CASCADE;
DROP TYPE IF EXISTS public.outreach_status CASCADE;
DROP TYPE IF EXISTS public.lead_status CASCADE;
DROP TYPE IF EXISTS public.audit_action CASCADE;
DROP TYPE IF EXISTS public.contract_status CASCADE;

-- ─── STEP 5: Drop custom functions ─────────────────────────────────────────

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.specialist_owns_client(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.specialist_owns_dispute(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.specialist_owns_timeline_event(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.specialist_owns_client_update(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.specialist_owns_client_document(UUID) CASCADE;

-- ─── STEP 6: Drop auth trigger ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ─── STEP 7: Verify cleanup ────────────────────────────────────────────────
-- Run this after cleanup to confirm all FixMy.Money objects are removed.
-- Expected: 0 rows
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

-- ─── STEP 8: Edge function cleanup ─────────────────────────────────────────
-- The send-email edge function must be deleted via Supabase dashboard or CLI:
--   supabase functions delete send-email --project-ref qpgkbbtamfnodbbcqykd
-- Verify it is already deployed on agxzfdyvewptjwdfuvwq before deleting.

-- ─── STEP 9: Auth configuration cleanup ────────────────────────────────────
-- In Supabase dashboard for qpgkbbtamfnodbbcqykd:
--   - Remove https://fixmy.money from Site URL (if set)
--   - Remove https://fixmy.money/auth/callback from Redirect URLs
--   - Remove Google OAuth credentials (if FixMy.Money-specific)
-- Do NOT change Partix-specific auth settings.

-- ─── ROLLBACK INSTRUCTIONS ─────────────────────────────────────────────────
-- If cleanup causes issues:
--   1. Restore schema: psql $PARTIX_DB_URL < partix_schema_backup_YYYYMMDD.sql
--   2. Restore data:   psql $PARTIX_DB_URL < partix_data_backup_YYYYMMDD.sql
--   3. Redeploy edge function from backup
--   4. Restore auth configuration from recorded settings
