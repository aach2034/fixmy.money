BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(70);

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

-- Catalog gates.
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND NOT relation.relrowsecurity
  ),
  'every public application table has RLS enabled'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        regexp_replace(coalesce(qual, ''), '[()[:space:]]', '', 'g') = 'true'
        OR regexp_replace(coalesce(with_check, ''), '[()[:space:]]', '', 'g') = 'true'
      )
  ),
  'no public policy has an exact true predicate'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND roles::text = '{public}'
  ),
  'every public policy targets an explicit role'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND cmd = 'UPDATE' AND with_check IS NULL
  ),
  'every public UPDATE policy has WITH CHECK'
);

SELECT is(
  (
    SELECT count(*)
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND grantee = 'anon'
  ),
  0::bigint,
  'anon has no public table privileges'
);

SELECT is(
  (
    SELECT count(*)
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND grantee = 'authenticated'
      AND privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  0::bigint,
  'authenticated has no truncate, references, or trigger privileges'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_proc AS function
    JOIN pg_namespace AS namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'public'
      AND function.prosecdef
      AND has_function_privilege('authenticated', function.oid, 'EXECUTE')
  ),
  0::bigint,
  'authenticated cannot directly execute public SECURITY DEFINER functions'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_proc AS function
    JOIN pg_namespace AS namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'public'
      AND function.proname LIKE 'specialist_owns_%'
  ),
  0::bigint,
  'ownership helpers are absent from the exposed public schema'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_proc AS function
    JOIN pg_namespace AS namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'private'
      AND function.proname LIKE 'specialist_owns_%'
  ),
  6::bigint,
  'all six ownership helpers exist in the private schema'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_proc AS function
    JOIN pg_namespace AS namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'private'
      AND function.proname LIKE 'specialist_owns_%'
      AND coalesce(array_to_string(function.proconfig, ','), '') <> 'search_path=""'
  ),
  0::bigint,
  'private ownership helpers use an empty fixed search_path'
);

SELECT ok(NOT has_schema_privilege('anon', 'private', 'USAGE'), 'anon cannot use the private schema');
SELECT ok(has_schema_privilege('authenticated', 'private', 'USAGE'), 'authenticated can evaluate private RLS helpers');

SELECT is(
  (
    SELECT count(*)
    FROM pg_class AS view
    JOIN pg_namespace AS namespace ON namespace.oid = view.relnamespace
    WHERE namespace.nspname = 'public' AND view.relkind IN ('v', 'm')
  ),
  0::bigint,
  'no public view can bypass table RLS'
);

SELECT is(
  (SELECT count(*) FROM storage.buckets WHERE id = 'evidence-documents' AND public = false),
  1::bigint,
  'the evidence bucket is private'
);

SELECT is(
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND roles::text = '{authenticated}'),
  4::bigint,
  'storage.objects has four owner-scoped authenticated policies'
);

SELECT is(
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_analytics_events' AND policyname = 'product_analytics_events_server_only'),
  1::bigint,
  'the server-only analytics decision is explicit in RLS metadata'
);

SELECT ok(
  to_regclass('public.workspace_members') IS NULL,
  'no same-workspace membership relation exists; FMM-007 remains a documented blocker'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND relation.relname = ANY (ARRAY[
        'audit_logs',
        'cancellation_periods',
        'compliance_disclosures',
        'compliance_overrides',
        'consumer_contracts',
        'consumer_disclosures',
        'consumer_services',
        'croa_contracts',
        'leads',
        'state_compliance_configs'
      ])
  ),
  10::bigint,
  'all production-only schema-history objects are restored by source replay'
);

SELECT is(
  (
    SELECT array_agg(enum_value.enumlabel ORDER BY enum_value.enumsortorder)::text
    FROM pg_type AS enum_type
    JOIN pg_enum AS enum_value ON enum_value.enumtypid = enum_type.oid
    JOIN pg_namespace AS namespace ON namespace.oid = enum_type.typnamespace
    WHERE namespace.nspname = 'public'
      AND enum_type.typname = 'lead_status'
  ),
  '{new,contacted,qualified,converted,lost}'::text,
  'the reconstructed lead status enum preserves production ordering'
);

-- Synthetic isolated fixtures. They are rolled back at the end of the test.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at
)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@fmm003.invalid', '{}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@fmm003.invalid', '{}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, now(), now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client-a@fmm003.invalid', '{}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, now(), now()),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client-b@fmm003.invalid', '{}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, now(), now());

INSERT INTO public.staff_clients (id, owner_id, name, email)
VALUES
  ('11000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Synthetic Client A', 'client-a@fmm003.invalid'),
  ('22000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 'Synthetic Client B', 'client-b@fmm003.invalid');

INSERT INTO public.client_accounts (id, email, full_name)
VALUES
  ('31000000-0000-0000-0000-000000000031', 'client-a@fmm003.invalid', 'Synthetic Portal A'),
  ('42000000-0000-0000-0000-000000000042', 'client-b@fmm003.invalid', 'Synthetic Portal B');

INSERT INTO public.client_disputes (id, client_id, owner_id, case_number, title, bureau)
VALUES
  ('31000000-0000-0000-0000-000000000032', '31000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000001', 'SYN-A', 'Synthetic dispute A', 'Equifax'),
  ('42000000-0000-0000-0000-000000000043', '42000000-0000-0000-0000-000000000042', '20000000-0000-0000-0000-000000000002', 'SYN-B', 'Synthetic dispute B', 'TransUnion');

INSERT INTO public.client_documents (id, client_id, file_name, file_url)
VALUES
  ('31000000-0000-0000-0000-000000000033', '31000000-0000-0000-0000-000000000031', 'synthetic-a.pdf', 'private/synthetic-a.pdf'),
  ('42000000-0000-0000-0000-000000000044', '42000000-0000-0000-0000-000000000042', 'synthetic-b.pdf', 'private/synthetic-b.pdf');

INSERT INTO public.chat_conversations (id, client_account_id, specialist_id, subject)
VALUES
  ('31000000-0000-0000-0000-000000000034', '31000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000001', 'Synthetic A'),
  ('42000000-0000-0000-0000-000000000045', '42000000-0000-0000-0000-000000000042', '20000000-0000-0000-0000-000000000002', 'Synthetic B');

INSERT INTO public.chat_messages (id, conversation_id, sender_type, sender_id, sender_name, content)
VALUES
  ('31000000-0000-0000-0000-000000000035', '31000000-0000-0000-0000-000000000034', 'client', 'synthetic-a', 'Synthetic A', 'Synthetic message A'),
  ('42000000-0000-0000-0000-000000000046', '42000000-0000-0000-0000-000000000045', 'client', 'synthetic-b', 'Synthetic B', 'Synthetic message B');

INSERT INTO public.launch_directories (id, name, category, url, user_id)
VALUES
  ('11000000-0000-0000-0000-000000000012', 'Synthetic directory A', 'saas_directory', 'https://example.invalid/a', '10000000-0000-0000-0000-000000000001'),
  ('22000000-0000-0000-0000-000000000023', 'Synthetic directory B', 'saas_directory', 'https://example.invalid/b', '20000000-0000-0000-0000-000000000002');

INSERT INTO public.dashboard_metrics (id, owner_id, active_clients)
VALUES ('22000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000002', 2);

INSERT INTO public.leads (id, owner_id, first_name, last_name, email)
VALUES
  ('11000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', 'Synthetic', 'Lead A', 'lead-a@fmm003.invalid'),
  ('22000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000002', 'Synthetic', 'Lead B', 'lead-b@fmm003.invalid');

INSERT INTO public.consumer_services (id, owner_id, consumer_name, service_name, service_description)
VALUES
  ('11000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000001', 'Synthetic Consumer A', 'Synthetic Service', 'Isolated RLS fixture'),
  ('22000000-0000-0000-0000-000000000026', '20000000-0000-0000-0000-000000000002', 'Synthetic Consumer B', 'Synthetic Service', 'Isolated RLS fixture');

INSERT INTO public.state_compliance_configs (id, state_code, state_name, status)
VALUES ('11000000-0000-0000-0000-000000000017', 'ZY', 'Synthetic State', 'pending');

INSERT INTO public.audit_logs (id, owner_id, action, description)
VALUES
  ('11000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000001', 'lead_created', 'Synthetic audit A'),
  ('22000000-0000-0000-0000-000000000028', '20000000-0000-0000-0000-000000000002', 'lead_created', 'Synthetic audit B');

-- Anonymous callers have no public data path.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.workspaces'), 'anon cannot read workspaces');
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.chat_conversations'), 'anon cannot read chat conversations');
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.product_analytics_events'), 'anon cannot read server analytics');
SELECT ok(pg_temp.statement_raises('SELECT * FROM public.leads'), 'anon cannot read reconstructed lead data');
RESET ROLE;

-- Owner A can operate on owned rows and cannot observe or mutate owner B.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","email":"owner-a@fmm003.invalid","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.staff_clients WHERE id = '11000000-0000-0000-0000-000000000011'), 1::bigint, 'owner sees own client');
SELECT is((SELECT count(*) FROM public.staff_clients WHERE id = '22000000-0000-0000-0000-000000000022'), 0::bigint, 'owner cannot see another tenant client');
SELECT is((SELECT count(*) FROM public.launch_directories WHERE id = '11000000-0000-0000-0000-000000000012'), 1::bigint, 'owner sees own launch row');
SELECT is((SELECT count(*) FROM public.launch_directories WHERE id = '22000000-0000-0000-0000-000000000023'), 0::bigint, 'owner cannot see another tenant launch row');
SELECT ok(
  pg_temp.statement_raises('INSERT INTO public.launch_directories (name, category, url, user_id) VALUES (''Cross tenant'', ''saas_directory'', ''https://example.invalid/cross'', ''20000000-0000-0000-0000-000000000002'')'),
  'owner cannot insert a launch row for another tenant'
);
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = '31000000-0000-0000-0000-000000000034'), 1::bigint, 'specialist sees own conversation');
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = '42000000-0000-0000-0000-000000000045'), 0::bigint, 'specialist cannot see another conversation');
SELECT is((SELECT count(*) FROM public.chat_messages WHERE id = '31000000-0000-0000-0000-000000000035'), 1::bigint, 'specialist sees own chat message');
SELECT is((SELECT count(*) FROM public.chat_messages WHERE id = '42000000-0000-0000-0000-000000000046'), 0::bigint, 'specialist cannot see another chat message');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = '31000000-0000-0000-0000-000000000033'), 1::bigint, 'specialist sees own client document metadata');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = '42000000-0000-0000-0000-000000000044'), 0::bigint, 'specialist cannot see another client document');
SELECT is((SELECT count(*) FROM public.leads WHERE id = '11000000-0000-0000-0000-000000000015'), 1::bigint, 'owner sees own reconstructed lead');
SELECT is((SELECT count(*) FROM public.leads WHERE id = '22000000-0000-0000-0000-000000000025'), 0::bigint, 'owner cannot see another tenant reconstructed lead');
SELECT ok(
  pg_temp.statement_lives('INSERT INTO public.leads (owner_id, first_name, last_name, email) VALUES (''10000000-0000-0000-0000-000000000001'', ''Owned'', ''Lead'', ''owned-lead@fmm003.invalid'')'),
  'owner can insert an owned reconstructed lead'
);
SELECT ok(
  pg_temp.statement_raises('INSERT INTO public.leads (owner_id, first_name, last_name, email) VALUES (''20000000-0000-0000-0000-000000000002'', ''Cross'', ''Tenant'', ''cross-lead@fmm003.invalid'')'),
  'owner cannot insert a reconstructed lead for another tenant'
);
SELECT ok(
  pg_temp.statement_raises('UPDATE public.leads SET owner_id = ''20000000-0000-0000-0000-000000000002'' WHERE id = ''11000000-0000-0000-0000-000000000015'''),
  'owner cannot reassign reconstructed lead ownership'
);
SELECT is((SELECT count(*) FROM public.consumer_services WHERE id = '11000000-0000-0000-0000-000000000016'), 1::bigint, 'owner sees own consumer service');
SELECT is((SELECT count(*) FROM public.consumer_services WHERE id = '22000000-0000-0000-0000-000000000026'), 0::bigint, 'owner cannot see another tenant consumer service');
SELECT is((SELECT count(*) FROM public.state_compliance_configs WHERE state_code = 'ZY'), 1::bigint, 'authenticated owner can read state compliance configuration');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE id = '11000000-0000-0000-0000-000000000018'), 1::bigint, 'owner sees own immutable audit event');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE id = '22000000-0000-0000-0000-000000000028'), 0::bigint, 'owner cannot see another tenant audit event');
SELECT ok(
  pg_temp.statement_lives('INSERT INTO public.audit_logs (owner_id, action, description) VALUES (''10000000-0000-0000-0000-000000000001'', ''status_changed'', ''Synthetic owner insert'')'),
  'owner can append an owned audit event'
);
SELECT ok(
  pg_temp.statement_raises('INSERT INTO public.audit_logs (owner_id, action, description) VALUES (''20000000-0000-0000-0000-000000000002'', ''status_changed'', ''Synthetic cross-tenant insert'')'),
  'owner cannot append an audit event for another tenant'
);
SELECT ok(
  pg_temp.statement_raises('UPDATE public.audit_logs SET description = ''mutated'' WHERE id = ''11000000-0000-0000-0000-000000000018'''),
  'authenticated audit events cannot be updated'
);
SELECT ok(
  pg_temp.statement_raises('DELETE FROM public.audit_logs WHERE id = ''11000000-0000-0000-0000-000000000018'''),
  'authenticated audit events cannot be deleted'
);

SELECT ok(
  pg_temp.statement_lives('INSERT INTO public.dashboard_metrics (id, owner_id, active_clients) VALUES (''11000000-0000-0000-0000-000000000013'', ''10000000-0000-0000-0000-000000000001'', 1)'),
  'owner can insert an owned row'
);
SELECT ok(
  pg_temp.statement_raises('UPDATE public.dashboard_metrics SET owner_id = ''20000000-0000-0000-0000-000000000002'' WHERE id = ''11000000-0000-0000-0000-000000000013'''),
  'owner cannot reassign ownership'
);
UPDATE public.dashboard_metrics SET active_clients = 99 WHERE id = '22000000-0000-0000-0000-000000000024';
SELECT is((SELECT active_clients FROM public.dashboard_metrics WHERE id = '22000000-0000-0000-0000-000000000024'), NULL::integer, 'cross-tenant update cannot expose or modify the row');
DELETE FROM public.dashboard_metrics WHERE id = '22000000-0000-0000-0000-000000000024';
SELECT is((SELECT count(*) FROM public.dashboard_metrics WHERE id = '22000000-0000-0000-0000-000000000024'), 0::bigint, 'cross-tenant delete reveals no row');
SELECT ok(pg_temp.statement_lives('UPDATE public.dashboard_metrics SET active_clients = 3 WHERE id = ''11000000-0000-0000-0000-000000000013'''), 'owner can update an owned row');
SELECT ok(pg_temp.statement_lives('DELETE FROM public.dashboard_metrics WHERE id = ''11000000-0000-0000-0000-000000000013'''), 'owner can delete an owned row');
RESET ROLE;
SELECT is(
  (SELECT active_clients FROM public.dashboard_metrics WHERE id = '22000000-0000-0000-0000-000000000024'),
  2,
  'cross-tenant update and delete left the other tenant row unchanged'
);

-- The authenticated client portal identity can access only the matching email chain.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000003","email":"client-a@fmm003.invalid","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.client_accounts WHERE id = '31000000-0000-0000-0000-000000000031'), 1::bigint, 'portal client sees own account');
SELECT is((SELECT count(*) FROM public.client_accounts WHERE id = '42000000-0000-0000-0000-000000000042'), 0::bigint, 'portal client cannot see another account');
SELECT is((SELECT count(*) FROM public.client_disputes WHERE id = '31000000-0000-0000-0000-000000000032'), 1::bigint, 'portal client sees own dispute');
SELECT is((SELECT count(*) FROM public.client_disputes WHERE id = '42000000-0000-0000-0000-000000000043'), 0::bigint, 'portal client cannot see another dispute');
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = '31000000-0000-0000-0000-000000000034'), 1::bigint, 'portal client sees own conversation');
SELECT is((SELECT count(*) FROM public.chat_conversations WHERE id = '42000000-0000-0000-0000-000000000045'), 0::bigint, 'portal client cannot see another conversation');
SELECT is((SELECT count(*) FROM public.chat_messages WHERE id = '31000000-0000-0000-0000-000000000035'), 1::bigint, 'portal client sees own messages');
SELECT is((SELECT count(*) FROM public.chat_messages WHERE id = '42000000-0000-0000-0000-000000000046'), 0::bigint, 'portal client cannot see another tenant messages');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = '31000000-0000-0000-0000-000000000033'), 1::bigint, 'portal client sees own document metadata');
SELECT is((SELECT count(*) FROM public.client_documents WHERE id = '42000000-0000-0000-0000-000000000044'), 0::bigint, 'portal client cannot see another document');
SELECT ok(
  pg_temp.statement_raises('INSERT INTO public.chat_messages (conversation_id, sender_type, sender_id, sender_name, content) VALUES (''42000000-0000-0000-0000-000000000045'', ''client'', ''cross-tenant'', ''Cross tenant'', ''denied'')'),
  'portal client cannot insert into another tenant conversation'
);
RESET ROLE;

-- Service role remains the only server-wide path.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"sub":"50000000-0000-0000-0000-000000000005","role":"service_role"}', true);
SELECT is((SELECT count(*) FROM public.staff_clients WHERE id IN ('11000000-0000-0000-0000-000000000011', '22000000-0000-0000-0000-000000000022')), 2::bigint, 'service role can read across tenants');
SELECT is((SELECT count(*) FROM public.leads WHERE id IN ('11000000-0000-0000-0000-000000000015', '22000000-0000-0000-0000-000000000025')), 2::bigint, 'service role can read reconstructed data across tenants');
SELECT ok(
  pg_temp.statement_lives('INSERT INTO public.product_analytics_events (user_id, event_name, dedupe_key) VALUES (''10000000-0000-0000-0000-000000000001'', ''onboarding_started'', ''fmm003-service-test'')'),
  'service role can write the server-only event stream'
);
SELECT is((SELECT count(*) FROM public.product_analytics_events WHERE dedupe_key = 'fmm003-service-test'), 1::bigint, 'service role can read its server-only event');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
