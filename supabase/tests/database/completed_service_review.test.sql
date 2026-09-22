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
select ok(not has_table_privilege('service_role','public.consumer_billing_approvals','UPDATE'),
  'review-only counsel approval cannot be changed by service role');
select throws_ok($$
  update public.consumer_billing_approvals set status='COUNSEL_REJECTED' where id=1
$$, 'COUNSEL_APPROVAL_REQUIRED: review-only approval is immutable',
  'even the migration owner cannot alter review-only approval');

select ok((select not public from storage.buckets where id='personal-review-packets'),
  'completed packets use a private bucket');

select throws_ok($$
  insert into public.consumer_service_cycles
    (id,consumer_id,state,cycle_started_at,cycle_ends_at,cancellation_expires_at,
     contract_version,disclosure_version,completed_at,invoice_eligible_at,packet_storage_path,packet_sha256)
  values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
    'invoice_eligible',now()-interval '32 days',now()-interval '2 days',now()-interval '33 days',
    'test','test',now(),now(),'22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/packet.pdf',repeat('a',64))
$$, 'Review-only cycle must start empty in cancellation_period',
  'direct insert cannot seed invoice eligibility');

insert into public.consumer_service_cycles
  (id,consumer_id,cycle_started_at,cycle_ends_at,cancellation_expires_at,contract_version,disclosure_version)
values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
  now()-interval '32 days',now()-interval '2 days',now()-interval '33 days','test','test');
select throws_ok($$
  update public.consumer_service_cycles set completed_at=now()
  where id='11111111-1111-4111-8111-111111111111'
$$, 'Review-only cycle completion and billing are disabled',
  'service-role update cannot claim completion in the review migration');
select throws_ok($$
  update public.consumer_service_cycles set state='invoice_eligible'
  where id='11111111-1111-4111-8111-111111111111'
$$, 'COUNSEL_APPROVAL_REQUIRED: invoice eligibility is disabled',
  'elapsed time alone never grants invoice eligibility');

select * from finish();
rollback;
