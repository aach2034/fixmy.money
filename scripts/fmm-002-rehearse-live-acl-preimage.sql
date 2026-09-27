\set ON_ERROR_STOP on

begin;

do $guard$
declare
  relation_acl_lines bigint;
  function_acl_lines bigint;
begin
  -- This disposable fixture starts from the previously validated production-
  -- derived source clone. Refuse to normalize any broader ACL topology.
  select count(*) into relation_acl_lines
  from pg_catalog.pg_class as relation_record
  join pg_catalog.pg_namespace as namespace_record
    on namespace_record.oid = relation_record.relnamespace
  cross join lateral pg_catalog.aclexplode(coalesce(
    relation_record.relacl,
    pg_catalog.acldefault('r'::"char", relation_record.relowner)
  )) as acl_record
  where (namespace_record.nspname, relation_record.relname) in (
    ('public','parsed_credit_reports'), ('public','negative_items'),
    ('public','credit_report_snapshots'), ('public','report_snapshots'),
    ('public','credit_accounts'), ('public','bureau_tradelines'),
    ('public','ai_usage_events'), ('public','workspace_memberships'),
    ('public','staff_clients'), ('public','user_profiles'),
    ('public','dispute_letters'), ('public','generated_dispute_letters'),
    ('public','dispute_rounds'), ('storage','objects')
  ) and pg_catalog.pg_get_userbyid(acl_record.grantee) = 'postgres';

  select count(*) into function_acl_lines
  from pg_catalog.pg_proc as procedure_record
  join pg_catalog.pg_namespace as namespace_record
    on namespace_record.oid = procedure_record.pronamespace
  cross join lateral pg_catalog.aclexplode(coalesce(
    procedure_record.proacl,
    pg_catalog.acldefault('f'::"char", procedure_record.proowner)
  )) as acl_record
  where (namespace_record.nspname, procedure_record.proname) in (
    ('private','can_read_owner'), ('private','can_write_owner'),
    ('private','bind_selected_workspace_owner'), ('public','reserve_ai_usage')
  ) and pg_catalog.pg_get_userbyid(acl_record.grantee) = 'postgres';

  if relation_acl_lines <> 112 or function_acl_lines <> 4
     or exists (
       select 1 from pg_catalog.pg_class as relation_record
       join pg_catalog.pg_namespace as namespace_record
         on namespace_record.oid = relation_record.relnamespace
       cross join lateral pg_catalog.aclexplode(coalesce(
         relation_record.relacl,
         pg_catalog.acldefault('r'::"char", relation_record.relowner)
       )) as acl_record
       where (namespace_record.nspname, relation_record.relname) in (
         ('public','parsed_credit_reports'), ('public','negative_items'),
         ('public','credit_report_snapshots'), ('public','report_snapshots'),
         ('public','credit_accounts'), ('public','bureau_tradelines'),
         ('public','ai_usage_events'), ('public','workspace_memberships'),
         ('public','staff_clients'), ('public','user_profiles'),
         ('public','dispute_letters'), ('public','generated_dispute_letters'),
         ('public','dispute_rounds'), ('storage','objects')
       ) and pg_catalog.pg_get_userbyid(acl_record.grantee) <> 'postgres'
     ) then
    raise exception 'unexpected ACL rehearsal source';
  end if;
end;
$guard$;

-- Production has the same column definition and values, but its original
-- attribute slot 36 is dropped and the active column occupies slot 37.
-- Reproduce that catalog-only difference without losing fixture values.
drop trigger user_profiles_server_onboarding_completion
  on public.user_profiles;
alter table public.user_profiles
  rename column onboarding_company_completed
  to onboarding_company_completed_previous;
alter table public.user_profiles
  add column onboarding_company_completed boolean not null default false;
update public.user_profiles
set onboarding_company_completed = onboarding_company_completed_previous;
alter table public.user_profiles
  drop column onboarding_company_completed_previous;
create trigger user_profiles_server_onboarding_completion
before update of onboarding_completed, onboarding_company_completed
on public.user_profiles
for each row execute function private.enforce_server_onboarding_completion();

grant all privileges on table
  public.ai_usage_events,
  public.bureau_tradelines,
  public.credit_accounts,
  public.credit_report_snapshots,
  public.dispute_letters,
  public.dispute_rounds,
  public.generated_dispute_letters,
  public.negative_items,
  public.parsed_credit_reports,
  public.report_snapshots,
  public.staff_clients,
  public.user_profiles,
  public.workspace_memberships
to service_role;

grant select, insert, update, delete on table
  public.bureau_tradelines,
  public.credit_accounts,
  public.credit_report_snapshots,
  public.dispute_rounds,
  public.negative_items,
  public.parsed_credit_reports,
  public.report_snapshots,
  public.staff_clients
to authenticated;

grant select on table
  public.dispute_letters,
  public.generated_dispute_letters
to authenticated;

grant select, update on table public.user_profiles to authenticated;
grant all privileges on table public.workspace_memberships to authenticated;

alter table storage.objects owner to supabase_storage_admin;
grant all privileges on table storage.objects
  to anon, authenticated, service_role;
grant all privileges on table storage.objects
  to postgres, supabase_storage_admin with grant option;

grant execute on function private.can_read_owner(uuid)
  to authenticated, service_role;
grant execute on function private.can_write_owner(uuid)
  to authenticated, service_role;
grant execute on function public.reserve_ai_usage(
  uuid, uuid, text, text, integer, integer, integer, integer, integer, integer,
  integer, integer
) to service_role;

commit;
