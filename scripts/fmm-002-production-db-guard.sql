\set ON_ERROR_STOP on

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;

SET LOCAL search_path = '';
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

SELECT pg_catalog.set_config('fmm002.guard_mode', :'guard_mode', true);
SELECT pg_catalog.set_config('fmm002.expected_database', :'expected_database', true);

DO $guard$
DECLARE
  v_mode text := pg_catalog.current_setting('fmm002.guard_mode');
  v_expected_database text := pg_catalog.current_setting('fmm002.expected_database');
  v_expected_pre_versions constant text[] := ARRAY[
    '20260805161853', '20260812034808', '20260812034953',
    '20260812035104', '20260813221718', '20260813221952',
    '20260823190143', '20260829214723', '20260902032551',
    '20260902034124', '20260903024247', '20260903024321',
    '20260903091603', '20260903092257', '20260903165041',
    '20260903165215', '20260903192405', '20260903222256',
    '20260903223300', '20260903230920', '20260904002426',
    '20260904002523', '20260904003807', '20260904003919',
    '20260904010628', '20260904124210', '20260905023201',
    '20260910005214', '20260910034145', '20260912105022',
    '20260913215428', '20260913234809'
  ]::text[];
  v_expected_post_versions constant text[] := ARRAY[
    '20260805161853', '20260812034808', '20260812034953',
    '20260812035104', '20260813221718', '20260813221952',
    '20260823190143', '20260826110000', '20260829214723',
    '20260902032551', '20260902034124', '20260903024247',
    '20260903024321', '20260903091603', '20260903092257',
    '20260903165041', '20260903165215', '20260903181039',
    '20260903192405', '20260903222256', '20260903223300',
    '20260903230920', '20260904002426', '20260904002523',
    '20260904003807', '20260904003919', '20260904010628',
    '20260904124210', '20260905023201', '20260910005214',
    '20260910034145', '20260912105022', '20260913215428',
    '20260913234809'
  ]::text[];
  v_versions text[];
  v_schema_tables bigint;
  v_schema_columns bigint;
  v_schema_constraints bigint;
  v_schema_indexes bigint;
  v_schema_trigger_events bigint;
  v_schema_policies bigint;
  v_schema_functions bigint;
  v_unvalidated_constraints bigint;
  v_fingerprint text;
  v_fingerprint_lines bigint;
  v_parsed_total bigint;
  v_parsed_raw_rows bigint;
  v_parsed_raw_chars bigint;
  v_negative_total bigint;
  v_negative_raw_rows bigint;
  v_negative_raw_chars bigint;
  v_credit_report_snapshots bigint;
  v_report_snapshots bigint;
  v_credit_accounts bigint;
  v_bureau_tradelines bigint;
  v_ai_usage_events bigint;
  v_nested_parsed_rows bigint;
  v_nested_parsed_occurrences bigint;
  v_nested_credit_report_snapshot_rows bigint;
  v_nested_credit_report_snapshot_occurrences bigint;
  v_nested_other_rows bigint;
  v_nested_other_occurrences bigint;
  v_target_constraints bigint;
  v_certified_columns bigint;
  v_certified_constraints bigint;
  v_certified_indexes bigint;
  v_certified_triggers bigint;
  v_certified_policies bigint;
  v_certified_rows bigint;
  v_reserve_oid oid;
  v_reserve_config text[];
  v_reserve_security_definer boolean;
  v_reserve_execute_acl_count bigint;
  v_reserve_public_execute boolean;
  v_reserve_anon_execute boolean;
  v_reserve_authenticated_execute boolean;
  v_reserve_service_execute boolean;
  v_operation_check text;
BEGIN
  IF v_mode NOT IN ('preflight', 'postflight') THEN
    RAISE EXCEPTION 'FMM-002 guard stopped: unsupported mode %', v_mode;
  END IF;

  IF v_expected_database = '' OR pg_catalog.current_database() <> v_expected_database THEN
    RAISE EXCEPTION
      'FMM-002 guard stopped: connected database % does not equal explicitly expected %',
      pg_catalog.current_database(), v_expected_database;
  END IF;

  IF pg_catalog.current_setting('transaction_read_only') <> 'on' THEN
    RAISE EXCEPTION 'FMM-002 guard stopped: transaction is not read-only';
  END IF;

  IF extract(epoch FROM pg_catalog.current_setting('lock_timeout')::interval) <> 5
     OR extract(epoch FROM pg_catalog.current_setting('statement_timeout')::interval) <> 60
     OR extract(
          epoch FROM pg_catalog.current_setting('idle_in_transaction_session_timeout')::interval
        ) <> 60 THEN
    RAISE EXCEPTION 'FMM-002 guard stopped: guard timeouts are not 5s/60s/60s';
  END IF;

  IF pg_catalog.current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'FMM-002 guard stopped: rehearsal requires PostgreSQL major 17';
  END IF;

  IF pg_catalog.to_regrole('anon') IS NULL
     OR pg_catalog.to_regrole('authenticated') IS NULL
     OR pg_catalog.to_regrole('service_role') IS NULL THEN
    RAISE EXCEPTION 'FMM-002 guard stopped: required Supabase roles are absent';
  END IF;

  SELECT pg_catalog.array_agg(migration.version ORDER BY migration.version)
  INTO v_versions
  FROM supabase_migrations.schema_migrations AS migration;

  SELECT
    (SELECT pg_catalog.count(*)
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
    (SELECT pg_catalog.count(*)
     FROM information_schema.columns
     WHERE table_schema = 'public'),
    (SELECT pg_catalog.count(*)
     FROM pg_catalog.pg_constraint AS constraint_record
     JOIN pg_catalog.pg_namespace AS namespace_record
       ON namespace_record.oid = constraint_record.connamespace
     WHERE namespace_record.nspname = 'public'),
    (SELECT pg_catalog.count(*)
     FROM pg_catalog.pg_indexes
     WHERE schemaname = 'public'),
    (SELECT pg_catalog.count(*)
     FROM information_schema.triggers
     WHERE trigger_schema = 'public'),
    (SELECT pg_catalog.count(*)
     FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'),
    (SELECT pg_catalog.count(*)
     FROM pg_catalog.pg_proc AS procedure_record
     JOIN pg_catalog.pg_namespace AS namespace_record
       ON namespace_record.oid = procedure_record.pronamespace
     WHERE namespace_record.nspname = 'public'),
    (SELECT pg_catalog.count(*)
     FROM pg_catalog.pg_constraint AS constraint_record
     JOIN pg_catalog.pg_class AS relation_record
       ON relation_record.oid = constraint_record.conrelid
     JOIN pg_catalog.pg_namespace AS namespace_record
       ON namespace_record.oid = relation_record.relnamespace
     WHERE namespace_record.nspname = 'public'
       AND NOT constraint_record.convalidated)
  INTO
    v_schema_tables,
    v_schema_columns,
    v_schema_constraints,
    v_schema_indexes,
    v_schema_trigger_events,
    v_schema_policies,
    v_schema_functions,
    v_unvalidated_constraints;

  -- This hashes every migration-relevant relation definition, column,
  -- constraint, index, trigger, policy, normalized ACL, and helper definition.
  -- It deliberately contains no table data or secrets.
  WITH selected_relations(schema_name, relation_name) AS (
    VALUES
      ('public', 'parsed_credit_reports'),
      ('public', 'negative_items'),
      ('public', 'credit_report_snapshots'),
      ('public', 'report_snapshots'),
      ('public', 'credit_accounts'),
      ('public', 'bureau_tradelines'),
      ('public', 'ai_usage_events'),
      ('public', 'workspace_memberships'),
      ('public', 'staff_clients'),
      ('public', 'user_profiles'),
      ('public', 'dispute_letters'),
      ('public', 'generated_dispute_letters'),
      ('public', 'dispute_rounds'),
      ('public', 'certified_mailings'),
      ('storage', 'objects')
  ), selected_function_names(schema_name, function_name) AS (
    VALUES
      ('private', 'can_read_owner'),
      ('private', 'can_write_owner'),
      ('private', 'bind_selected_workspace_owner'),
      ('private', 'fmm002_contains_raw_report_artifact'),
      ('private', 'fmm002_strip_raw_report_artifacts'),
      ('public', 'reserve_ai_usage'),
      ('public', 'update_certified_mailings_updated_at')
  ), relations AS (
    SELECT
      namespace_record.nspname AS schema_name,
      relation_record.relname AS relation_name,
      relation_record.*
    FROM selected_relations AS selected
    JOIN pg_catalog.pg_namespace AS namespace_record
      ON namespace_record.nspname = selected.schema_name
    JOIN pg_catalog.pg_class AS relation_record
      ON relation_record.relnamespace = namespace_record.oid
     AND relation_record.relname = selected.relation_name
  ), procedures AS (
    SELECT
      namespace_record.nspname AS schema_name,
      procedure_record.*
    FROM selected_function_names AS selected
    JOIN pg_catalog.pg_namespace AS namespace_record
      ON namespace_record.nspname = selected.schema_name
    JOIN pg_catalog.pg_proc AS procedure_record
      ON procedure_record.pronamespace = namespace_record.oid
     AND procedure_record.proname = selected.function_name
  ), fingerprint_lines(line) AS (
    SELECT pg_catalog.format(
      'REL|%I.%I|kind=%s|owner=%I|rls=%s|force=%s|persistence=%s',
      relation.schema_name,
      relation.relation_name,
      relation.relkind,
      pg_catalog.pg_get_userbyid(relation.relowner),
      relation.relrowsecurity,
      relation.relforcerowsecurity,
      relation.relpersistence
    )
    FROM relations AS relation

    UNION ALL

    SELECT pg_catalog.format(
      'COL|%I.%I|%s|%s|notnull=%s|identity=%s|generated=%s|default=%s',
      relation.schema_name,
      relation.relation_name,
      attribute_record.attnum,
      attribute_record.attname,
      attribute_record.attnotnull,
      attribute_record.attidentity,
      attribute_record.attgenerated,
      COALESCE(
        pg_catalog.pg_get_expr(default_record.adbin, default_record.adrelid),
        '<null>'
      ) || '|type=' || pg_catalog.format_type(
        attribute_record.atttypid,
        attribute_record.atttypmod
      )
    )
    FROM relations AS relation
    JOIN pg_catalog.pg_attribute AS attribute_record
      ON attribute_record.attrelid = relation.oid
     AND attribute_record.attnum > 0
     AND NOT attribute_record.attisdropped
    LEFT JOIN pg_catalog.pg_attrdef AS default_record
      ON default_record.adrelid = relation.oid
     AND default_record.adnum = attribute_record.attnum

    UNION ALL

    SELECT pg_catalog.format(
      'CON|%I.%I|%s|type=%s|validated=%s|%s',
      relation.schema_name,
      relation.relation_name,
      constraint_record.conname,
      constraint_record.contype,
      constraint_record.convalidated,
      pg_catalog.pg_get_constraintdef(constraint_record.oid, false)
    )
    FROM relations AS relation
    JOIN pg_catalog.pg_constraint AS constraint_record
      ON constraint_record.conrelid = relation.oid

    UNION ALL

    SELECT pg_catalog.format(
      'IDX|%I.%I|%s|%s',
      relation.schema_name,
      relation.relation_name,
      index_relation.relname,
      pg_catalog.pg_get_indexdef(index_relation.oid)
    )
    FROM relations AS relation
    JOIN pg_catalog.pg_index AS index_record
      ON index_record.indrelid = relation.oid
    JOIN pg_catalog.pg_class AS index_relation
      ON index_relation.oid = index_record.indexrelid

    UNION ALL

    SELECT pg_catalog.format(
      'TRG|%I.%I|%s|%s',
      relation.schema_name,
      relation.relation_name,
      trigger_record.tgname,
      pg_catalog.pg_get_triggerdef(trigger_record.oid, false)
    )
    FROM relations AS relation
    JOIN pg_catalog.pg_trigger AS trigger_record
      ON trigger_record.tgrelid = relation.oid
     AND NOT trigger_record.tgisinternal

    UNION ALL

    SELECT pg_catalog.format(
      'POL|%I.%I|%s|permissive=%s|cmd=%s|roles=%s|using=%s|check=%s',
      relation.schema_name,
      relation.relation_name,
      policy_record.polname,
      policy_record.polpermissive,
      policy_record.polcmd,
      COALESCE((
        SELECT pg_catalog.string_agg(
          CASE
            WHEN role_oid = 0 THEN 'PUBLIC'
            ELSE pg_catalog.pg_get_userbyid(role_oid)
          END,
          ',' ORDER BY
            CASE
              WHEN role_oid = 0 THEN 'PUBLIC'
              ELSE pg_catalog.pg_get_userbyid(role_oid)
            END
        )
        FROM pg_catalog.unnest(policy_record.polroles) AS role_oid
      ), '<none>'),
      COALESCE(pg_catalog.pg_get_expr(policy_record.polqual, policy_record.polrelid), '<null>'),
      COALESCE(pg_catalog.pg_get_expr(policy_record.polwithcheck, policy_record.polrelid), '<null>')
    )
    FROM relations AS relation
    JOIN pg_catalog.pg_policy AS policy_record
      ON policy_record.polrelid = relation.oid

    UNION ALL

    SELECT pg_catalog.format(
      'RACL|%I.%I|grantor=%s|grantee=%s|privilege=%s|grantable=%s',
      relation.schema_name,
      relation.relation_name,
      pg_catalog.pg_get_userbyid(acl_record.grantor),
      CASE
        WHEN acl_record.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(acl_record.grantee)
      END,
      acl_record.privilege_type,
      acl_record.is_grantable
    )
    FROM relations AS relation
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(
        relation.relacl,
        pg_catalog.acldefault(
          CASE WHEN relation.relkind = 'S' THEN 's'::"char" ELSE 'r'::"char" END,
          relation.relowner
        )
      )
    ) AS acl_record

    UNION ALL

    SELECT pg_catalog.format(
      'FUN|%I.%I(%s)|owner=%I|result=%s|lang=%s|volatility=%s|parallel=%s|strict=%s|security_definer=%s|leakproof=%s|config=%s|definition=%s',
      procedure_record.schema_name,
      procedure_record.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure_record.oid),
      pg_catalog.pg_get_userbyid(procedure_record.proowner),
      pg_catalog.pg_get_function_result(procedure_record.oid),
      language_record.lanname,
      procedure_record.provolatile,
      procedure_record.proparallel,
      procedure_record.proisstrict,
      procedure_record.prosecdef,
      procedure_record.proleakproof,
      COALESCE(pg_catalog.array_to_string(procedure_record.proconfig, ','), '<null>'),
      pg_catalog.pg_get_functiondef(procedure_record.oid)
    )
    FROM procedures AS procedure_record
    JOIN pg_catalog.pg_language AS language_record
      ON language_record.oid = procedure_record.prolang

    UNION ALL

    SELECT pg_catalog.format(
      'FACL|%I.%I(%s)|grantor=%s|grantee=%s|privilege=%s|grantable=%s',
      procedure_record.schema_name,
      procedure_record.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure_record.oid),
      pg_catalog.pg_get_userbyid(acl_record.grantor),
      CASE
        WHEN acl_record.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(acl_record.grantee)
      END,
      acl_record.privilege_type,
      acl_record.is_grantable
    )
    FROM procedures AS procedure_record
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(
        procedure_record.proacl,
        pg_catalog.acldefault('f'::"char", procedure_record.proowner)
      )
    ) AS acl_record
  )
  SELECT
    pg_catalog.md5(pg_catalog.string_agg(line, E'\n' ORDER BY line)),
    pg_catalog.count(*)
  INTO v_fingerprint, v_fingerprint_lines
  FROM fingerprint_lines;

  SELECT
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (WHERE COALESCE(report.raw_text, '') <> ''),
    COALESCE(pg_catalog.sum(pg_catalog.length(COALESCE(report.raw_text, ''))), 0)
  INTO v_parsed_total, v_parsed_raw_rows, v_parsed_raw_chars
  FROM public.parsed_credit_reports AS report;

  SELECT
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (WHERE COALESCE(item.raw_text_source, '') <> ''),
    COALESCE(pg_catalog.sum(pg_catalog.length(COALESCE(item.raw_text_source, ''))), 0)
  INTO v_negative_total, v_negative_raw_rows, v_negative_raw_chars
  FROM public.negative_items AS item;

  SELECT
    (SELECT pg_catalog.count(*) FROM public.credit_report_snapshots),
    (SELECT pg_catalog.count(*) FROM public.report_snapshots),
    (SELECT pg_catalog.count(*) FROM public.credit_accounts),
    (SELECT pg_catalog.count(*) FROM public.bureau_tradelines),
    (SELECT pg_catalog.count(*) FROM public.ai_usage_events)
  INTO
    v_credit_report_snapshots,
    v_report_snapshots,
    v_credit_accounts,
    v_bureau_tradelines,
    v_ai_usage_events;

  WITH RECURSIVE json_nodes(table_name, row_id, node_key, node_value) AS (
    SELECT
      'parsed_credit_reports',
      report.id::text,
      NULL::text,
      source.value
    FROM public.parsed_credit_reports AS report
    CROSS JOIN LATERAL (
      VALUES (report.all_accounts), (report.all_inquiries), (report.public_records)
    ) AS source(value)
    WHERE source.value IS NOT NULL

    UNION ALL

    SELECT 'credit_report_snapshots', snapshot.id::text, NULL::text, snapshot.snapshot_data
    FROM public.credit_report_snapshots AS snapshot
    WHERE snapshot.snapshot_data IS NOT NULL

    UNION ALL

    SELECT 'report_snapshots', snapshot.id::text, NULL::text, snapshot.snapshot_data
    FROM public.report_snapshots AS snapshot
    WHERE snapshot.snapshot_data IS NOT NULL

    UNION ALL

    SELECT 'credit_accounts', account.id::text, NULL::text, account.normalized_fields
    FROM public.credit_accounts AS account
    WHERE account.normalized_fields IS NOT NULL

    UNION ALL

    SELECT 'bureau_tradelines', tradeline.id::text, NULL::text, tradeline.raw_tradeline
    FROM public.bureau_tradelines AS tradeline
    WHERE tradeline.raw_tradeline IS NOT NULL

    UNION ALL

    SELECT
      parent.table_name,
      parent.row_id,
      child.node_key,
      child.node_value
    FROM json_nodes AS parent
    CROSS JOIN LATERAL (
      SELECT object_entry.key, object_entry.value
      FROM pg_catalog.jsonb_each(
        CASE
          WHEN pg_catalog.jsonb_typeof(parent.node_value) = 'object'
            THEN parent.node_value
          ELSE '{}'::jsonb
        END
      ) AS object_entry

      UNION ALL

      SELECT NULL::text, array_entry.value
      FROM pg_catalog.jsonb_array_elements(
        CASE
          WHEN pg_catalog.jsonb_typeof(parent.node_value) = 'array'
            THEN parent.node_value
          ELSE '[]'::jsonb
        END
      ) AS array_entry
    ) AS child(node_key, node_value)
  ), forbidden_nodes AS (
    SELECT table_name, row_id
    FROM json_nodes
    WHERE node_key = ANY (ARRAY[
      'rawText', 'raw_text', 'raw_text_source', 'textContent',
      'unparsedBlocks', 'rawBlocks', 'blockDispositions', 'normalizedText'
    ])
  )
  SELECT
    pg_catalog.count(DISTINCT row_id)
      FILTER (WHERE table_name = 'parsed_credit_reports'),
    pg_catalog.count(*)
      FILTER (WHERE table_name = 'parsed_credit_reports'),
    pg_catalog.count(DISTINCT row_id)
      FILTER (WHERE table_name = 'credit_report_snapshots'),
    pg_catalog.count(*)
      FILTER (WHERE table_name = 'credit_report_snapshots'),
    pg_catalog.count(DISTINCT table_name || ':' || row_id)
      FILTER (WHERE table_name IN ('report_snapshots', 'credit_accounts', 'bureau_tradelines')),
    pg_catalog.count(*)
      FILTER (WHERE table_name IN ('report_snapshots', 'credit_accounts', 'bureau_tradelines'))
  INTO
    v_nested_parsed_rows,
    v_nested_parsed_occurrences,
    v_nested_credit_report_snapshot_rows,
    v_nested_credit_report_snapshot_occurrences,
    v_nested_other_rows,
    v_nested_other_occurrences
  FROM forbidden_nodes;

  SELECT pg_catalog.count(*)
  INTO v_target_constraints
  FROM pg_catalog.pg_constraint AS constraint_record
  WHERE constraint_record.conname = ANY (ARRAY[
    'parsed_credit_reports_no_raw_report_artifacts',
    'negative_items_no_raw_report_artifacts',
    'credit_report_snapshots_no_raw_report_artifacts',
    'report_snapshots_no_raw_report_artifacts',
    'credit_accounts_no_raw_report_artifacts',
    'bureau_tradelines_no_raw_report_artifacts'
  ]);

  IF v_parsed_total <> 40
     OR v_negative_total <> 1149
     OR v_credit_report_snapshots <> 1
     OR v_report_snapshots <> 14
     OR v_credit_accounts <> 167
     OR v_bureau_tradelines <> 244
     OR v_ai_usage_events <> 0 THEN
    RAISE EXCEPTION
      'FMM-002 guard stopped: affected row counts drifted (parsed %, negative %, report snapshots %/%, accounts %, tradelines %, AI %)',
      v_parsed_total,
      v_negative_total,
      v_credit_report_snapshots,
      v_report_snapshots,
      v_credit_accounts,
      v_bureau_tradelines,
      v_ai_usage_events;
  END IF;

  IF v_mode = 'preflight' THEN
    IF v_versions IS DISTINCT FROM v_expected_pre_versions THEN
      RAISE EXCEPTION 'FMM-002 preflight stopped: migration ledger is not the exact 32-version production ledger';
    END IF;

    IF (v_schema_tables, v_schema_columns, v_schema_constraints, v_schema_indexes,
        v_schema_trigger_events, v_schema_policies, v_schema_functions,
        v_unvalidated_constraints)
       IS DISTINCT FROM (72::bigint, 1083::bigint, 361::bigint, 340::bigint,
                         124::bigint, 202::bigint, 37::bigint, 0::bigint) THEN
      RAISE EXCEPTION
        'FMM-002 preflight stopped: public catalog tuple drifted (%/%/%/%/%/%/%/%)',
        v_schema_tables,
        v_schema_columns,
        v_schema_constraints,
        v_schema_indexes,
        v_schema_trigger_events,
        v_schema_policies,
        v_schema_functions,
        v_unvalidated_constraints;
    END IF;

    IF v_fingerprint <> '781d104fd91ed9aa993d79973c6f625b' THEN
      RAISE EXCEPTION
        'FMM-002 preflight stopped: prerequisite fingerprint drifted (actual %, lines %)',
        v_fingerprint, v_fingerprint_lines;
    END IF;

    IF pg_catalog.to_regclass('public.certified_mailings') IS NOT NULL
       OR pg_catalog.to_regprocedure('public.update_certified_mailings_updated_at()') IS NOT NULL
       OR pg_catalog.to_regprocedure('private.fmm002_contains_raw_report_artifact(jsonb)') IS NOT NULL
       OR pg_catalog.to_regprocedure('private.fmm002_strip_raw_report_artifacts(jsonb)') IS NOT NULL
       OR v_target_constraints <> 0
       OR EXISTS (
         SELECT 1
         FROM pg_catalog.pg_policies AS policy_record
         WHERE policy_record.schemaname = 'storage'
           AND policy_record.tablename = 'objects'
           AND policy_record.policyname = 'fmm002_ocr_artifacts_authenticated_deny'
       ) THEN
      RAISE EXCEPTION 'FMM-002 preflight stopped: a target object already exists';
    END IF;

    IF v_parsed_raw_rows <> 38
       OR v_parsed_raw_chars <> 1510438
       OR v_negative_raw_rows <> 935
       OR v_negative_raw_chars <> 859284
       OR v_nested_parsed_rows <> 38
       OR v_nested_parsed_occurrences <> 2028
       OR v_nested_credit_report_snapshot_rows <> 1
       OR v_nested_credit_report_snapshot_occurrences <> 1
       OR v_nested_other_rows <> 0
       OR v_nested_other_occurrences <> 0 THEN
      RAISE EXCEPTION
        'FMM-002 preflight stopped: raw preimage drifted (text rows/chars %/% and %/%, nested %/% %/% %/%)',
        v_parsed_raw_rows,
        v_parsed_raw_chars,
        v_negative_raw_rows,
        v_negative_raw_chars,
        v_nested_parsed_rows,
        v_nested_parsed_occurrences,
        v_nested_credit_report_snapshot_rows,
        v_nested_credit_report_snapshot_occurrences,
        v_nested_other_rows,
        v_nested_other_occurrences;
    END IF;
  ELSE
    IF v_versions IS DISTINCT FROM v_expected_post_versions THEN
      RAISE EXCEPTION 'FMM-002 postflight stopped: ledger is not the exact 34-version set';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260826110000' AND name = 'certified_mailings'
    ) OR NOT EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260903181039' AND name = 'fmm_002_report_privacy_controls'
    ) THEN
      RAISE EXCEPTION 'FMM-002 postflight stopped: target ledger names are not exact';
    END IF;

    IF (v_schema_tables, v_schema_columns, v_schema_constraints, v_schema_indexes,
        v_schema_trigger_events, v_schema_policies, v_schema_functions,
        v_unvalidated_constraints)
       IS DISTINCT FROM (73::bigint, 1111::bigint, 376::bigint, 348::bigint,
                         127::bigint, 206::bigint, 38::bigint, 0::bigint) THEN
      RAISE EXCEPTION
        'FMM-002 postflight stopped: public catalog tuple drifted (%/%/%/%/%/%/%/%)',
        v_schema_tables,
        v_schema_columns,
        v_schema_constraints,
        v_schema_indexes,
        v_schema_trigger_events,
        v_schema_policies,
        v_schema_functions,
        v_unvalidated_constraints;
    END IF;

    IF v_fingerprint <> '9514c5c6ebaf3a18be9017eff212232c' THEN
      RAISE EXCEPTION
        'FMM-002 postflight stopped: hardened catalog fingerprint drifted (actual %, lines %)',
        v_fingerprint, v_fingerprint_lines;
    END IF;

    IF v_parsed_raw_rows <> 0
       OR v_parsed_raw_chars <> 0
       OR v_negative_raw_rows <> 0
       OR v_negative_raw_chars <> 0
       OR v_nested_parsed_rows <> 0
       OR v_nested_parsed_occurrences <> 0
       OR v_nested_credit_report_snapshot_rows <> 0
       OR v_nested_credit_report_snapshot_occurrences <> 0
       OR v_nested_other_rows <> 0
       OR v_nested_other_occurrences <> 0 THEN
      RAISE EXCEPTION 'FMM-002 postflight stopped: raw text or nested artifacts remain';
    END IF;

    IF v_target_constraints <> 6
       OR EXISTS (
         SELECT 1
         FROM pg_catalog.pg_constraint AS constraint_record
         WHERE constraint_record.conname = ANY (ARRAY[
           'parsed_credit_reports_no_raw_report_artifacts',
           'negative_items_no_raw_report_artifacts',
           'credit_report_snapshots_no_raw_report_artifacts',
           'report_snapshots_no_raw_report_artifacts',
           'credit_accounts_no_raw_report_artifacts',
           'bureau_tradelines_no_raw_report_artifacts'
         ])
           AND (constraint_record.contype <> 'c' OR NOT constraint_record.convalidated)
       ) THEN
      RAISE EXCEPTION 'FMM-002 postflight stopped: six validated containment constraints are not exact';
    END IF;

    SELECT
      (SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_attribute
       WHERE attrelid = 'public.certified_mailings'::pg_catalog.regclass
         AND attnum > 0 AND NOT attisdropped),
      (SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_constraint
       WHERE conrelid = 'public.certified_mailings'::pg_catalog.regclass),
      (SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_index
       WHERE indrelid = 'public.certified_mailings'::pg_catalog.regclass),
      (SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_trigger
       WHERE tgrelid = 'public.certified_mailings'::pg_catalog.regclass
         AND NOT tgisinternal),
      (SELECT pg_catalog.count(*)
       FROM pg_catalog.pg_policy
       WHERE polrelid = 'public.certified_mailings'::pg_catalog.regclass),
      (SELECT pg_catalog.count(*) FROM public.certified_mailings)
    INTO
      v_certified_columns,
      v_certified_constraints,
      v_certified_indexes,
      v_certified_triggers,
      v_certified_policies,
      v_certified_rows;

    IF (v_certified_columns, v_certified_constraints, v_certified_indexes,
        v_certified_triggers, v_certified_policies, v_certified_rows)
       IS DISTINCT FROM (28::bigint, 9::bigint, 8::bigint, 2::bigint, 4::bigint, 0::bigint) THEN
      RAISE EXCEPTION
        'FMM-002 postflight stopped: certified_mailings catalog/emptiness drifted (%/%/%/%/%/%)',
        v_certified_columns,
        v_certified_constraints,
        v_certified_indexes,
        v_certified_triggers,
        v_certified_policies,
        v_certified_rows;
    END IF;

    SELECT pg_catalog.pg_get_constraintdef(constraint_record.oid, false)
    INTO v_operation_check
    FROM pg_catalog.pg_constraint AS constraint_record
    WHERE constraint_record.conrelid = 'public.ai_usage_events'::pg_catalog.regclass
      AND constraint_record.conname = 'ai_usage_events_operation_check'
      AND constraint_record.contype = 'c'
      AND constraint_record.convalidated;

    IF v_operation_check IS DISTINCT FROM
       'CHECK ((operation = ANY (ARRAY[''agency_assistant''::text, ''credit_report_analysis''::text])))' THEN
      RAISE EXCEPTION 'FMM-002 postflight stopped: AI operation constraint is not exact (%)', v_operation_check;
    END IF;

    v_reserve_oid := pg_catalog.to_regprocedure(
      'public.reserve_ai_usage(uuid,uuid,text,text,integer,integer,integer,integer,integer,integer,integer,integer)'
    );
    IF v_reserve_oid IS NULL THEN
      RAISE EXCEPTION 'FMM-002 postflight stopped: reserve_ai_usage signature is absent';
    END IF;

    SELECT procedure_record.prosecdef, procedure_record.proconfig
    INTO v_reserve_security_definer, v_reserve_config
    FROM pg_catalog.pg_proc AS procedure_record
    WHERE procedure_record.oid = v_reserve_oid;

    SELECT
      pg_catalog.count(*) FILTER (WHERE acl_record.privilege_type = 'EXECUTE'),
      pg_catalog.bool_or(acl_record.grantee = 0 AND acl_record.privilege_type = 'EXECUTE'),
      pg_catalog.bool_or(
        acl_record.grantee = pg_catalog.to_regrole('anon')
        AND acl_record.privilege_type = 'EXECUTE'
      ),
      pg_catalog.bool_or(
        acl_record.grantee = pg_catalog.to_regrole('authenticated')
        AND acl_record.privilege_type = 'EXECUTE'
      ),
      pg_catalog.bool_or(
        acl_record.grantee = pg_catalog.to_regrole('service_role')
        AND acl_record.privilege_type = 'EXECUTE'
      )
    INTO
      v_reserve_execute_acl_count,
      v_reserve_public_execute,
      v_reserve_anon_execute,
      v_reserve_authenticated_execute,
      v_reserve_service_execute
    FROM pg_catalog.pg_proc AS procedure_record
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(
        procedure_record.proacl,
        pg_catalog.acldefault('f'::"char", procedure_record.proowner)
      )
    ) AS acl_record
    WHERE procedure_record.oid = v_reserve_oid;

    IF NOT v_reserve_security_definer
       OR v_reserve_config IS DISTINCT FROM ARRAY['search_path=""']::text[]
       OR v_reserve_execute_acl_count <> 2
       OR COALESCE(v_reserve_public_execute, false)
       OR COALESCE(v_reserve_anon_execute, false)
       OR COALESCE(v_reserve_authenticated_execute, false)
       OR NOT COALESCE(v_reserve_service_execute, false) THEN
      RAISE EXCEPTION
        'FMM-002 postflight stopped: reserve_ai_usage SECURITY DEFINER/search_path/ACL is not exact';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policy AS policy_record
      WHERE policy_record.polrelid = 'storage.objects'::pg_catalog.regclass
        AND policy_record.polname = 'fmm002_ocr_artifacts_authenticated_deny'
        AND NOT policy_record.polpermissive
        AND policy_record.polcmd = '*'
        AND policy_record.polroles = ARRAY[pg_catalog.to_regrole('authenticated')::oid]
    ) THEN
      RAISE EXCEPTION 'FMM-002 postflight stopped: restrictive OCR-object policy is absent or drifted';
    END IF;
  END IF;

  RAISE NOTICE
    'FMM-002 % PASS: database=%, ledger=%, fingerprint=% (lines=%), affected_rows=40/1149/1/14/167/244/0',
    v_mode,
    pg_catalog.current_database(),
    pg_catalog.cardinality(v_versions),
    v_fingerprint,
    v_fingerprint_lines;
END;
$guard$;

ROLLBACK;
