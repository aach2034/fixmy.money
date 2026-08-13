-- Explicitly override broad project-level default grants for sensitive evidence data.
-- case_events is append-only for authenticated users.

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

-- Cover every evidence-engine foreign key used for joins and cascading deletes.
CREATE INDEX IF NOT EXISTS idx_bureau_tradelines_client_id ON public.bureau_tradelines(client_id);
CREATE INDEX IF NOT EXISTS idx_bureau_tradelines_parsed_report_id ON public.bureau_tradelines(parsed_report_id);
CREATE INDEX IF NOT EXISTS idx_bureau_tradelines_source_item ON public.bureau_tradelines(source_negative_item_id);
CREATE INDEX IF NOT EXISTS idx_case_events_owner_id ON public.case_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_case_events_client_id ON public.case_events(client_id);
CREATE INDEX IF NOT EXISTS idx_case_events_created_by ON public.case_events(created_by);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_client_id ON public.credit_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_cases_client_id ON public.credit_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_cases_account_id ON public.credit_cases(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_detected_issues_client_id ON public.detected_issues(client_id);
CREATE INDEX IF NOT EXISTS idx_detected_issues_snapshot_id ON public.detected_issues(report_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_dispute_recipients_owner_id ON public.dispute_recipients(owner_id);
CREATE INDEX IF NOT EXISTS idx_disputes_owner_id ON public.disputes(owner_id);
CREATE INDEX IF NOT EXISTS idx_disputes_client_id ON public.disputes(client_id);
CREATE INDEX IF NOT EXISTS idx_disputes_letter_id ON public.disputes(dispute_letter_id);
CREATE INDEX IF NOT EXISTS idx_escalations_owner_id ON public.escalations(owner_id);
CREATE INDEX IF NOT EXISTS idx_escalations_client_id ON public.escalations(client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_documents_client_id ON public.evidence_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_documents_account_id ON public.evidence_documents(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_evidence_documents_issue_id ON public.evidence_documents(detected_issue_id);
CREATE INDEX IF NOT EXISTS idx_evidence_facts_owner_id ON public.evidence_facts(owner_id);
CREATE INDEX IF NOT EXISTS idx_evidence_facts_client_id ON public.evidence_facts(client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_facts_document_id ON public.evidence_facts(evidence_document_id);
CREATE INDEX IF NOT EXISTS idx_evidence_facts_confirmed_by ON public.evidence_facts(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_investigation_results_owner_id ON public.investigation_results(owner_id);
CREATE INDEX IF NOT EXISTS idx_investigation_results_client_id ON public.investigation_results(client_id);
CREATE INDEX IF NOT EXISTS idx_investigation_results_dispute_id ON public.investigation_results(dispute_id);
CREATE INDEX IF NOT EXISTS idx_investigation_results_recipient_id ON public.investigation_results(recipient_id);
CREATE INDEX IF NOT EXISTS idx_investigation_results_response_document_id ON public.investigation_results(response_document_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_owner_id ON public.report_comparisons(owner_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_client_id ON public.report_comparisons(client_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_before_snapshot_id ON public.report_comparisons(before_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_after_snapshot_id ON public.report_comparisons(after_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_account_id ON public.report_comparisons(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_client_id ON public.report_snapshots(client_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_parsed_report_id ON public.report_snapshots(parsed_report_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_import_id ON public.report_snapshots(import_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_legacy_snapshot_id ON public.report_snapshots(legacy_credit_report_snapshot_id);
