-- Evidence-driven dispute engine backbone.
-- Adds normalized account, issue, evidence, case, investigation, comparison,
-- reinsertion/escalation tables without replacing existing parser or letter tables.

CREATE OR REPLACE FUNCTION public.update_evidence_engine_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_evidence_engine_updated_at() FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  workspace_id UUID,
  canonical_key TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  creditor_name TEXT NOT NULL DEFAULT '',
  furnisher_name TEXT NOT NULL DEFAULT '',
  account_number_masked TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT '',
  original_creditor TEXT NOT NULL DEFAULT '',
  collection_agency TEXT NOT NULL DEFAULT '',
  first_seen_snapshot_id UUID,
  last_seen_snapshot_id UUID,
  latest_reported_at TEXT NOT NULL DEFAULT '',
  normalized_fields JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, client_id, canonical_key)
);

CREATE TABLE IF NOT EXISTS public.bureau_tradelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_account_id UUID REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
  parsed_report_id UUID REFERENCES public.parsed_credit_reports(id) ON DELETE SET NULL,
  source_negative_item_id UUID REFERENCES public.negative_items(id) ON DELETE SET NULL,
  bureau TEXT NOT NULL DEFAULT 'Unknown',
  creditor_name TEXT NOT NULL DEFAULT '',
  furnisher_name TEXT NOT NULL DEFAULT '',
  account_number_masked TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT '',
  original_creditor TEXT NOT NULL DEFAULT '',
  collection_agency TEXT NOT NULL DEFAULT '',
  account_status TEXT NOT NULL DEFAULT '',
  payment_status TEXT NOT NULL DEFAULT '',
  balance NUMERIC(12,2),
  credit_limit NUMERIC(12,2),
  past_due NUMERIC(12,2),
  date_opened TEXT NOT NULL DEFAULT '',
  date_reported TEXT NOT NULL DEFAULT '',
  last_payment_date TEXT NOT NULL DEFAULT '',
  payment_history TEXT NOT NULL DEFAULT '',
  remarks TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  raw_tradeline JSONB NOT NULL DEFAULT '{}'::JSONB,
  parser_confidence INTEGER NOT NULL DEFAULT 0,
  snapshot_observed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  parsed_report_id UUID REFERENCES public.parsed_credit_reports(id) ON DELETE SET NULL,
  import_id UUID REFERENCES public.credit_report_imports(id) ON DELETE SET NULL,
  legacy_credit_report_snapshot_id UUID REFERENCES public.credit_report_snapshots(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'unknown',
  report_date TEXT NOT NULL DEFAULT '',
  accounts_count INTEGER NOT NULL DEFAULT 0,
  bureaus TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  snapshot_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.detected_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_account_id UUID REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
  report_snapshot_id UUID REFERENCES public.report_snapshots(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL DEFAULT '',
  issue_label TEXT NOT NULL DEFAULT 'Potential reporting discrepancy',
  affected_bureaus TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  affected_furnisher TEXT NOT NULL DEFAULT '',
  reported_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  conflicting_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  why_flagged TEXT NOT NULL DEFAULT '',
  confidence_level INTEGER NOT NULL DEFAULT 0,
  evidence_currently_available TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  evidence_still_needed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  evidence_strength TEXT NOT NULL DEFAULT 'insufficient' CHECK (evidence_strength IN ('strong', 'moderate', 'insufficient')),
  status TEXT NOT NULL DEFAULT 'potential_issue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.evidence_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_account_id UUID REFERENCES public.credit_accounts(id) ON DELETE SET NULL,
  detected_issue_id UUID REFERENCES public.detected_issues(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  document_name TEXT NOT NULL DEFAULT '',
  storage_bucket TEXT NOT NULL DEFAULT 'evidence-documents',
  storage_path TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  document_date DATE,
  ai_extraction_status TEXT NOT NULL DEFAULT 'not_started',
  extracted_facts JSONB NOT NULL DEFAULT '[]'::JSONB,
  user_confirmed_facts JSONB NOT NULL DEFAULT '[]'::JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.evidence_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  evidence_document_id UUID REFERENCES public.evidence_documents(id) ON DELETE CASCADE,
  detected_issue_id UUID REFERENCES public.detected_issues(id) ON DELETE SET NULL,
  fact_type TEXT NOT NULL DEFAULT '',
  field_name TEXT NOT NULL DEFAULT '',
  fact_value TEXT NOT NULL DEFAULT '',
  source_reference JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_category TEXT NOT NULL DEFAULT 'uploaded_evidence',
  confirmed_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.credit_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_account_id UUID REFERENCES public.credit_accounts(id) ON DELETE SET NULL,
  detected_issue_id UUID REFERENCES public.detected_issues(id) ON DELETE SET NULL,
  case_number TEXT NOT NULL DEFAULT '',
  issue_summary TEXT NOT NULL DEFAULT '',
  responsible_party TEXT NOT NULL DEFAULT '',
  evidence_strength TEXT NOT NULL DEFAULT 'insufficient' CHECK (evidence_strength IN ('strong', 'moderate', 'insufficient')),
  escalation_level INTEGER NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 6),
  case_status TEXT NOT NULL DEFAULT 'evidence_gathering',
  recommended_next_action TEXT NOT NULL DEFAULT 'Gather additional documentation before disputing.',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_case_id UUID REFERENCES public.credit_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT '',
  event_summary TEXT NOT NULL DEFAULT '',
  event_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_case_id UUID REFERENCES public.credit_cases(id) ON DELETE SET NULL,
  dispute_letter_id UUID REFERENCES public.dispute_letters(id) ON DELETE SET NULL,
  dispute_kind TEXT NOT NULL DEFAULT 'cra_or_furnisher_dispute',
  generated_from_verified_facts BOOLEAN NOT NULL DEFAULT FALSE,
  reported_fact JSONB NOT NULL DEFAULT '{}'::JSONB,
  consumer_position JSONB NOT NULL DEFAULT '{}'::JSONB,
  supporting_evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
  requested_investigation TEXT NOT NULL DEFAULT '',
  factual_assertions JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.dispute_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT '',
  recipient_name TEXT NOT NULL DEFAULT '',
  submission_method TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  confirmation_number TEXT NOT NULL DEFAULT '',
  tracking_number TEXT NOT NULL DEFAULT '',
  response_deadline_estimate DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.investigation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_case_id UUID REFERENCES public.credit_cases(id) ON DELETE SET NULL,
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES public.dispute_recipients(id) ON DELETE SET NULL,
  response_received_at DATE,
  result_status TEXT NOT NULL DEFAULT '',
  reporting_changed BOOLEAN,
  information_deleted BOOLEAN,
  information_reappeared BOOLEAN NOT NULL DEFAULT FALSE,
  response_document_id UUID REFERENCES public.evidence_documents(id) ON DELETE SET NULL,
  result_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.report_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_case_id UUID REFERENCES public.credit_cases(id) ON DELETE SET NULL,
  before_snapshot_id UUID REFERENCES public.report_snapshots(id) ON DELETE SET NULL,
  after_snapshot_id UUID REFERENCES public.report_snapshots(id) ON DELETE SET NULL,
  credit_account_id UUID REFERENCES public.credit_accounts(id) ON DELETE SET NULL,
  compared_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  changed_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  unchanged_disputed_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  material_correction_detected BOOLEAN NOT NULL DEFAULT FALSE,
  potential_reinsertion_detected BOOLEAN NOT NULL DEFAULT FALSE,
  recommendation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
  credit_case_id UUID REFERENCES public.credit_cases(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 6),
  escalation_type TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  package_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  requires_user_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  user_confirmed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_owner_client ON public.credit_accounts(owner_id, client_id);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_canonical ON public.credit_accounts(owner_id, client_id, canonical_key);
CREATE INDEX IF NOT EXISTS idx_bureau_tradelines_account ON public.bureau_tradelines(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_bureau_tradelines_owner_client ON public.bureau_tradelines(owner_id, client_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_owner_client ON public.report_snapshots(owner_id, client_id);
CREATE INDEX IF NOT EXISTS idx_detected_issues_owner_client ON public.detected_issues(owner_id, client_id);
CREATE INDEX IF NOT EXISTS idx_detected_issues_account ON public.detected_issues(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_evidence_documents_owner_client ON public.evidence_documents(owner_id, client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_facts_issue ON public.evidence_facts(detected_issue_id);
CREATE INDEX IF NOT EXISTS idx_credit_cases_owner_client ON public.credit_cases(owner_id, client_id);
CREATE INDEX IF NOT EXISTS idx_credit_cases_issue ON public.credit_cases(detected_issue_id);
CREATE INDEX IF NOT EXISTS idx_case_events_case ON public.case_events(credit_case_id);
CREATE INDEX IF NOT EXISTS idx_disputes_case ON public.disputes(credit_case_id);
CREATE INDEX IF NOT EXISTS idx_dispute_recipients_dispute ON public.dispute_recipients(dispute_id);
CREATE INDEX IF NOT EXISTS idx_investigation_results_case ON public.investigation_results(credit_case_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_case ON public.report_comparisons(credit_case_id);
CREATE INDEX IF NOT EXISTS idx_escalations_case ON public.escalations(credit_case_id);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureau_tradelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_credit_accounts" ON public.credit_accounts;
CREATE POLICY "owner_credit_accounts" ON public.credit_accounts FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_bureau_tradelines" ON public.bureau_tradelines;
CREATE POLICY "owner_bureau_tradelines" ON public.bureau_tradelines FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_report_snapshots" ON public.report_snapshots;
CREATE POLICY "owner_report_snapshots" ON public.report_snapshots FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_detected_issues" ON public.detected_issues;
CREATE POLICY "owner_detected_issues" ON public.detected_issues FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_evidence_documents" ON public.evidence_documents;
CREATE POLICY "owner_evidence_documents" ON public.evidence_documents FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_evidence_facts" ON public.evidence_facts;
CREATE POLICY "owner_evidence_facts" ON public.evidence_facts FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_credit_cases" ON public.credit_cases;
CREATE POLICY "owner_credit_cases" ON public.credit_cases FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_case_events_select" ON public.case_events;
CREATE POLICY "owner_case_events_select" ON public.case_events FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_case_events_insert" ON public.case_events;
CREATE POLICY "owner_case_events_insert" ON public.case_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_disputes" ON public.disputes;
CREATE POLICY "owner_disputes" ON public.disputes FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_dispute_recipients" ON public.dispute_recipients;
CREATE POLICY "owner_dispute_recipients" ON public.dispute_recipients FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_investigation_results" ON public.investigation_results;
CREATE POLICY "owner_investigation_results" ON public.investigation_results FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_report_comparisons" ON public.report_comparisons;
CREATE POLICY "owner_report_comparisons" ON public.report_comparisons FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "owner_escalations" ON public.escalations;
CREATE POLICY "owner_escalations" ON public.escalations FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

REVOKE ALL ON
  public.credit_accounts,
  public.bureau_tradelines,
  public.report_snapshots,
  public.detected_issues,
  public.evidence_documents,
  public.evidence_facts,
  public.credit_cases,
  public.disputes,
  public.dispute_recipients,
  public.investigation_results,
  public.report_comparisons,
  public.escalations
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.credit_accounts,
  public.bureau_tradelines,
  public.report_snapshots,
  public.detected_issues,
  public.evidence_documents,
  public.evidence_facts,
  public.credit_cases,
  public.disputes,
  public.dispute_recipients,
  public.investigation_results,
  public.report_comparisons,
  public.escalations
TO authenticated;

REVOKE ALL ON public.case_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.case_events TO authenticated;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'credit_accounts',
    'bureau_tradelines',
    'detected_issues',
    'evidence_documents',
    'evidence_facts',
    'credit_cases',
    'disputes',
    'dispute_recipients',
    'investigation_results',
    'escalations'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_evidence_engine_updated_at()', table_name, table_name);
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-documents', 'evidence-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "owner_evidence_storage_select" ON storage.objects;
CREATE POLICY "owner_evidence_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence-documents' AND (storage.foldername(name))[1] = (select auth.uid())::TEXT);

DROP POLICY IF EXISTS "owner_evidence_storage_insert" ON storage.objects;
CREATE POLICY "owner_evidence_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence-documents' AND (storage.foldername(name))[1] = (select auth.uid())::TEXT);

DROP POLICY IF EXISTS "owner_evidence_storage_update" ON storage.objects;
CREATE POLICY "owner_evidence_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'evidence-documents' AND (storage.foldername(name))[1] = (select auth.uid())::TEXT)
  WITH CHECK (bucket_id = 'evidence-documents' AND (storage.foldername(name))[1] = (select auth.uid())::TEXT);

DROP POLICY IF EXISTS "owner_evidence_storage_delete" ON storage.objects;
CREATE POLICY "owner_evidence_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence-documents' AND (storage.foldername(name))[1] = (select auth.uid())::TEXT);
