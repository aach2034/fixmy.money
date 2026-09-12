BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

CREATE OR REPLACE FUNCTION pg_temp.statement_sqlstate(statement text)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.statement_row_count(statement text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  affected bigint;
BEGIN
  EXECUTE statement;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'client-documents' AND public = false
  ),
  'client document bucket remains private'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'client_documents_storage_select',
        'client_documents_storage_insert',
        'client_documents_storage_update',
        'client_documents_storage_delete'
      )
  ),
  0::bigint,
  'legacy authenticated client-document Storage policies are absent'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'client_documents_storage_authenticated_route_only'
      AND permissive = 'RESTRICTIVE'
      AND cmd = 'ALL'
      AND roles = ARRAY['authenticated']::name[]
      AND qual ILIKE '%bucket_id%<>%client-documents%'
      AND with_check ILIKE '%bucket_id%<>%client-documents%'
  ),
  1::bigint,
  'restrictive authenticated policy denies every direct operation on this bucket'
);

SELECT ok(
  (SELECT relrowsecurity
   FROM pg_class
   WHERE oid = 'storage.objects'::regclass),
  'storage objects RLS remains enabled'
);

SELECT ok(
  NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'authenticated'),
  'authenticated callers cannot bypass Storage RLS'
);

SELECT ok(
  (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'),
  'trusted service role retains its RLS bypass'
);

SELECT is(
  (
    SELECT count(*)
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS required(privilege)
    WHERE has_table_privilege('service_role', 'storage.objects', required.privilege)
  ),
  4::bigint,
  'service role retains every Storage object privilege used by trusted routes'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.client_documents', 'SELECT'),
  'authenticated users retain tenant-scoped document metadata listing'
);

SELECT is(
  (
    SELECT count(*)
    FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS forbidden(privilege)
    WHERE has_table_privilege('authenticated', 'public.client_documents', forbidden.privilege)
  ),
  0::bigint,
  'authenticated users cannot mutate document metadata outside server routes'
);

SELECT is(
  (
    SELECT count(*)
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS required(privilege)
    WHERE has_table_privilege('service_role', 'public.client_documents', required.privilege)
  ),
  4::bigint,
  'service role retains document metadata access for authorized server routes'
);

-- One synthetic object-bearing row in every document status exactly consumes
-- the Starter plan's 5 GiB allowance. The next byte must therefore fail. This
-- is behavioral coverage: omitting any status from the aggregate would make
-- the final insert incorrectly succeed. Every fixture is rolled back below.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, created_at, updated_at
)
VALUES (
  '69500000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'quota-owner@fmm006009.invalid',
  crypt('SyntheticFmm006009Only!', gen_salt('bf')),
  '', '', '', '', '', '', '', '',
  CURRENT_TIMESTAMP,
  '{"full_name":"FMM006009 Quota Owner","is_client":true}',
  '{"provider":"email","providers":["email"]}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

UPDATE public.user_profiles
SET account_type = 'business'
WHERE id = '69500000-0000-4000-8000-000000000001';

INSERT INTO public.workspaces (id, owner_id, name, slug, is_active)
VALUES (
  '69500000-0000-4000-8000-000000000002',
  '69500000-0000-4000-8000-000000000001',
  'FMM006009 quota workspace',
  'fmm006009-quota-workspace',
  true
);

UPDATE public.workspace_entitlements
SET plan_id = 'starter',
    stripe_status = 'active',
    access_state = 'active',
    current_period_ends_at = CURRENT_TIMESTAMP + interval '1 day',
    last_verified_at = CURRENT_TIMESTAMP
WHERE workspace_id = '69500000-0000-4000-8000-000000000002';

INSERT INTO public.staff_clients (id, owner_id, workspace_id, name, email)
VALUES (
  '69500000-0000-4000-8000-000000000003',
  '69500000-0000-4000-8000-000000000001',
  '69500000-0000-4000-8000-000000000002',
  'FMM006009 quota client',
  'quota-client@fmm006009.invalid'
);

WITH relationship AS (
  SELECT id
  FROM public.workspace_client_memberships
  WHERE staff_client_id = '69500000-0000-4000-8000-000000000003'
)
INSERT INTO public.client_documents (
  id, workspace_client_id, file_name, file_url, file_size, mime_type, doc_status
)
SELECT
  fixture.id,
  relationship.id,
  fixture.file_name,
  fixture.file_url,
  1073741824,
  'application/pdf',
  fixture.doc_status
FROM relationship
CROSS JOIN (VALUES
  ('69500000-0000-4000-8000-000000000010'::uuid, 'pending.pdf', 'quota/pending.pdf', 'pending'::public.document_status),
  ('69500000-0000-4000-8000-000000000011'::uuid, 'uploaded.pdf', 'quota/uploaded.pdf', 'uploaded'::public.document_status),
  ('69500000-0000-4000-8000-000000000012'::uuid, 'reviewed.pdf', 'quota/reviewed.pdf', 'reviewed'::public.document_status),
  ('69500000-0000-4000-8000-000000000013'::uuid, 'approved.pdf', 'quota/approved.pdf', 'approved'::public.document_status),
  ('69500000-0000-4000-8000-000000000014'::uuid, 'rejected.pdf', 'quota/rejected.pdf', 'rejected'::public.document_status)
) AS fixture(id, file_name, file_url, doc_status);

SELECT is(
  (
    SELECT array_agg(doc_status::text ORDER BY doc_status)
    FROM public.client_documents
    WHERE workspace_id = '69500000-0000-4000-8000-000000000002'
  ),
  ARRAY['pending', 'uploaded', 'reviewed', 'approved', 'rejected']::text[],
  'quota fixture contains every object-bearing document status'
);

SELECT throws_ok(
  $sql$
    INSERT INTO public.client_documents (
      id, workspace_client_id, file_name, file_url, file_size, mime_type, doc_status
    )
    VALUES (
      '69500000-0000-4000-8000-000000000015',
      (SELECT id
       FROM public.workspace_client_memberships
       WHERE staff_client_id = '69500000-0000-4000-8000-000000000003'),
      'over-quota.pdf',
      'quota/over-quota.pdf',
      1,
      'application/pdf',
      'pending'
    )
  $sql$,
  'P0001',
  'STORAGE_BYTES_LIMIT_REACHED',
  'all retained document statuses count toward aggregate Storage quota'
);

INSERT INTO storage.objects (id, bucket_id, name, metadata)
VALUES (
  '69000000-0000-4000-8000-000000000001',
  'client-documents',
  '69100000-0000-4000-8000-000000000001/69200000-0000-4000-8000-000000000002/69300000-0000-4000-8000-000000000003/original.pdf',
  '{"mimetype":"application/pdf","size":5}'::jsonb
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"69400000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

SELECT is(
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'client-documents'),
  0::bigint,
  'direct authenticated Storage SELECT is denied'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    INSERT INTO storage.objects (id, bucket_id, name)
    VALUES (
      '69000000-0000-4000-8000-000000000002',
      'client-documents',
      '69100000-0000-4000-8000-000000000001/69200000-0000-4000-8000-000000000002/69300000-0000-4000-8000-000000000004/bypass.pdf'
    )
  $sql$),
  '42501',
  'direct authenticated Storage INSERT is denied by RLS'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    UPDATE storage.objects
    SET metadata = '{"tampered":true}'::jsonb
    WHERE id = '69000000-0000-4000-8000-000000000001'
  $sql$),
  0::bigint,
  'direct authenticated Storage UPDATE is denied'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    DELETE FROM storage.objects
    WHERE id = '69000000-0000-4000-8000-000000000001'
  $sql$),
  '42501',
  'direct authenticated Storage DELETE is denied'
);

RESET ROLE;
SELECT is(
  (SELECT count(*) FROM storage.objects WHERE id = '69000000-0000-4000-8000-000000000001'),
  1::bigint,
  'denied browser mutations leave the existing object metadata unchanged'
);

SET LOCAL ROLE service_role;
SELECT is(
  (SELECT count(*) FROM storage.objects WHERE id = '69000000-0000-4000-8000-000000000001'),
  1::bigint,
  'service role can access the object for trusted server routes'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
