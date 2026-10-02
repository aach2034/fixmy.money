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
  ('08000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@fmm008.invalid', crypt('SyntheticFmm008Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM008 Admin","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('08000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer@fmm008.invalid', crypt('SyntheticFmm008Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM008 Customer","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now()),
  ('08000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactive@fmm008.invalid', crypt('SyntheticFmm008Only!', gen_salt('bf')), '', '', '', '', '', '', '', '', now(), '{"full_name":"FMM008 Inactive","is_client":true}', '{"provider":"email","providers":["email"]}', now(), now());

INSERT INTO public.platform_admins (user_id, role, active, created_by, notes)
VALUES
  ('08000000-0000-4000-8000-000000000001', 'platform_superadmin', true, '08000000-0000-4000-8000-000000000001', 'Synthetic FMM-008 active admin'),
  ('08000000-0000-4000-8000-000000000003', 'platform_admin', false, '08000000-0000-4000-8000-000000000001', 'Synthetic FMM-008 inactive admin');

INSERT INTO public.stripe_webhook_events (
  stripe_event_id, event_type, object_key, stripe_created_at, payload, status,
  attempt_count, processed_at
)
VALUES
  ('evt_fmm008_replay', 'customer.subscription.updated', 'subscription:replay', now(), '{}'::jsonb, 'succeeded', 1, now()),
  ('evt_fmm008_close', 'invoice.upcoming', 'invoice:close', now(), '{}'::jsonb, 'succeeded', 1, now()),
  ('evt_fmm008_atomic', 'checkout.session.completed', 'checkout:atomic', now(), '{}'::jsonb, 'succeeded', 1, now());

INSERT INTO public.billing_email_outbox (
  id, source_stripe_event_id, dedupe_key, email_type, recipient, payload,
  status, attempt_count, max_attempts, last_error, dead_lettered_at
)
VALUES
  ('08000000-0000-4000-8000-000000000011', 'evt_fmm008_replay', 'evt_fmm008_replay:subscription_started', 'subscription_started', 'customer@fmm008.invalid', '{"type":"subscription_started","to":"customer@fmm008.invalid"}'::jsonb, 'dead_letter', 8, 8, 'EMAIL_DELIVERY_FAILED', now()),
  ('08000000-0000-4000-8000-000000000012', 'evt_fmm008_close', 'evt_fmm008_close:renewal_reminder', 'renewal_reminder', 'customer@fmm008.invalid', '{"type":"renewal_reminder","to":"customer@fmm008.invalid"}'::jsonb, 'dead_letter', 8, 8, 'EMAIL_DELIVERY_FAILED', now()),
  ('08000000-0000-4000-8000-000000000013', 'evt_fmm008_atomic', 'evt_fmm008_atomic:trial_confirmation', 'trial_confirmation', 'customer@fmm008.invalid', '{"type":"trial_confirmation","to":"customer@fmm008.invalid"}'::jsonb, 'dead_letter', 8, 8, 'EMAIL_DELIVERY_FAILED', now());

INSERT INTO public.webhook_failures (stripe_event_id, event_type, error_message, retry_count, resolved, dead_lettered_at)
VALUES ('email:evt_fmm008_close:renewal_reminder', 'email.renewal_reminder', 'EMAIL_DELIVERY_FAILED', 8, false, now());

SELECT ok(
  pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'billing_email_outbox_status_check'))
    ILIKE '%cancelled%',
  'outbox terminal states include explicit cancellation'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.admin_replay_billing_email_atomic(uuid,uuid,text,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.admin_close_billing_email_atomic(uuid,uuid,text,uuid)', 'EXECUTE'),
  'browser roles cannot replay or close billing email dead letters'
);
SELECT ok(
  has_function_privilege('service_role', 'public.admin_replay_billing_email_atomic(uuid,uuid,text,uuid)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public.admin_close_billing_email_atomic(uuid,uuid,text,uuid)', 'EXECUTE'),
  'trusted service role receives the two operational controls'
);

SELECT lives_ok(
  $$SELECT public.admin_replay_billing_email_atomic(
    '08000000-0000-4000-8000-000000000011',
    '08000000-0000-4000-8000-000000000001',
    'Current subscription notice remains accurate.',
    '08000000-0000-4000-8000-000000000021'
  )$$,
  'a dead letter can be replayed with an active administrator and reason'
);
SELECT is(
  (SELECT status || ':' || attempt_count::text FROM public.billing_email_outbox WHERE id = '08000000-0000-4000-8000-000000000011'),
  'pending:0',
  'replay resets the bounded delivery state without claiming success'
);
SELECT is(
  (SELECT count(*) FROM public.admin_action_audit_logs WHERE request_id = '08000000-0000-4000-8000-000000000021'),
  1::bigint,
  'replay creates exactly one append-only audit record'
);
SELECT lives_ok(
  $$SELECT public.admin_replay_billing_email_atomic(
    '08000000-0000-4000-8000-000000000011',
    '08000000-0000-4000-8000-000000000001',
    'Current subscription notice remains accurate.',
    '08000000-0000-4000-8000-000000000021'
  )$$,
  'an exact replay request retry is idempotent'
);

SELECT lives_ok(
  $$SELECT public.admin_close_billing_email_atomic(
    '08000000-0000-4000-8000-000000000012',
    '08000000-0000-4000-8000-000000000001',
    'Renewal date passed; sending now would mislead.',
    '08000000-0000-4000-8000-000000000022'
  )$$,
  'an obsolete dead letter can be explicitly closed'
);
SELECT is(
  (SELECT status FROM public.billing_email_outbox WHERE id = '08000000-0000-4000-8000-000000000012'),
  'cancelled',
  'closure is a distinct terminal state rather than a simulated send'
);
SELECT ok(
  (SELECT closed_at IS NOT NULL AND closed_by = '08000000-0000-4000-8000-000000000001'::uuid
   FROM public.billing_email_outbox WHERE id = '08000000-0000-4000-8000-000000000012'),
  'closure records the responsible administrator and time'
);
SELECT ok(
  (SELECT resolved FROM public.webhook_failures WHERE stripe_event_id = 'email:evt_fmm008_close:renewal_reminder'),
  'closure resolves the linked operational failure'
);
SELECT is(
  (SELECT count(*) FROM public.admin_action_audit_logs WHERE request_id = '08000000-0000-4000-8000-000000000022'),
  1::bigint,
  'closure creates exactly one append-only audit record'
);
SELECT lives_ok(
  $$SELECT public.admin_close_billing_email_atomic(
    '08000000-0000-4000-8000-000000000012',
    '08000000-0000-4000-8000-000000000001',
    'Renewal date passed; sending now would mislead.',
    '08000000-0000-4000-8000-000000000022'
  )$$,
  'an exact close request retry is idempotent'
);

SELECT throws_ok(
  $$SELECT public.admin_close_billing_email_atomic(
    '08000000-0000-4000-8000-000000000013',
    '08000000-0000-4000-8000-000000000003',
    'This request must be rejected for inactive admin.',
    '08000000-0000-4000-8000-000000000023'
  )$$,
  'An active platform administrator is required.',
  'inactive administrators cannot resolve dead letters'
);
SELECT is(
  (SELECT status FROM public.billing_email_outbox WHERE id = '08000000-0000-4000-8000-000000000013'),
  'dead_letter',
  'a rejected administrator leaves the dead letter unchanged'
);

CREATE FUNCTION pg_temp.reject_fmm008_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.request_id = '08000000-0000-4000-8000-000000000024'::uuid THEN
    RAISE EXCEPTION 'forced audit failure';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reject_fmm008_audit
  BEFORE INSERT ON public.admin_action_audit_logs
  FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_fmm008_audit();
SELECT throws_ok(
  $$SELECT public.admin_close_billing_email_atomic(
    '08000000-0000-4000-8000-000000000013',
    '08000000-0000-4000-8000-000000000001',
    'Stale trial message should be closed atomically.',
    '08000000-0000-4000-8000-000000000024'
  )$$,
  'forced audit failure',
  'audit failure aborts the closure statement'
);
SELECT is(
  (SELECT status FROM public.billing_email_outbox WHERE id = '08000000-0000-4000-8000-000000000013'),
  'dead_letter',
  'queue state rolls back when its audit insert fails'
);

SELECT * FROM finish();
ROLLBACK;
