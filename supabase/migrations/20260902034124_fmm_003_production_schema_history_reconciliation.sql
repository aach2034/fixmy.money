-- FMM-003: restore production schema objects that existed outside committed
-- migration history. Definitions were reconstructed from read-only production
-- catalog metadata and are validated only in an isolated Supabase project.

DO $$
BEGIN
  CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.croa_pipeline_stage AS ENUM (
    'lead',
    'disclosure_delivered',
    'agreement_signed',
    'cancellation_period',
    'active_client',
    'disputes_in_progress',
    'monitoring',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.contract_status AS ENUM ('pending', 'signed', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.audit_action AS ENUM (
    'lead_created',
    'disclosure_delivered',
    'disclosure_acknowledged',
    'contract_generated',
    'contract_signed',
    'cancellation_period_started',
    'cancellation_period_expired',
    'service_activated',
    'dispute_generated',
    'dispute_sent',
    'dispute_updated',
    'document_signed',
    'message_sent',
    'status_changed',
    'payment_recorded',
    'payment_failed',
    'client_note_added',
    'report_uploaded',
    'report_analyzed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  first_name text DEFAULT ''::text NOT NULL,
  last_name text DEFAULT ''::text NOT NULL,
  email text DEFAULT ''::text NOT NULL,
  phone text DEFAULT ''::text NOT NULL,
  address text DEFAULT ''::text NOT NULL,
  city text DEFAULT ''::text NOT NULL,
  state text DEFAULT ''::text NOT NULL,
  zip text DEFAULT ''::text NOT NULL,
  referral_source text DEFAULT ''::text NOT NULL,
  referral_notes text DEFAULT ''::text NOT NULL,
  lead_status public.lead_status DEFAULT 'new'::public.lead_status NOT NULL,
  pipeline_stage public.croa_pipeline_stage DEFAULT 'lead'::public.croa_pipeline_stage NOT NULL,
  assigned_staff text DEFAULT ''::text NOT NULL,
  notes text DEFAULT ''::text NOT NULL,
  converted_client_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_converted_client_id_fkey FOREIGN KEY (converted_client_id) REFERENCES public.staff_clients(id) ON DELETE SET NULL,
  CONSTRAINT leads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.compliance_disclosures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  client_id uuid,
  lead_id uuid,
  disclosure_text text DEFAULT ''::text NOT NULL,
  acknowledged boolean DEFAULT false NOT NULL,
  acknowledged_at timestamp with time zone,
  client_ip text DEFAULT ''::text NOT NULL,
  client_name text DEFAULT ''::text NOT NULL,
  client_email text DEFAULT ''::text NOT NULL,
  delivery_method text DEFAULT 'email'::text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT compliance_disclosures_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_disclosures_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  CONSTRAINT compliance_disclosures_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT compliance_disclosures_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.croa_contracts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  client_id uuid,
  lead_id uuid,
  contract_text text DEFAULT ''::text NOT NULL,
  contract_status public.contract_status DEFAULT 'pending'::public.contract_status NOT NULL,
  client_name text DEFAULT ''::text NOT NULL,
  client_email text DEFAULT ''::text NOT NULL,
  signed_at timestamp with time zone,
  signed_ip text DEFAULT ''::text NOT NULL,
  signature_data text DEFAULT ''::text NOT NULL,
  cancellation_deadline timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT croa_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT croa_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  CONSTRAINT croa_contracts_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT croa_contracts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.cancellation_periods (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  client_id uuid,
  contract_id uuid,
  started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_expired boolean DEFAULT false NOT NULL,
  expired_at timestamp with time zone,
  was_cancelled boolean DEFAULT false NOT NULL,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT cancellation_periods_pkey PRIMARY KEY (id),
  CONSTRAINT cancellation_periods_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  CONSTRAINT cancellation_periods_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.croa_contracts(id) ON DELETE CASCADE,
  CONSTRAINT cancellation_periods_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.consumer_services (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid,
  consumer_id uuid,
  consumer_name text NOT NULL,
  service_name text NOT NULL,
  service_description text NOT NULL,
  date_authorized timestamp with time zone,
  date_work_began timestamp with time zone,
  date_fully_performed timestamp with time zone,
  staff_member text,
  completion_evidence text,
  billing_eligibility_status text DEFAULT 'Proposed'::text NOT NULL,
  invoice_created_at timestamp with time zone,
  payment_at timestamp with time zone,
  contract_signed boolean DEFAULT false NOT NULL,
  disclosures_delivered boolean DEFAULT false NOT NULL,
  cancellation_period_expired boolean DEFAULT false NOT NULL,
  billing_approved boolean DEFAULT false NOT NULL,
  audit_log_complete boolean DEFAULT false NOT NULL,
  contract_version text,
  disclosure_version text,
  billing_approval_id uuid,
  service_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT consumer_services_pkey PRIMARY KEY (id),
  CONSTRAINT consumer_services_billing_eligibility_status_check CHECK (
    billing_eligibility_status = ANY (ARRAY[
      'Proposed'::text, 'Awaiting Contract'::text, 'Cancellation Period'::text,
      'Authorized'::text, 'In Progress'::text, 'Awaiting Review'::text,
      'Fully Performed'::text, 'Eligible for Billing'::text, 'Invoiced'::text,
      'Paid'::text, 'Disputed'::text, 'Refunded'::text, 'Cancelled'::text
    ])
  ),
  CONSTRAINT consumer_services_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.consumer_contracts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid,
  consumer_id uuid,
  consumer_name text NOT NULL,
  consumer_email text,
  consumer_signature text,
  contract_signed_at timestamp with time zone,
  cancellation_deadline timestamp with time zone,
  cancellation_requested boolean DEFAULT false NOT NULL,
  cancellation_requested_at timestamp with time zone,
  cancellation_confirmation_number text,
  cancellation_reason text,
  disclosure_acknowledged boolean DEFAULT false NOT NULL,
  disclosure_acknowledged_at timestamp with time zone,
  disclosure_version text,
  contract_version text DEFAULT '1.0'::text NOT NULL,
  contract_document_url text,
  status text DEFAULT 'Awaiting Disclosure'::text NOT NULL,
  state text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT consumer_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT consumer_contracts_status_check CHECK (
    status = ANY (ARRAY[
      'Awaiting Disclosure'::text, 'Awaiting Signature'::text,
      'Cancellation Period'::text, 'Active'::text, 'Cancelled'::text,
      'Completed'::text
    ])
  ),
  CONSTRAINT consumer_contracts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.consumer_disclosures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid,
  consumer_id uuid,
  consumer_email text,
  disclosure_version text DEFAULT '1.0'::text NOT NULL,
  displayed_at timestamp with time zone,
  acknowledged_at timestamp with time zone,
  emailed_at timestamp with time zone,
  download_url text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT consumer_disclosures_pkey PRIMARY KEY (id),
  CONSTRAINT consumer_disclosures_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.compliance_overrides (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid,
  service_id uuid,
  override_by text NOT NULL,
  override_reason text NOT NULL,
  warning_acknowledged boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT compliance_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_overrides_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT compliance_overrides_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.consumer_services(id)
);

CREATE TABLE IF NOT EXISTS public.state_compliance_configs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  state_code character(2) NOT NULL,
  state_name text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  registration_required boolean DEFAULT false,
  bond_required boolean DEFAULT false,
  cancellation_period_days integer DEFAULT 3,
  advance_fee_prohibited boolean DEFAULT true,
  notes text,
  configured_by text,
  configured_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT state_compliance_configs_pkey PRIMARY KEY (id),
  CONSTRAINT state_compliance_configs_state_code_key UNIQUE (state_code),
  CONSTRAINT state_compliance_configs_status_check CHECK (
    status = ANY (ARRAY['configured'::text, 'pending'::text, 'restricted'::text])
  )
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  client_id uuid,
  lead_id uuid,
  action public.audit_action NOT NULL,
  actor_name text DEFAULT ''::text NOT NULL,
  actor_email text DEFAULT ''::text NOT NULL,
  actor_ip text DEFAULT ''::text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  related_document_version text,
  event_reason text,
  service_id uuid,
  contract_id uuid,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.staff_clients(id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON public.leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_compliance_disclosures_client_id ON public.compliance_disclosures(client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_disclosures_owner_id ON public.compliance_disclosures(owner_id);
CREATE INDEX IF NOT EXISTS idx_croa_contracts_client_id ON public.croa_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_croa_contracts_contract_status ON public.croa_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_croa_contracts_owner_id ON public.croa_contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_periods_client_id ON public.cancellation_periods(client_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_periods_expires_at ON public.cancellation_periods(expires_at);
CREATE INDEX IF NOT EXISTS idx_cancellation_periods_owner_id ON public.cancellation_periods(owner_id);
CREATE INDEX IF NOT EXISTS idx_consumer_services_owner ON public.consumer_services(owner_id);
CREATE INDEX IF NOT EXISTS idx_consumer_services_status ON public.consumer_services(billing_eligibility_status);
CREATE INDEX IF NOT EXISTS idx_consumer_contracts_owner ON public.consumer_contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_consumer_contracts_status ON public.consumer_contracts(status);
CREATE INDEX IF NOT EXISTS idx_consumer_disclosures_owner ON public.consumer_disclosures(owner_id);
CREATE INDEX IF NOT EXISTS idx_compliance_overrides_owner ON public.compliance_overrides(owner_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON public.audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_owner_id ON public.audit_logs(owner_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.croa_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_compliance_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_leads" ON public.leads;
CREATE POLICY "users_manage_own_leads"
ON public.leads FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_compliance_disclosures" ON public.compliance_disclosures;
CREATE POLICY "users_manage_own_compliance_disclosures"
ON public.compliance_disclosures FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_croa_contracts" ON public.croa_contracts;
CREATE POLICY "users_manage_own_croa_contracts"
ON public.croa_contracts FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_cancellation_periods" ON public.cancellation_periods;
CREATE POLICY "users_manage_own_cancellation_periods"
ON public.cancellation_periods FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "consumer_services_owner_policy" ON public.consumer_services;
CREATE POLICY "consumer_services_owner_policy"
ON public.consumer_services FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "consumer_contracts_owner_policy" ON public.consumer_contracts;
CREATE POLICY "consumer_contracts_owner_policy"
ON public.consumer_contracts FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "consumer_disclosures_owner_policy" ON public.consumer_disclosures;
CREATE POLICY "consumer_disclosures_owner_policy"
ON public.consumer_disclosures FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "compliance_overrides_owner_policy" ON public.compliance_overrides;
CREATE POLICY "compliance_overrides_owner_policy"
ON public.compliance_overrides FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "state_configs_read_policy" ON public.state_compliance_configs;
CREATE POLICY "state_configs_read_policy"
ON public.state_compliance_configs FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "users_view_own_audit_logs" ON public.audit_logs;
CREATE POLICY "users_view_own_audit_logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_insert_own_audit_logs" ON public.audit_logs;
CREATE POLICY "users_insert_own_audit_logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
CREATE POLICY "audit_logs_no_update"
ON public.audit_logs FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;
CREATE POLICY "audit_logs_no_delete"
ON public.audit_logs FOR DELETE TO authenticated
USING (false);

REVOKE ALL ON
  public.leads,
  public.compliance_disclosures,
  public.croa_contracts,
  public.cancellation_periods,
  public.consumer_services,
  public.consumer_contracts,
  public.consumer_disclosures,
  public.compliance_overrides,
  public.state_compliance_configs,
  public.audit_logs
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.leads,
  public.compliance_disclosures,
  public.croa_contracts,
  public.cancellation_periods,
  public.consumer_services,
  public.consumer_contracts,
  public.consumer_disclosures,
  public.compliance_overrides
TO authenticated;

GRANT SELECT ON public.state_compliance_configs TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

GRANT ALL ON
  public.leads,
  public.compliance_disclosures,
  public.croa_contracts,
  public.cancellation_periods,
  public.consumer_services,
  public.consumer_contracts,
  public.consumer_disclosures,
  public.compliance_overrides,
  public.state_compliance_configs,
  public.audit_logs
TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND NOT relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'FMM-003 requires RLS on every public application table';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        roles::text = '{public}'
        OR regexp_replace(coalesce(qual, ''), '[()[:space:]]', '', 'g') = 'true'
        OR regexp_replace(coalesce(with_check, ''), '[()[:space:]]', '', 'g') = 'true'
      )
  ) THEN
    RAISE EXCEPTION 'FMM-003 rejected a broad or implicit-PUBLIC RLS policy';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'UPDATE'
      AND with_check IS NULL
  ) THEN
    RAISE EXCEPTION 'FMM-003 requires WITH CHECK on every UPDATE policy';
  END IF;
END;
$$;
