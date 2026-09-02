-- FMM-003: make a clean source replay fail closed and reproduce the
-- owner-scoped RLS hardening observed in production.
--
-- This migration is intentionally source-only. It must be validated in an
-- isolated Supabase project before a separately authorized production rollout.

-- Production has this invariant and handle_new_user() relies on it for
-- ON CONFLICT (owner_id). It was absent from source migration history.
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_id_unique
ON public.workspaces(owner_id);

-- Remove the original permissive policies that remained active alongside the
-- later owner-scoped policies. PostgreSQL ORs permissive policies, so leaving
-- either generation in place defeats the restrictive policy.
DROP POLICY IF EXISTS "specialists_manage_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "clients_view_own_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "clients_insert_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "clients_update_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "specialists_manage_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "clients_view_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "clients_insert_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "clients_update_messages" ON public.chat_messages;

DROP POLICY IF EXISTS "staff_manage_client_accounts" ON public.client_accounts;
DROP POLICY IF EXISTS "staff_manage_client_disputes" ON public.client_disputes;
DROP POLICY IF EXISTS "staff_manage_timeline" ON public.dispute_timeline_events;
DROP POLICY IF EXISTS "staff_manage_client_updates" ON public.client_updates;
DROP POLICY IF EXISTS "staff_manage_client_documents" ON public.client_documents;

-- Client portal chat access remains tied to the authenticated account email.
-- This preserves the current portal identity model without inventing the
-- workspace/client membership model deferred to FMM-007.
DROP POLICY IF EXISTS "clients_select_own_conversations_auth" ON public.chat_conversations;
CREATE POLICY "clients_select_own_conversations_auth"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  client_account_id IN (
    SELECT ca.id
    FROM public.client_accounts AS ca
    WHERE ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
);

DROP POLICY IF EXISTS "clients_insert_own_conversations_auth" ON public.chat_conversations;
CREATE POLICY "clients_insert_own_conversations_auth"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  client_account_id IN (
    SELECT ca.id
    FROM public.client_accounts AS ca
    WHERE ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
);

DROP POLICY IF EXISTS "clients_update_own_conversations_auth" ON public.chat_conversations;
CREATE POLICY "clients_update_own_conversations_auth"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (
  client_account_id IN (
    SELECT ca.id
    FROM public.client_accounts AS ca
    WHERE ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
)
WITH CHECK (
  client_account_id IN (
    SELECT ca.id
    FROM public.client_accounts AS ca
    WHERE ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
);

DROP POLICY IF EXISTS "clients_select_own_messages_auth" ON public.chat_messages;
CREATE POLICY "clients_select_own_messages_auth"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations AS cc
    JOIN public.client_accounts AS ca ON ca.id = cc.client_account_id
    WHERE cc.id = chat_messages.conversation_id
      AND ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
);

DROP POLICY IF EXISTS "clients_insert_own_messages_auth" ON public.chat_messages;
CREATE POLICY "clients_insert_own_messages_auth"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations AS cc
    JOIN public.client_accounts AS ca ON ca.id = cc.client_account_id
    WHERE cc.id = chat_messages.conversation_id
      AND ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
);

DROP POLICY IF EXISTS "clients_update_own_messages_auth" ON public.chat_messages;
CREATE POLICY "clients_update_own_messages_auth"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations AS cc
    JOIN public.client_accounts AS ca ON ca.id = cc.client_account_id
    WHERE cc.id = chat_messages.conversation_id
      AND ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations AS cc
    JOIN public.client_accounts AS ca ON ca.id = cc.client_account_id
    WHERE cc.id = chat_messages.conversation_id
      AND ca.email = ((SELECT auth.jwt()) ->> 'email')
  )
);

-- Production-only hardening narrowed the launch workflow to the authenticated
-- row owner. Recreate it in source with both USING and WITH CHECK.
DROP POLICY IF EXISTS "authenticated_manage_launch_directories" ON public.launch_directories;
CREATE POLICY "authenticated_manage_launch_directories"
ON public.launch_directories
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "authenticated_manage_outreach_targets" ON public.outreach_targets;
CREATE POLICY "authenticated_manage_outreach_targets"
ON public.outreach_targets
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "authenticated_manage_social_posts" ON public.social_posts;
CREATE POLICY "authenticated_manage_social_posts"
ON public.social_posts
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "authenticated_manage_utm_tracking" ON public.utm_tracking;
CREATE POLICY "authenticated_manage_utm_tracking"
ON public.utm_tracking
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Replace policies that implicitly targeted PUBLIC with explicit application
-- roles. Server-only writes remain denied to authenticated callers; the
-- service_role continues to bypass RLS.
DROP POLICY IF EXISTS "agency_own_clicks" ON public.affiliate_link_clicks;
CREATE POLICY "agency_own_clicks"
ON public.affiliate_link_clicks
FOR ALL
TO authenticated
USING (
  agency_id IN (
    SELECT w.id FROM public.workspaces AS w
    WHERE w.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  agency_id IN (
    SELECT w.id FROM public.workspaces AS w
    WHERE w.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "agency_own_provider_settings" ON public.report_provider_settings;
CREATE POLICY "agency_own_provider_settings"
ON public.report_provider_settings
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces AS w
    WHERE w.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT w.id FROM public.workspaces AS w
    WHERE w.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "billing_events_workspace_select" ON public.billing_events;
CREATE POLICY "billing_events_workspace_select"
ON public.billing_events
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces AS w
    WHERE w.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "billing_events_workspace_insert" ON public.billing_events;
CREATE POLICY "billing_events_workspace_insert"
ON public.billing_events
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "ai_usage_events_select" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_select"
ON public.ai_usage_events
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces AS w
    WHERE w.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "ai_usage_events_insert" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_insert"
ON public.ai_usage_events
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "ai_usage_events_no_update" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_no_update"
ON public.ai_usage_events
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "ai_usage_events_no_delete" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_no_delete"
ON public.ai_usage_events
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "webhook_failures_insert" ON public.webhook_failures;
CREATE POLICY "webhook_failures_insert"
ON public.webhook_failures
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "webhook_failures_no_delete" ON public.webhook_failures;
CREATE POLICY "webhook_failures_no_delete"
ON public.webhook_failures
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "platform_admins_select" ON public.platform_admins;
CREATE POLICY "platform_admins_select"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins AS pa
    WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
  )
);

DROP POLICY IF EXISTS "platform_admins_insert" ON public.platform_admins;
CREATE POLICY "platform_admins_insert"
ON public.platform_admins
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "platform_admins_update" ON public.platform_admins;
CREATE POLICY "platform_admins_update"
ON public.platform_admins
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "platform_admins_delete" ON public.platform_admins;
CREATE POLICY "platform_admins_delete"
ON public.platform_admins
FOR DELETE
TO authenticated
USING (false);

-- Recreate the central owner policies with stable auth initialization and
-- complete ownership checks for UPDATE/INSERT paths.
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_workspaces" ON public.workspaces;
CREATE POLICY "users_manage_own_workspaces"
ON public.workspaces FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_staff_clients" ON public.staff_clients;
CREATE POLICY "users_manage_own_staff_clients"
ON public.staff_clients FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_dispute_letters" ON public.dispute_letters;
CREATE POLICY "users_manage_own_dispute_letters"
ON public.dispute_letters FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_dashboard_metrics" ON public.dashboard_metrics;
CREATE POLICY "users_manage_own_dashboard_metrics"
ON public.dashboard_metrics FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_disputes_by_bureau" ON public.disputes_by_bureau;
CREATE POLICY "users_manage_own_disputes_by_bureau"
ON public.disputes_by_bureau FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_credit_report_uploads" ON public.credit_report_uploads;
CREATE POLICY "users_manage_own_credit_report_uploads"
ON public.credit_report_uploads FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_credit_report_analyses" ON public.credit_report_analyses;
CREATE POLICY "users_manage_own_credit_report_analyses"
ON public.credit_report_analyses FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_dispute_recommendations" ON public.dispute_recommendations;
CREATE POLICY "users_manage_own_dispute_recommendations"
ON public.dispute_recommendations FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_client_disputes" ON public.client_disputes;
CREATE POLICY "users_manage_own_client_disputes"
ON public.client_disputes FOR ALL TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.staff_clients AS sc
    WHERE sc.id = client_disputes.client_id
      AND sc.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.staff_clients AS sc
    WHERE sc.id = client_disputes.client_id
      AND sc.owner_id = (SELECT auth.uid())
  )
);

-- Security-definer ownership helpers are required to evaluate ownership across
-- RLS-protected relations. Keep them out of the exposed public API schema so
-- they cannot become callable RPC endpoints.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.specialist_owns_client(client_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.staff_clients AS sc
      JOIN public.client_accounts AS ca ON ca.email = sc.email
      WHERE ca.id = client_account_id
        AND sc.owner_id = (SELECT auth.uid())
    )
$$;

CREATE OR REPLACE FUNCTION private.specialist_owns_dispute(dispute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.client_disputes AS cd
      JOIN public.client_accounts AS ca ON ca.id = cd.client_id
      JOIN public.staff_clients AS sc ON sc.email = ca.email
      WHERE cd.id = dispute_id
        AND sc.owner_id = (SELECT auth.uid())
    )
$$;

CREATE OR REPLACE FUNCTION private.specialist_owns_timeline_event(event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.dispute_timeline_events AS event
      WHERE event.id = event_id
        AND private.specialist_owns_dispute(event.dispute_id)
    )
$$;

CREATE OR REPLACE FUNCTION private.specialist_owns_client_update(update_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.client_updates AS client_update
      WHERE client_update.id = update_id
        AND private.specialist_owns_client(client_update.client_id)
    )
$$;

CREATE OR REPLACE FUNCTION private.specialist_owns_client_document(document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.client_documents AS document
      WHERE document.id = document_id
        AND private.specialist_owns_client(document.client_id)
    )
$$;

CREATE OR REPLACE FUNCTION private.specialist_owns_conversation(conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.chat_conversations AS conversation
      WHERE conversation.id = conversation_id
        AND conversation.specialist_id = (SELECT auth.uid())
    )
$$;

REVOKE ALL ON FUNCTION private.specialist_owns_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.specialist_owns_dispute(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.specialist_owns_timeline_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.specialist_owns_client_update(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.specialist_owns_client_document(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.specialist_owns_conversation(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.specialist_owns_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.specialist_owns_dispute(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.specialist_owns_timeline_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.specialist_owns_client_update(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.specialist_owns_client_document(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.specialist_owns_conversation(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "specialists_manage_own_client_accounts" ON public.client_accounts;
CREATE POLICY "specialists_manage_own_client_accounts"
ON public.client_accounts FOR ALL TO authenticated
USING (private.specialist_owns_client(id))
WITH CHECK (private.specialist_owns_client(id));

DROP POLICY IF EXISTS "specialists_manage_own_client_disputes" ON public.client_disputes;
CREATE POLICY "specialists_manage_own_client_disputes"
ON public.client_disputes FOR ALL TO authenticated
USING (private.specialist_owns_dispute(id))
WITH CHECK (private.specialist_owns_dispute(id));

DROP POLICY IF EXISTS "specialists_manage_own_dispute_timeline_events" ON public.dispute_timeline_events;
CREATE POLICY "specialists_manage_own_dispute_timeline_events"
ON public.dispute_timeline_events FOR ALL TO authenticated
USING (private.specialist_owns_timeline_event(id))
WITH CHECK (private.specialist_owns_timeline_event(id));

DROP POLICY IF EXISTS "specialists_manage_own_client_updates" ON public.client_updates;
CREATE POLICY "specialists_manage_own_client_updates"
ON public.client_updates FOR ALL TO authenticated
USING (private.specialist_owns_client_update(id))
WITH CHECK (private.specialist_owns_client_update(id));

DROP POLICY IF EXISTS "specialists_manage_own_client_documents" ON public.client_documents;
CREATE POLICY "specialists_manage_own_client_documents"
ON public.client_documents FOR ALL TO authenticated
USING (private.specialist_owns_client_document(id))
WITH CHECK (private.specialist_owns_client_document(id));

DROP POLICY IF EXISTS "specialists_manage_own_chat_messages" ON public.chat_messages;
CREATE POLICY "specialists_manage_own_chat_messages"
ON public.chat_messages FOR ALL TO authenticated
USING (private.specialist_owns_conversation(conversation_id))
WITH CHECK (private.specialist_owns_conversation(conversation_id));

DROP FUNCTION IF EXISTS public.specialist_owns_client(uuid);
DROP FUNCTION IF EXISTS public.specialist_owns_dispute(uuid);
DROP FUNCTION IF EXISTS public.specialist_owns_timeline_event(uuid);
DROP FUNCTION IF EXISTS public.specialist_owns_client_update(uuid);
DROP FUNCTION IF EXISTS public.specialist_owns_client_document(uuid);
DROP FUNCTION IF EXISTS public.specialist_owns_conversation(uuid);

-- Trigger functions are not public RPCs. Keep their search paths fixed and
-- remove direct execution from browser-facing roles.
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.update_client_portal_updated_at() SET search_path = '';
ALTER FUNCTION public.update_staff_updated_at() SET search_path = '';
ALTER FUNCTION public.update_credit_upload_updated_at() SET search_path = '';
ALTER FUNCTION public.update_conversation_last_message() SET search_path = '';
ALTER FUNCTION public.update_client_disputes_updated_at() SET search_path = '';
ALTER FUNCTION public.update_parser_workflow_updated_at() SET search_path = '';
ALTER FUNCTION public.update_import_workflow_updated_at() SET search_path = '';
ALTER FUNCTION public.update_evidence_engine_updated_at() SET search_path = '';
ALTER FUNCTION public.update_admin_follow_up_updated_at() SET search_path = '';
ALTER FUNCTION public.update_admin_retention_alert_updated_at() SET search_path = '';
ALTER FUNCTION public.update_certified_mailings_updated_at() SET search_path = '';

REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_client_portal_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_staff_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_credit_upload_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_client_disputes_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_parser_workflow_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_import_workflow_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_evidence_engine_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_admin_follow_up_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_admin_retention_alert_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_certified_mailings_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_client_portal_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_staff_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_credit_upload_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_conversation_last_message() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_client_disputes_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_parser_workflow_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_import_workflow_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_evidence_engine_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_follow_up_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_retention_alert_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_certified_mailings_updated_at() TO service_role;

-- Browser roles receive only the operations supported by their RLS policies.
-- This remains correct on a completely new public schema where platform
-- default privileges have not implicitly granted table access.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.affiliate_link_clicks,
  public.bureau_tradelines,
  public.certified_mailings,
  public.chat_conversations,
  public.chat_messages,
  public.client_accounts,
  public.client_disputes,
  public.client_documents,
  public.client_updates,
  public.credit_accounts,
  public.credit_cases,
  public.credit_report_analyses,
  public.credit_report_imports,
  public.credit_report_snapshots,
  public.credit_report_uploads,
  public.dashboard_metrics,
  public.detected_issues,
  public.dispute_letters,
  public.dispute_recipients,
  public.dispute_recommendations,
  public.dispute_round_items,
  public.dispute_rounds,
  public.dispute_timeline_events,
  public.disputes,
  public.disputes_by_bureau,
  public.escalations,
  public.evidence_documents,
  public.evidence_facts,
  public.generated_dispute_letters,
  public.import_comparisons,
  public.investigation_results,
  public.launch_directories,
  public.negative_items,
  public.outreach_targets,
  public.parsed_credit_reports,
  public.public_content_seo,
  public.report_comparisons,
  public.report_provider_settings,
  public.report_snapshots,
  public.social_posts,
  public.staff_clients,
  public.user_profiles,
  public.utm_tracking,
  public.workspaces
TO authenticated;

GRANT SELECT, INSERT ON
  public.admin_action_audit_logs,
  public.admin_customer_notes,
  public.case_events
TO authenticated;

GRANT SELECT, INSERT, UPDATE ON
  public.admin_follow_up_tasks,
  public.admin_retention_alert_states
TO authenticated;

GRANT SELECT ON
  public.ai_usage_events,
  public.billing_events,
  public.platform_admins
TO authenticated;

-- This event stream is server-only. Keep an explicit deny policy so the
-- catalog records the decision instead of relying solely on absent policies.
DROP POLICY IF EXISTS "product_analytics_events_server_only" ON public.product_analytics_events;
CREATE POLICY "product_analytics_events_server_only"
ON public.product_analytics_events
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Fail the migration if a later edit reintroduces the exact broad predicates
-- or an implicit PUBLIC policy role on application tables.
DO $$
BEGIN
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
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'FMM-003 requires RLS on every public application table';
  END IF;
END;
$$;
