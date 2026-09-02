BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(80);

CREATE OR REPLACE FUNCTION pg_temp.statement_raises(statement text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE statement;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.statement_lives(statement text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE statement;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Catalog and fixture integrity.
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
), 'every production-shaped public table has RLS');

SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND (
    roles::text = '{public}'
    OR regexp_replace(coalesce(qual, ''), '[()[:space:]]', '', 'g') = 'true'
    OR regexp_replace(coalesce(with_check, ''), '[()[:space:]]', '', 'g') = 'true'
  )
), 'no broad or implicit-PUBLIC public policy remains');

SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND cmd = 'UPDATE' AND with_check IS NULL
), 'every public UPDATE policy has WITH CHECK');

SELECT is((
  SELECT count(*) FROM information_schema.table_privileges
  WHERE table_schema = 'public' AND grantee = 'anon'
), 0::bigint, 'anon has no public table grants');

SELECT is((
  SELECT count(*) FROM information_schema.table_privileges
  WHERE table_schema = 'public' AND grantee = 'authenticated'
    AND privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER')
), 0::bigint, 'authenticated has no dangerous public table grants');

SELECT is((
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
), 0::bigint, 'no public view can bypass RLS');

SELECT is((
  SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
), 0::bigint, 'authenticated cannot directly execute public SECURITY DEFINER functions');

SELECT is((
  SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'private' AND p.proname LIKE 'specialist_owns_%'
), 6::bigint, 'six ownership helpers moved to private');

SELECT is((
  SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'private' AND p.proname LIKE 'specialist_owns_%'
    AND coalesce(array_to_string(p.proconfig, ','), '') <> 'search_path=""'
), 0::bigint, 'private ownership helpers have a fixed empty search_path');

SELECT ok(NOT has_schema_privilege('anon', 'private', 'USAGE'), 'anon cannot use private');
SELECT ok(has_schema_privilege('authenticated', 'private', 'USAGE'), 'authenticated can evaluate private RLS helpers');
SELECT is((SELECT count(*) FROM storage.buckets WHERE id = 'evidence-documents' AND public = false), 1::bigint, 'evidence bucket remains private');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND roles::text = '{authenticated}'), 4::bigint, 'storage owner policies remain intact');
SELECT is((SELECT count(*) FROM supabase_migrations.schema_migrations WHERE name LIKE 'fmm_003%'), 2::bigint, 'both FMM-003 forward migrations are recorded');
SELECT ok(to_regclass('public.workspace_members') IS NULL, 'workspace membership remains an explicit FMM-007 blocker');
SELECT is((SELECT count(*) FROM auth.users WHERE email LIKE '%@phase1b.invalid'), 6::bigint, 'six synthetic Auth users survived the upgrade');
SELECT is((SELECT count(*) FROM auth.identities WHERE identity_data ->> 'email' LIKE '%@phase1b.invalid'), 6::bigint, 'six synthetic identities survived the upgrade');
SELECT is((SELECT count(*) FROM public.product_analytics_events WHERE user_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000003',
  'd4000000-0000-0000-0000-000000000004',
  'e5000000-0000-0000-0000-000000000005',
  'f6000000-0000-0000-0000-000000000006'
)), 6::bigint, 'synthetic signup analytics rows survived the upgrade');
SELECT is((SELECT count(*) FROM public.staff_clients WHERE id IN (
  'a1100000-0000-0000-0000-000000000011',
  'b2200000-0000-0000-0000-000000000022'
)), 2::bigint, 'both existing synthetic client rows survived the upgrade');

-- Anonymous access is closed at the grant layer.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.workspaces'), 'anon cannot read workspaces');
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.credit_report_analyses'), 'anon cannot read reports');
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.client_documents'), 'anon cannot read document metadata');
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.leads'), 'anon cannot read leads');
RESET ROLE;

-- Owner A retains access and cannot cross into Owner B.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","email":"owner-a@phase1b.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.user_profiles WHERE id = 'a1000000-0000-0000-0000-000000000001'), 1::bigint, 'owner reads own profile');
SELECT is((SELECT count(*) FROM public.user_profiles WHERE id = 'b2000000-0000-0000-0000-000000000002'), 0::bigint, 'owner cannot read other profile');
SELECT is((SELECT count(*) FROM public.workspaces WHERE id = 'a1000000-0000-0000-0000-000000000010'), 1::bigint, 'owner reads own workspace');
SELECT is((SELECT count(*) FROM public.workspaces WHERE id = 'b2000000-0000-0000-0000-000000000020'), 0::bigint, 'owner cannot read other workspace');
SELECT is((SELECT count(*) FROM public.staff_clients WHERE id = 'a1100000-0000-0000-0000-000000000011'), 1::bigint, 'owner reads own client');
SELECT is((SELECT count(*) FROM public.staff_clients WHERE id = 'b2200000-0000-0000-0000-000000000022'), 0::bigint, 'owner cannot read other client');
SELECT is((SELECT count(*) FROM public.dashboard_metrics WHERE id = 'a1b00000-0000-0000-0000-00000000001b'), 1::bigint, 'owner reads own dashboard');
SELECT is((SELECT count(*) FROM public.dashboard_metrics WHERE id = 'b2c00000-0000-0000-0000-00000000002c'), 0::bigint, 'owner cannot read other dashboard');
SELECT is((SELECT count(*) FROM public.credit_report_uploads WHERE id = 'a1700000-0000-0000-0000-000000000017'), 1::bigint, 'owner reads own report upload');
SELECT is((SELECT count(*) FROM public.credit_report_uploads WHERE id = 'b2800000-0000-0000-0000-000000000028'), 0::bigint, 'owner cannot read other report upload');
SELECT is((SELECT count(*) FROM public.credit_report_analyses WHERE id = 'a1800000-0000-0000-0000-000000000018'), 1::bigint, 'owner reads own report analysis');
SELECT is((SELECT count(*) FROM public.credit_report_analyses WHERE id = 'b2900000-0000-0000-0000-000000000029'), 0::bigint, 'owner cannot read other report analysis');
SELECT is((SELECT count(*) FROM public.dispute_letters WHERE id = 'a1900000-0000-0000-0000-000000000019'), 1::bigint, 'owner reads own dispute letter');
SELECT is((SELECT count(*) FROM public.dispute_letters WHERE id = 'b2a00000-0000-0000-0000-00000000002a'), 0::bigint, 'owner cannot read other dispute letter');
SELECT is((SELECT count(*) FROM public.generated_dispute_letters WHERE id = 'a1a00000-0000-0000-0000-00000000001a'), 1::bigint, 'owner reads own generated letter');
SELECT is((SELECT count(*) FROM public.generated_dispute_letters WHERE id = 'b2b00000-0000-0000-0000-00000000002b'), 0::bigint, 'owner cannot read other generated letter');
SELECT is((SELECT count(*) FROM public.leads WHERE id = 'a2100000-0000-0000-0000-000000000021'), 1::bigint, 'owner reads own lead');
SELECT is((SELECT count(*) FROM public.leads WHERE id = 'b3200000-0000-0000-0000-000000000032'), 0::bigint, 'owner cannot read other lead');
SELECT is((SELECT count(*) FROM public.billing_events WHERE id = 'a1d00000-0000-0000-0000-00000000001d'), 1::bigint, 'owner reads own billing metadata');
SELECT is((SELECT count(*) FROM public.billing_events WHERE id = 'b2e00000-0000-0000-0000-00000000002e'), 0::bigint, 'owner cannot read other billing metadata');
SELECT is((SELECT count(*) FROM public.ai_usage_events WHERE id = 'a1e00000-0000-0000-0000-00000000001e'), 1::bigint, 'owner reads own AI usage metadata');
SELECT is((SELECT count(*) FROM public.ai_usage_events WHERE id = 'b2f00000-0000-0000-0000-00000000002f'), 0::bigint, 'owner cannot read other AI usage metadata');
SELECT is((SELECT count(*) FROM public.report_provider_settings WHERE id = 'a1f00000-0000-0000-0000-00000000001f'), 1::bigint, 'owner reads own report provider settings');
SELECT is((SELECT count(*) FROM public.report_provider_settings WHERE id = 'b3000000-0000-0000-0000-000000000030'), 0::bigint, 'owner cannot read other report provider settings');
SELECT is((SELECT count(*) FROM public.affiliate_link_clicks WHERE id = 'a2000000-0000-0000-0000-000000000020'), 1::bigint, 'owner reads own affiliate metadata');
SELECT is((SELECT count(*) FROM public.affiliate_link_clicks WHERE id = 'b3100000-0000-0000-0000-000000000031'), 0::bigint, 'owner cannot read other affiliate metadata');
SELECT is((SELECT count(*) FROM public.client_disputes WHERE id = 'a1300000-0000-0000-0000-000000000013'), 1::bigint, 'specialist reads own client dispute');
SELECT is((SELECT count(*) FROM public.client_disputes WHERE id = 'b2400000-0000-0000-0000-000000000024'), 0::bigint, 'specialist cannot read other client dispute');
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = 'a1500000-0000-0000-0000-000000000015'), 1::bigint, 'specialist reads own chat');
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = 'b2600000-0000-0000-0000-000000000026'), 0::bigint, 'specialist cannot read other chat');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = 'a1400000-0000-0000-0000-000000000014'), 1::bigint, 'specialist reads own client document metadata');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = 'b2500000-0000-0000-0000-000000000025'), 0::bigint, 'specialist cannot read other document metadata');
SELECT ok(pg_temp.statement_raises('UPDATE public.leads SET owner_id = ''b2000000-0000-0000-0000-000000000002'' WHERE id = ''a2100000-0000-0000-0000-000000000021'''), 'owner cannot reassign lead ownership');
SELECT ok(pg_temp.statement_raises('INSERT INTO public.leads (owner_id, first_name, last_name, email) VALUES (''b2000000-0000-0000-0000-000000000002'', ''Cross'', ''Tenant'', ''cross@phase1b.invalid'')'), 'owner cannot insert another tenant lead');
SELECT ok(pg_temp.statement_lives('UPDATE public.dashboard_metrics SET active_clients = 2 WHERE id = ''a1b00000-0000-0000-0000-00000000001b'''), 'owner can update own dashboard row');
RESET ROLE;

-- No membership relation exists, so the member candidate must fail closed.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"c3000000-0000-0000-0000-000000000003","email":"member-c@phase1b.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.staff_clients WHERE id = 'a1100000-0000-0000-0000-000000000011'), 0::bigint, 'member candidate cannot read Owner A client');
SELECT is((SELECT count(*) FROM public.dashboard_metrics WHERE id = 'a1b00000-0000-0000-0000-00000000001b'), 0::bigint, 'member candidate cannot read Owner A dashboard');
SELECT is((SELECT count(*) FROM public.workspaces WHERE id = 'a1000000-0000-0000-0000-000000000010'), 0::bigint, 'member candidate cannot read Owner A workspace');
RESET ROLE;

-- Portal A can follow only the matching email-linked client chain.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000004","email":"portal-a@phase1b.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.client_accounts WHERE id = 'a1200000-0000-0000-0000-000000000012'), 1::bigint, 'portal reads own account');
SELECT is((SELECT count(*) FROM public.client_accounts WHERE id = 'b2300000-0000-0000-0000-000000000023'), 0::bigint, 'portal cannot read other account');
SELECT is((SELECT count(*) FROM public.client_disputes WHERE id = 'a1300000-0000-0000-0000-000000000013'), 1::bigint, 'portal reads own dispute');
SELECT is((SELECT count(*) FROM public.client_disputes WHERE id = 'b2400000-0000-0000-0000-000000000024'), 0::bigint, 'portal cannot read other dispute');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = 'a1400000-0000-0000-0000-000000000014'), 1::bigint, 'portal reads own document metadata');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = 'b2500000-0000-0000-0000-000000000025'), 0::bigint, 'portal cannot read other document metadata');
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = 'a1500000-0000-0000-0000-000000000015'), 1::bigint, 'portal reads own chat');
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = 'b2600000-0000-0000-0000-000000000026'), 0::bigint, 'portal cannot read other chat');
SELECT is((SELECT count(*) FROM public.chat_messages WHERE id = 'a1600000-0000-0000-0000-000000000016'), 1::bigint, 'portal reads own messages');
SELECT is((SELECT count(*) FROM public.chat_messages WHERE id = 'b2700000-0000-0000-0000-000000000027'), 0::bigint, 'portal cannot read other messages');
SELECT ok(pg_temp.statement_raises('INSERT INTO public.chat_messages (conversation_id, sender_type, sender_id, sender_name, content) VALUES (''b2600000-0000-0000-0000-000000000026'', ''client'', ''cross'', ''Cross'', ''Denied'')'), 'portal cannot write another tenant chat');
RESET ROLE;

-- Admin predicates are database-backed, not email-only.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"f6000000-0000-0000-0000-000000000006","email":"admin-f@phase1b.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.platform_admins WHERE user_id = 'f6000000-0000-0000-0000-000000000006'), 1::bigint, 'active admin reads admin role row');
SELECT is((SELECT count(*) FROM public.admin_customer_notes WHERE id = 'f6200000-0000-0000-0000-000000000062'), 1::bigint, 'active admin reads customer note');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","email":"owner-a@phase1b.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 0::bigint, 'non-admin cannot read platform admins');
SELECT is((SELECT count(*) FROM public.admin_customer_notes), 0::bigint, 'non-admin cannot read admin notes');
RESET ROLE;

-- Service role retains the server-wide path.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099","role":"service_role"}', true);
SELECT is((SELECT count(*) FROM public.staff_clients WHERE id IN ('a1100000-0000-0000-0000-000000000011', 'b2200000-0000-0000-0000-000000000022')), 2::bigint, 'service role reads both tenants');
SELECT is((SELECT count(*) FROM public.billing_events WHERE id IN ('a1d00000-0000-0000-0000-00000000001d', 'b2e00000-0000-0000-0000-00000000002e')), 2::bigint, 'service role reads both billing metadata rows');
SELECT is((SELECT count(*) FROM public.product_analytics_events WHERE user_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000003',
  'd4000000-0000-0000-0000-000000000004',
  'e5000000-0000-0000-0000-000000000005',
  'f6000000-0000-0000-0000-000000000006'
)), 6::bigint, 'service role reads server-only analytics');
SELECT is((SELECT count(*) FROM public.state_compliance_configs WHERE state_code = 'ZZ'), 1::bigint, 'service role reads state compliance configuration');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
