-- FMM-009 compatibility: establish the initial fail-closed entitlement before
-- the owner membership is created by the workspace INSERT trigger.
--
-- The placeholder grants no application access. Stripe verification remains
-- the only path that can move it from none/expired to a paid or trial state.

CREATE OR REPLACE FUNCTION private.ensure_workspace_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.workspace_entitlements (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.workspace_memberships (
    workspace_id, user_id, role, status, is_selected, invited_by
  ) VALUES (
    NEW.id,
    NEW.owner_id,
    'owner',
    'active',
    NOT EXISTS (
      SELECT 1 FROM public.workspace_memberships
      WHERE user_id = NEW.owner_id AND is_selected IS TRUE
    ),
    NEW.owner_id
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active', updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.ensure_workspace_owner_membership() FROM PUBLIC, anon, authenticated;

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
  target_workspace := NEW.workspace_id;

  -- The workspace owner membership is an identity/ownership invariant, not a
  -- paid seat allocation. Permit it only when it matches the authoritative
  -- workspace owner; forged owner memberships still fail closed.
  IF TG_TABLE_NAME = 'workspace_memberships' AND NEW.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.workspaces workspace
      WHERE workspace.id = target_workspace AND workspace.owner_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORKSPACE_OWNER_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_workspace::text, 9009)
  );
  SELECT * INTO entitlement
  FROM public.workspace_entitlements
  WHERE workspace_id = target_workspace
  FOR SHARE;

  IF NOT FOUND
     OR entitlement.last_verified_at IS NULL
     OR entitlement.last_verified_at <= CURRENT_TIMESTAMP - interval '1 hour'
     OR entitlement.last_verified_at > CURRENT_TIMESTAMP + interval '5 minutes'
     OR NOT (
       (entitlement.access_state = 'active' AND entitlement.stripe_status = 'active' AND entitlement.current_period_ends_at > CURRENT_TIMESTAMP)
       OR (entitlement.access_state = 'trial' AND entitlement.stripe_status = 'trialing' AND entitlement.trial_ends_at > CURRENT_TIMESTAMP)
       OR (entitlement.access_state = 'grace' AND entitlement.stripe_status = 'past_due' AND entitlement.grace_ends_at > CURRENT_TIMESTAMP)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAN_ENTITLEMENT_REQUIRED';
  END IF;

  SELECT * INTO catalog
  FROM private.plan_catalog
  WHERE catalog_version = entitlement.plan_catalog_version
    AND plan_id = COALESCE(
      (SELECT alias.canonical_plan_id FROM private.plan_catalog_aliases alias
       WHERE alias.catalog_version = entitlement.plan_catalog_version
         AND alias.alias_plan_id = entitlement.plan_id),
      entitlement.plan_id
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAN_NOT_CONFIGURED';
  END IF;

  IF TG_TABLE_NAME = 'staff_clients' AND NEW.case_stage NOT IN ('completed', 'churned') THEN
    SELECT count(*) INTO used_count FROM public.staff_clients
    WHERE workspace_id = target_workspace AND case_stage NOT IN ('completed', 'churned')
      AND id IS DISTINCT FROM NEW.id;
    IF catalog.max_clients IS NOT NULL AND used_count + 1 > catalog.max_clients THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLIENTS_LIMIT_REACHED';
    END IF;
  ELSIF TG_TABLE_NAME = 'workspace_memberships'
    AND NEW.role <> 'owner'
    AND NEW.status IN ('active', 'invited') THEN
    SELECT count(*) INTO used_count FROM public.workspace_memberships
    WHERE workspace_id = target_workspace AND status IN ('active', 'invited')
      AND id IS DISTINCT FROM NEW.id;
    IF catalog.max_seats IS NOT NULL AND used_count + 1 > catalog.max_seats THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SEATS_LIMIT_REACHED';
    END IF;
  ELSIF TG_TABLE_NAME = 'client_documents' AND NEW.doc_status IN ('pending', 'uploaded') THEN
    SELECT COALESCE(sum(GREATEST(file_size, 0)), 0) INTO used_bytes
    FROM public.client_documents
    WHERE workspace_id = target_workspace AND doc_status IN ('pending', 'uploaded')
      AND id IS DISTINCT FROM NEW.id;
    IF catalog.storage_bytes IS NOT NULL AND used_bytes + GREATEST(NEW.file_size, 0) > catalog.storage_bytes THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STORAGE_BYTES_LIMIT_REACHED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_workspace_plan_allocation() FROM PUBLIC, anon, authenticated;
