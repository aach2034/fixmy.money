-- FMM-009: versioned plan catalog and database-enforced resource ceilings.
-- Existing customer rows are preserved. Downgrades never delete data; they
-- prevent new over-limit allocation until usage returns below the new limit.

CREATE TABLE private.plan_catalog (
  catalog_version text NOT NULL,
  plan_id text NOT NULL,
  max_clients integer,
  max_seats integer,
  storage_bytes bigint,
  enabled_features text[] NOT NULL,
  PRIMARY KEY (catalog_version, plan_id),
  CHECK (max_clients IS NULL OR max_clients > 0),
  CHECK (max_seats IS NULL OR max_seats > 0),
  CHECK (storage_bytes IS NULL OR storage_bytes > 0)
);

REVOKE ALL ON TABLE private.plan_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE private.plan_catalog TO service_role;

INSERT INTO private.plan_catalog
  (catalog_version, plan_id, max_clients, max_seats, storage_bytes, enabled_features)
VALUES
  ('2026-09-03.v1', 'starter', 3, 1, 5368709120, ARRAY['core_crm','client_portal','credit_report_import','ai_assistant']),
  ('2026-09-03.v1', 'professional', 300, 3, 26843545600, ARRAY['core_crm','client_portal','credit_report_import','ai_assistant','team_access']),
  ('2026-09-03.v1', 'agency', 600, 6, 107374182400, ARRAY['core_crm','client_portal','credit_report_import','ai_assistant','team_access','data_export']),
  ('2026-09-03.v1', 'enterprise', NULL, NULL, NULL, ARRAY['core_crm','client_portal','credit_report_import','ai_assistant','team_access','data_export']);

-- Compatibility aliases are separate from the canonical catalog. They allow
-- legacy persisted values to resolve without rewriting customer entitlements.
CREATE TABLE private.plan_catalog_aliases (
  catalog_version text NOT NULL,
  alias_plan_id text NOT NULL,
  canonical_plan_id text NOT NULL,
  PRIMARY KEY (catalog_version, alias_plan_id),
  FOREIGN KEY (catalog_version, canonical_plan_id)
    REFERENCES private.plan_catalog(catalog_version, plan_id),
  CHECK (alias_plan_id <> canonical_plan_id)
);
REVOKE ALL ON TABLE private.plan_catalog_aliases FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE private.plan_catalog_aliases TO service_role;
INSERT INTO private.plan_catalog_aliases (catalog_version, alias_plan_id, canonical_plan_id)
VALUES ('2026-09-03.v1', 'growth', 'professional');

ALTER TABLE public.workspace_entitlements
  ADD COLUMN plan_catalog_version text NOT NULL DEFAULT '2026-09-03.v1';

CREATE OR REPLACE FUNCTION private.validate_workspace_entitlement_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM private.plan_catalog
    WHERE catalog_version = NEW.plan_catalog_version AND plan_id = NEW.plan_id
    UNION ALL
    SELECT 1 FROM private.plan_catalog_aliases
    WHERE catalog_version = NEW.plan_catalog_version AND alias_plan_id = NEW.plan_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAN_NOT_CONFIGURED';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_workspace_entitlement_plan() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workspace_entitlements_validate_plan
BEFORE INSERT OR UPDATE OF plan_id, plan_catalog_version ON public.workspace_entitlements
FOR EACH ROW EXECUTE FUNCTION private.validate_workspace_entitlement_plan();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.workspace_entitlements entitlement
    WHERE entitlement.plan_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM private.plan_catalog catalog
        WHERE catalog.catalog_version = entitlement.plan_catalog_version
          AND catalog.plan_id = entitlement.plan_id
        UNION ALL
        SELECT 1 FROM private.plan_catalog_aliases alias
        WHERE alias.catalog_version = entitlement.plan_catalog_version
          AND alias.alias_plan_id = entitlement.plan_id
      )
  ) THEN
    RAISE EXCEPTION 'PLAN_NOT_CONFIGURED';
  END IF;
END $$;

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
  -- Serialize allocations per workspace so concurrent requests cannot both
  -- observe the same remaining capacity and exceed a limit.
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

CREATE TRIGGER staff_clients_enforce_plan_limit
BEFORE INSERT OR UPDATE OF workspace_id, case_stage ON public.staff_clients
FOR EACH ROW EXECUTE FUNCTION private.enforce_workspace_plan_allocation();

CREATE TRIGGER workspace_memberships_enforce_plan_limit
BEFORE INSERT OR UPDATE OF workspace_id, status ON public.workspace_memberships
FOR EACH ROW EXECUTE FUNCTION private.enforce_workspace_plan_allocation();

CREATE TRIGGER client_documents_enforce_plan_limit
BEFORE INSERT OR UPDATE OF workspace_id, file_size, doc_status ON public.client_documents
FOR EACH ROW EXECUTE FUNCTION private.enforce_workspace_plan_allocation();
