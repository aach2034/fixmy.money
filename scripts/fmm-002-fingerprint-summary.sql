\set ON_ERROR_STOP on

begin isolation level repeatable read read only;
set local search_path = '';
set local lock_timeout = '5s';
set local statement_timeout = '30s';

with wanted(schema_name, object_name, object_kind) as (
  values
    ('public','parsed_credit_reports','relation'),
    ('public','negative_items','relation'),
    ('public','credit_report_snapshots','relation'),
    ('public','report_snapshots','relation'),
    ('public','credit_accounts','relation'),
    ('public','bureau_tradelines','relation'),
    ('public','ai_usage_events','relation'),
    ('public','workspace_memberships','relation'),
    ('public','staff_clients','relation'),
    ('public','user_profiles','relation'),
    ('public','dispute_letters','relation'),
    ('public','generated_dispute_letters','relation'),
    ('public','dispute_rounds','relation'),
    ('public','certified_mailings','relation'),
    ('storage','objects','relation'),
    ('private','can_read_owner','function'),
    ('private','can_write_owner','function'),
    ('private','bind_selected_workspace_owner','function'),
    ('private','fmm002_contains_raw_report_artifact','function'),
    ('private','fmm002_strip_raw_report_artifacts','function'),
    ('public','reserve_ai_usage','function'),
    ('public','update_certified_mailings_updated_at','function')
), relations as (
  select namespace_record.nspname as schema_name,
    relation_record.relname as object_name,
    relation_record.oid,
    relation_record.relacl,
    relation_record.relkind,
    relation_record.relowner
  from wanted
  join pg_catalog.pg_namespace as namespace_record
    on namespace_record.nspname = wanted.schema_name
  join pg_catalog.pg_class as relation_record
    on relation_record.relnamespace = namespace_record.oid
   and relation_record.relname = wanted.object_name
  where wanted.object_kind = 'relation'
), functions as (
  select namespace_record.nspname as schema_name,
    procedure_record.proname as object_name,
    procedure_record.oid,
    procedure_record.proacl,
    procedure_record.proowner
  from wanted
  join pg_catalog.pg_namespace as namespace_record
    on namespace_record.nspname = wanted.schema_name
  join pg_catalog.pg_proc as procedure_record
    on procedure_record.pronamespace = namespace_record.oid
   and procedure_record.proname = wanted.object_name
  where wanted.object_kind = 'function'
), counts as (
  select 'REL' as kind, schema_name || '.' || object_name as object_name, count(*) as line_count
  from relations group by 1, 2
  union all
  select 'COL', relation.schema_name || '.' || relation.object_name, count(*)
  from relations as relation
  join pg_catalog.pg_attribute as attribute_record
    on attribute_record.attrelid = relation.oid
   and attribute_record.attnum > 0
   and not attribute_record.attisdropped
  group by 1, 2
  union all
  select 'CON', relation.schema_name || '.' || relation.object_name, count(*)
  from relations as relation
  join pg_catalog.pg_constraint as constraint_record
    on constraint_record.conrelid = relation.oid
  group by 1, 2
  union all
  select 'IDX', relation.schema_name || '.' || relation.object_name, count(*)
  from relations as relation
  join pg_catalog.pg_index as index_record
    on index_record.indrelid = relation.oid
  group by 1, 2
  union all
  select 'TRG', relation.schema_name || '.' || relation.object_name, count(*)
  from relations as relation
  join pg_catalog.pg_trigger as trigger_record
    on trigger_record.tgrelid = relation.oid
   and not trigger_record.tgisinternal
  group by 1, 2
  union all
  select 'POL', relation.schema_name || '.' || relation.object_name, count(*)
  from relations as relation
  join pg_catalog.pg_policy as policy_record
    on policy_record.polrelid = relation.oid
  group by 1, 2
  union all
  select 'RACL', relation.schema_name || '.' || relation.object_name, count(*)
  from relations as relation
  cross join lateral pg_catalog.aclexplode(coalesce(
    relation.relacl,
    pg_catalog.acldefault(
      case when relation.relkind = 'S' then 's'::"char" else 'r'::"char" end,
      relation.relowner
    )
  )) as acl_record
  group by 1, 2
  union all
  select 'FUN', schema_name || '.' || object_name, count(*)
  from functions group by 1, 2
  union all
  select 'FACL', function_record.schema_name || '.' || function_record.object_name, count(*)
  from functions as function_record
  cross join lateral pg_catalog.aclexplode(coalesce(
    function_record.proacl,
    pg_catalog.acldefault('f'::"char", function_record.proowner)
  )) as acl_record
  group by 1, 2
)
select kind, object_name, line_count
from counts
order by kind, object_name;

rollback;
