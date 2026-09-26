-- Certified mailings for dispute letters.
-- No seed/demo data; stores only per-user mailing metadata and USPS tracking state.

CREATE TABLE IF NOT EXISTS public.certified_mailings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    dispute_letter_id UUID REFERENCES public.dispute_letters(id) ON DELETE SET NULL,
    generated_dispute_letter_id UUID REFERENCES public.generated_dispute_letters(id) ON DELETE SET NULL,
    dispute_round_id UUID REFERENCES public.dispute_rounds(id) ON DELETE SET NULL,
    bureau TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'usps',
    service_type TEXT NOT NULL DEFAULT 'certified_mail',
    return_receipt_electronic BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'not_mailed',
    tracking_number TEXT DEFAULT '',
    amount_paid_cents INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD',
    sender_address JSONB NOT NULL DEFAULT '{}'::JSONB,
    destination_address JSONB NOT NULL DEFAULT '{}'::JSONB,
    provider_request_id TEXT NOT NULL DEFAULT '',
    provider_label_id TEXT DEFAULT '',
    label_file_ref TEXT DEFAULT '',
    proof_of_delivery_ref TEXT DEFAULT '',
    return_receipt_status TEXT DEFAULT '',
    usps_status TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    mailed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    last_tracked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT certified_mailings_status_check CHECK (
      status IN ('not_mailed', 'ready_for_purchase', 'label_created', 'in_transit', 'delivered', 'delivery_issue', 'canceled')
    ),
    CONSTRAINT certified_mailings_one_letter_check CHECK (
      (dispute_letter_id IS NOT NULL AND generated_dispute_letter_id IS NULL)
      OR (dispute_letter_id IS NULL AND generated_dispute_letter_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_certified_mailings_owner ON public.certified_mailings(owner_id);
CREATE INDEX IF NOT EXISTS idx_certified_mailings_client ON public.certified_mailings(client_id);
CREATE INDEX IF NOT EXISTS idx_certified_mailings_round ON public.certified_mailings(dispute_round_id);
CREATE INDEX IF NOT EXISTS idx_certified_mailings_tracking ON public.certified_mailings(tracking_number);

CREATE UNIQUE INDEX IF NOT EXISTS certified_mailings_dispute_letter_once
ON public.certified_mailings(owner_id, dispute_letter_id)
WHERE dispute_letter_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certified_mailings_generated_letter_once
ON public.certified_mailings(owner_id, generated_dispute_letter_id)
WHERE generated_dispute_letter_id IS NOT NULL;

ALTER TABLE public.certified_mailings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_certified_mailings" ON public.certified_mailings;
CREATE POLICY "users_manage_own_certified_mailings"
ON public.certified_mailings
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_certified_mailings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_certified_mailings_updated_at ON public.certified_mailings;
CREATE TRIGGER trg_certified_mailings_updated_at
    BEFORE UPDATE ON public.certified_mailings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_certified_mailings_updated_at();

-- This migration was intentionally held back from production while later
-- tenant-hardening migrations were applied. Keep the table safe in both
-- supported orders:
--   1. chronological replay, where FMM-003/FMM-007 run after this file; and
--   2. production catch-up, where their helper functions already exist.
ALTER FUNCTION public.update_certified_mailings_updated_at() SET search_path = '';
REVOKE ALL ON FUNCTION public.update_certified_mailings_updated_at()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_certified_mailings_updated_at()
  TO service_role;

REVOKE ALL ON TABLE public.certified_mailings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certified_mailings
  TO authenticated;
GRANT ALL ON TABLE public.certified_mailings TO service_role;

DO $late_tenant_reconciliation$
DECLARE
  policy_record record;
  later_helpers_present integer := pg_catalog.num_nonnulls(
    pg_catalog.to_regprocedure('private.can_read_owner(uuid)'),
    pg_catalog.to_regprocedure('private.can_write_owner(uuid)'),
    pg_catalog.to_regprocedure('private.bind_selected_workspace_owner()')
  );
  client_attnum smallint;
  owner_attnum smallint;
  staff_client_id_attnum smallint;
  staff_owner_attnum smallint;
BEGIN
  -- On a clean replay none of these later helpers exists yet. FMM-007 will
  -- perform the same reconciliation after it creates them.
  IF later_helpers_present = 0 THEN
    RETURN;
  END IF;

  -- A partially present later security layer is not a supported state. Abort
  -- rather than creating a table with only some tenant controls.
  IF later_helpers_present <> 3 THEN
    RAISE EXCEPTION
      'certified_mailings stopped: incomplete FMM-007 tenant helper set';
  END IF;

  IF pg_catalog.to_regclass('public.staff_clients') IS NULL THEN
    RAISE EXCEPTION
      'certified_mailings stopped: public.staff_clients is missing';
  END IF;

  SELECT attribute.attnum::smallint
  INTO client_attnum
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.certified_mailings'::pg_catalog.regclass
    AND attribute.attname = 'client_id'
    AND NOT attribute.attisdropped;

  SELECT attribute.attnum::smallint
  INTO owner_attnum
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.certified_mailings'::pg_catalog.regclass
    AND attribute.attname = 'owner_id'
    AND NOT attribute.attisdropped;

  SELECT attribute.attnum::smallint
  INTO staff_client_id_attnum
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.staff_clients'::pg_catalog.regclass
    AND attribute.attname = 'id'
    AND NOT attribute.attisdropped;

  SELECT attribute.attnum::smallint
  INTO staff_owner_attnum
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.staff_clients'::pg_catalog.regclass
    AND attribute.attname = 'owner_id'
    AND NOT attribute.attisdropped;

  IF client_attnum IS NULL OR owner_attnum IS NULL
     OR staff_client_id_attnum IS NULL OR staff_owner_attnum IS NULL THEN
    RAISE EXCEPTION
      'certified_mailings stopped: tenant key columns are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS tenant_key
    WHERE tenant_key.conrelid = 'public.staff_clients'::pg_catalog.regclass
      AND tenant_key.contype IN ('p', 'u')
      AND tenant_key.conkey = ARRAY[staff_client_id_attnum, staff_owner_attnum]::smallint[]
  ) THEN
    RAISE EXCEPTION
      'certified_mailings stopped: staff_clients (id, owner_id) is not unique';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS tenant_fk
    WHERE tenant_fk.conrelid = 'public.certified_mailings'::pg_catalog.regclass
      AND tenant_fk.conname = 'certified_mailings_client_owner_tenant_fkey'
      AND NOT (
        tenant_fk.contype = 'f'
        AND tenant_fk.confrelid = 'public.staff_clients'::pg_catalog.regclass
        AND tenant_fk.conkey = ARRAY[client_attnum, owner_attnum]::smallint[]
        AND tenant_fk.confkey = ARRAY[staff_client_id_attnum, staff_owner_attnum]::smallint[]
        AND tenant_fk.confdeltype = 'r'
        AND NOT tenant_fk.condeferrable
      )
  ) THEN
    RAISE EXCEPTION
      'certified_mailings stopped: tenant constraint name has an unexpected definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS tenant_fk
    WHERE tenant_fk.conrelid = 'public.certified_mailings'::pg_catalog.regclass
      AND tenant_fk.conname = 'certified_mailings_client_owner_tenant_fkey'
  ) THEN
    ALTER TABLE public.certified_mailings
      ADD CONSTRAINT certified_mailings_client_owner_tenant_fkey
      FOREIGN KEY (client_id, owner_id)
      REFERENCES public.staff_clients(id, owner_id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;

  ALTER TABLE public.certified_mailings
    VALIDATE CONSTRAINT certified_mailings_client_owner_tenant_fkey;

  CREATE INDEX IF NOT EXISTS certified_mailings_client_owner_tenant_idx
    ON public.certified_mailings (client_id, owner_id);

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS index_relation
    JOIN pg_catalog.pg_namespace AS index_namespace
      ON index_namespace.oid = index_relation.relnamespace
    JOIN pg_catalog.pg_index AS index_definition
      ON index_definition.indexrelid = index_relation.oid
    WHERE index_namespace.nspname = 'public'
      AND index_relation.relname = 'certified_mailings_client_owner_tenant_idx'
      AND index_definition.indrelid = 'public.certified_mailings'::pg_catalog.regclass
      AND index_definition.indnkeyatts = 2
      AND index_definition.indnatts = 2
      AND (index_definition.indkey::smallint[])[0] = client_attnum
      AND (index_definition.indkey::smallint[])[1] = owner_attnum
      AND index_definition.indexprs IS NULL
      AND index_definition.indpred IS NULL
  ) THEN
    RAISE EXCEPTION
      'certified_mailings stopped: tenant index has an unexpected definition';
  END IF;

  DROP TRIGGER IF EXISTS bind_selected_workspace_owner
    ON public.certified_mailings;
  CREATE TRIGGER bind_selected_workspace_owner
    BEFORE INSERT OR UPDATE OF owner_id ON public.certified_mailings
    FOR EACH ROW
    EXECUTE FUNCTION private.bind_selected_workspace_owner();

  FOR policy_record IN
    SELECT policy.policyname
    FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'certified_mailings'
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY IF EXISTS %I ON public.certified_mailings',
      policy_record.policyname
    );
  END LOOP;

  CREATE POLICY workspace_members_select_certified_mailings
    ON public.certified_mailings FOR SELECT TO authenticated
    USING (private.can_read_owner(owner_id));
  CREATE POLICY workspace_members_insert_certified_mailings
    ON public.certified_mailings FOR INSERT TO authenticated
    WITH CHECK (private.can_write_owner(owner_id));
  CREATE POLICY workspace_members_update_certified_mailings
    ON public.certified_mailings FOR UPDATE TO authenticated
    USING (private.can_write_owner(owner_id))
    WITH CHECK (private.can_write_owner(owner_id));
  CREATE POLICY workspace_members_delete_certified_mailings
    ON public.certified_mailings FOR DELETE TO authenticated
    USING (private.can_write_owner(owner_id));
END;
$late_tenant_reconciliation$;
