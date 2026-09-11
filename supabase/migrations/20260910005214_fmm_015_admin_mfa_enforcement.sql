-- FMM-015: fail closed for administrator browser sessions unless the role is
-- active and the verified Supabase session has reached AAL2. The application
-- still performs the same checks before using its service-role client.

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS sessions_revoked_after timestamptz NOT NULL DEFAULT 'epoch'::timestamptz;

CREATE OR REPLACE FUNCTION private.is_active_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    AND EXISTS (
      SELECT 1
      FROM public.platform_admins AS platform_admin
      WHERE platform_admin.user_id = (SELECT auth.uid())
        AND platform_admin.active = true
        AND platform_admin.role IN ('platform_admin', 'platform_superadmin')
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) AS method(entry)
          WHERE method.entry ->> 'method' IN ('magiclink', 'oauth', 'otp', 'password', 'sso/saml')
            AND jsonb_typeof(method.entry -> 'timestamp') = 'number'
            AND (method.entry ->> 'timestamp')::numeric
              > extract(epoch FROM platform_admin.sessions_revoked_after)
        )
    )
$$;

REVOKE ALL ON FUNCTION private.is_active_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_platform_admin() TO authenticated, service_role;

-- Replace every positive administrator policy that predates the central
-- helper. Deny-only policies remain unchanged.
DROP POLICY IF EXISTS "active_admins_select_notes" ON public.admin_customer_notes;
CREATE POLICY "active_admins_select_notes"
  ON public.admin_customer_notes FOR SELECT TO authenticated
  USING ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "active_admins_insert_notes" ON public.admin_customer_notes;
CREATE POLICY "active_admins_insert_notes"
  ON public.admin_customer_notes FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND (SELECT private.is_active_platform_admin())
  );

DROP POLICY IF EXISTS "active_admins_select_followups" ON public.admin_follow_up_tasks;
CREATE POLICY "active_admins_select_followups"
  ON public.admin_follow_up_tasks FOR SELECT TO authenticated
  USING ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "active_admins_insert_followups" ON public.admin_follow_up_tasks;
CREATE POLICY "active_admins_insert_followups"
  ON public.admin_follow_up_tasks FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND (SELECT private.is_active_platform_admin())
  );

DROP POLICY IF EXISTS "active_admins_update_followups" ON public.admin_follow_up_tasks;
CREATE POLICY "active_admins_update_followups"
  ON public.admin_follow_up_tasks FOR UPDATE TO authenticated
  USING ((SELECT private.is_active_platform_admin()))
  WITH CHECK ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "active_admins_select_admin_audit" ON public.admin_action_audit_logs;
CREATE POLICY "active_admins_select_admin_audit"
  ON public.admin_action_audit_logs FOR SELECT TO authenticated
  USING ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "active_admins_insert_admin_audit" ON public.admin_action_audit_logs;
CREATE POLICY "active_admins_insert_admin_audit"
  ON public.admin_action_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND (SELECT private.is_active_platform_admin())
  );

DROP POLICY IF EXISTS "active_admins_select_retention_alerts" ON public.admin_retention_alert_states;
CREATE POLICY "active_admins_select_retention_alerts"
  ON public.admin_retention_alert_states FOR SELECT TO authenticated
  USING ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "active_admins_insert_retention_alerts" ON public.admin_retention_alert_states;
CREATE POLICY "active_admins_insert_retention_alerts"
  ON public.admin_retention_alert_states FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND (SELECT private.is_active_platform_admin())
  );

DROP POLICY IF EXISTS "active_admins_update_retention_alerts" ON public.admin_retention_alert_states;
CREATE POLICY "active_admins_update_retention_alerts"
  ON public.admin_retention_alert_states FOR UPDATE TO authenticated
  USING ((SELECT private.is_active_platform_admin()))
  WITH CHECK ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "seo_platform_admin_select" ON public.public_content_seo;
CREATE POLICY "seo_platform_admin_select"
  ON public.public_content_seo FOR SELECT TO authenticated
  USING ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "seo_platform_admin_insert" ON public.public_content_seo;
CREATE POLICY "seo_platform_admin_insert"
  ON public.public_content_seo FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "seo_platform_admin_update" ON public.public_content_seo;
CREATE POLICY "seo_platform_admin_update"
  ON public.public_content_seo FOR UPDATE TO authenticated
  USING ((SELECT private.is_active_platform_admin()))
  WITH CHECK ((SELECT private.is_active_platform_admin()));

DROP POLICY IF EXISTS "seo_platform_admin_delete" ON public.public_content_seo;
CREATE POLICY "seo_platform_admin_delete"
  ON public.public_content_seo FOR DELETE TO authenticated
  USING ((SELECT private.is_active_platform_admin()));

COMMENT ON COLUMN public.platform_admins.sessions_revoked_after IS
  'Application-enforced administrator session epoch; primary authentication must be newer than this timestamp.';
