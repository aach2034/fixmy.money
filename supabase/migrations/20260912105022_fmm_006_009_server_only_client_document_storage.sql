-- FMM-006 / FMM-009: make private client-document objects server-only.
--
-- Storage table privileges are shared by every bucket. Do not revoke them
-- globally: removing these bucket-scoped policies is the supported RLS
-- boundary, while service_role continues to bypass RLS for trusted routes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'client-documents'
  ) THEN
    RAISE EXCEPTION 'The client-documents bucket must exist before applying the server-only boundary.';
  END IF;
END;
$$;

UPDATE storage.buckets
SET public = false
WHERE id = 'client-documents'
  AND public IS DISTINCT FROM false;

DROP POLICY IF EXISTS client_documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS client_documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS client_documents_storage_update ON storage.objects;
DROP POLICY IF EXISTS client_documents_storage_delete ON storage.objects;
DROP POLICY IF EXISTS client_documents_storage_authenticated_route_only ON storage.objects;

-- This restrictive guard keeps this one bucket server-only even if another
-- permissive authenticated policy is added to storage.objects later. It is
-- true for every other bucket and therefore does not change their behavior.
CREATE POLICY client_documents_storage_authenticated_route_only
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (bucket_id <> 'client-documents')
WITH CHECK (bucket_id <> 'client-documents');

-- Metadata remains readable through its tenant-scoped SELECT policy so the
-- portal can list documents. All metadata mutations are server-route-only;
-- otherwise a browser could delete a row without deleting its object or
-- manufacture a row without a validated object.
DROP POLICY IF EXISTS client_documents_insert_authorized ON public.client_documents;
DROP POLICY IF EXISTS client_documents_update_authorized ON public.client_documents;
DROP POLICY IF EXISTS client_documents_delete_authorized ON public.client_documents;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.client_documents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_documents TO service_role;

-- Count every retained object-bearing document status toward aggregate plan
-- Storage. The prior filter omitted reviewed/approved/rejected documents even
-- though their private objects remain stored.
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
  IF TG_TABLE_SCHEMA <> 'public'
     OR TG_TABLE_NAME NOT IN ('staff_clients', 'workspace_memberships', 'client_documents') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'UNSUPPORTED_ALLOCATION_TABLE';
  END IF;

  target_workspace := NEW.workspace_id;

  IF TG_TABLE_NAME = 'workspace_memberships' THEN
    IF NEW.role = 'owner' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.workspaces AS workspace
        WHERE workspace.id = target_workspace
          AND workspace.owner_id = NEW.user_id
      ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORKSPACE_OWNER_REQUIRED';
      END IF;
      RETURN NEW;
    END IF;
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
      (
        SELECT alias.canonical_plan_id
        FROM private.plan_catalog_aliases AS alias
        WHERE alias.catalog_version = entitlement.plan_catalog_version
          AND alias.alias_plan_id = entitlement.plan_id
      ),
      entitlement.plan_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAN_NOT_CONFIGURED';
  END IF;

  IF TG_TABLE_NAME = 'staff_clients' THEN
    IF NEW.case_stage NOT IN ('completed', 'churned') THEN
      SELECT count(*) INTO used_count
      FROM public.staff_clients
      WHERE workspace_id = target_workspace
        AND case_stage NOT IN ('completed', 'churned')
        AND id IS DISTINCT FROM NEW.id;

      IF catalog.max_clients IS NOT NULL AND used_count + 1 > catalog.max_clients THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CLIENTS_LIMIT_REACHED';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'workspace_memberships' THEN
    IF NEW.status IN ('active', 'invited') THEN
      SELECT count(*) INTO used_count
      FROM public.workspace_memberships
      WHERE workspace_id = target_workspace
        AND status IN ('active', 'invited')
        AND id IS DISTINCT FROM NEW.id;

      IF catalog.max_seats IS NOT NULL AND used_count + 1 > catalog.max_seats THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SEATS_LIMIT_REACHED';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'client_documents' THEN
    SELECT COALESCE(sum(GREATEST(file_size, 0)), 0) INTO used_bytes
    FROM public.client_documents
    WHERE workspace_id = target_workspace
      AND id IS DISTINCT FROM NEW.id;

    IF catalog.storage_bytes IS NOT NULL
       AND used_bytes + GREATEST(NEW.file_size, 0) > catalog.storage_bytes THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STORAGE_BYTES_LIMIT_REACHED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_workspace_plan_allocation() FROM PUBLIC, anon, authenticated;
