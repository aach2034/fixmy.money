BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

CREATE OR REPLACE FUNCTION pg_temp.statement_raises(statement text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN true;
END;
$$;

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.activate_workspace_free_trial_server(uuid,uuid,text)', 'EXECUTE'),
  'browser roles cannot activate a trial'
);
SELECT ok(
  has_function_privilege('service_role', 'public.activate_workspace_free_trial_server(uuid,uuid,text)', 'EXECUTE'),
  'trusted server role can activate a trial after application checks'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, created_at, updated_at
) VALUES (
  '71000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'trial-owner@local.invalid',
  crypt('SyntheticTrialOnly!', gen_salt('bf')), '', '', '', '', '', '', '', '',
  CURRENT_TIMESTAMP,
  '{"full_name":"Trial Owner","company_name":"Trial Agency","plan":"professional"}',
  '{"provider":"email","providers":["email"]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

UPDATE public.user_profiles SET onboarding_completed = true
WHERE id = '71000000-0000-4000-8000-000000000001';

SELECT lives_ok(format(
  'SELECT public.activate_workspace_free_trial_server(%L, %L, %L)',
  '71000000-0000-4000-8000-000000000001',
  (SELECT id FROM public.workspaces WHERE owner_id = '71000000-0000-4000-8000-000000000001'),
  'professional'
), 'verified onboarding activates the selected business trial');

SELECT is(
  (SELECT count(*) FROM public.workspace_entitlements e
   JOIN public.workspaces w ON w.id = e.workspace_id
   WHERE w.owner_id = '71000000-0000-4000-8000-000000000001'
     AND e.access_state = 'trial' AND e.trial_source = 'application'
     AND e.stripe_status = 'none' AND e.stripe_customer_id IS NULL
     AND e.stripe_subscription_id IS NULL
     AND e.plan_id = 'professional'
     AND e.free_trial_ends_at = e.free_trial_started_at + interval '30 days'),
  1::bigint,
  'trial grants exactly 30 days without creating Stripe billing state'
);

SELECT lives_ok(format(
  'SELECT public.activate_workspace_free_trial_server(%L, %L, %L)',
  '71000000-0000-4000-8000-000000000001',
  (SELECT id FROM public.workspaces WHERE owner_id = '71000000-0000-4000-8000-000000000001'),
  'professional'
), 'same request is idempotent and does not restart the trial');

SELECT ok(pg_temp.statement_raises(format(
  'SELECT public.activate_workspace_free_trial_server(%L, %L, %L)',
  '71000000-0000-4000-8000-000000000001',
  (SELECT id FROM public.workspaces WHERE owner_id = '71000000-0000-4000-8000-000000000001'),
  'agency'
)), 'changing plans cannot restart or replace the claimed trial');

SELECT ok(pg_temp.statement_raises(format(
  'UPDATE public.workspace_entitlements SET free_trial_ends_at = free_trial_ends_at + interval ''1 day'' WHERE workspace_id = %L',
  (SELECT id FROM public.workspaces WHERE owner_id = '71000000-0000-4000-8000-000000000001')
)), 'trial timestamps are immutable after activation');

SELECT * FROM finish();
ROLLBACK;
