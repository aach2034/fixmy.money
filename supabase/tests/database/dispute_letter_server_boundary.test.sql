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
    FROM unnest(ARRAY['dispute_letters', 'generated_dispute_letters']) AS relation(table_name)
    CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS forbidden(privilege)
    WHERE has_table_privilege('authenticated', 'public.' || relation.table_name, forbidden.privilege)
       OR has_table_privilege('anon', 'public.' || relation.table_name, forbidden.privilege)
  ),
  0::bigint,
  'browser-facing roles have no direct dispute-letter mutation privileges'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('dispute_letters', 'generated_dispute_letters')
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      AND (
        roles @> ARRAY['authenticated']::name[]
        OR roles @> ARRAY['public']::name[]
      )
  ),
  0::bigint,
  'no permissive or generic mutation policy can reopen the browser write boundary'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('dispute_letters', 'generated_dispute_letters')
      AND cmd = 'SELECT'
      AND roles = ARRAY['authenticated']::name[]
      AND qual ILIKE '%can_read_owner%'
  ),
  2::bigint,
  'both letter tables retain exactly tenant-authorized authenticated reads'
);

SELECT is(
  (
    SELECT count(*)
    FROM unnest(ARRAY['dispute_letters', 'generated_dispute_letters']) AS relation(table_name)
    CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS required(privilege)
    WHERE has_table_privilege('service_role', 'public.' || relation.table_name, required.privilege)
  ),
  8::bigint,
  'service role retains the CRUD privileges required by trusted server operations'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_trigger
    WHERE tgrelid IN ('public.dispute_letters'::regclass, 'public.generated_dispute_letters'::regclass)
      AND tgname IN (
        'enforce_dispute_letter_server_transition',
        'enforce_generated_dispute_letter_server_transition'
      )
      AND tgenabled = 'O'
      AND NOT tgisinternal
  ),
  2::bigint,
  'server mutations remain guarded by forward-only transition triggers'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_class
    WHERE oid IN (
      'public.dispute_letters'::regclass,
      'public.generated_dispute_letters'::regclass
    )
      AND relrowsecurity
  ),
  2::bigint,
  'row-level security remains enabled on both generated-letter tables'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_proc AS routine
    JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
    WHERE namespace.nspname = 'private'
      AND routine.proname IN (
        'enforce_dispute_letter_server_transition',
        'enforce_generated_dispute_letter_server_transition'
      )
      AND NOT routine.prosecdef
      AND routine.proconfig @> ARRAY['search_path=""']::text[]
  ),
  2::bigint,
  'transition trigger functions are security-invoker with a fixed empty search path'
);

SELECT is(
  (
    SELECT count(*)
    FROM unnest(ARRAY['anon', 'authenticated']) AS browser_role(role_name)
    CROSS JOIN unnest(ARRAY[
      'private.enforce_dispute_letter_server_transition()',
      'private.enforce_generated_dispute_letter_server_transition()'
    ]) AS routine(signature)
    WHERE has_function_privilege(browser_role.role_name, routine.signature, 'EXECUTE')
  ),
  0::bigint,
  'browser-facing roles cannot execute the private transition functions directly'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_proc AS routine
    JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
    WHERE namespace.nspname = 'public'
      AND routine.proname = 'mark_dispute_letters_mailed_server'
      AND NOT routine.prosecdef
      AND routine.proconfig @> ARRAY['search_path=""']::text[]
  ),
  1::bigint,
  'atomic mailing transition is security-invoker with a fixed empty search path'
);

SELECT is(
  (
    SELECT count(*)
    FROM unnest(ARRAY['anon', 'authenticated']) AS browser_role(role_name)
    WHERE has_function_privilege(
      browser_role.role_name,
      'public.mark_dispute_letters_mailed_server(text,uuid,uuid,uuid,uuid[])',
      'EXECUTE'
    )
  ),
  0::bigint,
  'browser-facing roles cannot execute the atomic mailing transition'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_proc AS routine
    JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
    CROSS JOIN LATERAL aclexplode(
      COALESCE(routine.proacl, acldefault('f', routine.proowner))
    ) AS permission
    WHERE namespace.nspname = 'public'
      AND routine.proname = 'mark_dispute_letters_mailed_server'
      AND permission.grantee = 0
      AND permission.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC has no implicit execute grant on the atomic mailing transition'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.mark_dispute_letters_mailed_server(text,uuid,uuid,uuid,uuid[])',
    'EXECUTE'
  ),
  'service role can execute the atomic mailing transition'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, created_at, updated_at
)
VALUES
  (
    '79100000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner-a@letter-boundary.invalid',
    crypt('SyntheticLetterBoundaryOnly!', gen_salt('bf')),
    '', '', '', '', '', '', '', '', CURRENT_TIMESTAMP,
    '{"full_name":"Letter Boundary Owner A","is_client":true}',
    '{"provider":"email","providers":["email"]}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '79200000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner-b@letter-boundary.invalid',
    crypt('SyntheticLetterBoundaryOnly!', gen_salt('bf')),
    '', '', '', '', '', '', '', '', CURRENT_TIMESTAMP,
    '{"full_name":"Letter Boundary Owner B","is_client":true}',
    '{"provider":"email","providers":["email"]}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );

UPDATE public.user_profiles
SET account_type = 'business'
WHERE id IN (
  '79100000-0000-4000-8000-000000000001',
  '79200000-0000-4000-8000-000000000002'
);

INSERT INTO public.workspaces (id, owner_id, name, slug, is_active)
VALUES
  ('79110000-0000-4000-8000-000000000011', '79100000-0000-4000-8000-000000000001', 'Letter Boundary A', 'letter-boundary-a', true),
  ('79210000-0000-4000-8000-000000000012', '79200000-0000-4000-8000-000000000002', 'Letter Boundary B', 'letter-boundary-b', true);

UPDATE public.workspace_entitlements
SET plan_id = 'professional',
    stripe_status = 'trialing',
    access_state = 'trial',
    trial_ends_at = CURRENT_TIMESTAMP + interval '1 day',
    last_verified_at = CURRENT_TIMESTAMP
WHERE workspace_id IN (
  '79110000-0000-4000-8000-000000000011',
  '79210000-0000-4000-8000-000000000012'
);

INSERT INTO public.staff_clients (id, owner_id, workspace_id, name, email)
VALUES
  ('79120000-0000-4000-8000-000000000021', '79100000-0000-4000-8000-000000000001', '79110000-0000-4000-8000-000000000011', 'Synthetic Client A', 'client-a@letter-boundary.invalid'),
  ('79220000-0000-4000-8000-000000000022', '79200000-0000-4000-8000-000000000002', '79210000-0000-4000-8000-000000000012', 'Synthetic Client B', 'client-b@letter-boundary.invalid');

INSERT INTO public.dispute_rounds (
  id, owner_id, client_id, round_number, title, status, mailed_at, follow_up_date
)
VALUES
  ('79150000-0000-4000-8000-000000000051', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', 1, 'Successful atomic transition', 'generated', NULL, NULL),
  ('79150000-0000-4000-8000-000000000052', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', 2, 'Synthetic rollback transition', 'generated', NULL, NULL),
  ('79150000-0000-4000-8000-000000000053', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', 3, 'Closed transition rejection', 'closed', '2026-09-01T12:00:00Z', '2026-10-01T12:00:00Z'),
  ('79150000-0000-4000-8000-000000000054', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', 4, 'Idempotent sent transition', 'sent', '2026-09-02T12:00:00Z', '2026-10-02T12:00:00Z');

INSERT INTO public.dispute_letters (
  id, owner_id, workspace_id, client_id, letter_id, client_name, bureau,
  letter_status, letter_content, dispute_reason, account_number
)
VALUES
  ('79130000-0000-4000-8000-000000000031', '79100000-0000-4000-8000-000000000001', '79110000-0000-4000-8000-000000000011', '79120000-0000-4000-8000-000000000021', 'EQ-BOUNDARY-A', 'Synthetic Client A', 'Equifax', 'draft', 'Supported synthetic A content', 'Stored balance discrepancy', '****1234'),
  ('79130000-0000-4000-8000-000000000032', '79100000-0000-4000-8000-000000000001', '79110000-0000-4000-8000-000000000011', '79120000-0000-4000-8000-000000000021', 'EX-PRESERVE-A', 'Synthetic Client A', 'Experian', 'draft', 'Preserved synthetic A content', 'Stored status discrepancy', '****1234'),
  ('79230000-0000-4000-8000-000000000033', '79200000-0000-4000-8000-000000000002', '79210000-0000-4000-8000-000000000012', '79220000-0000-4000-8000-000000000022', 'TU-BOUNDARY-B', 'Synthetic Client B', 'TransUnion', 'draft', 'Supported synthetic B content', 'Stored balance discrepancy', '****5678');

INSERT INTO public.generated_dispute_letters (
  id, owner_id, client_id, round_id, bureau, letter_content, items_count, items_summary, status, mailed_at
)
VALUES
  ('79140000-0000-4000-8000-000000000041', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', '79150000-0000-4000-8000-000000000051', 'Equifax', 'Supported round content', 1, '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["evidence-a"]}]}'::jsonb, 'generated', NULL),
  ('79140000-0000-4000-8000-000000000042', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', NULL, 'Experian', 'Preserved round content', 1, '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["evidence-preserve"]}]}'::jsonb, 'generated', NULL),
  ('79240000-0000-4000-8000-000000000043', '79200000-0000-4000-8000-000000000002', '79220000-0000-4000-8000-000000000022', NULL, 'TransUnion', 'Supported round B content', 1, '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["evidence-b"]}]}'::jsonb, 'generated', NULL),
  ('79140000-0000-4000-8000-000000000045', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', '79150000-0000-4000-8000-000000000052', 'Equifax', 'Atomic rollback content', 1, '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["evidence-rollback"]}]}'::jsonb, 'generated', NULL),
  ('79140000-0000-4000-8000-000000000046', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', '79150000-0000-4000-8000-000000000053', 'Equifax', 'Closed round content', 1, '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["evidence-closed"]}]}'::jsonb, 'generated', NULL),
  ('79140000-0000-4000-8000-000000000047', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', '79150000-0000-4000-8000-000000000054', 'Equifax', 'Previously sent content', 1, '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["evidence-sent"]}]}'::jsonb, 'sent', '2026-09-02T12:00:00Z'),
  ('79140000-0000-4000-8000-000000000048', '79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', NULL, 'Equifax', 'Closed letter content', 1, '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["evidence-letter-closed"]}]}'::jsonb, 'closed', NULL);

CREATE TEMP TABLE preserved_letter_hashes AS
SELECT 'dispute_letters'::text AS source, id, md5(to_jsonb(row_value)::text) AS row_hash
FROM public.dispute_letters AS row_value
WHERE id = '79130000-0000-4000-8000-000000000032'
UNION ALL
SELECT 'generated_dispute_letters', id, md5(to_jsonb(row_value)::text)
FROM public.generated_dispute_letters AS row_value
WHERE id = '79140000-0000-4000-8000-000000000042';

ALTER TABLE public.dispute_rounds
  ADD CONSTRAINT synthetic_reject_round_sent
  CHECK (id <> '79150000-0000-4000-8000-000000000052' OR status <> 'sent')
  NOT VALID;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"79100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

SELECT is((SELECT count(*) FROM public.dispute_letters), 2::bigint, 'owner A reads only its dispute letters');
SELECT is((SELECT count(*) FROM public.generated_dispute_letters), 6::bigint, 'owner A reads only its generated letters');
SELECT is((SELECT count(*) FROM public.dispute_letters WHERE owner_id = '79200000-0000-4000-8000-000000000002'), 0::bigint, 'cross-tenant dispute-letter reads are denied');
SELECT is((SELECT count(*) FROM public.generated_dispute_letters WHERE owner_id = '79200000-0000-4000-8000-000000000002'), 0::bigint, 'cross-tenant generated-letter reads are denied');

SELECT is(
  pg_temp.statement_sqlstate($sql$
    INSERT INTO public.dispute_letters (owner_id, letter_id, bureau, letter_content)
    VALUES ('79100000-0000-4000-8000-000000000001', 'BYPASS', 'Equifax', 'Unsupported allegation')
  $sql$),
  '42501',
  'authenticated direct dispute-letter insertion is denied'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    INSERT INTO public.generated_dispute_letters (owner_id, client_id, bureau, letter_content, items_summary)
    VALUES ('79100000-0000-4000-8000-000000000001', '79120000-0000-4000-8000-000000000021', 'Equifax', 'Unsupported allegation', '{"enclosures":["missing.pdf"]}'::jsonb)
  $sql$),
  '42501',
  'authenticated direct generated-letter insertion is denied'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE public.dispute_letters
    SET letter_content = 'Rewritten unsupported content', bureau = 'TransUnion', owner_id = '79200000-0000-4000-8000-000000000002'
    WHERE id = '79130000-0000-4000-8000-000000000031'
  $sql$),
  '42501',
  'authenticated content, bureau, and ownership mutation is denied'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE public.generated_dispute_letters
    SET items_summary = '{"enclosures":["unverified.pdf"],"paragraphs":[]}'::jsonb,
        letter_content = 'Rewritten content',
        client_id = '79220000-0000-4000-8000-000000000022'
    WHERE id = '79140000-0000-4000-8000-000000000041'
  $sql$),
  '42501',
  'authenticated provenance, enclosure, content, and client mutation is denied'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    DELETE FROM public.dispute_letters
    WHERE id = '79130000-0000-4000-8000-000000000031'
  $sql$),
  '42501',
  'authenticated direct draft deletion is denied outside the server route'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'dispute_letters',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79130000-0000-4000-8000-000000000031']::uuid[]
    )
  $sql$),
  '42501',
  'authenticated callers cannot invoke the server-only mailing transition'
);

RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  pg_temp.statement_row_count($sql$
    INSERT INTO public.dispute_letters (
      id, owner_id, workspace_id, client_id, letter_id, client_name, bureau,
      letter_status, letter_content, dispute_reason, account_number
    ) VALUES (
      '79130000-0000-4000-8000-000000000034',
      '79100000-0000-4000-8000-000000000001',
      '79110000-0000-4000-8000-000000000011',
      '79120000-0000-4000-8000-000000000021',
      'EQ-SERVER', 'Synthetic Client A', 'Equifax', 'draft',
      'Canonical server content', 'Stored balance discrepancy', '****1234'
    )
  $sql$),
  1::bigint,
  'service-role canonical dispute-letter generation succeeds'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    INSERT INTO public.generated_dispute_letters (
      id, owner_id, client_id, bureau, letter_content, items_count, items_summary, status
    ) VALUES (
      '79140000-0000-4000-8000-000000000044',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      'Equifax', 'Canonical round content', 1,
      '{"schema_version":2,"paragraphs":[{"sourceEvidenceIds":["server-evidence"]}],"enclosures":[]}'::jsonb,
      'generated'
    )
  $sql$),
  1::bigint,
  'service-role canonical round-letter generation with provenance succeeds'
);

SELECT lives_ok(
  $sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'dispute_letters',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79130000-0000-4000-8000-000000000031']::uuid[]
    )
  $sql$,
  'server may atomically advance a dispute letter from draft to sent'
);

SELECT is(
  (
    SELECT letter_status::text || ':' || (sent_date IS NOT NULL)::text || ':'
      || (response_due_date = sent_date + 30)::text || ':' || days_remaining::text
    FROM public.dispute_letters
    WHERE id = '79130000-0000-4000-8000-000000000031'
  ),
  'sent:true:true:30',
  'mailing dates are derived by the database for the approved transition'
);

SELECT lives_ok(
  $sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'generated_dispute_letters',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79140000-0000-4000-8000-000000000041']::uuid[]
    )
  $sql$,
  'server atomically advances a generated letter and its linked round'
);

SELECT ok(
  (
    SELECT letter.status = 'sent'
      AND letter.mailed_at IS NOT NULL
      AND round_record.status = 'sent'
      AND round_record.mailed_at IS NOT NULL
      AND round_record.follow_up_date = round_record.mailed_at + interval '30 days'
    FROM public.generated_dispute_letters AS letter
    JOIN public.dispute_rounds AS round_record ON round_record.id = letter.round_id
    WHERE letter.id = '79140000-0000-4000-8000-000000000041'
  ),
  'generated-letter and linked-round mailing state is derived in one transaction'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    SELECT public.mark_dispute_letters_mailed_server(
      NULL::text,
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79130000-0000-4000-8000-000000000031']::uuid[]
    )
  $sql$),
  '22023',
  'a null letter source is rejected instead of falling through to another table'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'generated_dispute_letters',
      '79200000-0000-4000-8000-000000000002',
      '79220000-0000-4000-8000-000000000022',
      '79210000-0000-4000-8000-000000000012',
      ARRAY['79140000-0000-4000-8000-000000000045']::uuid[]
    )
  $sql$),
  '42501',
  'the atomic transition rejects a cross-tenant letter identifier'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'generated_dispute_letters',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79140000-0000-4000-8000-000000000048']::uuid[]
    )
  $sql$),
  '23514',
  'a closed generated letter cannot move backward to sent'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'generated_dispute_letters',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79140000-0000-4000-8000-000000000046']::uuid[]
    )
  $sql$),
  '23514',
  'a linked closed round cannot move backward to sent'
);

SELECT ok(
  (
    SELECT letter.status = 'generated' AND round_record.status = 'closed'
    FROM public.generated_dispute_letters AS letter
    JOIN public.dispute_rounds AS round_record ON round_record.id = letter.round_id
    WHERE letter.id = '79140000-0000-4000-8000-000000000046'
  ),
  'closed-round rejection leaves both letter and round unchanged'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'generated_dispute_letters',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79140000-0000-4000-8000-000000000045']::uuid[]
    )
  $sql$),
  '23514',
  'a linked-round write failure aborts the atomic transition'
);

SELECT ok(
  (
    SELECT letter.status = 'generated'
      AND letter.mailed_at IS NULL
      AND round_record.status = 'generated'
      AND round_record.mailed_at IS NULL
    FROM public.generated_dispute_letters AS letter
    JOIN public.dispute_rounds AS round_record ON round_record.id = letter.round_id
    WHERE letter.id = '79140000-0000-4000-8000-000000000045'
  ),
  'a linked-round failure rolls back the generated-letter update without partial state'
);

SELECT lives_ok(
  $sql$
    SELECT public.mark_dispute_letters_mailed_server(
      'generated_dispute_letters',
      '79100000-0000-4000-8000-000000000001',
      '79120000-0000-4000-8000-000000000021',
      '79110000-0000-4000-8000-000000000011',
      ARRAY['79140000-0000-4000-8000-000000000047']::uuid[]
    )
  $sql$,
  'repeating an already-completed transition is safely idempotent'
);

SELECT ok(
  (
    SELECT letter.mailed_at = '2026-09-02T12:00:00Z'::timestamptz
      AND round_record.mailed_at = '2026-09-02T12:00:00Z'::timestamptz
      AND round_record.follow_up_date = '2026-10-02T12:00:00Z'::timestamptz
    FROM public.generated_dispute_letters AS letter
    JOIN public.dispute_rounds AS round_record ON round_record.id = letter.round_id
    WHERE letter.id = '79140000-0000-4000-8000-000000000047'
  ),
  'idempotent replay preserves the original letter and round mailing timestamps'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE public.dispute_letters
    SET letter_status = 'draft'
    WHERE id = '79130000-0000-4000-8000-000000000031'
  $sql$),
  '23514',
  'backward dispute-letter status transition fails'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE public.generated_dispute_letters
    SET status = 'closed'
    WHERE id = '79140000-0000-4000-8000-000000000044'
  $sql$),
  '23514',
  'unsupported generated-letter status transition fails'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE public.dispute_letters
    SET letter_status = 'sent', letter_content = 'Tampered while mailing'
    WHERE id = '79130000-0000-4000-8000-000000000034'
  $sql$),
  '23514',
  'mixed operational and substantive dispute-letter update fails atomically'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE public.generated_dispute_letters
    SET status = 'sent', items_summary = '{"paragraphs":[],"enclosures":["invented.pdf"]}'::jsonb
    WHERE id = '79140000-0000-4000-8000-000000000044'
  $sql$),
  '23514',
  'mixed operational and provenance mutation fails atomically'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    DELETE FROM public.dispute_letters
    WHERE id = '79130000-0000-4000-8000-000000000034'
  $sql$),
  1::bigint,
  'trusted server may delete an unsent draft'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    DELETE FROM public.dispute_letters
    WHERE id = '79130000-0000-4000-8000-000000000031'
  $sql$),
  1::bigint,
  'trusted server retains sent-letter access for authorized lifecycle and data-erasure operations'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    DELETE FROM public.generated_dispute_letters
    WHERE id IN (
      '79140000-0000-4000-8000-000000000041',
      '79140000-0000-4000-8000-000000000044'
    )
  $sql$),
  2::bigint,
  'trusted server retains generated-letter access for authorized lifecycle and data-erasure operations'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)
    FROM preserved_letter_hashes AS expected
    JOIN LATERAL (
      SELECT md5(to_jsonb(row_value)::text) AS row_hash
      FROM public.dispute_letters AS row_value
      WHERE expected.source = 'dispute_letters' AND row_value.id = expected.id
      UNION ALL
      SELECT md5(to_jsonb(row_value)::text)
      FROM public.generated_dispute_letters AS row_value
      WHERE expected.source = 'generated_dispute_letters' AND row_value.id = expected.id
    ) AS actual ON actual.row_hash = expected.row_hash
  ),
  2::bigint,
  'unrelated existing and historical letter rows remain byte-for-byte unchanged'
);

SELECT * FROM finish();
ROLLBACK;
