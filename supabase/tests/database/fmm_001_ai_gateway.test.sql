BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

SELECT ok(
  to_regclass('public.ai_usage_events') IS NOT NULL,
  'server-owned AI usage ledger exists'
);

SELECT ok(
  to_regclass('public.ai_usage_events_legacy_fmm001') IS NOT NULL,
  'legacy AI usage ledger is preserved'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.ai_usage_events_legacy_fmm001',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'authenticated clients cannot access the preserved legacy ledger'
);

SELECT ok(
  (SELECT relation.relrowsecurity
   FROM pg_class AS relation
   JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
   WHERE namespace.nspname = 'public'
     AND relation.relname = 'ai_usage_events'),
  'AI usage ledger has RLS enabled'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.ai_usage_events', 'SELECT,INSERT,UPDATE,DELETE'),
  'anonymous clients have no AI usage ledger privileges'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.ai_usage_events', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated clients cannot read or forge AI usage'
);

SELECT ok(
  has_table_privilege('service_role', 'public.ai_usage_events', 'SELECT,INSERT,UPDATE'),
  'trusted server role can maintain AI usage accounting'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.reserve_ai_usage(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,integer,integer)',
    'EXECUTE'
  ),
  'authenticated clients cannot invoke the admission function'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.finalize_ai_usage(uuid,text,integer,integer,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot finalize or falsify usage'
);

SELECT ok(
  pg_get_functiondef(
    'public.reserve_ai_usage(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure
  ) ILIKE '%pg_advisory_xact_lock%',
  'request, quota, and concurrency admission is serialized per workspace'
);

SELECT ok(
  pg_get_functiondef(
    'public.reserve_ai_usage(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure
  ) ILIKE '%membership.status = ''active''%',
  'database admission independently requires active workspace membership'
);

SELECT ok(
  pg_get_functiondef(
    'public.reserve_ai_usage(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure
  ) ILIKE '%AI_CONCURRENCY_LIMIT%'
  AND pg_get_functiondef(
    'public.reserve_ai_usage(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure
  ) ILIKE '%AI_RATE_LIMIT%'
  AND pg_get_functiondef(
    'public.reserve_ai_usage(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure
  ) ILIKE '%AI_TOKEN_QUOTA%',
  'database admission enforces concurrency, request rate, and token quotas'
);

SELECT * FROM finish();
ROLLBACK;
