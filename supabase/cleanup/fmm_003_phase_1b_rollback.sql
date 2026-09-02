-- FMM-003 Phase 1B tested rollback artifact.
-- This file is intentionally outside supabase/migrations and must never run
-- automatically. It restores the exact pre-FMM-003 production policy, public
-- function, and application-role grant state captured read-only from Sites v159
-- at commit a0088ee117e893fa62fa0d8449da64ce02499015.
--
-- Positively identify the target and take fresh metadata evidence before use.
-- This rehearsal artifact does not authorize a production rollback.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $rollback$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END;
$rollback$;

DROP SCHEMA IF EXISTS private CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  workspace_name TEXT;
  base_slug TEXT;
  workspace_slug TEXT;
  attribution JSONB := COALESCE(NEW.raw_user_meta_data->'attribution', '{}'::jsonb);
  first_touch TIMESTAMPTZ;
BEGIN
  IF COALESCE(attribution->>'first_touch_at', '') ~ '^\d{4}-\d{2}-\d{2}T' THEN
    BEGIN
      first_touch := (attribution->>'first_touch_at')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      first_touch := NULL;
    END;
  END IF;

  INSERT INTO public.user_profiles (
    id, email, full_name, company_name, plan, avatar_url,
    referral_code, referral_source, utm_source, utm_medium, utm_campaign,
    utm_content, utm_term, landing_page, first_touch_at,
    last_referral_code, last_utm_source, last_utm_medium,
    last_utm_campaign, last_landing_page, anonymous_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'plan', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(attribution->>'referral_code', ''),
    COALESCE(attribution->>'referral_source', ''),
    COALESCE(attribution->>'utm_source', ''),
    COALESCE(attribution->>'utm_medium', ''),
    COALESCE(attribution->>'utm_campaign', ''),
    COALESCE(attribution->>'utm_content', ''),
    COALESCE(attribution->>'utm_term', ''),
    COALESCE(attribution->>'landing_page', ''),
    first_touch,
    COALESCE(attribution->>'referral_code', ''),
    COALESCE(attribution->>'last_utm_source', ''),
    COALESCE(attribution->>'last_utm_medium', ''),
    COALESCE(attribution->>'last_utm_campaign', ''),
    COALESCE(attribution->>'last_landing_page', ''),
    COALESCE(attribution->>'anonymous_id', '')
  )
  ON CONFLICT (id) DO NOTHING;

  workspace_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '');
  IF workspace_name IS NULL THEN
    workspace_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  END IF;
  IF workspace_name IS NULL THEN
    workspace_name := NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), '');
  END IF;
  IF workspace_name IS NULL THEN workspace_name := 'Workspace'; END IF;

  base_slug := LOWER(REGEXP_REPLACE(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  IF base_slug IS NULL OR base_slug = '' THEN base_slug := 'workspace'; END IF;
  workspace_slug := LEFT(base_slug, 48) || '-' || LEFT(NEW.id::text, 8);

  INSERT INTO public.workspaces (owner_id, name, slug, is_active)
  VALUES (NEW.id, workspace_name, workspace_slug, true)
  ON CONFLICT (owner_id) DO NOTHING;

  INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
  VALUES (
    NEW.id,
    'signup_completed',
    jsonb_strip_nulls(jsonb_build_object(
      'plan', NULLIF(COALESCE(NEW.raw_user_meta_data->>'plan', ''), ''),
      'source', NULLIF(COALESCE(attribution->>'utm_source', ''), ''),
      'campaign', NULLIF(COALESCE(attribution->>'utm_campaign', ''), ''),
      'landing_page', NULLIF(COALESCE(attribution->>'landing_page', ''), '')
    )),
    'signup:' || NEW.id::text,
    COALESCE(first_touch, NEW.created_at, CURRENT_TIMESTAMP)
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_client_portal_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_staff_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_credit_upload_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.specialist_owns_client(client_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_clients sc
    WHERE sc.owner_id = auth.uid()
      AND sc.email = (SELECT email FROM public.client_accounts WHERE id = client_account_id LIMIT 1)
  )
$function$;

CREATE OR REPLACE FUNCTION public.specialist_owns_dispute(dispute_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_disputes cd
    JOIN public.staff_clients sc ON sc.email = (
      SELECT email FROM public.client_accounts WHERE id = cd.client_id LIMIT 1
    )
    WHERE cd.id = dispute_id
      AND sc.owner_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.specialist_owns_timeline_event(event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.dispute_timeline_events dte
    WHERE dte.id = event_id
      AND public.specialist_owns_dispute(dte.dispute_id)
  )
$function$;

CREATE OR REPLACE FUNCTION public.specialist_owns_client_update(update_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_updates cu
    WHERE cu.id = update_id
      AND public.specialist_owns_client(cu.client_id)
  )
$function$;

CREATE OR REPLACE FUNCTION public.specialist_owns_client_document(doc_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_documents cd
    WHERE cd.id = doc_id
      AND public.specialist_owns_client(cd.client_id)
  )
$function$;

CREATE OR REPLACE FUNCTION public.specialist_owns_conversation(conv_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations cc
    WHERE cc.id = conv_id
      AND cc.specialist_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.update_client_disputes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_parser_workflow_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_import_workflow_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_evidence_engine_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_follow_up_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  IF NEW.completed = true AND OLD.completed = false AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_retention_alert_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_client_portal_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_portal_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_client_portal_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_portal_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_staff_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_staff_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_staff_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_credit_upload_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_credit_upload_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_credit_upload_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_credit_upload_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_conversation_last_message() TO service_role;
GRANT EXECUTE ON FUNCTION public.specialist_owns_client(client_account_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.specialist_owns_dispute(dispute_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.specialist_owns_timeline_event(event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.specialist_owns_client_update(update_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.specialist_owns_client_document(doc_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.specialist_owns_conversation(conv_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_client_disputes_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_disputes_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_client_disputes_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_disputes_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_parser_workflow_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_import_workflow_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_evidence_engine_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_evidence_engine_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_evidence_engine_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_follow_up_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_admin_follow_up_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_follow_up_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_retention_alert_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_admin_retention_alert_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_retention_alert_updated_at() TO service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public
FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_action_audit_logs TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_action_audit_logs TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_action_audit_logs TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_customer_notes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_customer_notes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_customer_notes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_follow_up_tasks TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_follow_up_tasks TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_follow_up_tasks TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_retention_alert_states TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_retention_alert_states TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_retention_alert_states TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.affiliate_link_clicks TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.affiliate_link_clicks TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.affiliate_link_clicks TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ai_usage_events TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ai_usage_events TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ai_usage_events TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.audit_logs TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.audit_logs TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.audit_logs TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.billing_events TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.billing_events TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.billing_events TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.bureau_tradelines TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bureau_tradelines TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.cancellation_periods TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.cancellation_periods TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.cancellation_periods TO service_role;
GRANT INSERT, SELECT ON TABLE public.case_events TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.case_events TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.chat_conversations TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.chat_conversations TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.chat_conversations TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.chat_messages TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.chat_messages TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.chat_messages TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_accounts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_accounts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_accounts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_disputes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_disputes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_disputes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_documents TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_documents TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_documents TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_updates TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_updates TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.client_updates TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.compliance_disclosures TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.compliance_disclosures TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.compliance_disclosures TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.compliance_overrides TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.compliance_overrides TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.compliance_overrides TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_contracts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_contracts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_contracts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_disclosures TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_disclosures TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_disclosures TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_services TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_services TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.consumer_services TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.credit_accounts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_accounts TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.credit_cases TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_cases TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_analyses TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_analyses TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_analyses TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_imports TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_imports TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_imports TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_snapshots TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_snapshots TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_snapshots TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_uploads TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_uploads TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.credit_report_uploads TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.croa_contracts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.croa_contracts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.croa_contracts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dashboard_metrics TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dashboard_metrics TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dashboard_metrics TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.detected_issues TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.detected_issues TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_letters TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_letters TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_letters TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.dispute_recipients TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_recipients TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_recommendations TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_recommendations TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_recommendations TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_round_items TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_round_items TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_round_items TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_rounds TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_rounds TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_rounds TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_timeline_events TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_timeline_events TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.dispute_timeline_events TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.disputes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.disputes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.disputes_by_bureau TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.disputes_by_bureau TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.disputes_by_bureau TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.escalations TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.escalations TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.evidence_documents TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.evidence_documents TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.evidence_facts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.evidence_facts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.generated_dispute_letters TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.generated_dispute_letters TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.generated_dispute_letters TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.import_comparisons TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.import_comparisons TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.import_comparisons TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.investigation_results TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.investigation_results TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.launch_directories TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.launch_directories TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.launch_directories TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.leads TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.leads TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.leads TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.negative_items TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.negative_items TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.negative_items TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.outreach_targets TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.outreach_targets TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.outreach_targets TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.parsed_credit_reports TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.parsed_credit_reports TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.parsed_credit_reports TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_admins TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_admins TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_admins TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.product_analytics_events TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.public_content_seo TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.public_content_seo TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.report_comparisons TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.report_comparisons TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.report_provider_settings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.report_provider_settings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.report_provider_settings TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.report_snapshots TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.report_snapshots TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.social_posts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.social_posts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.social_posts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.staff_clients TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.staff_clients TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.staff_clients TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.state_compliance_configs TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.state_compliance_configs TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.state_compliance_configs TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_profiles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.utm_tracking TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.utm_tracking TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.utm_tracking TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.webhook_failures TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.webhook_failures TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.webhook_failures TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO service_role;

REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO PUBLIC, anon, authenticated, service_role;

CREATE POLICY active_admins_insert_admin_audit ON public.admin_action_audit_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((admin_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true))))));
CREATE POLICY active_admins_select_admin_audit ON public.admin_action_audit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY admin_audit_no_delete ON public.admin_action_audit_logs AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY admin_audit_no_update ON public.admin_action_audit_logs AS PERMISSIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY active_admins_insert_notes ON public.admin_customer_notes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((admin_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true))))));
CREATE POLICY active_admins_select_notes ON public.admin_customer_notes AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY admin_notes_no_delete ON public.admin_customer_notes AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY admin_notes_no_update ON public.admin_customer_notes AS PERMISSIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY active_admins_insert_followups ON public.admin_follow_up_tasks AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((admin_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true))))));
CREATE POLICY active_admins_select_followups ON public.admin_follow_up_tasks AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY active_admins_update_followups ON public.admin_follow_up_tasks AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY admin_followups_no_delete ON public.admin_follow_up_tasks AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY active_admins_insert_retention_alerts ON public.admin_retention_alert_states AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((admin_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true))))));
CREATE POLICY active_admins_select_retention_alerts ON public.admin_retention_alert_states AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY active_admins_update_retention_alerts ON public.admin_retention_alert_states AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY admin_retention_alerts_no_delete ON public.admin_retention_alert_states AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY agency_own_clicks ON public.affiliate_link_clicks AS PERMISSIVE FOR ALL TO authenticated USING ((agency_id IN ( SELECT workspaces.id
   FROM workspaces
  WHERE (workspaces.owner_id = auth.uid()))));
CREATE POLICY ai_usage_events_insert ON public.ai_usage_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY ai_usage_events_no_delete ON public.ai_usage_events AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY ai_usage_events_no_update ON public.ai_usage_events AS PERMISSIVE FOR UPDATE TO authenticated USING (false);
CREATE POLICY ai_usage_events_select ON public.ai_usage_events AS PERMISSIVE FOR SELECT TO authenticated USING ((workspace_id IN ( SELECT workspaces.id
   FROM workspaces
  WHERE (workspaces.owner_id = auth.uid()))));
CREATE POLICY audit_logs_no_delete ON public.audit_logs AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY audit_logs_no_update ON public.audit_logs AS PERMISSIVE FOR UPDATE TO authenticated USING (false);
CREATE POLICY users_insert_own_audit_logs ON public.audit_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY users_view_own_audit_logs ON public.audit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((owner_id = auth.uid()));
CREATE POLICY billing_events_workspace_insert ON public.billing_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY billing_events_workspace_select ON public.billing_events AS PERMISSIVE FOR SELECT TO authenticated USING ((workspace_id IN ( SELECT workspaces.id
   FROM workspaces
  WHERE (workspaces.owner_id = auth.uid()))));
CREATE POLICY owner_bureau_tradelines ON public.bureau_tradelines AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_cancellation_periods ON public.cancellation_periods AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_case_events_insert ON public.case_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owner_case_events_select ON public.case_events AS PERMISSIVE FOR SELECT TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY clients_insert_own_conversations_auth ON public.chat_conversations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((client_account_id IN ( SELECT ca.id
   FROM client_accounts ca
  WHERE (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)))));
CREATE POLICY clients_select_own_conversations_auth ON public.chat_conversations AS PERMISSIVE FOR SELECT TO authenticated USING ((client_account_id IN ( SELECT ca.id
   FROM client_accounts ca
  WHERE (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)))));
CREATE POLICY clients_update_own_conversations_auth ON public.chat_conversations AS PERMISSIVE FOR UPDATE TO authenticated USING ((client_account_id IN ( SELECT ca.id
   FROM client_accounts ca
  WHERE (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))))) WITH CHECK ((client_account_id IN ( SELECT ca.id
   FROM client_accounts ca
  WHERE (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)))));
CREATE POLICY specialists_manage_own_chat_conversations ON public.chat_conversations AS PERMISSIVE FOR ALL TO authenticated USING ((specialist_id = auth.uid())) WITH CHECK ((specialist_id = auth.uid()));
CREATE POLICY clients_insert_own_messages_auth ON public.chat_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (chat_conversations cc
     JOIN client_accounts ca ON ((ca.id = cc.client_account_id)))
  WHERE ((cc.id = chat_messages.conversation_id) AND (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))))));
CREATE POLICY clients_select_own_messages_auth ON public.chat_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (chat_conversations cc
     JOIN client_accounts ca ON ((ca.id = cc.client_account_id)))
  WHERE ((cc.id = chat_messages.conversation_id) AND (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))))));
CREATE POLICY clients_update_own_messages_auth ON public.chat_messages AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (chat_conversations cc
     JOIN client_accounts ca ON ((ca.id = cc.client_account_id)))
  WHERE ((cc.id = chat_messages.conversation_id) AND (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (chat_conversations cc
     JOIN client_accounts ca ON ((ca.id = cc.client_account_id)))
  WHERE ((cc.id = chat_messages.conversation_id) AND (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))))));
CREATE POLICY specialists_manage_own_chat_messages ON public.chat_messages AS PERMISSIVE FOR ALL TO authenticated USING (specialist_owns_conversation(conversation_id)) WITH CHECK (specialist_owns_conversation(conversation_id));
CREATE POLICY clients_read_own_account ON public.client_accounts AS PERMISSIVE FOR SELECT TO authenticated USING ((email = (auth.jwt() ->> 'email'::text)));
CREATE POLICY clients_update_own_account ON public.client_accounts AS PERMISSIVE FOR UPDATE TO authenticated USING ((email = (auth.jwt() ->> 'email'::text))) WITH CHECK ((email = (auth.jwt() ->> 'email'::text)));
CREATE POLICY specialists_manage_own_client_accounts ON public.client_accounts AS PERMISSIVE FOR ALL TO authenticated USING (specialist_owns_client(id)) WITH CHECK (specialist_owns_client(id));
CREATE POLICY clients_view_own_disputes ON public.client_disputes AS PERMISSIVE FOR SELECT TO authenticated USING ((client_id IN ( SELECT ca.id
   FROM client_accounts ca
  WHERE (ca.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)))));
CREATE POLICY specialists_manage_own_client_disputes ON public.client_disputes AS PERMISSIVE FOR ALL TO authenticated USING (specialist_owns_dispute(id)) WITH CHECK (specialist_owns_dispute(id));
CREATE POLICY users_manage_own_client_disputes ON public.client_disputes AS PERMISSIVE FOR ALL TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM staff_clients sc
  WHERE ((sc.id = client_disputes.client_id) AND (sc.owner_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM staff_clients sc
  WHERE ((sc.id = client_disputes.client_id) AND (sc.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY clients_manage_own_documents ON public.client_documents AS PERMISSIVE FOR ALL TO authenticated USING ((client_id IN ( SELECT client_accounts.id
   FROM client_accounts
  WHERE (client_accounts.email = (auth.jwt() ->> 'email'::text))))) WITH CHECK ((client_id IN ( SELECT client_accounts.id
   FROM client_accounts
  WHERE (client_accounts.email = (auth.jwt() ->> 'email'::text)))));
CREATE POLICY specialists_manage_own_client_documents ON public.client_documents AS PERMISSIVE FOR ALL TO authenticated USING (specialist_owns_client_document(id)) WITH CHECK (specialist_owns_client_document(id));
CREATE POLICY clients_manage_own_updates ON public.client_updates AS PERMISSIVE FOR ALL TO authenticated USING ((client_id IN ( SELECT client_accounts.id
   FROM client_accounts
  WHERE (client_accounts.email = (auth.jwt() ->> 'email'::text))))) WITH CHECK ((client_id IN ( SELECT client_accounts.id
   FROM client_accounts
  WHERE (client_accounts.email = (auth.jwt() ->> 'email'::text)))));
CREATE POLICY specialists_manage_own_client_updates ON public.client_updates AS PERMISSIVE FOR ALL TO authenticated USING (specialist_owns_client_update(id)) WITH CHECK (specialist_owns_client_update(id));
CREATE POLICY users_manage_own_compliance_disclosures ON public.compliance_disclosures AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY compliance_overrides_owner_policy ON public.compliance_overrides AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid()));
CREATE POLICY consumer_contracts_owner_policy ON public.consumer_contracts AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid()));
CREATE POLICY consumer_disclosures_owner_policy ON public.consumer_disclosures AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid()));
CREATE POLICY consumer_services_owner_policy ON public.consumer_services AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid()));
CREATE POLICY owner_credit_accounts ON public.credit_accounts AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owner_credit_cases ON public.credit_cases AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_credit_report_analyses ON public.credit_report_analyses AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY owner_credit_imports ON public.credit_report_imports AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_snapshots ON public.credit_report_snapshots AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY users_manage_own_credit_report_uploads ON public.credit_report_uploads AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_croa_contracts ON public.croa_contracts AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY users_manage_own_dashboard_metrics ON public.dashboard_metrics AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_detected_issues ON public.detected_issues AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_dispute_letters ON public.dispute_letters AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owner_dispute_recipients ON public.dispute_recipients AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_dispute_recommendations ON public.dispute_recommendations AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY owner_round_items ON public.dispute_round_items AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_dispute_rounds ON public.dispute_rounds AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY clients_view_own_timeline ON public.dispute_timeline_events AS PERMISSIVE FOR SELECT TO authenticated USING ((dispute_id IN ( SELECT cd.id
   FROM (client_disputes cd
     JOIN client_accounts ca ON ((cd.client_id = ca.id)))
  WHERE (ca.email = (auth.jwt() ->> 'email'::text)))));
CREATE POLICY specialists_manage_own_dispute_timeline_events ON public.dispute_timeline_events AS PERMISSIVE FOR ALL TO authenticated USING (specialist_owns_timeline_event(id)) WITH CHECK (specialist_owns_timeline_event(id));
CREATE POLICY owner_disputes ON public.disputes AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_disputes_by_bureau ON public.disputes_by_bureau AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_escalations ON public.escalations AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owner_evidence_documents ON public.evidence_documents AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owner_evidence_facts ON public.evidence_facts AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owner_gen_letters ON public.generated_dispute_letters AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_comparisons ON public.import_comparisons AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_investigation_results ON public.investigation_results AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY authenticated_manage_launch_directories ON public.launch_directories AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_leads ON public.leads AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY owner_negative_items ON public.negative_items AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY authenticated_manage_outreach_targets ON public.outreach_targets AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY owner_parsed_reports ON public.parsed_credit_reports AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY platform_admins_delete ON public.platform_admins AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY platform_admins_insert ON public.platform_admins AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY platform_admins_select ON public.platform_admins AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = auth.uid()) AND (pa.active = true)))));
CREATE POLICY platform_admins_update ON public.platform_admins AS PERMISSIVE FOR UPDATE TO authenticated USING (false);
CREATE POLICY seo_platform_admin_delete ON public.public_content_seo AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY seo_platform_admin_insert ON public.public_content_seo AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY seo_platform_admin_select ON public.public_content_seo AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY seo_platform_admin_update ON public.public_content_seo AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_admins pa
  WHERE ((pa.user_id = ( SELECT auth.uid() AS uid)) AND (pa.active = true)))));
CREATE POLICY owner_report_comparisons ON public.report_comparisons AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY agency_own_provider_settings ON public.report_provider_settings AS PERMISSIVE FOR ALL TO authenticated USING ((workspace_id IN ( SELECT workspaces.id
   FROM workspaces
  WHERE (workspaces.owner_id = auth.uid()))));
CREATE POLICY owner_report_snapshots ON public.report_snapshots AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY authenticated_manage_social_posts ON public.social_posts AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY users_manage_own_staff_clients ON public.staff_clients AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY state_configs_read_policy ON public.state_compliance_configs AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY users_manage_own_user_profiles ON public.user_profiles AS PERMISSIVE FOR ALL TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY authenticated_manage_utm_tracking ON public.utm_tracking AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY webhook_failures_insert ON public.webhook_failures AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY webhook_failures_no_delete ON public.webhook_failures AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY users_manage_own_workspaces ON public.workspaces AS PERMISSIVE FOR ALL TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));

COMMIT;
