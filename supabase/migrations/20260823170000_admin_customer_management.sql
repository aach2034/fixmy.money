-- Internal admin/customer-management support.
-- Additive only: admin notes, follow-up tasks, admin action audit records,
-- and idempotent platform-superadmin configuration for the primary admin.

CREATE TABLE IF NOT EXISTS public.admin_customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note_text text NOT NULL CHECK (char_length(trim(note_text)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  description text NOT NULL CHECK (char_length(trim(description)) > 0),
  due_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_action_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_customer_notes_customer_created
  ON public.admin_customer_notes(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_customer_notes_admin
  ON public.admin_customer_notes(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_follow_up_tasks_customer_due
  ON public.admin_follow_up_tasks(customer_id, completed, due_date);
CREATE INDEX IF NOT EXISTS idx_admin_follow_up_tasks_due
  ON public.admin_follow_up_tasks(completed, due_date);
CREATE INDEX IF NOT EXISTS idx_admin_follow_up_tasks_admin
  ON public.admin_follow_up_tasks(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_action_audit_logs_customer_created
  ON public.admin_action_audit_logs(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_audit_logs_admin_created
  ON public.admin_action_audit_logs(admin_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_admin_follow_up_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.completed = true AND OLD.completed = false AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_admin_follow_up_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_admin_follow_up_tasks_updated_at ON public.admin_follow_up_tasks;
CREATE TRIGGER trg_admin_follow_up_tasks_updated_at
  BEFORE UPDATE ON public.admin_follow_up_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_follow_up_updated_at();

ALTER TABLE public.admin_customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_admins_select_notes" ON public.admin_customer_notes;
CREATE POLICY "active_admins_select_notes"
  ON public.admin_customer_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "active_admins_insert_notes" ON public.admin_customer_notes;
CREATE POLICY "active_admins_insert_notes"
  ON public.admin_customer_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "admin_notes_no_update" ON public.admin_customer_notes;
CREATE POLICY "admin_notes_no_update"
  ON public.admin_customer_notes
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "admin_notes_no_delete" ON public.admin_customer_notes;
CREATE POLICY "admin_notes_no_delete"
  ON public.admin_customer_notes
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "active_admins_select_followups" ON public.admin_follow_up_tasks;
CREATE POLICY "active_admins_select_followups"
  ON public.admin_follow_up_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "active_admins_insert_followups" ON public.admin_follow_up_tasks;
CREATE POLICY "active_admins_insert_followups"
  ON public.admin_follow_up_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "active_admins_update_followups" ON public.admin_follow_up_tasks;
CREATE POLICY "active_admins_update_followups"
  ON public.admin_follow_up_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "admin_followups_no_delete" ON public.admin_follow_up_tasks;
CREATE POLICY "admin_followups_no_delete"
  ON public.admin_follow_up_tasks
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "active_admins_select_admin_audit" ON public.admin_action_audit_logs;
CREATE POLICY "active_admins_select_admin_audit"
  ON public.admin_action_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "active_admins_insert_admin_audit" ON public.admin_action_audit_logs;
CREATE POLICY "active_admins_insert_admin_audit"
  ON public.admin_action_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "admin_audit_no_update" ON public.admin_action_audit_logs;
CREATE POLICY "admin_audit_no_update"
  ON public.admin_action_audit_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "admin_audit_no_delete" ON public.admin_action_audit_logs;
CREATE POLICY "admin_audit_no_delete"
  ON public.admin_action_audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

GRANT SELECT, INSERT ON public.admin_customer_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_follow_up_tasks TO authenticated;
GRANT SELECT, INSERT ON public.admin_action_audit_logs TO authenticated;

-- Configure the primary admin via the existing database-backed role mechanism.
INSERT INTO public.platform_admins (user_id, role, active, created_by, notes)
SELECT u.id, 'platform_superadmin', true, u.id, 'Primary admin configured by 20260823170000_admin_customer_management.sql'
FROM auth.users u
WHERE lower(u.email) = lower('adamchamilton@gmail.com')
ON CONFLICT (user_id) DO UPDATE
SET role = 'platform_superadmin',
    active = true,
    revoked_at = NULL,
    revoked_by = NULL,
    notes = COALESCE(public.platform_admins.notes, 'Primary admin configured by 20260823170000_admin_customer_management.sql');
