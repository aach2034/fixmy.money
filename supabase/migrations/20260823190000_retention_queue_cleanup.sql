-- Retention queue cleanup: classify non-customer accounts, support do-not-contact,
-- and let admins dismiss/contact/snooze individual retention alerts.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'real'
    CHECK (customer_type IN ('real', 'internal', 'qa', 'demo', 'test')),
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_classification_note text;

CREATE INDEX IF NOT EXISTS idx_user_profiles_customer_type ON public.user_profiles(customer_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_do_not_contact ON public.user_profiles(do_not_contact);

CREATE TABLE IF NOT EXISTS public.admin_retention_alert_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  alert_key text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dismissed', 'contacted', 'snoozed')),
  snoozed_until date,
  reason text,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_retention_alert_states_customer
  ON public.admin_retention_alert_states(customer_id, status, snoozed_until);
CREATE INDEX IF NOT EXISTS idx_admin_retention_alert_states_admin
  ON public.admin_retention_alert_states(admin_id);

CREATE OR REPLACE FUNCTION public.update_admin_retention_alert_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_admin_retention_alert_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_admin_retention_alert_states_updated_at ON public.admin_retention_alert_states;
CREATE TRIGGER trg_admin_retention_alert_states_updated_at
  BEFORE UPDATE ON public.admin_retention_alert_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_retention_alert_updated_at();

ALTER TABLE public.admin_retention_alert_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_admins_select_retention_alerts" ON public.admin_retention_alert_states;
CREATE POLICY "active_admins_select_retention_alerts"
  ON public.admin_retention_alert_states
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "active_admins_insert_retention_alerts" ON public.admin_retention_alert_states;
CREATE POLICY "active_admins_insert_retention_alerts"
  ON public.admin_retention_alert_states
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true
    )
  );

DROP POLICY IF EXISTS "active_admins_update_retention_alerts" ON public.admin_retention_alert_states;
CREATE POLICY "active_admins_update_retention_alerts"
  ON public.admin_retention_alert_states
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

DROP POLICY IF EXISTS "admin_retention_alerts_no_delete" ON public.admin_retention_alert_states;
CREATE POLICY "admin_retention_alerts_no_delete"
  ON public.admin_retention_alert_states
  FOR DELETE
  TO authenticated
  USING (false);

GRANT SELECT, INSERT, UPDATE ON public.admin_retention_alert_states TO authenticated;

-- Backfill obvious non-customer records so retention metrics default to real customers only.
UPDATE public.user_profiles
SET customer_type = 'internal',
    admin_classification_note = 'Auto-classified as internal by retention queue cleanup migration.'
WHERE customer_type = 'real'
  AND (
    id IN (SELECT user_id FROM public.platform_admins WHERE active = true)
    OR lower(email) LIKE '%adamchamilton%'
    OR lower(email) LIKE '%@fixmy.money'
  );

UPDATE public.user_profiles
SET customer_type = 'demo',
    admin_classification_note = 'Auto-classified as demo by retention queue cleanup migration.'
WHERE customer_type = 'real'
  AND (
    lower(email) LIKE '%demo%'
    OR lower(full_name) LIKE '%demo%'
  );

UPDATE public.user_profiles
SET customer_type = 'qa',
    admin_classification_note = 'Auto-classified as QA by retention queue cleanup migration.'
WHERE customer_type = 'real'
  AND (
    lower(email) LIKE '%qa%'
    OR lower(full_name) LIKE '%qa user%'
    OR lower(full_name) LIKE '% qa %'
  );

UPDATE public.user_profiles
SET customer_type = 'test',
    admin_classification_note = 'Auto-classified as test by retention queue cleanup migration.'
WHERE customer_type = 'real'
  AND (
    lower(email) LIKE '%yopmail%'
    OR lower(email) LIKE '%test%'
    OR lower(email) LIKE '%.invalid'
    OR lower(email) LIKE '%example.%'
  );
