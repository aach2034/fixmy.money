-- Application-managed 30-day trial. No Stripe customer, subscription, invoice,
-- payment method, charge, or debt is created by this lifecycle.

ALTER TABLE public.workspace_entitlements
  ADD COLUMN trial_source text NOT NULL DEFAULT 'none'
    CHECK (trial_source IN ('none', 'application', 'stripe')),
  ADD COLUMN free_trial_started_at timestamptz,
  ADD COLUMN free_trial_ends_at timestamptz;

UPDATE public.workspace_entitlements
SET trial_source = 'stripe'
WHERE access_state = 'trial' AND stripe_status = 'trialing';

ALTER TABLE public.workspace_entitlements
  DROP CONSTRAINT workspace_entitlements_trial_shape,
  ADD CONSTRAINT workspace_entitlements_trial_shape CHECK (
    access_state <> 'trial' OR (
      trial_ends_at IS NOT NULL AND (
        (trial_source = 'stripe' AND stripe_status = 'trialing') OR
        (trial_source = 'application' AND free_trial_started_at IS NOT NULL
          AND free_trial_ends_at = trial_ends_at
          AND free_trial_ends_at > free_trial_started_at)
      )
    )
  );

CREATE TABLE private.free_trial_claims (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  plan_id text NOT NULL CHECK (plan_id IN ('professional', 'agency')),
  started_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  CHECK (ends_at = started_at + interval '30 days')
);
REVOKE ALL ON TABLE private.free_trial_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE private.free_trial_claims TO service_role;

CREATE OR REPLACE FUNCTION private.prevent_free_trial_restart()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.free_trial_started_at IS NOT NULL AND (
    NEW.free_trial_started_at IS DISTINCT FROM OLD.free_trial_started_at OR
    NEW.free_trial_ends_at IS DISTINCT FROM OLD.free_trial_ends_at
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FREE_TRIAL_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.prevent_free_trial_restart() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workspace_entitlements_free_trial_immutable
BEFORE UPDATE OF free_trial_started_at, free_trial_ends_at ON public.workspace_entitlements
FOR EACH ROW EXECUTE FUNCTION private.prevent_free_trial_restart();

CREATE OR REPLACE FUNCTION public.activate_workspace_free_trial_server(
  p_user_id uuid,
  p_workspace_id uuid,
  p_plan_id text
)
RETURNS SETOF public.workspace_entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  started_at timestamptz := CURRENT_TIMESTAMP;
  existing public.workspace_entitlements%ROWTYPE;
BEGIN
  IF p_plan_id NOT IN ('professional', 'agency') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BUSINESS_PLAN_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users AS auth_user
    JOIN public.user_profiles AS profile ON profile.id = auth_user.id
    JOIN public.workspaces AS workspace ON workspace.owner_id = auth_user.id
    WHERE auth_user.id = p_user_id
      AND auth_user.email_confirmed_at IS NOT NULL
      AND profile.onboarding_completed IS TRUE
      AND profile.plan = p_plan_id
      AND workspace.id = p_workspace_id
      AND workspace.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FREE_TRIAL_PREREQUISITES_FAILED';
  END IF;

  SELECT * INTO existing FROM public.workspace_entitlements
  WHERE workspace_id = p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ENTITLEMENT_NOT_CONFIGURED';
  END IF;

  IF existing.free_trial_started_at IS NOT NULL THEN
    IF existing.trial_source = 'application' AND existing.plan_id = p_plan_id THEN
      RETURN QUERY SELECT * FROM public.workspace_entitlements WHERE workspace_id = p_workspace_id;
      RETURN;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FREE_TRIAL_ALREADY_CLAIMED';
  END IF;
  IF existing.stripe_subscription_id IS NOT NULL OR existing.stripe_status <> 'none' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'EXISTING_BILLING_HISTORY';
  END IF;

  INSERT INTO private.free_trial_claims (user_id, workspace_id, plan_id, started_at, ends_at)
  VALUES (p_user_id, p_workspace_id, p_plan_id, started_at, started_at + interval '30 days');

  UPDATE public.workspace_entitlements
  SET plan_id = p_plan_id,
      access_state = 'trial',
      stripe_status = 'none',
      trial_source = 'application',
      free_trial_started_at = started_at,
      free_trial_ends_at = started_at + interval '30 days',
      trial_ends_at = started_at + interval '30 days',
      last_verified_at = started_at,
      updated_at = started_at
  WHERE workspace_id = p_workspace_id;

  RETURN QUERY SELECT * FROM public.workspace_entitlements WHERE workspace_id = p_workspace_id;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_workspace_free_trial_server(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_workspace_free_trial_server(uuid, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.current_workspace_context()
RETURNS TABLE (
  workspace_id uuid, workspace_name text, workspace_owner_id uuid,
  member_role public.workspace_member_role, onboarding_completed boolean,
  subscription_status text, subscription_plan text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace.id, workspace.name, workspace.owner_id, membership.role,
         COALESCE(owner_profile.onboarding_completed, false),
         CASE
           WHEN entitlement.access_state = 'active'
             AND entitlement.stripe_status = 'active'
             AND entitlement.last_verified_at > CURRENT_TIMESTAMP - interval '1 hour'
             AND entitlement.last_verified_at <= CURRENT_TIMESTAMP + interval '5 minutes'
             AND entitlement.current_period_ends_at > CURRENT_TIMESTAMP THEN 'active'
           WHEN entitlement.access_state = 'trial'
             AND entitlement.trial_source = 'application'
             AND entitlement.free_trial_started_at <= CURRENT_TIMESTAMP
             AND entitlement.free_trial_ends_at > CURRENT_TIMESTAMP THEN 'trialing'
           WHEN entitlement.access_state = 'trial'
             AND entitlement.trial_source = 'stripe'
             AND entitlement.stripe_status = 'trialing'
             AND entitlement.last_verified_at > CURRENT_TIMESTAMP - interval '1 hour'
             AND entitlement.last_verified_at <= CURRENT_TIMESTAMP + interval '5 minutes'
             AND entitlement.trial_ends_at > CURRENT_TIMESTAMP THEN 'trialing'
           WHEN entitlement.access_state = 'grace'
             AND entitlement.stripe_status = 'past_due'
             AND entitlement.last_verified_at > CURRENT_TIMESTAMP - interval '1 hour'
             AND entitlement.last_verified_at <= CURRENT_TIMESTAMP + interval '5 minutes'
             AND entitlement.grace_ends_at > CURRENT_TIMESTAMP THEN 'past_due'
           ELSE 'expired'
         END,
         COALESCE(entitlement.plan_id, '')
  FROM public.workspace_memberships AS membership
  JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
  JOIN public.user_profiles AS owner_profile ON owner_profile.id = workspace.owner_id
  LEFT JOIN public.workspace_entitlements AS entitlement ON entitlement.workspace_id = workspace.id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active' AND membership.is_selected IS TRUE
    AND workspace.is_active IS TRUE
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.current_workspace_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_context() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enforce_workspace_plan_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_workspace uuid;
  entitlement public.workspace_entitlements%ROWTYPE;
  catalog private.plan_catalog%ROWTYPE;
  used_count bigint;
  used_bytes bigint;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME NOT IN ('staff_clients', 'workspace_memberships', 'client_documents') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'UNSUPPORTED_ALLOCATION_TABLE';
  END IF;
  target_workspace := NEW.workspace_id;
  -- NEW is an untyped trigger record. Narrow to the membership table before
  -- dereferencing fields that do not exist on staff_clients/client_documents.
  IF TG_TABLE_NAME = 'workspace_memberships' THEN
    IF NEW.role = 'owner' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.workspaces AS workspace
        WHERE workspace.id = target_workspace AND workspace.owner_id = NEW.user_id
      ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORKSPACE_OWNER_REQUIRED';
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_workspace::text, 9009));
  SELECT * INTO entitlement FROM public.workspace_entitlements WHERE workspace_id = target_workspace FOR SHARE;

  IF NOT FOUND OR NOT (
    (entitlement.access_state = 'trial' AND entitlement.trial_source = 'application'
      AND entitlement.free_trial_started_at <= CURRENT_TIMESTAMP
      AND entitlement.free_trial_ends_at > CURRENT_TIMESTAMP)
    OR (entitlement.last_verified_at IS NOT NULL
      AND entitlement.last_verified_at > CURRENT_TIMESTAMP - interval '1 hour'
      AND entitlement.last_verified_at <= CURRENT_TIMESTAMP + interval '5 minutes'
      AND (
        (entitlement.access_state = 'active' AND entitlement.stripe_status = 'active' AND entitlement.current_period_ends_at > CURRENT_TIMESTAMP)
        OR (entitlement.access_state = 'trial' AND entitlement.trial_source = 'stripe' AND entitlement.stripe_status = 'trialing' AND entitlement.trial_ends_at > CURRENT_TIMESTAMP)
        OR (entitlement.access_state = 'grace' AND entitlement.stripe_status = 'past_due' AND entitlement.grace_ends_at > CURRENT_TIMESTAMP)
      ))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAN_ENTITLEMENT_REQUIRED';
  END IF;

  SELECT * INTO catalog FROM private.plan_catalog
  WHERE catalog_version = entitlement.plan_catalog_version
    AND plan_id = COALESCE((
      SELECT alias.canonical_plan_id FROM private.plan_catalog_aliases AS alias
      WHERE alias.catalog_version = entitlement.plan_catalog_version
        AND alias.alias_plan_id = entitlement.plan_id
    ), entitlement.plan_id);
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAN_NOT_CONFIGURED'; END IF;

  IF TG_TABLE_NAME = 'staff_clients' THEN
    IF NEW.case_stage NOT IN ('completed', 'churned') THEN
      SELECT count(*) INTO used_count FROM public.staff_clients
        WHERE workspace_id = target_workspace AND case_stage NOT IN ('completed', 'churned') AND id IS DISTINCT FROM NEW.id;
      IF catalog.max_clients IS NOT NULL AND used_count + 1 > catalog.max_clients THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLIENTS_LIMIT_REACHED';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'workspace_memberships' THEN
    IF NEW.status IN ('active', 'invited') THEN
      SELECT count(*) INTO used_count FROM public.workspace_memberships
        WHERE workspace_id = target_workspace AND status IN ('active', 'invited') AND id IS DISTINCT FROM NEW.id;
      IF catalog.max_seats IS NOT NULL AND used_count + 1 > catalog.max_seats THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SEATS_LIMIT_REACHED';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'client_documents' THEN
    SELECT COALESCE(sum(GREATEST(file_size, 0)), 0) INTO used_bytes FROM public.client_documents
      WHERE workspace_id = target_workspace AND id IS DISTINCT FROM NEW.id;
    IF catalog.storage_bytes IS NOT NULL AND used_bytes + GREATEST(NEW.file_size, 0) > catalog.storage_bytes THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STORAGE_BYTES_LIMIT_REACHED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_workspace_plan_allocation() FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.workspace_entitlements.free_trial_started_at IS
  'Immutable first application-trial start; retained after conversion or expiration to prevent restart.';
