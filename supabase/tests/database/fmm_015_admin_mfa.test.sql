BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, email_confirmed_at, raw_user_meta_data,
  raw_app_meta_data, created_at, updated_at
)
VALUES
  ('15000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@fmm015.invalid', crypt('SyntheticFmm015Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM015 Admin","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('15000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactive-admin@fmm015.invalid', crypt('SyntheticFmm015Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM015 Inactive","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('15000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer@fmm015.invalid', crypt('SyntheticFmm015Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM015 Customer","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now());

INSERT INTO public.platform_admins (user_id, role, active, created_by, notes, mfa_factor_ids)
VALUES
  ('15000000-0000-0000-0000-000000000001', 'platform_superadmin', true, '15000000-0000-0000-0000-000000000001', 'Synthetic FMM-015 active admin', ARRAY['35000000-0000-4000-8000-000000000001'::uuid]),
  ('15000000-0000-0000-0000-000000000002', 'platform_admin', false, '15000000-0000-0000-0000-000000000001', 'Synthetic FMM-015 inactive admin', '{}'::uuid[]);

INSERT INTO auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
VALUES (
  '35000000-0000-4000-8000-000000000001', '15000000-0000-0000-0000-000000000001',
  'FMM-015 pgTAP factor', 'totp', 'verified', now(), now(), 'SYNTHETICPGTAPONLY'
);

INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, aal)
VALUES (
  '25000000-0000-4000-8000-000000000001', '15000000-0000-0000-0000-000000000001',
  now(), now(), '35000000-0000-4000-8000-000000000001', 'aal2'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'platform_admins'
      AND column_name = 'sessions_revoked_after'
      AND is_nullable = 'NO'
  ),
  'administrator session revocation epoch is mandatory'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_admins'
      AND column_name = 'revoked_session_ids' AND is_nullable = 'NO'
  ),
  'clock-independent revoked administrator session IDs are mandatory'
);

SELECT ok(
  pg_get_functiondef('private.is_active_platform_admin()'::regprocedure)
    ILIKE '%auth.jwt()%aal%aal2%',
  'central database administrator check requires AAL2'
);

SELECT is(
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname LIKE 'active_admins_%'
     AND coalesce(qual, with_check, '') NOT ILIKE '%is_active_platform_admin%'),
  0::bigint,
  'all positive active-admin policies use the central MFA-aware predicate'
);

SET LOCAL ROLE authenticated;

-- An ordinary customer remains in their own tenant and cannot reach either an
-- administrator row or another identity's profile, even with an AAL2 token.
SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2","session_id":"25000000-0000-4000-8000-000000000003","amr":[{"method":"password","timestamp":1800000000}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 0::bigint, 'role denial: an ordinary customer cannot read administrator membership');
SELECT is((SELECT count(*) FROM public.user_profiles WHERE id = '15000000-0000-0000-0000-000000000001'), 0::bigint, 'tenant denial: an ordinary customer cannot read another profile');

-- Active role without MFA must not be enough.
SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","session_id":"25000000-0000-4000-8000-000000000001","amr":[{"method":"password","timestamp":1800000000}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 0::bigint, 'MFA bypass denied: AAL1 active administrator cannot read admin rows');

SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000001","role":"authenticated","session_id":"25000000-0000-4000-8000-000000000001","amr":[{"method":"password","timestamp":1800000000}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 0::bigint, 'MFA bypass denied: missing AAL fails closed as AAL1');

-- MFA without an active database role must not be enough.
SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2","session_id":"25000000-0000-4000-8000-000000000002","amr":[{"method":"password","timestamp":1800000000}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 0::bigint, 'role denial: inactive administrator is denied at AAL2');

-- Only the conjunction of active role and verified MFA grants the admin view.
SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2","session_id":"25000000-0000-4000-8000-000000000001","amr":[{"method":"password","timestamp":1800000000}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 2::bigint, 'active AAL2 administrator can read administrator membership');

RESET ROLE;
UPDATE public.platform_admins
SET sessions_revoked_after = to_timestamp(1800000000)
WHERE user_id = '15000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2","session_id":"25000000-0000-4000-8000-000000000001","amr":[{"method":"password","timestamp":1800000000}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 0::bigint, 'revoked session is denied even while its signed access token remains unexpired');

SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2","session_id":"25000000-0000-4000-8000-000000000009","amr":[{"method":"password","timestamp":1800000001}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 2::bigint, 'new primary authentication after revocation restores eligible admin access');

RESET ROLE;

-- Exact-intent destructive authorization is consumed only once.
INSERT INTO public.admin_destructive_authorizations (
  nonce_hash, admin_id, session_id, action, target_id, material_hash, expires_at
)
VALUES (
  repeat('n', 43), '15000000-0000-0000-0000-000000000001',
  '25000000-0000-4000-8000-000000000001', 'refund_issue', 'refund-1',
  repeat('m', 43), clock_timestamp() + interval '2 minutes'
);
SELECT is(
  public.consume_admin_destructive_authorization(
    repeat('n', 43), '15000000-0000-0000-0000-000000000001',
    '25000000-0000-4000-8000-000000000001', 'refund_issue', 'refund-1', repeat('m', 43)
  ), true, 'matching destructive authorization is consumed atomically'
);
SELECT is(
  public.consume_admin_destructive_authorization(
    repeat('n', 43), '15000000-0000-0000-0000-000000000001',
    '25000000-0000-4000-8000-000000000001', 'refund_issue', 'refund-1', repeat('m', 43)
  ), false, 'destructive authorization nonce replay is denied'
);

INSERT INTO public.admin_destructive_authorizations (
  nonce_hash, admin_id, session_id, action, target_id, material_hash, expires_at
)
VALUES (
  repeat('x', 43), '15000000-0000-0000-0000-000000000001',
  '25000000-0000-4000-8000-000000000001', 'refund_issue', 'refund-2',
  repeat('y', 43), clock_timestamp() + interval '2 minutes'
);
SELECT is(
  public.consume_admin_destructive_authorization(
    repeat('x', 43), '15000000-0000-0000-0000-000000000001',
    '25000000-0000-4000-8000-000000000001', 'customer_data_deletion', 'refund-2', repeat('y', 43)
  ), false, 'destructive authorization action mismatch is denied'
);
SELECT is(
  (SELECT count(*) FROM public.admin_destructive_authorizations WHERE nonce_hash = repeat('x', 43)),
  1::bigint, 'intent mismatch does not consume another authorization'
);

-- Explicit session IDs prevent Auth/application/database clock skew from
-- rescuing a JWT that was already issued when revocation occurred.
SELECT public.revoke_platform_admin_sessions(
  '15000000-0000-0000-0000-000000000001',
  'admin_sessions_revoked_test',
  '{"source":"pgtap"}'::jsonb
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2","session_id":"25000000-0000-4000-8000-000000000001","amr":[{"method":"password","timestamp":4102444800}]}', true);
SELECT is((SELECT count(*) FROM public.platform_admins), 0::bigint, 'clock skew cannot rescue an explicitly revoked session ID');
RESET ROLE;

INSERT INTO auth.audit_log_entries (id, payload)
VALUES (
  '45000000-0000-4000-8000-000000000001',
  '{"action":"factor_unenrolled","actor_id":"15000000-0000-0000-0000-000000000001","log_type":"factor","traits":{"factor_id":"35000000-0000-4000-8000-000000000001","factor_status":"verified","session_id":"25000000-0000-4000-8000-000000000001"}}'::json
);
SELECT ok(
  '25000000-0000-4000-8000-000000000001'::uuid = ANY((
    (SELECT revoked_session_ids FROM public.platform_admins
     WHERE user_id = '15000000-0000-0000-0000-000000000001')
  )::uuid[]),
  'provider-side factor removal advances authoritative session revocation state'
);
SELECT is(
  (SELECT count(*) FROM public.admin_action_audit_logs
   WHERE admin_id = '15000000-0000-0000-0000-000000000001'
     AND action = 'admin_mfa_factor_removed_and_sessions_revoked'),
  1::bigint, 'provider-side factor removal creates one security audit event'
);
SELECT is(
  cardinality((SELECT mfa_factor_ids FROM public.platform_admins
               WHERE user_id = '15000000-0000-0000-0000-000000000001')),
  0, 'provider-side factor removal clears authoritative MFA eligibility'
);
SELECT is(
  public.revoke_platform_admin_factor(
    '15000000-0000-0000-0000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    'application_fallback', NULL
  ),
  false, 'server fallback is a no-op after the Auth audit event already revoked the factor'
);
SELECT is(
  (SELECT count(*) FROM public.admin_action_audit_logs
   WHERE admin_id = '15000000-0000-0000-0000-000000000001'
     AND action = 'admin_mfa_factor_removed_and_sessions_revoked'),
  1::bigint, 'server fallback does not duplicate the factor-removal audit event'
);

SELECT lives_ok(
  $$SELECT public.admin_update_customer_classification_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'qa', true, 'synthetic classification',
    '55000000-0000-4000-8000-000000000001'
  )$$,
  'classification mutation and audit commit together'
);
SELECT is(
  (SELECT customer_type FROM public.user_profiles WHERE id = '15000000-0000-0000-0000-000000000003'),
  'qa', 'classification mutation committed'
);
SELECT is(
  (SELECT count(*) FROM public.admin_action_audit_logs
   WHERE customer_id = '15000000-0000-0000-0000-000000000003'
     AND action = 'admin_customer_classification_updated'),
  1::bigint, 'classification mutation creates exactly one matching audit event'
);
SELECT lives_ok(
  $$SELECT public.admin_update_customer_classification_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'qa', true, 'synthetic classification',
    '55000000-0000-4000-8000-000000000001'
  )$$,
  'classification exact retry is idempotent'
);
SELECT is(
  (SELECT count(*) FROM public.admin_action_audit_logs
   WHERE request_id = '55000000-0000-4000-8000-000000000001'),
  1::bigint, 'classification retry retains exactly one matching audit event'
);
SELECT throws_ok(
  $$SELECT public.admin_update_customer_classification_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'real', false, 'different intent',
    '55000000-0000-4000-8000-000000000001'
  )$$,
  'Classification mutation request ID was already used for another intent.',
  'classification request ID cannot be reused for another intent'
);

SELECT lives_ok(
  $$SELECT public.admin_update_retention_alert_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'synthetic-retry-alert', 'dismissed', NULL, 'synthetic retention',
    '55000000-0000-4000-8000-000000000002'
  )$$,
  'retention mutation and audit commit together'
);
SELECT lives_ok(
  $$SELECT public.admin_update_retention_alert_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'synthetic-retry-alert', 'dismissed', NULL, 'synthetic retention',
    '55000000-0000-4000-8000-000000000002'
  )$$,
  'retention exact retry is idempotent'
);
SELECT is(
  (SELECT count(*) FROM public.admin_action_audit_logs
   WHERE request_id = '55000000-0000-4000-8000-000000000002'),
  1::bigint, 'retention retry retains exactly one matching audit event'
);
SELECT throws_ok(
  $$SELECT public.admin_update_retention_alert_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'synthetic-retry-alert', 'contacted', NULL, 'different intent',
    '55000000-0000-4000-8000-000000000002'
  )$$,
  'Retention mutation request ID was already used for another intent.',
  'retention request ID cannot be reused for another intent'
);

CREATE FUNCTION pg_temp.reject_fmm015_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'forced audit failure';
END;
$$;
CREATE TRIGGER reject_fmm015_audit
BEFORE INSERT ON public.admin_action_audit_logs
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_fmm015_audit();

SELECT throws_ok(
  $$SELECT public.admin_update_customer_classification_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'real', false, 'must roll back',
    '55000000-0000-4000-8000-000000000003'
  )$$,
  'forced audit failure',
  'classification audit failure is returned to the caller'
);
SELECT is(
  (SELECT customer_type FROM public.user_profiles WHERE id = '15000000-0000-0000-0000-000000000003'),
  'qa', 'classification rolls back when audit insert fails'
);

SELECT throws_ok(
  $$SELECT public.admin_update_retention_alert_atomic(
    '15000000-0000-0000-0000-000000000001',
    '15000000-0000-0000-0000-000000000003',
    'synthetic-alert', 'dismissed', NULL, 'must roll back',
    '55000000-0000-4000-8000-000000000004'
  )$$,
  'forced audit failure',
  'retention audit failure is returned to the caller'
);
SELECT is(
  (SELECT count(*) FROM public.admin_retention_alert_states
   WHERE customer_id = '15000000-0000-0000-0000-000000000003'
     AND alert_key = 'synthetic-alert'),
  0::bigint, 'retention mutation rolls back when audit insert fails'
);
DROP TRIGGER reject_fmm015_audit ON public.admin_action_audit_logs;

SELECT * FROM finish();
ROLLBACK;
