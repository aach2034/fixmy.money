begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select ok((select not public from storage.buckets where id='personal-review-packets'),
  'packet bucket remains private');
select ok(exists(select 1 from pg_policies where schemaname='storage'
  and tablename='objects' and policyname='personal_review_packets_no_direct_client_access'
  and permissive='RESTRICTIVE'), 'direct authenticated Storage access stays restricted');
select ok(not has_function_privilege('authenticated',
  'public.record_personal_packet_completion(uuid,uuid,jsonb,text,text)','EXECUTE'),
  'consumers cannot invoke the completion transaction');

insert into public.consumer_service_cycles
  (id,consumer_id,cycle_started_at,cycle_ends_at,cancellation_expires_at,contract_version,disclosure_version)
values ('55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666',
  now()+interval '2 days',now()+interval '32 days',now()+interval '1 day','contract-v1','disclosure-v1');
select throws_ok($$
  update public.consumer_service_cycles set state='active_unbilled_service'
  where id='55555555-5555-4555-8555-555555555555'
$$, 'Cancellation period has not expired',
  'completion cannot begin before cancellation expires');

insert into public.consumer_service_cycles
  (id,consumer_id,cycle_started_at,cycle_ends_at,cancellation_expires_at,contract_version,disclosure_version)
values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
  now()-interval '32 days',now()-interval '2 days',now()-interval '33 days','contract-v1','disclosure-v1');
update public.consumer_service_cycles set state='active_unbilled_service'
  where id='11111111-1111-4111-8111-111111111111';
update public.consumer_service_cycles set state='service_completion_pending'
  where id='11111111-1111-4111-8111-111111111111';

create temp table packet_test_evidence (body jsonb);
insert into packet_test_evidence values (jsonb_build_object(
  'consumerId','22222222-2222-4222-8222-222222222222',
  'cycleId','11111111-1111-4111-8111-111111111111',
  'contractVersion','contract-v1','disclosureVersion','disclosure-v1',
  'parsingStatus','complete','analysisStatus','complete','materiallyNewSource',true,
  'analysisEngineVersion','test-engine','rulesetVersion','test-rules',
  'sourceArtifactId','33333333-3333-4333-8333-333333333333',
  'sourceSnapshotArtifactId',
    '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/source-snapshot.txt',
  'sourceSha256',repeat('b',64),'sourceReceivedAt',(now()-interval '31 days')::text,
  'sourceProcessedAt',(now()-interval '30 days')::text,'parserVersion','test-parser',
  'findings',jsonb_build_object('artifactId',
    '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/findings.txt',
    'sha256',repeat('c',64),
    'completedAt',(now()-interval '1 minute')::text),
  'actionPlan',jsonb_build_object('artifactId',
    '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/action-plan.txt',
    'sha256',repeat('d',64),
    'completedAt',(now()-interval '1 minute')::text),
  'noSupportedDispute',jsonb_build_object('artifactId',
    '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/no-supported-dispute.txt',
    'sha256',repeat('e',64),'completedAt',(now()-interval '1 minute')::text),
  'packet',jsonb_build_object('artifactId',
    '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/packet.txt',
    'sha256',repeat('a',64),'completedAt',(now()-interval '1 minute')::text),
  'deliveryVerifiedAt',(now()-interval '30 seconds')::text
));

select throws_ok($$
  select public.record_personal_packet_completion(
    '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
    (select body - 'findings' from packet_test_evidence),
    '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/packet.txt',
    repeat('a',64))
$$, 'Missing or invalid packet component: findings',
  'missing findings prevent completion atomically');
select is((select count(*) from public.consumer_service_audit_events
  where cycle_id='11111111-1111-4111-8111-111111111111'
  and event_type in ('delivery_notification_recorded','packet_completed')), 0::bigint,
  'failed completion leaves no notification or completion event');

select ok((public.record_personal_packet_completion(
  '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
  (select body from packet_test_evidence),
  '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/packet.txt',
  repeat('a',64))).state='completed_unbilled','atomic completion succeeds with every artifact');
select is((select state from public.consumer_service_cycles
  where id='11111111-1111-4111-8111-111111111111'),
  'completed_unbilled','complete packet remains unbilled');
select is((select count(*) from public.consumer_service_audit_events
  where cycle_id='11111111-1111-4111-8111-111111111111'
  and event_type='delivery_notification_recorded'), 1::bigint,
  'one neutral notification is recorded');
select is((select event_data from public.consumer_service_audit_events
  where cycle_id='11111111-1111-4111-8111-111111111111'
  and event_type='delivery_notification_recorded'),
  '{"channel":"in_app_record_only","message_code":"personal_packet_available"}'::jsonb,
  'notification audit contains no credit information');

select ok((public.record_personal_packet_completion(
  '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
  (select body from packet_test_evidence),
  '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/packet.txt',
  repeat('a',64))).state='completed_unbilled','idempotent retry returns completed cycle');
select is((select count(*) from public.consumer_service_audit_events
  where cycle_id='11111111-1111-4111-8111-111111111111'
  and event_type='delivery_notification_recorded'), 1::bigint,
  'retry cannot duplicate the notification');
select is((select count(*) from public.consumer_service_audit_events
  where cycle_id='11111111-1111-4111-8111-111111111111'
  and event_type='packet_completed'), 1::bigint,
  'retry cannot duplicate completion');

select throws_ok($$
  update public.consumer_service_cycles set state='invoice_eligible',invoice_eligible_at=now()
  where id='11111111-1111-4111-8111-111111111111'
$$, 'COUNSEL_APPROVAL_REQUIRED: invoice eligibility is disabled',
  'complete packet cannot bypass the counsel billing hold');
select throws_ok($$
  insert into public.completed_service_invoices
    (cycle_id,packet_id,period_started_at,period_ended_at,amount_cents,status,
     stripe_invoice_id,idempotency_key,due_at)
  values ('11111111-1111-4111-8111-111111111111','packet.txt',
    now()-interval '32 days',now()-interval '2 days',3900,'open','in_test','test-key',now())
$$, 'COUNSEL_APPROVAL_REQUIRED: invoice activation is disabled',
  'invoice execution is still blocked');

select * from finish();
rollback;
