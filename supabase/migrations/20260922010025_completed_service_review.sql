-- Review-only schema. No rows are backfilled, no billing or signup is enabled.
-- All mutations are service-role only; authenticated users cannot change state.
create table public.consumer_service_cycles (
  id uuid primary key default gen_random_uuid(),
  -- No auth.users FK: an existing account deletion must not fail due to a new hold-only table.
  consumer_id uuid not null,
  state text not null default 'cancellation_period' check (state in (
    'cancellation_period','active_unbilled_service','service_completion_pending',
    'invoice_eligible','invoice_due','suspended_nonpayment','paid_completed_cycle',
    'compliance_hold','closed')),
  cycle_started_at timestamptz not null,
  cycle_ends_at timestamptz not null,
  cancellation_expires_at timestamptz not null,
  contract_version text not null,
  disclosure_version text not null,
  packet_evidence jsonb not null default '{}'::jsonb,
  packet_storage_path text,
  packet_sha256 text check (packet_sha256 is null or packet_sha256 ~ '^[0-9a-f]{64}$'),
  completed_at timestamptz,
  invoice_eligible_at timestamptz,
  compliance_status text not null default 'OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING',
  last_actor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cycle_ends_at >= cycle_started_at + interval '30 days'),
  check (cycle_started_at >= cancellation_expires_at),
  check (packet_storage_path is null or packet_storage_path like consumer_id::text || '/%'),
  check (state not in ('invoice_eligible','invoice_due','suspended_nonpayment','paid_completed_cycle')
    or (completed_at is not null and invoice_eligible_at is not null and
        packet_storage_path is not null and packet_sha256 is not null)),
  unique (consumer_id, cycle_started_at)
);
create unique index consumer_cycle_distinct_source on public.consumer_service_cycles
  (consumer_id, (packet_evidence ->> 'sourceSha256'))
  where invoice_eligible_at is not null;

create table public.consumer_service_audit_events (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.consumer_service_cycles(id),
  event_type text not null,
  actor_id uuid,
  actor_kind text not null check (actor_kind in ('system','platform_admin','compliance_exception')),
  evidence_ref text,
  reason text,
  event_at timestamptz not null default now(),
  event_data jsonb not null default '{}'::jsonb
);

create or replace function public.prevent_consumer_service_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Consumer service audit events are append-only';
end;
$$;
create trigger consumer_service_audit_immutable
before update or delete on public.consumer_service_audit_events
for each row execute function public.prevent_consumer_service_audit_mutation();

create or replace function public.audit_consumer_service_cycle()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.consumer_service_audit_events(cycle_id,event_type,actor_id,actor_kind,event_data)
    values (new.id,'cycle_created',new.last_actor_id,'system',jsonb_build_object('state',new.state));
  else
    if old.state is distinct from new.state or old.packet_evidence is distinct from new.packet_evidence
      or old.invoice_eligible_at is distinct from new.invoice_eligible_at then
      insert into public.consumer_service_audit_events(cycle_id,event_type,actor_id,actor_kind,event_data)
      values (new.id,'cycle_updated',new.last_actor_id,'system',
        jsonb_build_object('old_state',old.state,'new_state',new.state,
          'packet_evidence_changed',old.packet_evidence is distinct from new.packet_evidence));
    end if;
  end if;
  return null;
end;
$$;
create trigger consumer_service_cycle_audit
after insert or update on public.consumer_service_cycles
for each row execute function public.audit_consumer_service_cycle();

create table public.consumer_billing_approvals (
  id integer primary key default 1 check (id = 1),
  status text not null default 'OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING' check (status in (
    'OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING','COUNSEL_APPROVED_WITH_CONDITIONS',
    'COUNSEL_APPROVED','COUNSEL_REJECTED','EXPIRED','REVOKED')),
  jurisdictions text[] not null default '{}',
  plans text[] not null default '{}',
  approved_billing_model text,
  approved_completion_definition text,
  effective_at timestamptz,
  review_at timestamptz,
  attorney_name text,
  attorney_firm text,
  written_opinion_ref text,
  contract_version text,
  disclosure_version text,
  conditions_satisfied_at timestamptz,
  reviewer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('COUNSEL_APPROVED','COUNSEL_APPROVED_WITH_CONDITIONS') or
    (cardinality(jurisdictions)>0 and cardinality(plans)>0 and
     approved_billing_model is not null and approved_completion_definition is not null and
     effective_at is not null and attorney_name is not null and attorney_firm is not null and
     written_opinion_ref is not null and contract_version is not null and
     disclosure_version is not null and reviewer_id is not null)),
  check (status <> 'COUNSEL_APPROVED_WITH_CONDITIONS' or conditions_satisfied_at is not null)
);
insert into public.consumer_billing_approvals(id) values (1);

create table public.completed_service_invoices (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references public.consumer_service_cycles(id),
  packet_id text not null,
  period_started_at timestamptz not null,
  period_ended_at timestamptz not null,
  amount_cents integer not null check (amount_cents = 3900),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'prepared' check (status in ('prepared','open','paid','void')),
  stripe_invoice_id text unique,
  idempotency_key text not null unique,
  due_at timestamptz,
  grace_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_ended_at > period_started_at),
  check (status = 'prepared' or (stripe_invoice_id is not null and due_at is not null)),
  check (grace_ends_at is null or grace_ends_at > due_at)
);

create or replace function public.enforce_review_only_invoice()
returns trigger language plpgsql set search_path = '' as $$
declare
  service_cycle public.consumer_service_cycles%rowtype;
begin
  -- A later counsel-approved, explicitly authorized release must replace this
  -- database hold before any invoice can be opened or sent to Stripe.
  if new.status <> 'prepared' or new.stripe_invoice_id is not null then
    raise exception 'COUNSEL_APPROVAL_REQUIRED: invoice activation is disabled';
  end if;
  select * into service_cycle from public.consumer_service_cycles where id = new.cycle_id;
  if not found or service_cycle.state <> 'invoice_eligible'
    or service_cycle.packet_evidence -> 'packet' ->> 'artifactId' is distinct from new.packet_id
    or service_cycle.cycle_started_at is distinct from new.period_started_at
    or service_cycle.cycle_ends_at is distinct from new.period_ended_at then
    raise exception 'Completed packet and matching service period are required';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger completed_service_invoice_hold
before insert or update on public.completed_service_invoices
for each row execute function public.enforce_review_only_invoice();

create table public.business_purchaser_verifications (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  purchaser_user_id uuid not null,
  legal_business_name text not null,
  business_type text not null,
  formation_jurisdiction text not null,
  business_address_summary text not null,
  authorized_representative_name text not null,
  website text,
  intended_business_use text not null,
  identifier_type text,
  identifier_last_four text check (identifier_last_four is null or identifier_last_four ~ '^[0-9]{4}$'),
  license_bond_evidence_ref text,
  business_evidence_ref text,
  verification_checks jsonb not null default '{}'::jsonb,
  attested_for_business boolean not null default false,
  plan_ids text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','verified','rejected','expired','manual_review')),
  reviewer_id uuid,
  review_reason text,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'verified' or (attested_for_business and business_evidence_ref is not null
    and reviewer_id is not null and reviewed_at is not null and expires_at > reviewed_at
    and cardinality(plan_ids)>0 and verification_checks @> '{"formation":true,"identifier":true,"address":true,"representative":true,"license_or_exemption":true}'::jsonb))
);

-- Private packet objects are served only through an owner-checked server route.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('personal-review-packets','personal-review-packets',false,10485760,array['application/pdf'])
on conflict (id) do nothing;
create policy personal_review_packets_no_direct_client_access on storage.objects
as restrictive for all to anon, authenticated
using (bucket_id <> 'personal-review-packets')
with check (bucket_id <> 'personal-review-packets');

create or replace function public.enforce_consumer_service_cycle_state()
returns trigger language plpgsql set search_path = '' as $$
declare
  linked_invoice public.completed_service_invoices%rowtype;
  required_evidence_keys text[] := array[
    'sourceReceivedAt','sourceArtifactId','sourceSha256','analysisEngineVersion',
    'rulesetVersion','deliveryVerifiedAt','deliveryNotificationEventId',
    'completionAuditEventId'
  ];
  evidence_key text;
begin
  if old.completed_at is not null and (old.packet_evidence is distinct from new.packet_evidence
    or old.packet_storage_path is distinct from new.packet_storage_path
    or old.packet_sha256 is distinct from new.packet_sha256) then
    raise exception 'Completed packet evidence is immutable';
  end if;
  if new.state = old.state then
    new.updated_at := now();
    return new;
  end if;
  if new.state = 'active_unbilled_service' and
     (old.state <> 'cancellation_period' or now() < new.cancellation_expires_at) then
    raise exception 'Cancellation period has not expired';
  end if;
  if new.state = 'service_completion_pending' and
     (old.state not in ('active_unbilled_service','service_completion_pending') or now() < new.cycle_ends_at) then
    raise exception 'Service period has not ended';
  end if;
  if new.state = 'invoice_eligible' then
    if old.state <> 'service_completion_pending' or new.completed_at < new.cycle_ends_at
      or new.invoice_eligible_at < new.completed_at or new.packet_storage_path is null
      or new.packet_sha256 is null or new.compliance_status <> 'OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING' then
      raise exception 'Completed-service evidence is required';
    end if;
    foreach evidence_key in array required_evidence_keys loop
      if nullif(new.packet_evidence ->> evidence_key, '') is null then
        raise exception 'Missing completed-service evidence: %', evidence_key;
      end if;
    end loop;
    if new.packet_evidence ->> 'parsingStatus' <> 'complete'
      or new.packet_evidence ->> 'analysisStatus' <> 'complete'
      or new.packet_evidence ->> 'materiallyNewSource' <> 'true'
      or new.packet_evidence -> 'findings' ->> 'artifactId' is null
      or new.packet_evidence -> 'actionPlan' ->> 'artifactId' is null
      or new.packet_evidence -> 'packet' ->> 'artifactId' is null
      or (new.packet_evidence -> 'disputeDocuments' ->> 'artifactId' is null
        and new.packet_evidence -> 'noSupportedDispute' ->> 'artifactId' is null) then
      raise exception 'Required Personal packet components are incomplete';
    end if;
    if (new.packet_evidence ->> 'sourceReceivedAt')::timestamptz < new.cycle_started_at
      or (new.packet_evidence ->> 'deliveryVerifiedAt')::timestamptz < new.completed_at then
      raise exception 'Service and delivery evidence timestamps are invalid';
    end if;
    if not exists (select 1 from public.consumer_service_audit_events a
      where a.id = (new.packet_evidence ->> 'completionAuditEventId')::uuid
        and a.cycle_id = new.id and a.event_type = 'packet_completed')
      or not exists (select 1 from public.consumer_service_audit_events a
      where a.id = (new.packet_evidence ->> 'deliveryNotificationEventId')::uuid
        and a.cycle_id = new.id and a.event_type = 'delivery_notification_recorded') then
      raise exception 'Immutable completion and delivery notification events are required';
    end if;
  end if;
  if new.state in ('invoice_due','suspended_nonpayment','paid_completed_cycle') then
    select * into linked_invoice from public.completed_service_invoices where cycle_id = new.id;
    if not found then raise exception 'A completed-service invoice is required'; end if;
    if new.state = 'invoice_due' and (old.state <> 'invoice_eligible' or linked_invoice.status <> 'open') then
      raise exception 'An open invoice is required';
    end if;
    if new.state = 'suspended_nonpayment' and
      (old.state <> 'invoice_due' or linked_invoice.status <> 'open'
       or linked_invoice.grace_ends_at is null or now() <= linked_invoice.grace_ends_at) then
      raise exception 'A valid overdue invoice past grace is required';
    end if;
    if new.state = 'paid_completed_cycle' and
      (old.state not in ('invoice_due','suspended_nonpayment') or linked_invoice.status <> 'paid') then
      raise exception 'A paid completed-service invoice is required';
    end if;
  end if;
  if new.state not in ('active_unbilled_service','service_completion_pending','invoice_eligible',
    'invoice_due','suspended_nonpayment','paid_completed_cycle','compliance_hold','closed') then
    raise exception 'Unsupported state transition';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger consumer_service_cycle_transition
before update on public.consumer_service_cycles
for each row execute function public.enforce_consumer_service_cycle_state();

-- Explicitly revoke legacy public-schema default grants before enabling RLS.
alter table public.consumer_service_cycles enable row level security;
alter table public.consumer_service_audit_events enable row level security;
alter table public.consumer_billing_approvals enable row level security;
alter table public.completed_service_invoices enable row level security;
alter table public.business_purchaser_verifications enable row level security;
revoke all on public.consumer_service_cycles, public.consumer_service_audit_events,
  public.consumer_billing_approvals, public.completed_service_invoices,
  public.business_purchaser_verifications from anon, authenticated;
grant select, insert, update, delete on public.consumer_service_cycles,
  public.consumer_billing_approvals, public.completed_service_invoices,
  public.business_purchaser_verifications to service_role;
grant select, insert on public.consumer_service_audit_events to service_role;
revoke all on function public.prevent_consumer_service_audit_mutation(),
  public.audit_consumer_service_cycle(),
  public.enforce_consumer_service_cycle_state(),
  public.enforce_review_only_invoice() from public, anon, authenticated;
