-- ============================================================
-- Fix My Money — Tenant Isolation RLS Migration
-- Ensures every user can only access their own data
-- ============================================================

-- ── user_profiles ────────────────────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ── workspaces ───────────────────────────────────────────────
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_workspaces" ON public.workspaces;
CREATE POLICY "users_manage_own_workspaces"
ON public.workspaces
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ── staff_clients ────────────────────────────────────────────
-- staff_clients has owner_id referencing user_profiles.id (= auth.uid())
ALTER TABLE public.staff_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_staff_clients" ON public.staff_clients;
CREATE POLICY "users_manage_own_staff_clients"
ON public.staff_clients
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ── dispute_letters ──────────────────────────────────────────
ALTER TABLE public.dispute_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_dispute_letters" ON public.dispute_letters;
CREATE POLICY "users_manage_own_dispute_letters"
ON public.dispute_letters
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ── dashboard_metrics ────────────────────────────────────────
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_dashboard_metrics" ON public.dashboard_metrics;
CREATE POLICY "users_manage_own_dashboard_metrics"
ON public.dashboard_metrics
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ── disputes_by_bureau ───────────────────────────────────────
ALTER TABLE public.disputes_by_bureau ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_disputes_by_bureau" ON public.disputes_by_bureau;
CREATE POLICY "users_manage_own_disputes_by_bureau"
ON public.disputes_by_bureau
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ── credit_report_uploads ────────────────────────────────────
ALTER TABLE public.credit_report_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_credit_report_uploads" ON public.credit_report_uploads;
CREATE POLICY "users_manage_own_credit_report_uploads"
ON public.credit_report_uploads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── credit_report_analyses ───────────────────────────────────
ALTER TABLE public.credit_report_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_credit_report_analyses" ON public.credit_report_analyses;
CREATE POLICY "users_manage_own_credit_report_analyses"
ON public.credit_report_analyses
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── dispute_recommendations ──────────────────────────────────
ALTER TABLE public.dispute_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_dispute_recommendations" ON public.dispute_recommendations;
CREATE POLICY "users_manage_own_dispute_recommendations"
ON public.dispute_recommendations
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── client_accounts ──────────────────────────────────────────
-- client_accounts are accessed by clients themselves (via client portal)
-- and by the specialist (staff) who owns them.
-- We allow authenticated users to read/write their own client_accounts row,
-- and allow specialists to manage clients linked to their staff_clients records.
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- Helper function: check if the authenticated user owns a staff_client linked to this client_account
CREATE OR REPLACE FUNCTION public.specialist_owns_client(client_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_clients sc
    WHERE sc.owner_id = auth.uid()
      AND sc.email = (SELECT email FROM public.client_accounts WHERE id = client_account_id LIMIT 1)
  )
$$;

DROP POLICY IF EXISTS "specialists_manage_own_client_accounts" ON public.client_accounts;
CREATE POLICY "specialists_manage_own_client_accounts"
ON public.client_accounts
FOR ALL
TO authenticated
USING (public.specialist_owns_client(id))
WITH CHECK (public.specialist_owns_client(id));

-- ── client_disputes ──────────────────────────────────────────
-- Disputes belong to client_accounts; specialists access via ownership chain
ALTER TABLE public.client_disputes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.specialist_owns_dispute(dispute_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_disputes cd
    JOIN public.staff_clients sc ON sc.email = (
      SELECT email FROM public.client_accounts WHERE id = cd.client_id LIMIT 1
    )
    WHERE cd.id = dispute_id
      AND sc.owner_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "specialists_manage_own_client_disputes" ON public.client_disputes;
CREATE POLICY "specialists_manage_own_client_disputes"
ON public.client_disputes
FOR ALL
TO authenticated
USING (public.specialist_owns_dispute(id))
WITH CHECK (public.specialist_owns_dispute(id));

-- ── dispute_timeline_events ──────────────────────────────────
ALTER TABLE public.dispute_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.specialist_owns_timeline_event(event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dispute_timeline_events dte
    WHERE dte.id = event_id
      AND public.specialist_owns_dispute(dte.dispute_id)
  )
$$;

DROP POLICY IF EXISTS "specialists_manage_own_dispute_timeline_events" ON public.dispute_timeline_events;
CREATE POLICY "specialists_manage_own_dispute_timeline_events"
ON public.dispute_timeline_events
FOR ALL
TO authenticated
USING (public.specialist_owns_timeline_event(id))
WITH CHECK (public.specialist_owns_timeline_event(id));

-- ── client_updates ───────────────────────────────────────────
ALTER TABLE public.client_updates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.specialist_owns_client_update(update_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_updates cu
    WHERE cu.id = update_id
      AND public.specialist_owns_client(cu.client_id)
  )
$$;

DROP POLICY IF EXISTS "specialists_manage_own_client_updates" ON public.client_updates;
CREATE POLICY "specialists_manage_own_client_updates"
ON public.client_updates
FOR ALL
TO authenticated
USING (public.specialist_owns_client_update(id))
WITH CHECK (public.specialist_owns_client_update(id));

-- ── client_documents ─────────────────────────────────────────
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.specialist_owns_client_document(doc_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_documents cd
    WHERE cd.id = doc_id
      AND public.specialist_owns_client(cd.client_id)
  )
$$;

DROP POLICY IF EXISTS "specialists_manage_own_client_documents" ON public.client_documents;
CREATE POLICY "specialists_manage_own_client_documents"
ON public.client_documents
FOR ALL
TO authenticated
USING (public.specialist_owns_client_document(id))
WITH CHECK (public.specialist_owns_client_document(id));

-- ── chat_conversations ───────────────────────────────────────
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "specialists_manage_own_chat_conversations" ON public.chat_conversations;
CREATE POLICY "specialists_manage_own_chat_conversations"
ON public.chat_conversations
FOR ALL
TO authenticated
USING (specialist_id = auth.uid())
WITH CHECK (specialist_id = auth.uid());

-- ── chat_messages ────────────────────────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.specialist_owns_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations cc
    WHERE cc.id = conv_id
      AND cc.specialist_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "specialists_manage_own_chat_messages" ON public.chat_messages;
CREATE POLICY "specialists_manage_own_chat_messages"
ON public.chat_messages
FOR ALL
TO authenticated
USING (public.specialist_owns_conversation(conversation_id))
WITH CHECK (public.specialist_owns_conversation(conversation_id));
