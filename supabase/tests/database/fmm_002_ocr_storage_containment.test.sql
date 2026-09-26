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

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'fmm002_ocr_artifacts_authenticated_deny'
      AND permissive = 'RESTRICTIVE'
      AND cmd = 'ALL'
      AND roles = ARRAY['authenticated']::name[]
      AND qual ILIKE '%ocr-cache%'
      AND qual ILIKE '%ocr-temp%'
      AND with_check ILIKE '%ocr-cache%'
      AND with_check ILIKE '%ocr-temp%'
  ),
  1::bigint,
  'authenticated OCR containment is a restrictive policy for every operation'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, created_at, updated_at
)
VALUES (
  '78000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'owner@fmm002-storage.invalid',
  crypt('SyntheticFmm002StorageOnly!', gen_salt('bf')),
  '', '', '', '', '', '', '', '',
  CURRENT_TIMESTAMP,
  '{"full_name":"FMM002 Storage Owner","is_client":true}',
  '{"provider":"email","providers":["email"]}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO public.workspaces (id, owner_id, name, slug, is_active)
VALUES (
  '78000000-0000-4000-8000-000000000002',
  '78000000-0000-4000-8000-000000000001',
  'FMM002 Storage Workspace',
  'fmm002-storage-workspace',
  true
);

INSERT INTO storage.objects (id, bucket_id, name, metadata)
VALUES
  (
    '78100000-0000-4000-8000-000000000001',
    'evidence-documents',
    '78000000-0000-4000-8000-000000000001/documents/normal.pdf',
    '{"kind":"normal"}'::jsonb
  ),
  (
    '78100000-0000-4000-8000-000000000002',
    'evidence-documents',
    '78000000-0000-4000-8000-000000000001/documents/ocr-cache/reference.pdf',
    '{"kind":"nested-normal"}'::jsonb
  ),
  (
    '78100000-0000-4000-8000-000000000003',
    'evidence-documents',
    '78000000-0000-4000-8000-000000000001/ocr-cache/cache.json',
    '{"kind":"ocr-cache"}'::jsonb
  ),
  (
    '78100000-0000-4000-8000-000000000004',
    'evidence-documents',
    '78000000-0000-4000-8000-000000000001/ocr-temp/upload.pdf',
    '{"kind":"ocr-temp"}'::jsonb
  );

-- Mirror the Storage service's guarded delete transaction so DELETE assertions
-- exercise RLS instead of the storage.protect_delete safety trigger.
SELECT set_config('storage.allow_delete_query', 'true', true);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

SELECT is(
  (
    SELECT array_agg(metadata ->> 'kind' ORDER BY metadata ->> 'kind')
    FROM storage.objects
    WHERE bucket_id = 'evidence-documents'
      AND name LIKE '78000000-0000-4000-8000-000000000001/%'
  ),
  ARRAY['nested-normal', 'normal']::text[],
  'authenticated SELECT hides only exact second-segment OCR namespaces'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    INSERT INTO storage.objects (id, bucket_id, name, metadata)
    VALUES (
      '78100000-0000-4000-8000-000000000005',
      'evidence-documents',
      '78000000-0000-4000-8000-000000000001/documents/new.pdf',
      '{"kind":"new-normal"}'::jsonb
    )
  $sql$),
  1::bigint,
  'authenticated INSERT preserves normal evidence-document access'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    INSERT INTO storage.objects (id, bucket_id, name)
    VALUES (
      '78100000-0000-4000-8000-000000000006',
      'evidence-documents',
      '78000000-0000-4000-8000-000000000001/ocr-cache/denied.json'
    )
  $sql$),
  '42501',
  'authenticated INSERT cannot recreate ocr-cache objects'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    INSERT INTO storage.objects (id, bucket_id, name)
    VALUES (
      '78100000-0000-4000-8000-000000000007',
      'evidence-documents',
      '78000000-0000-4000-8000-000000000001/ocr-temp/denied.pdf'
    )
  $sql$),
  '42501',
  'authenticated INSERT cannot recreate ocr-temp objects'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    UPDATE storage.objects
    SET metadata = '{"kind":"updated-normal"}'::jsonb
    WHERE id = '78100000-0000-4000-8000-000000000005'
  $sql$),
  1::bigint,
  'authenticated UPDATE preserves normal evidence-document access'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE storage.objects
    SET name = '78000000-0000-4000-8000-000000000001/ocr-cache/moved.json'
    WHERE id = '78100000-0000-4000-8000-000000000005'
  $sql$),
  '42501',
  'authenticated UPDATE cannot move a normal object into an OCR namespace'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    DELETE FROM storage.objects
    WHERE id IN (
      '78100000-0000-4000-8000-000000000003',
      '78100000-0000-4000-8000-000000000004'
    )
  $sql$),
  0::bigint,
  'authenticated DELETE cannot reach contained OCR objects'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    DELETE FROM storage.objects
    WHERE id = '78100000-0000-4000-8000-000000000005'
  $sql$),
  1::bigint,
  'authenticated DELETE preserves normal evidence-document access'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  (
    SELECT count(*)
    FROM storage.objects
    WHERE id IN (
      '78100000-0000-4000-8000-000000000003',
      '78100000-0000-4000-8000-000000000004'
    )
  ),
  2::bigint,
  'service role can inspect contained OCR objects for the audited purge'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    DELETE FROM storage.objects
    WHERE id IN (
      '78100000-0000-4000-8000-000000000003',
      '78100000-0000-4000-8000-000000000004'
    )
  $sql$),
  2::bigint,
  'service role can purge contained OCR objects'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
