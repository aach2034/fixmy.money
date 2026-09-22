-- Non-billing Personal packet completion. No production data is backfilled.
-- Counsel approval, invoice eligibility, checkout, and payment remain held.
update storage.buckets set allowed_mime_types = array['application/pdf','text/plain'],
  public = false where id = 'personal-review-packets';

alter table public.consumer_service_cycles
  drop constraint consumer_service_cycles_state_check;
alter table public.consumer_service_cycles
  add constraint consumer_service_cycles_state_check check (state in (
    'cancellation_period','active_unbilled_service','service_completion_pending',
    'completed_unbilled','invoice_eligible','invoice_due','suspended_nonpayment',
    'paid_completed_cycle','compliance_hold','closed'));
alter table public.consumer_service_cycles
  add constraint consumer_completed_unbilled_evidence check (
    state <> 'completed_unbilled' or
    (completed_at is not null and packet_storage_path is not null and packet_sha256 is not null));
create unique index consumer_cycle_completed_source on public.consumer_service_cycles
  (consumer_id, (packet_evidence ->> 'sourceSha256'))
  where completed_at is not null;
create unique index consumer_packet_one_notification on public.consumer_service_audit_events(cycle_id)
  where event_type = 'delivery_notification_recorded';
create unique index consumer_packet_one_completion on public.consumer_service_audit_events(cycle_id)
  where event_type = 'packet_completed';

create or replace function public.enforce_consumer_service_cycle_state()
returns trigger language plpgsql set search_path = '' as $$
declare
  part_name text;
  part jsonb;
  expected_path text;
  linked_invoice public.completed_service_invoices%rowtype;
begin
  if old.completed_at is not null and (
    old.packet_evidence is distinct from new.packet_evidence or
    old.packet_storage_path is distinct from new.packet_storage_path or
    old.packet_sha256 is distinct from new.packet_sha256 or
    old.completed_at is distinct from new.completed_at) then
    raise exception 'Completed packet evidence is immutable';
  end if;
  if new.state = 'invoice_eligible' or new.invoice_eligible_at is not null then
    raise exception 'COUNSEL_APPROVAL_REQUIRED: invoice eligibility is disabled';
  end if;
  if old.completed_at is null and new.completed_at is not null and new.state <> 'completed_unbilled' then
    raise exception 'Completion requires the completed_unbilled state';
  end if;
  if new.state = 'completed_unbilled' and old.state <> 'completed_unbilled' then
    if old.state <> 'service_completion_pending' or now() < new.cycle_ends_at
      or now() < new.cancellation_expires_at or new.completed_at is null
      or new.completed_at < new.cycle_ends_at or new.completed_at > now()
      or new.packet_storage_path is null or new.packet_sha256 is null
      or new.packet_sha256 !~ '^[0-9a-f]{64}$'
      or new.packet_storage_path not like new.consumer_id::text || '/' || new.id::text || '/%'
      or new.compliance_status <> 'OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING' then
      raise exception 'Personal packet completion preconditions are missing';
    end if;
    if new.packet_evidence ->> 'consumerId' is distinct from new.consumer_id::text
      or new.packet_evidence ->> 'cycleId' is distinct from new.id::text
      or new.packet_evidence ->> 'contractVersion' is distinct from new.contract_version
      or new.packet_evidence ->> 'disclosureVersion' is distinct from new.disclosure_version
      or new.packet_evidence ->> 'parsingStatus' is distinct from 'complete'
      or new.packet_evidence ->> 'analysisStatus' is distinct from 'complete'
      or new.packet_evidence ->> 'materiallyNewSource' is distinct from 'true'
      or nullif(new.packet_evidence ->> 'analysisEngineVersion','') is null
      or nullif(new.packet_evidence ->> 'rulesetVersion','') is null
      or nullif(new.packet_evidence ->> 'sourceArtifactId','') is null
      or new.packet_evidence ->> 'sourceSnapshotArtifactId' is distinct from
         new.consumer_id::text || '/' || new.id::text || '/source-snapshot.txt'
      or nullif(new.packet_evidence ->> 'parserVersion','') is null
      or coalesce((new.packet_evidence ->> 'sourceSha256') ~ '^[0-9a-f]{64}$',false) = false
      or new.packet_evidence ->> 'sourceReceivedAt' is null
      or new.packet_evidence ->> 'sourceProcessedAt' is null
      or (new.packet_evidence ->> 'sourceReceivedAt')::timestamptz < new.cycle_started_at
      or (new.packet_evidence ->> 'sourceReceivedAt')::timestamptz > new.cycle_ends_at
      or (new.packet_evidence ->> 'sourceProcessedAt')::timestamptz <
         (new.packet_evidence ->> 'sourceReceivedAt')::timestamptz
      or (new.packet_evidence ->> 'sourceProcessedAt')::timestamptz > new.completed_at then
      raise exception 'Source processing evidence is incomplete';
    end if;
    if (new.packet_evidence -> 'disputeDocuments' is null) =
       (new.packet_evidence -> 'noSupportedDispute' is null) then
      raise exception 'Exactly one dispute decision is required';
    end if;
    foreach part_name in array array['findings','actionPlan','packet'] loop
      part := new.packet_evidence -> part_name;
      expected_path := new.consumer_id::text || '/' || new.id::text || '/' ||
        case part_name when 'actionPlan' then 'action-plan.txt' else part_name || '.txt' end;
      if part ->> 'artifactId' is distinct from expected_path
        or coalesce((part ->> 'sha256') ~ '^[0-9a-f]{64}$',false) = false
        or part ->> 'completedAt' is null
        or (part ->> 'completedAt')::timestamptz < new.cycle_ends_at
        or (part ->> 'completedAt')::timestamptz > new.completed_at then
        raise exception 'Missing or invalid packet component: %', part_name;
      end if;
    end loop;
    part := coalesce(new.packet_evidence -> 'disputeDocuments',
      new.packet_evidence -> 'noSupportedDispute');
    expected_path := new.consumer_id::text || '/' || new.id::text || '/' ||
      case when new.packet_evidence -> 'disputeDocuments' is not null
        then 'dispute-documents.txt' else 'no-supported-dispute.txt' end;
    if part ->> 'artifactId' is distinct from expected_path
      or coalesce((part ->> 'sha256') ~ '^[0-9a-f]{64}$',false) = false
      or part ->> 'completedAt' is null
      or (part ->> 'completedAt')::timestamptz < new.cycle_ends_at
      or (part ->> 'completedAt')::timestamptz > new.completed_at
      or new.packet_evidence -> 'packet' ->> 'sha256' is distinct from new.packet_sha256
      or new.packet_evidence -> 'packet' ->> 'artifactId' is distinct from new.packet_storage_path
      or new.packet_evidence ->> 'deliveryVerifiedAt' is null
      or (new.packet_evidence ->> 'deliveryVerifiedAt')::timestamptz <
         (new.packet_evidence -> 'packet' ->> 'completedAt')::timestamptz
      or (new.packet_evidence ->> 'deliveryVerifiedAt')::timestamptz > new.completed_at then
      raise exception 'Packet integrity or delivery evidence is incomplete';
    end if;
    if not exists (select 1 from public.consumer_service_audit_events a
      where a.id = (new.packet_evidence ->> 'deliveryNotificationEventId')::uuid
        and a.cycle_id = new.id and a.event_type = 'delivery_notification_recorded'
        and a.event_data ->> 'message_code' = 'personal_packet_available'
        and a.event_data ->> 'channel' = 'in_app_record_only')
      or not exists (select 1 from public.consumer_service_audit_events a
      where a.id = (new.packet_evidence ->> 'completionAuditEventId')::uuid
        and a.cycle_id = new.id and a.event_type = 'packet_completed'
        and a.event_data ->> 'packet_sha256' = new.packet_sha256) then
      raise exception 'Immutable notification and completion events are required';
    end if;
  end if;
  if new.state = 'active_unbilled_service' and
    (old.state <> 'cancellation_period' or now() < new.cancellation_expires_at) then
    raise exception 'Cancellation period has not expired';
  end if;
  if new.state = 'service_completion_pending' and new.state <> old.state and
    (old.state <> 'active_unbilled_service' or now() < new.cycle_ends_at) then
    raise exception 'Service period has not ended';
  end if;
  if new.state in ('invoice_due','suspended_nonpayment','paid_completed_cycle') then
    select * into linked_invoice from public.completed_service_invoices where cycle_id = new.id;
    if not found then raise exception 'A completed-service invoice is required'; end if;
    if new.state = 'invoice_due' and (old.state <> 'invoice_eligible' or linked_invoice.status <> 'open') then
      raise exception 'An open invoice is required';
    end if;
    if new.state = 'suspended_nonpayment' and
      (old.state <> 'invoice_due' or linked_invoice.status <> 'open' or
       linked_invoice.grace_ends_at is null or now() <= linked_invoice.grace_ends_at) then
      raise exception 'A valid overdue invoice past grace is required';
    end if;
    if new.state = 'paid_completed_cycle' and
      (old.state not in ('invoice_due','suspended_nonpayment') or linked_invoice.status <> 'paid') then
      raise exception 'A paid completed-service invoice is required';
    end if;
  end if;
  if new.state <> old.state and new.state not in (
    'active_unbilled_service','service_completion_pending','completed_unbilled',
    'invoice_due','suspended_nonpayment','paid_completed_cycle','compliance_hold','closed') then
    raise exception 'Unsupported state transition';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.record_personal_packet_completion(
  p_cycle_id uuid, p_actor_id uuid, p_evidence jsonb, p_packet_path text, p_packet_sha256 text)
returns public.consumer_service_cycles
language plpgsql security invoker set search_path = '' as $$
declare
  service_cycle public.consumer_service_cycles%rowtype;
  notification_id uuid;
  completion_id uuid;
begin
  select * into service_cycle from public.consumer_service_cycles
  where id = p_cycle_id for update;
  if not found then raise exception 'Cycle not found'; end if;
  if service_cycle.state = 'completed_unbilled' then
    if service_cycle.packet_storage_path = p_packet_path and
      service_cycle.packet_sha256 = p_packet_sha256 then return service_cycle; end if;
    raise exception 'Completed packet is immutable';
  end if;
  if service_cycle.state <> 'service_completion_pending' then
    raise exception 'Cycle is not ready for packet completion';
  end if;
  if p_actor_id is null or p_packet_path is null or p_packet_sha256 is null then
    raise exception 'Completion actor and packet are required';
  end if;
  insert into public.consumer_service_audit_events
    (cycle_id,event_type,actor_id,actor_kind,event_data)
  values (p_cycle_id,'delivery_notification_recorded',p_actor_id,'platform_admin',
    jsonb_build_object('channel','in_app_record_only','message_code','personal_packet_available'))
  returning id into notification_id;
  insert into public.consumer_service_audit_events
    (cycle_id,event_type,actor_id,actor_kind,event_data)
  values (p_cycle_id,'packet_completed',p_actor_id,'platform_admin',
    jsonb_build_object('packet_sha256',p_packet_sha256))
  returning id into completion_id;
  update public.consumer_service_cycles set
    state = 'completed_unbilled',
    packet_evidence = p_evidence || jsonb_build_object(
      'deliveryNotificationEventId',notification_id,
      'completionAuditEventId',completion_id),
    packet_storage_path = p_packet_path,
    packet_sha256 = p_packet_sha256,
    completed_at = now(),
    last_actor_id = p_actor_id
  where id = p_cycle_id returning * into service_cycle;
  return service_cycle;
end;
$$;
revoke all on function public.record_personal_packet_completion(uuid,uuid,jsonb,text,text)
  from public, anon, authenticated;
grant execute on function public.record_personal_packet_completion(uuid,uuid,jsonb,text,text)
  to service_role;
