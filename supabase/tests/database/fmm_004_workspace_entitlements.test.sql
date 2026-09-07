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
  to_regclass('public.workspace_entitlements') IS NOT NULL,
  'workspace entitlement authority exists'
);

SELECT is(
  (SELECT count(*) FROM public.workspace_entitlements),
  (SELECT count(*) FROM public.workspaces),
  'the additive migration preserves one entitlement row per existing workspace'
);

SELECT ok(
  (SELECT relation.relrowsecurity
   FROM pg_class AS relation
   JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
   WHERE namespace.nspname = 'public'
     AND relation.relname = 'workspace_entitlements'),
  'workspace entitlements has RLS enabled'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.workspace_entitlements', 'SELECT'),
  'anonymous users cannot read billing authority rows'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.workspace_entitlements', 'SELECT'),
  'authenticated users cannot read billing authority rows directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.workspace_entitlements', 'INSERT,UPDATE,DELETE'),
  'authenticated users cannot mutate billing authority rows'
);

SELECT ok(
  has_table_privilege('service_role', 'public.workspace_entitlements', 'SELECT,INSERT,UPDATE,DELETE'),
  'only the trusted service role can manage billing authority rows'
);

SELECT is(
  (SELECT count(*)
   FROM public.workspace_entitlements
   WHERE access_state IN ('active', 'trial', 'grace')
     AND last_verified_at IS NULL),
  0::bigint,
  'unverified legacy billing data never grants access'
);

SELECT ok(
  pg_get_constraintdef(
    (SELECT oid FROM pg_constraint
     WHERE conname = 'workspace_entitlements_verified_access_shape')
  ) ILIKE '%last_verified_at IS NOT NULL%',
  'database constraints prohibit an unverified access grant'
);

SELECT is(
  (SELECT count(*)
   FROM public.workspace_entitlements
   WHERE access_state = 'active'
     AND (stripe_status <> 'active' OR current_period_ends_at IS NULL)),
  0::bigint,
  'active access rows have an active Stripe shape'
);

SELECT is(
  (SELECT count(*)
   FROM public.workspace_entitlements
   WHERE access_state = 'trial'
     AND (stripe_status <> 'trialing' OR trial_ends_at IS NULL)),
  0::bigint,
  'trial access rows have a trialing Stripe shape'
);

SELECT is(
  (SELECT count(*)
   FROM public.workspace_entitlements
   WHERE access_state = 'grace'
     AND (stripe_status <> 'past_due' OR grace_ends_at IS NULL)),
  0::bigint,
  'grace access rows have a bounded past-due shape'
);

SELECT is(
  (SELECT count(*) - count(DISTINCT stripe_customer_id)
   FROM public.workspace_entitlements
   WHERE stripe_customer_id IS NOT NULL),
  0::bigint,
  'a Stripe customer cannot be bound to multiple workspaces'
);

SELECT is(
  (SELECT count(*) - count(DISTINCT stripe_subscription_id)
   FROM public.workspace_entitlements
   WHERE stripe_subscription_id IS NOT NULL),
  0::bigint,
  'a Stripe subscription cannot be bound to multiple workspaces'
);

SET LOCAL ROLE anon;
SELECT ok(
  pg_temp.statement_raises('SELECT * FROM public.workspace_entitlements'),
  'anonymous access is rejected at the grant layer'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT ok(
  pg_temp.statement_raises('SELECT * FROM public.workspace_entitlements'),
  'signed-in users cannot bypass the server-side entitlement endpoint'
);
RESET ROLE;

SELECT ok(
  pg_get_functiondef('public.current_workspace_context()'::regprocedure)
    ILIKE '%LEFT JOIN public.workspace_entitlements%',
  'workspace context uses the new authority without hiding uninitialized workspaces'
);

SELECT ok(
  pg_get_functiondef('public.current_workspace_context()'::regprocedure)
    NOT ILIKE '%owner_profile.subscription_status%',
  'workspace context no longer trusts legacy profile billing state'
);

SELECT ok(
  pg_get_functiondef('public.current_workspace_context()'::regprocedure)
    ILIKE '%last_verified_at%1 hour%',
  'workspace context also expires stale entitlement verification'
);

SELECT * FROM finish();
ROLLBACK;
