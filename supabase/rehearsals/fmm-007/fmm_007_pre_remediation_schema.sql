-- Synthetic pre-FMM-007 schema for disposable-branch validation only.
-- This is intentionally not a production migration and contains no customer data.

CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  company_name text DEFAULT '',
  plan text DEFAULT '',
  avatar_url text DEFAULT '',
  account_type text DEFAULT 'business',
  referral_code text DEFAULT '', referral_source text DEFAULT '',
  utm_source text DEFAULT '', utm_medium text DEFAULT '', utm_campaign text DEFAULT '',
  utm_content text DEFAULT '', utm_term text DEFAULT '', landing_page text DEFAULT '',
  first_touch_at timestamptz, last_referral_code text DEFAULT '',
  last_utm_source text DEFAULT '', last_utm_medium text DEFAULT '',
  last_utm_campaign text DEFAULT '', last_landing_page text DEFAULT '', anonymous_id text DEFAULT '',
  onboarding_completed boolean DEFAULT false,
  subscription_status text DEFAULT '', subscription_plan text DEFAULT '',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL, slug text, is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := CURRENT_TIMESTAMP; RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, account_type)
  VALUES (
    NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN lower(COALESCE(NEW.raw_user_meta_data->>'is_client', 'false')) IN ('true','1','yes')
      THEN 'consumer' ELSE 'business' END
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.staff_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.user_profiles(id),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, email text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE, full_name text NOT NULL DEFAULT '', phone text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE public.dispute_status AS ENUM ('pending','in_review','submitted','resolved','closed');
CREATE TYPE public.document_status AS ENUM ('pending','uploaded','reviewed','approved','rejected');

CREATE TABLE public.client_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  owner_id uuid, workspace_id uuid,
  case_number text NOT NULL, title text NOT NULL, bureau text NOT NULL DEFAULT '',
  dispute_status public.dispute_status DEFAULT 'pending', description text DEFAULT '',
  opened_at timestamptz DEFAULT CURRENT_TIMESTAMP, resolved_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.dispute_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.client_disputes(id) ON DELETE CASCADE,
  event_title text NOT NULL, event_description text DEFAULT '',
  event_date timestamptz DEFAULT CURRENT_TIMESTAMP, created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.client_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  dispute_id uuid REFERENCES public.client_disputes(id) ON DELETE SET NULL,
  subject text NOT NULL, message text NOT NULL, is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  dispute_id uuid REFERENCES public.client_disputes(id) ON DELETE SET NULL,
  file_name text NOT NULL, file_url text NOT NULL DEFAULT '', file_size integer DEFAULT 0,
  mime_type text DEFAULT '', doc_status public.document_status DEFAULT 'uploaded',
  notes text DEFAULT '', uploaded_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  specialist_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open', subject text NOT NULL DEFAULT 'Support Chat',
  last_message_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('client','specialist')),
  sender_id text NOT NULL, sender_name text NOT NULL DEFAULT '', content text NOT NULL,
  is_read boolean DEFAULT false, created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.affiliate_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
  agency_id uuid NOT NULL REFERENCES public.workspaces(id), client_id uuid REFERENCES public.staff_clients(id),
  provider text NOT NULL, source_page text NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.credit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
  client_id uuid NOT NULL, workspace_id uuid, canonical_key text DEFAULT '',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (owner_id, client_id, canonical_key)
);
CREATE TABLE public.credit_report_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL,
  workspace_id uuid, created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.dispute_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
  workspace_id uuid, client_id uuid NOT NULL, letter_id text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.report_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.product_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
  event_name text NOT NULL, properties jsonb DEFAULT '{}'::jsonb,
  dedupe_key text UNIQUE, occurred_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
  first_name text, last_name text, email text, created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_logs','bureau_tradelines','cancellation_periods','case_events',
    'compliance_disclosures','credit_cases','credit_report_imports','credit_report_snapshots',
    'croa_contracts','dashboard_metrics','detected_issues','dispute_recipients',
    'dispute_round_items','dispute_rounds','disputes','disputes_by_bureau','escalations',
    'evidence_documents','evidence_facts','generated_dispute_letters','import_comparisons',
    'investigation_results','negative_items','parsed_credit_reports','report_comparisons',
    'report_snapshots','certified_mailings'
  ] LOOP
    EXECUTE format(
      'CREATE TABLE public.%I (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, client_id uuid NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP)',
      table_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'workspaces','staff_clients','client_accounts','client_disputes','dispute_timeline_events',
    'client_updates','client_documents','chat_conversations','chat_messages','affiliate_link_clicks',
    'credit_accounts','credit_report_uploads','dispute_letters','report_provider_settings',
    'ai_usage_events','billing_events','leads','audit_logs','bureau_tradelines',
    'cancellation_periods','case_events','compliance_disclosures','credit_cases',
    'credit_report_imports','credit_report_snapshots','croa_contracts','dashboard_metrics',
    'detected_issues','dispute_recipients','dispute_round_items','dispute_rounds','disputes',
    'disputes_by_bureau','escalations','evidence_documents','evidence_facts',
    'generated_dispute_letters','import_comparisons','investigation_results','negative_items',
    'parsed_credit_reports','report_comparisons','report_snapshots','certified_mailings'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role', table_name);
  END LOOP;
END;
$$;

CREATE POLICY legacy_portal_email_policy ON public.client_accounts
FOR SELECT TO authenticated USING (email = auth.jwt()->>'email');
CREATE POLICY legacy_staff_clients_policy ON public.staff_clients
FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION private.specialist_owns_client(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE OR REPLACE FUNCTION private.specialist_owns_dispute(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE OR REPLACE FUNCTION private.specialist_owns_timeline_event(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE OR REPLACE FUNCTION private.specialist_owns_client_update(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE OR REPLACE FUNCTION private.specialist_owns_client_document(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE OR REPLACE FUNCTION private.specialist_owns_conversation(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-documents','evidence-documents',false)
ON CONFLICT (id) DO UPDATE SET public=false;
CREATE POLICY owner_evidence_storage_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='evidence-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY owner_evidence_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='evidence-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY owner_evidence_storage_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='evidence-documents' AND (storage.foldername(name))[1]=auth.uid()::text)
WITH CHECK (bucket_id='evidence-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY owner_evidence_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='evidence-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
