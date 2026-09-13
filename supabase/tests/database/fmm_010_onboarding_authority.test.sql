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
  has_table_privilege('authenticated', 'public.user_profiles', 'SELECT'),
  'authenticated users retain read access to their own profile'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.user_profiles', 'UPDATE'),
  'authenticated users retain ordinary profile-edit access'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.user_profiles', 'INSERT'),
  'authenticated browsers cannot insert a replacement profile row'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.user_profiles', 'DELETE'),
  'authenticated browsers cannot delete their profile row'
);

SELECT is(
  (
    SELECT count(*)
    FROM unnest(ARRAY['anon', 'authenticated']) AS api_role(role_name)
    CROSS JOIN unnest(ARRAY['INSERT', 'DELETE']) AS forbidden(privilege)
    WHERE has_table_privilege(api_role.role_name, 'public.user_profiles', forbidden.privilege)
  ),
  0::bigint,
  'neither API role inherits profile insert or delete through PUBLIC'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND cmd IN ('ALL', 'INSERT', 'DELETE')
      AND (
        roles @> ARRAY['authenticated']::name[]
        OR roles @> ARRAY['public']::name[]
      )
  ),
  0::bigint,
  'no RLS policy authorizes browser insert, delete, or generic ALL access'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname IN ('users_read_own_user_profile', 'users_update_own_user_profile')
      AND roles = ARRAY['authenticated']::name[]
      AND qual ILIKE '%auth.uid()%'
      AND (cmd = 'SELECT' OR with_check ILIKE '%auth.uid()%')
  ),
  2::bigint,
  'read and update policies remain scoped to the authenticated user id'
);

SELECT ok(
  (
    SELECT count(*)
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS required(privilege)
    WHERE has_table_privilege('service_role', 'public.user_profiles', required.privilege)
  ) = 4,
  'trusted service role retains profile lifecycle privileges'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, created_at, updated_at
)
VALUES (
  '61000000-0000-4000-8000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'fmm010-authority@local.invalid',
  crypt('SyntheticFmm010Only!', gen_salt('bf')),
  '', '', '', '', '', '', '', '',
  CURRENT_TIMESTAMP,
  '{"full_name":"FMM010 Authority"}',
  '{"provider":"email","providers":["email"]}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000010","role":"authenticated"}',
  true
);

SELECT is(
  (SELECT count(*) FROM public.user_profiles),
  1::bigint,
  'authenticated user can read only the matching profile row'
);

SELECT is(
  pg_temp.statement_row_count($sql$
    UPDATE public.user_profiles
    SET full_name = 'Updated FMM010 Authority'
    WHERE id = '61000000-0000-4000-8000-000000000010'
  $sql$),
  1::bigint,
  'ordinary self-profile edits remain available'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    UPDATE public.user_profiles
    SET onboarding_completed = true,
        onboarding_company_completed = true
    WHERE id = '61000000-0000-4000-8000-000000000010'
  $sql$),
  'P0001',
  'browser updates cannot advance onboarding completion flags'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    DELETE FROM public.user_profiles
    WHERE id = '61000000-0000-4000-8000-000000000010'
  $sql$),
  '42501',
  'browser cannot delete its profile to prepare a replacement-row bypass'
);

SELECT is(
  pg_temp.statement_sqlstate($sql$
    INSERT INTO public.user_profiles (
      id, email, onboarding_completed, onboarding_company_completed
    ) VALUES (
      '61000000-0000-4000-8000-000000000010',
      'fmm010-authority@local.invalid',
      true,
      true
    )
  $sql$),
  '42501',
  'browser cannot insert a profile pre-marked as onboarding complete'
);

RESET ROLE;

SELECT is(
  (
    SELECT onboarding_completed::text || ':' || onboarding_company_completed::text
    FROM public.user_profiles
    WHERE id = '61000000-0000-4000-8000-000000000010'
  ),
  'false:false',
  'denied bypass attempts leave both authoritative completion flags false'
);

SELECT * FROM finish();
ROLLBACK;
