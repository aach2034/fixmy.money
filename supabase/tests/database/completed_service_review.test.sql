begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select is((select status from public.consumer_billing_approvals where id = 1),
  'OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING', 'no false counsel approval is seeded');

select is((select count(*) from unnest(array[
  'consumer_service_cycles','consumer_service_audit_events',
  'consumer_billing_approvals','completed_service_invoices',
  'business_purchaser_verifications']) as t(name)
  where not (select c.relrowsecurity from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=t.name)), 0::bigint,
  'all review tables have RLS');

select is((select count(*) from unnest(array[
  'consumer_service_cycles','consumer_service_audit_events',
  'consumer_billing_approvals','completed_service_invoices',
  'business_purchaser_verifications']) as t(name)
  cross join unnest(array['anon','authenticated']) as r(role_name)
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) as p(privilege)
  where has_table_privilege(r.role_name, 'public.' || t.name, p.privilege)), 0::bigint,
  'browser roles have no review-table privileges');

select ok(not has_table_privilege('authenticated','public.consumer_service_audit_events','INSERT'),
  'a consumer cannot forge completion audit events');
select ok(not has_table_privilege('authenticated','public.business_purchaser_verifications','UPDATE'),
  'a purchaser cannot self-verify');
select ok(not has_table_privilege('service_role','public.consumer_service_audit_events','UPDATE'),
  'service role cannot edit audit events');
select ok(not has_table_privilege('service_role','public.consumer_service_audit_events','DELETE'),
  'service role cannot delete audit events');

select ok((select not public from storage.buckets where id='personal-review-packets'),
  'completed packets use a private bucket');

select * from finish();
rollback;
