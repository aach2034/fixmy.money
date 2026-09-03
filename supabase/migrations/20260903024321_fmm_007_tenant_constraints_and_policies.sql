-- FMM-007 phase two: validate tenant bindings, make them mandatory, and
-- replace all email/owner authorization predicates. Phase one is additive and
-- leaves existing policies intact if this validation cannot complete.

ALTER TABLE public.client_disputes
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN owner_id SET NOT NULL,
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN workspace_client_id SET NOT NULL,
  ALTER COLUMN staff_client_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS client_disputes_client_id_fkey,
  ADD CONSTRAINT client_disputes_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  ADD CONSTRAINT client_disputes_workspace_owner_fkey
    FOREIGN KEY (workspace_id, owner_id)
    REFERENCES public.workspaces(id, owner_id) ON DELETE RESTRICT,
  ADD CONSTRAINT client_disputes_workspace_client_fkey
    FOREIGN KEY (workspace_client_id, workspace_id, staff_client_id)
    REFERENCES public.workspace_client_memberships(id, workspace_id, staff_client_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT client_disputes_portal_identity_fkey
    FOREIGN KEY (workspace_client_id, client_id)
    REFERENCES public.workspace_client_memberships(id, client_account_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT client_disputes_id_relationship_workspace_key
    UNIQUE (id, workspace_client_id, workspace_id);

ALTER TABLE public.client_updates
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN workspace_client_id SET NOT NULL,
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN staff_client_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS client_updates_client_id_fkey,
  ADD CONSTRAINT client_updates_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  ADD CONSTRAINT client_updates_workspace_client_fkey
    FOREIGN KEY (workspace_client_id, workspace_id, staff_client_id)
    REFERENCES public.workspace_client_memberships(id, workspace_id, staff_client_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT client_updates_portal_identity_fkey
    FOREIGN KEY (workspace_client_id, client_id)
    REFERENCES public.workspace_client_memberships(id, client_account_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT client_updates_dispute_relationship_fkey
    FOREIGN KEY (dispute_id, workspace_client_id, workspace_id)
    REFERENCES public.client_disputes(id, workspace_client_id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.client_documents
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN workspace_client_id SET NOT NULL,
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN staff_client_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS client_documents_client_id_fkey,
  ADD CONSTRAINT client_documents_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  ADD CONSTRAINT client_documents_workspace_client_fkey
    FOREIGN KEY (workspace_client_id, workspace_id, staff_client_id)
    REFERENCES public.workspace_client_memberships(id, workspace_id, staff_client_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT client_documents_portal_identity_fkey
    FOREIGN KEY (workspace_client_id, client_id)
    REFERENCES public.workspace_client_memberships(id, client_account_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT client_documents_dispute_relationship_fkey
    FOREIGN KEY (dispute_id, workspace_client_id, workspace_id)
    REFERENCES public.client_disputes(id, workspace_client_id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.dispute_timeline_events
  ALTER COLUMN workspace_client_id SET NOT NULL,
  ALTER COLUMN workspace_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS dispute_timeline_events_dispute_id_fkey,
  ADD CONSTRAINT dispute_timeline_events_dispute_relationship_fkey
    FOREIGN KEY (dispute_id, workspace_client_id, workspace_id)
    REFERENCES public.client_disputes(id, workspace_client_id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.chat_conversations
  ALTER COLUMN workspace_client_id SET NOT NULL,
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN staff_client_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS chat_conversations_client_account_id_fkey,
  ADD CONSTRAINT chat_conversations_client_account_id_fkey
    FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  ADD CONSTRAINT chat_conversations_workspace_client_fkey
    FOREIGN KEY (workspace_client_id, workspace_id, staff_client_id)
    REFERENCES public.workspace_client_memberships(id, workspace_id, staff_client_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT chat_conversations_portal_identity_fkey
    FOREIGN KEY (workspace_client_id, client_account_id)
    REFERENCES public.workspace_client_memberships(id, client_account_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT chat_conversations_id_relationship_workspace_key
    UNIQUE (id, workspace_client_id, workspace_id);

ALTER TABLE public.chat_messages
  ALTER COLUMN workspace_client_id SET NOT NULL,
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN sender_user_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey,
  ADD CONSTRAINT chat_messages_conversation_relationship_fkey
    FOREIGN KEY (conversation_id, workspace_client_id, workspace_id)
    REFERENCES public.chat_conversations(id, workspace_client_id, workspace_id)
    ON DELETE RESTRICT;

CREATE INDEX client_disputes_workspace_client_idx
  ON public.client_disputes (workspace_client_id, created_at DESC);
CREATE INDEX client_updates_workspace_client_idx
  ON public.client_updates (workspace_client_id, created_at DESC);
CREATE INDEX client_documents_workspace_client_idx
  ON public.client_documents (workspace_client_id, created_at DESC);
CREATE INDEX dispute_timeline_workspace_client_idx
  ON public.dispute_timeline_events (workspace_client_id, event_date);
CREATE INDEX chat_conversations_workspace_client_idx
  ON public.chat_conversations (workspace_client_id, status, last_message_at DESC);
CREATE INDEX chat_messages_workspace_client_idx
  ON public.chat_messages (workspace_client_id, created_at);

-- The old owner/client pairs remain in application tables for compatibility,
-- but every pair is now constrained to the same dossier. These validations
-- fail rather than repairing or deleting a mismatched customer row.
DO $$
DECLARE
  target_table text;
  constraint_name text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'audit_logs', 'bureau_tradelines', 'cancellation_periods', 'case_events',
    'compliance_disclosures', 'credit_accounts', 'credit_cases',
    'credit_report_imports', 'credit_report_snapshots', 'croa_contracts',
    'detected_issues', 'dispute_letters', 'dispute_round_items',
    'dispute_rounds', 'disputes', 'escalations', 'evidence_documents',
    'evidence_facts', 'generated_dispute_letters', 'import_comparisons',
    'investigation_results', 'negative_items', 'parsed_credit_reports',
    'report_comparisons', 'report_snapshots', 'certified_mailings'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NULL THEN
      CONTINUE;
    END IF;
    constraint_name := target_table || '_client_owner_tenant_fkey';
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (client_id, owner_id) REFERENCES public.staff_clients(id, owner_id) ON DELETE RESTRICT NOT VALID',
      target_table, constraint_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I VALIDATE CONSTRAINT %I',
      target_table, constraint_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id, owner_id)',
      target_table || '_client_owner_tenant_idx', target_table
    );
  END LOOP;
END;
$$;

UPDATE public.credit_accounts AS account
SET workspace_id = client.workspace_id
FROM public.staff_clients AS client
WHERE account.client_id = client.id
  AND account.owner_id = client.owner_id
  AND account.workspace_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.credit_accounts AS account
    JOIN public.staff_clients AS client
      ON client.id = account.client_id
    WHERE account.workspace_id IS DISTINCT FROM client.workspace_id
  ) THEN
    RAISE EXCEPTION 'FMM-007 stopped: credit_accounts workspace does not match its client';
  END IF;
END;
$$;

ALTER TABLE public.credit_accounts
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT credit_accounts_workspace_client_fkey
  FOREIGN KEY (client_id, workspace_id)
  REFERENCES public.staff_clients(id, workspace_id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.credit_accounts
  VALIDATE CONSTRAINT credit_accounts_workspace_client_fkey;

ALTER TABLE public.credit_report_uploads
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT credit_report_uploads_workspace_client_fkey
  FOREIGN KEY (client_id, workspace_id)
  REFERENCES public.staff_clients(id, workspace_id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.credit_report_uploads
  VALIDATE CONSTRAINT credit_report_uploads_workspace_client_fkey;

ALTER TABLE public.dispute_letters
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT dispute_letters_workspace_owner_fkey
  FOREIGN KEY (workspace_id, owner_id)
  REFERENCES public.workspaces(id, owner_id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.dispute_letters
  VALIDATE CONSTRAINT dispute_letters_workspace_owner_fkey;

ALTER TABLE public.affiliate_link_clicks
  ADD CONSTRAINT affiliate_clicks_client_relationship_pair_check
    CHECK (
      (client_id IS NULL AND workspace_client_id IS NULL)
      OR (client_id IS NOT NULL AND workspace_client_id IS NOT NULL)
    ),
  ADD CONSTRAINT affiliate_clicks_workspace_client_fkey
    FOREIGN KEY (workspace_client_id, agency_id, client_id)
    REFERENCES public.workspace_client_memberships(id, workspace_id, staff_client_id)
    ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.affiliate_link_clicks
  VALIDATE CONSTRAINT affiliate_clicks_workspace_client_fkey;
CREATE INDEX affiliate_clicks_workspace_client_tenant_idx
  ON public.affiliate_link_clicks (workspace_client_id, agency_id, client_id)
  WHERE workspace_client_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.can_read_workspace(requested_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_memberships AS membership
      JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
      WHERE membership.workspace_id = requested_workspace_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
        AND membership.is_selected IS TRUE
        AND workspace.is_active IS TRUE
    )
$$;

CREATE OR REPLACE FUNCTION private.can_write_workspace(requested_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.can_read_workspace(requested_workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.workspace_memberships AS membership
      WHERE membership.workspace_id = requested_workspace_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
        AND membership.role IN ('owner', 'admin', 'specialist')
    )
$$;

CREATE OR REPLACE FUNCTION private.can_admin_workspace(requested_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.can_read_workspace(requested_workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.workspace_memberships AS membership
      WHERE membership.workspace_id = requested_workspace_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
        AND membership.role IN ('owner', 'admin')
    )
$$;

CREATE OR REPLACE FUNCTION private.workspace_id_for_owner(requested_owner_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace.id
  FROM public.workspaces AS workspace
  WHERE workspace.owner_id = requested_owner_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.can_read_owner(requested_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.can_read_workspace(private.workspace_id_for_owner(requested_owner_id))
$$;

CREATE OR REPLACE FUNCTION private.can_write_owner(requested_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.can_write_workspace(private.workspace_id_for_owner(requested_owner_id))
$$;

CREATE OR REPLACE FUNCTION private.portal_owns_workspace_client(requested_workspace_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_client_memberships AS relationship
      JOIN public.client_accounts AS account
        ON account.id = relationship.client_account_id
      JOIN public.workspaces AS workspace
        ON workspace.id = relationship.workspace_id
      WHERE relationship.id = requested_workspace_client_id
        AND relationship.status = 'active'
        AND account.auth_user_id = (SELECT auth.uid())
        AND account.is_active IS TRUE
        AND workspace.is_active IS TRUE
    )
$$;

CREATE OR REPLACE FUNCTION private.can_read_workspace_client(requested_workspace_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = requested_workspace_client_id
      AND relationship.status IN ('pending', 'active')
      AND private.can_read_workspace(relationship.workspace_id)
  ) OR private.portal_owns_workspace_client(requested_workspace_client_id)
$$;

CREATE OR REPLACE FUNCTION private.can_write_workspace_client(requested_workspace_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = requested_workspace_client_id
      AND relationship.status IN ('pending', 'active')
      AND private.can_write_workspace(relationship.workspace_id)
  )
$$;

CREATE OR REPLACE FUNCTION private.safe_uuid(value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_client_dispute_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  relationship public.workspace_client_memberships%ROWTYPE;
  workspace_owner uuid;
BEGIN
  SELECT * INTO STRICT relationship
  FROM public.workspace_client_memberships
  WHERE id = NEW.workspace_client_id;

  SELECT owner_id INTO STRICT workspace_owner
  FROM public.staff_clients
  WHERE id = relationship.staff_client_id
    AND workspace_id = relationship.workspace_id;

  IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM relationship.workspace_id THEN
    RAISE EXCEPTION 'workspace does not belong to workspace-client relationship';
  END IF;
  IF NEW.staff_client_id IS NOT NULL AND NEW.staff_client_id IS DISTINCT FROM relationship.staff_client_id THEN
    RAISE EXCEPTION 'client dossier does not belong to workspace-client relationship';
  END IF;
  IF NEW.owner_id IS NOT NULL AND NEW.owner_id IS DISTINCT FROM workspace_owner
     AND NEW.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'owner does not belong to workspace-client relationship';
  END IF;

  IF NEW.client_id IS NOT NULL
     AND NEW.client_id IS DISTINCT FROM relationship.client_account_id THEN
    RAISE EXCEPTION 'client identity does not belong to workspace-client relationship';
  END IF;

  NEW.workspace_id := relationship.workspace_id;
  NEW.staff_client_id := relationship.staff_client_id;
  NEW.client_id := relationship.client_account_id;
  NEW.owner_id := workspace_owner;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_client_portal_item_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  relationship public.workspace_client_memberships%ROWTYPE;
  dispute_relationship uuid;
  dispute_workspace uuid;
BEGIN
  SELECT * INTO STRICT relationship
  FROM public.workspace_client_memberships
  WHERE id = NEW.workspace_client_id;

  IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM relationship.workspace_id THEN
    RAISE EXCEPTION 'workspace does not belong to workspace-client relationship';
  END IF;
  IF NEW.staff_client_id IS NOT NULL AND NEW.staff_client_id IS DISTINCT FROM relationship.staff_client_id THEN
    RAISE EXCEPTION 'client dossier does not belong to workspace-client relationship';
  END IF;

  IF NEW.client_id IS NOT NULL
     AND NEW.client_id IS DISTINCT FROM relationship.client_account_id THEN
    RAISE EXCEPTION 'client identity does not belong to workspace-client relationship';
  END IF;

  IF NEW.dispute_id IS NOT NULL THEN
    SELECT workspace_client_id, workspace_id
      INTO STRICT dispute_relationship, dispute_workspace
    FROM public.client_disputes
    WHERE id = NEW.dispute_id;
    IF dispute_relationship IS DISTINCT FROM relationship.id
       OR dispute_workspace IS DISTINCT FROM relationship.workspace_id THEN
      RAISE EXCEPTION 'dispute does not belong to workspace-client relationship';
    END IF;
  END IF;

  NEW.workspace_id := relationship.workspace_id;
  NEW.staff_client_id := relationship.staff_client_id;
  NEW.client_id := relationship.client_account_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_timeline_event_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  dispute_relationship uuid;
  dispute_workspace uuid;
BEGIN
  SELECT workspace_client_id, workspace_id
    INTO STRICT dispute_relationship, dispute_workspace
  FROM public.client_disputes
  WHERE id = NEW.dispute_id;

  IF NEW.workspace_client_id IS NOT NULL
     AND NEW.workspace_client_id IS DISTINCT FROM dispute_relationship THEN
    RAISE EXCEPTION 'timeline relationship does not match dispute';
  END IF;
  IF NEW.workspace_id IS NOT NULL
     AND NEW.workspace_id IS DISTINCT FROM dispute_workspace THEN
    RAISE EXCEPTION 'timeline workspace does not match dispute';
  END IF;
  NEW.workspace_client_id := dispute_relationship;
  NEW.workspace_id := dispute_workspace;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_chat_conversation_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  relationship public.workspace_client_memberships%ROWTYPE;
BEGIN
  SELECT * INTO STRICT relationship
  FROM public.workspace_client_memberships
  WHERE id = NEW.workspace_client_id;

  IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM relationship.workspace_id THEN
    RAISE EXCEPTION 'conversation workspace does not belong to relationship';
  END IF;
  IF NEW.staff_client_id IS NOT NULL AND NEW.staff_client_id IS DISTINCT FROM relationship.staff_client_id THEN
    RAISE EXCEPTION 'conversation client dossier does not belong to relationship';
  END IF;

  IF NEW.client_account_id IS NOT NULL
     AND NEW.client_account_id IS DISTINCT FROM relationship.client_account_id THEN
    RAISE EXCEPTION 'client identity does not belong to workspace-client relationship';
  END IF;

  NEW.workspace_id := relationship.workspace_id;
  NEW.staff_client_id := relationship.staff_client_id;
  NEW.client_account_id := relationship.client_account_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_chat_message_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  conversation_relationship uuid;
  conversation_workspace uuid;
BEGIN
  SELECT workspace_client_id, workspace_id
    INTO STRICT conversation_relationship, conversation_workspace
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  IF NEW.workspace_client_id IS NOT NULL
     AND NEW.workspace_client_id IS DISTINCT FROM conversation_relationship THEN
    RAISE EXCEPTION 'message relationship does not match conversation';
  END IF;
  IF NEW.workspace_id IS NOT NULL
     AND NEW.workspace_id IS DISTINCT FROM conversation_workspace THEN
    RAISE EXCEPTION 'message workspace does not match conversation';
  END IF;

  NEW.workspace_client_id := conversation_relationship;
  NEW.workspace_id := conversation_workspace;

  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW.sender_user_id := (SELECT auth.uid());
    NEW.sender_id := (SELECT auth.uid())::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_tenant_keys()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'staff_clients' THEN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'client tenant transfer requires the audited transfer workflow';
    END IF;
  ELSIF TG_TABLE_NAME = 'workspace_client_memberships'
  THEN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.staff_client_id IS DISTINCT FROM OLD.staff_client_id THEN
      RAISE EXCEPTION 'workspace-client tenant keys are immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'workspace_memberships' THEN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'workspace membership tenant keys are immutable';
    END IF;
    IF NEW.is_selected IS DISTINCT FROM OLD.is_selected
       AND (SELECT auth.uid()) IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'only the member may select their active workspace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_selected_workspace_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_owner_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace.owner_id INTO STRICT selected_owner_id
  FROM public.workspace_memberships AS membership
  JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active'
    AND membership.is_selected IS TRUE
    AND workspace.is_active IS TRUE;

  IF NEW.owner_id IS NOT NULL
     AND NEW.owner_id IS DISTINCT FROM selected_owner_id
     AND NEW.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'owner does not match the selected workspace';
  END IF;
  NEW.owner_id := selected_owner_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_staff_client_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_workspace_id uuid;
  selected_owner_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace.id, workspace.owner_id
    INTO STRICT selected_workspace_id, selected_owner_id
  FROM public.workspace_memberships AS membership
  JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active'
    AND membership.is_selected IS TRUE
    AND workspace.is_active IS TRUE;

  IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM selected_workspace_id THEN
    RAISE EXCEPTION 'client workspace does not match the selected workspace';
  END IF;
  IF NEW.owner_id IS NOT NULL
     AND NEW.owner_id IS DISTINCT FROM selected_owner_id
     AND NEW.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'client owner does not match the selected workspace';
  END IF;
  NEW.workspace_id := selected_workspace_id;
  NEW.owner_id := selected_owner_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_dispute_letter_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_workspace_id uuid;
  selected_owner_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace.id, workspace.owner_id
    INTO STRICT selected_workspace_id, selected_owner_id
  FROM public.workspace_memberships AS membership
  JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active'
    AND membership.is_selected IS TRUE
    AND workspace.is_active IS TRUE;

  IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM selected_workspace_id THEN
    RAISE EXCEPTION 'letter workspace does not match the selected workspace';
  END IF;
  IF NEW.owner_id IS NOT NULL
     AND NEW.owner_id IS DISTINCT FROM selected_owner_id
     AND NEW.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'letter owner does not match the selected workspace';
  END IF;
  NEW.workspace_id := selected_workspace_id;
  NEW.owner_id := selected_owner_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.ensure_workspace_client_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.workspace_client_memberships (
    workspace_id, staff_client_id, status, created_by
  ) VALUES (
    NEW.workspace_id, NEW.id, 'active', COALESCE((SELECT auth.uid()), NEW.owner_id)
  )
  ON CONFLICT (staff_client_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.bind_affiliate_click_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  relationship_workspace_id uuid;
  relationship_staff_client_id uuid;
BEGIN
  IF NEW.workspace_client_id IS NOT NULL THEN
    SELECT relationship.workspace_id, relationship.staff_client_id
      INTO STRICT relationship_workspace_id, relationship_staff_client_id
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = NEW.workspace_client_id;

    IF NEW.agency_id IS NOT NULL AND NEW.agency_id IS DISTINCT FROM relationship_workspace_id THEN
      RAISE EXCEPTION 'affiliate workspace does not match workspace-client relationship';
    END IF;
    IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM relationship_staff_client_id THEN
      RAISE EXCEPTION 'affiliate client does not match workspace-client relationship';
    END IF;
    NEW.agency_id := relationship_workspace_id;
    NEW.client_id := relationship_staff_client_id;
  ELSIF (SELECT auth.uid()) IS NOT NULL THEN
    SELECT workspace.id INTO STRICT NEW.agency_id
    FROM public.workspace_memberships AS membership
    JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
    WHERE membership.user_id = (SELECT auth.uid())
      AND membership.status = 'active'
      AND membership.is_selected IS TRUE
      AND workspace.is_active IS TRUE;
  END IF;
  NEW.user_id := COALESCE(NEW.user_id, (SELECT auth.uid()));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_portal_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  staff_can_write boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'client_accounts' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.workspace_client_memberships AS relationship
      WHERE relationship.client_account_id = OLD.id
        AND private.can_write_workspace(relationship.workspace_id)
    ) INTO staff_can_write;
    IF NOT staff_can_write
       AND (NEW.id IS DISTINCT FROM OLD.id
            OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
            OR NEW.email IS DISTINCT FROM OLD.email
            OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
      RAISE EXCEPTION 'portal users may update only their name and phone';
    END IF;
  ELSIF TG_TABLE_NAME = 'client_updates' THEN
    staff_can_write := private.can_write_workspace(OLD.workspace_id);
    IF NOT staff_can_write
       AND (NEW.id IS DISTINCT FROM OLD.id
            OR NEW.workspace_client_id IS DISTINCT FROM OLD.workspace_client_id
            OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
            OR NEW.staff_client_id IS DISTINCT FROM OLD.staff_client_id
            OR NEW.client_id IS DISTINCT FROM OLD.client_id
            OR NEW.dispute_id IS DISTINCT FROM OLD.dispute_id
            OR NEW.subject IS DISTINCT FROM OLD.subject
            OR NEW.message IS DISTINCT FROM OLD.message
            OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
      RAISE EXCEPTION 'portal users may update only read status';
    END IF;
  ELSIF TG_TABLE_NAME = 'chat_conversations' THEN
    staff_can_write := private.can_write_workspace(OLD.workspace_id);
    IF NOT staff_can_write
       AND (NEW.id IS DISTINCT FROM OLD.id
            OR NEW.workspace_client_id IS DISTINCT FROM OLD.workspace_client_id
            OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
            OR NEW.staff_client_id IS DISTINCT FROM OLD.staff_client_id
            OR NEW.client_account_id IS DISTINCT FROM OLD.client_account_id
            OR NEW.specialist_id IS DISTINCT FROM OLD.specialist_id
            OR NEW.subject IS DISTINCT FROM OLD.subject
            OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
      RAISE EXCEPTION 'portal users may update only conversation status';
    END IF;
  ELSIF TG_TABLE_NAME = 'chat_messages' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.workspace_client_id IS DISTINCT FROM OLD.workspace_client_id
       OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.sender_type IS DISTINCT FROM OLD.sender_type
       OR NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.sender_name IS DISTINCT FROM OLD.sender_name
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'chat messages are immutable except for read status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_staff_client_tenant ON public.staff_clients;
CREATE TRIGGER protect_staff_client_tenant
BEFORE UPDATE OF workspace_id, owner_id ON public.staff_clients
FOR EACH ROW EXECUTE FUNCTION private.protect_tenant_keys();

DROP TRIGGER IF EXISTS bind_staff_client_workspace ON public.staff_clients;
CREATE TRIGGER bind_staff_client_workspace
BEFORE INSERT ON public.staff_clients
FOR EACH ROW EXECUTE FUNCTION private.bind_staff_client_workspace();

DROP TRIGGER IF EXISTS ensure_workspace_client_membership ON public.staff_clients;
CREATE TRIGGER ensure_workspace_client_membership
AFTER INSERT ON public.staff_clients
FOR EACH ROW EXECUTE FUNCTION private.ensure_workspace_client_membership();

DROP TRIGGER IF EXISTS bind_affiliate_click_tenant ON public.affiliate_link_clicks;
CREATE TRIGGER bind_affiliate_click_tenant
BEFORE INSERT OR UPDATE OF workspace_client_id, agency_id, client_id
ON public.affiliate_link_clicks
FOR EACH ROW EXECUTE FUNCTION private.bind_affiliate_click_tenant();

DROP TRIGGER IF EXISTS bind_dispute_letter_workspace ON public.dispute_letters;
CREATE TRIGGER bind_dispute_letter_workspace
BEFORE INSERT OR UPDATE OF workspace_id, owner_id ON public.dispute_letters
FOR EACH ROW EXECUTE FUNCTION private.bind_dispute_letter_workspace();

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'audit_logs', 'bureau_tradelines', 'cancellation_periods', 'case_events',
    'compliance_disclosures', 'credit_accounts', 'credit_cases',
    'credit_report_imports', 'credit_report_snapshots', 'croa_contracts',
    'dashboard_metrics', 'detected_issues', 'dispute_letters',
    'dispute_recipients', 'dispute_round_items', 'dispute_rounds', 'disputes',
    'disputes_by_bureau', 'escalations', 'evidence_documents',
    'evidence_facts', 'generated_dispute_letters', 'import_comparisons',
    'investigation_results', 'leads', 'negative_items',
    'parsed_credit_reports', 'report_comparisons', 'report_snapshots',
    'certified_mailings'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS bind_selected_workspace_owner ON public.%I', target_table);
    EXECUTE format(
      'CREATE TRIGGER bind_selected_workspace_owner BEFORE INSERT OR UPDATE OF owner_id ON public.%I FOR EACH ROW EXECUTE FUNCTION private.bind_selected_workspace_owner()',
      target_table
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS protect_workspace_client_tenant ON public.workspace_client_memberships;
CREATE TRIGGER protect_workspace_client_tenant
BEFORE UPDATE OF workspace_id, staff_client_id ON public.workspace_client_memberships
FOR EACH ROW EXECUTE FUNCTION private.protect_tenant_keys();

DROP TRIGGER IF EXISTS protect_workspace_membership_tenant ON public.workspace_memberships;
CREATE TRIGGER protect_workspace_membership_tenant
BEFORE UPDATE OF workspace_id, user_id, is_selected ON public.workspace_memberships
FOR EACH ROW EXECUTE FUNCTION private.protect_tenant_keys();

DROP TRIGGER IF EXISTS bind_client_dispute_tenant ON public.client_disputes;
CREATE TRIGGER bind_client_dispute_tenant
BEFORE INSERT OR UPDATE OF workspace_client_id, workspace_id, staff_client_id, client_id, owner_id
ON public.client_disputes
FOR EACH ROW EXECUTE FUNCTION private.bind_client_dispute_tenant();

DROP TRIGGER IF EXISTS bind_client_update_tenant ON public.client_updates;
CREATE TRIGGER bind_client_update_tenant
BEFORE INSERT OR UPDATE OF workspace_client_id, workspace_id, staff_client_id, client_id, dispute_id
ON public.client_updates
FOR EACH ROW EXECUTE FUNCTION private.bind_client_portal_item_tenant();

DROP TRIGGER IF EXISTS bind_client_document_tenant ON public.client_documents;
CREATE TRIGGER bind_client_document_tenant
BEFORE INSERT OR UPDATE OF workspace_client_id, workspace_id, staff_client_id, client_id, dispute_id
ON public.client_documents
FOR EACH ROW EXECUTE FUNCTION private.bind_client_portal_item_tenant();

DROP TRIGGER IF EXISTS bind_timeline_event_tenant ON public.dispute_timeline_events;
CREATE TRIGGER bind_timeline_event_tenant
BEFORE INSERT OR UPDATE OF dispute_id, workspace_client_id, workspace_id
ON public.dispute_timeline_events
FOR EACH ROW EXECUTE FUNCTION private.bind_timeline_event_tenant();

DROP TRIGGER IF EXISTS bind_chat_conversation_tenant ON public.chat_conversations;
CREATE TRIGGER bind_chat_conversation_tenant
BEFORE INSERT OR UPDATE OF workspace_client_id, workspace_id, staff_client_id, client_account_id
ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION private.bind_chat_conversation_tenant();

DROP TRIGGER IF EXISTS bind_chat_message_tenant ON public.chat_messages;
CREATE TRIGGER bind_chat_message_tenant
BEFORE INSERT OR UPDATE OF conversation_id, workspace_client_id, workspace_id, sender_user_id
ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION private.bind_chat_message_tenant();

DROP TRIGGER IF EXISTS protect_client_account_columns ON public.client_accounts;
CREATE TRIGGER protect_client_account_columns
BEFORE UPDATE ON public.client_accounts
FOR EACH ROW EXECUTE FUNCTION private.protect_portal_update_columns();

DROP TRIGGER IF EXISTS protect_client_update_columns ON public.client_updates;
CREATE TRIGGER protect_client_update_columns
BEFORE UPDATE ON public.client_updates
FOR EACH ROW EXECUTE FUNCTION private.protect_portal_update_columns();

DROP TRIGGER IF EXISTS protect_chat_conversation_columns ON public.chat_conversations;
CREATE TRIGGER protect_chat_conversation_columns
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION private.protect_portal_update_columns();

DROP TRIGGER IF EXISTS protect_chat_message_columns ON public.chat_messages;
CREATE TRIGGER protect_chat_message_columns
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION private.protect_portal_update_columns();

DROP TRIGGER IF EXISTS update_workspace_memberships_updated_at ON public.workspace_memberships;
CREATE TRIGGER update_workspace_memberships_updated_at
BEFORE UPDATE ON public.workspace_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_workspace_client_memberships_updated_at ON public.workspace_client_memberships;
CREATE TRIGGER update_workspace_client_memberships_updated_at
BEFORE UPDATE ON public.workspace_client_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_client_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_invitations_no_direct_access
ON public.workspace_invitations FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

-- Remove every legacy policy on the boundary tables. This includes historical
-- anon-wide and JWT-email policies as well as owner_id = auth.uid() policies.
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'workspaces', 'workspace_memberships', 'staff_clients',
        'workspace_client_memberships', 'client_accounts', 'client_disputes',
        'dispute_timeline_events', 'client_updates', 'client_documents',
        'chat_conversations', 'chat_messages'
      ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_record.policyname, policy_record.tablename
    );
  END LOOP;
END;
$$;

CREATE POLICY workspaces_select_members
ON public.workspaces FOR SELECT TO authenticated
USING (private.can_read_workspace(id));

CREATE POLICY workspaces_insert_owner
ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY workspaces_update_admins
ON public.workspaces FOR UPDATE TO authenticated
USING (private.can_admin_workspace(id))
WITH CHECK (private.can_admin_workspace(id));

CREATE POLICY workspaces_delete_owner
ON public.workspaces FOR DELETE TO authenticated
USING (owner_id = (SELECT auth.uid()) AND private.can_admin_workspace(id));

CREATE POLICY workspace_memberships_select_members
ON public.workspace_memberships FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_read_workspace(workspace_id)
);

CREATE POLICY workspace_memberships_insert_admins
ON public.workspace_memberships FOR INSERT TO authenticated
WITH CHECK (
  private.can_admin_workspace(workspace_id)
  AND role <> 'owner'
);

CREATE POLICY workspace_memberships_update_admins
ON public.workspace_memberships FOR UPDATE TO authenticated
USING (private.can_admin_workspace(workspace_id) AND role <> 'owner')
WITH CHECK (private.can_admin_workspace(workspace_id) AND role <> 'owner');

CREATE POLICY workspace_memberships_delete_admins
ON public.workspace_memberships FOR DELETE TO authenticated
USING (private.can_admin_workspace(workspace_id) AND role <> 'owner');

CREATE POLICY staff_clients_select_members
ON public.staff_clients FOR SELECT TO authenticated
USING (private.can_read_workspace(workspace_id));

CREATE POLICY staff_clients_insert_writers
ON public.staff_clients FOR INSERT TO authenticated
WITH CHECK (private.can_write_workspace(workspace_id));

CREATE POLICY staff_clients_update_writers
ON public.staff_clients FOR UPDATE TO authenticated
USING (private.can_write_workspace(workspace_id))
WITH CHECK (private.can_write_workspace(workspace_id));

CREATE POLICY staff_clients_delete_writers
ON public.staff_clients FOR DELETE TO authenticated
USING (private.can_write_workspace(workspace_id));

CREATE POLICY workspace_clients_select_authorized
ON public.workspace_client_memberships FOR SELECT TO authenticated
USING (
  private.can_read_workspace(workspace_id)
  OR private.portal_owns_workspace_client(id)
);

CREATE POLICY workspace_clients_insert_writers
ON public.workspace_client_memberships FOR INSERT TO authenticated
WITH CHECK (private.can_write_workspace(workspace_id));

CREATE POLICY workspace_clients_update_writers
ON public.workspace_client_memberships FOR UPDATE TO authenticated
USING (private.can_write_workspace(workspace_id))
WITH CHECK (private.can_write_workspace(workspace_id));

CREATE POLICY workspace_clients_delete_writers
ON public.workspace_client_memberships FOR DELETE TO authenticated
USING (private.can_write_workspace(workspace_id));

CREATE POLICY client_accounts_select_authorized
ON public.client_accounts FOR SELECT TO authenticated
USING (
  auth_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.client_account_id = client_accounts.id
      AND private.can_read_workspace(relationship.workspace_id)
  )
);

CREATE POLICY client_accounts_update_authorized
ON public.client_accounts FOR UPDATE TO authenticated
USING (
  auth_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.client_account_id = client_accounts.id
      AND private.can_write_workspace(relationship.workspace_id)
  )
)
WITH CHECK (
  auth_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.client_account_id = client_accounts.id
      AND private.can_write_workspace(relationship.workspace_id)
  )
);

CREATE POLICY client_disputes_select_authorized
ON public.client_disputes FOR SELECT TO authenticated
USING (private.can_read_workspace_client(workspace_client_id));

CREATE POLICY client_disputes_insert_staff
ON public.client_disputes FOR INSERT TO authenticated
WITH CHECK (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY client_disputes_update_staff
ON public.client_disputes FOR UPDATE TO authenticated
USING (private.can_write_workspace_client(workspace_client_id))
WITH CHECK (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY client_disputes_delete_staff
ON public.client_disputes FOR DELETE TO authenticated
USING (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY timeline_select_authorized
ON public.dispute_timeline_events FOR SELECT TO authenticated
USING (private.can_read_workspace_client(workspace_client_id));

CREATE POLICY timeline_insert_staff
ON public.dispute_timeline_events FOR INSERT TO authenticated
WITH CHECK (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY timeline_update_staff
ON public.dispute_timeline_events FOR UPDATE TO authenticated
USING (private.can_write_workspace_client(workspace_client_id))
WITH CHECK (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY timeline_delete_staff
ON public.dispute_timeline_events FOR DELETE TO authenticated
USING (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY client_updates_select_authorized
ON public.client_updates FOR SELECT TO authenticated
USING (private.can_read_workspace_client(workspace_client_id));

CREATE POLICY client_updates_insert_staff
ON public.client_updates FOR INSERT TO authenticated
WITH CHECK (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY client_updates_update_authorized
ON public.client_updates FOR UPDATE TO authenticated
USING (
  private.can_write_workspace_client(workspace_client_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
)
WITH CHECK (
  private.can_write_workspace_client(workspace_client_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
);

CREATE POLICY client_updates_delete_staff
ON public.client_updates FOR DELETE TO authenticated
USING (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY client_documents_select_authorized
ON public.client_documents FOR SELECT TO authenticated
USING (private.can_read_workspace_client(workspace_client_id));

CREATE POLICY client_documents_insert_authorized
ON public.client_documents FOR INSERT TO authenticated
WITH CHECK (
  private.can_write_workspace_client(workspace_client_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
);

CREATE POLICY client_documents_update_authorized
ON public.client_documents FOR UPDATE TO authenticated
USING (
  private.can_write_workspace_client(workspace_client_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
)
WITH CHECK (
  private.can_write_workspace_client(workspace_client_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
);

CREATE POLICY client_documents_delete_authorized
ON public.client_documents FOR DELETE TO authenticated
USING (
  private.can_write_workspace_client(workspace_client_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
);

CREATE POLICY chat_conversations_select_authorized
ON public.chat_conversations FOR SELECT TO authenticated
USING (private.can_read_workspace_client(workspace_client_id));

CREATE POLICY chat_conversations_insert_authorized
ON public.chat_conversations FOR INSERT TO authenticated
WITH CHECK (
  private.can_write_workspace_client(workspace_client_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
);

CREATE POLICY chat_conversations_update_authorized
ON public.chat_conversations FOR UPDATE TO authenticated
USING (private.can_read_workspace_client(workspace_client_id))
WITH CHECK (private.can_read_workspace_client(workspace_client_id));

CREATE POLICY chat_conversations_delete_staff
ON public.chat_conversations FOR DELETE TO authenticated
USING (private.can_write_workspace_client(workspace_client_id));

CREATE POLICY chat_messages_select_authorized
ON public.chat_messages FOR SELECT TO authenticated
USING (private.can_read_workspace_client(workspace_client_id));

CREATE POLICY chat_messages_insert_actor
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = (SELECT auth.uid())
  AND (
    (sender_type = 'client' AND private.portal_owns_workspace_client(workspace_client_id))
    OR
    (sender_type = 'specialist' AND private.can_write_workspace(workspace_id))
  )
);

CREATE POLICY chat_messages_update_authorized
ON public.chat_messages FOR UPDATE TO authenticated
USING (private.can_read_workspace_client(workspace_client_id))
WITH CHECK (private.can_read_workspace_client(workspace_client_id));

DROP POLICY IF EXISTS "agency_own_clicks" ON public.affiliate_link_clicks;
CREATE POLICY affiliate_clicks_select_staff
ON public.affiliate_link_clicks FOR SELECT TO authenticated
USING (private.can_read_workspace(agency_id));
CREATE POLICY affiliate_clicks_insert_authorized
ON public.affiliate_link_clicks FOR INSERT TO authenticated
WITH CHECK (
  private.can_write_workspace(agency_id)
  OR private.portal_owns_workspace_client(workspace_client_id)
);
CREATE POLICY affiliate_clicks_update_staff
ON public.affiliate_link_clicks FOR UPDATE TO authenticated
USING (private.can_write_workspace(agency_id))
WITH CHECK (private.can_write_workspace(agency_id));
CREATE POLICY affiliate_clicks_delete_staff
ON public.affiliate_link_clicks FOR DELETE TO authenticated
USING (private.can_write_workspace(agency_id));

-- Convert the owner-scoped operational tables to role-aware workspace access.
-- Audit logs and case events remain append-only.
DO $$
DECLARE
  target_table text;
  policy_record record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'bureau_tradelines', 'cancellation_periods', 'compliance_disclosures',
    'credit_accounts', 'credit_cases', 'credit_report_imports',
    'credit_report_snapshots', 'croa_contracts', 'dashboard_metrics',
    'detected_issues', 'dispute_letters', 'dispute_recipients',
    'dispute_round_items', 'dispute_rounds', 'disputes',
    'disputes_by_bureau', 'escalations', 'evidence_documents',
    'evidence_facts', 'generated_dispute_letters', 'import_comparisons',
    'investigation_results', 'leads', 'negative_items',
    'parsed_credit_reports', 'report_comparisons', 'report_snapshots',
    'certified_mailings'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NULL THEN
      CONTINUE;
    END IF;
    FOR policy_record IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.can_read_owner(owner_id))',
      'workspace_members_select_' || target_table, target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.can_write_owner(owner_id))',
      'workspace_members_insert_' || target_table, target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.can_write_owner(owner_id)) WITH CHECK (private.can_write_owner(owner_id))',
      'workspace_members_update_' || target_table, target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.can_write_owner(owner_id))',
      'workspace_members_delete_' || target_table, target_table
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  target_table text;
  policy_record record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['audit_logs', 'case_events']
  LOOP
    FOR policy_record IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.can_read_owner(owner_id))',
      'workspace_members_select_' || target_table, target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.can_write_owner(owner_id))',
      'workspace_members_insert_' || target_table, target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (false) WITH CHECK (false)',
      target_table || '_no_update', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (false)',
      target_table || '_no_delete', target_table
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "users_manage_own_credit_report_uploads" ON public.credit_report_uploads;
CREATE POLICY workspace_members_select_credit_report_uploads
ON public.credit_report_uploads FOR SELECT TO authenticated
USING (private.can_read_workspace(workspace_id));
CREATE POLICY workspace_members_insert_credit_report_uploads
ON public.credit_report_uploads FOR INSERT TO authenticated
WITH CHECK (private.can_write_workspace(workspace_id));
CREATE POLICY workspace_members_update_credit_report_uploads
ON public.credit_report_uploads FOR UPDATE TO authenticated
USING (private.can_write_workspace(workspace_id))
WITH CHECK (private.can_write_workspace(workspace_id));
CREATE POLICY workspace_members_delete_credit_report_uploads
ON public.credit_report_uploads FOR DELETE TO authenticated
USING (private.can_write_workspace(workspace_id));

DROP POLICY IF EXISTS "workspace_members_manage_report_provider_settings" ON public.report_provider_settings;
DROP POLICY IF EXISTS "users_manage_report_provider_settings" ON public.report_provider_settings;
DROP POLICY IF EXISTS "agency_own_provider_settings" ON public.report_provider_settings;
CREATE POLICY workspace_members_select_report_provider_settings
ON public.report_provider_settings FOR SELECT TO authenticated
USING (private.can_read_workspace(workspace_id));
CREATE POLICY workspace_admins_manage_report_provider_settings
ON public.report_provider_settings FOR ALL TO authenticated
USING (private.can_admin_workspace(workspace_id))
WITH CHECK (private.can_admin_workspace(workspace_id));

DROP POLICY IF EXISTS "ai_usage_events_select" ON public.ai_usage_events;
CREATE POLICY ai_usage_events_select_members
ON public.ai_usage_events FOR SELECT TO authenticated
USING (private.can_read_workspace(workspace_id));

DROP POLICY IF EXISTS "billing_events_workspace_select" ON public.billing_events;
CREATE POLICY billing_events_select_members
ON public.billing_events FOR SELECT TO authenticated
USING (private.can_read_workspace(workspace_id));

-- Evidence/OCR objects keep the existing owner-prefixed paths so no production
-- object is moved or renamed. Access is now based on the selected workspace's
-- owner rather than the human actor, allowing legitimate staff collaboration
-- without sharing objects across selected tenants.
DROP POLICY IF EXISTS "owner_evidence_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "owner_evidence_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "owner_evidence_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "owner_evidence_storage_delete" ON storage.objects;

CREATE POLICY workspace_evidence_storage_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'evidence-documents'
  AND private.can_read_owner(private.safe_uuid((storage.foldername(name))[1]))
);
CREATE POLICY workspace_evidence_storage_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evidence-documents'
  AND private.can_write_owner(private.safe_uuid((storage.foldername(name))[1]))
);
CREATE POLICY workspace_evidence_storage_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'evidence-documents'
  AND private.can_write_owner(private.safe_uuid((storage.foldername(name))[1]))
)
WITH CHECK (
  bucket_id = 'evidence-documents'
  AND private.can_write_owner(private.safe_uuid((storage.foldername(name))[1]))
);
CREATE POLICY workspace_evidence_storage_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'evidence-documents'
  AND private.can_write_owner(private.safe_uuid((storage.foldername(name))[1]))
);

DROP FUNCTION IF EXISTS private.specialist_owns_client(uuid);
DROP FUNCTION IF EXISTS private.specialist_owns_dispute(uuid);
DROP FUNCTION IF EXISTS private.specialist_owns_timeline_event(uuid);
DROP FUNCTION IF EXISTS private.specialist_owns_client_update(uuid);
DROP FUNCTION IF EXISTS private.specialist_owns_client_document(uuid);
DROP FUNCTION IF EXISTS private.specialist_owns_conversation(uuid);

REVOKE ALL ON TABLE public.workspace_memberships FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.workspace_client_memberships FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.workspace_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_memberships TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_client_memberships TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_invitations TO service_role;

REVOKE ALL ON FUNCTION private.can_read_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_write_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_admin_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.workspace_id_for_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_read_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_write_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.portal_owns_workspace_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_read_workspace_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_write_workspace_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.safe_uuid(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.can_read_workspace(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_write_workspace(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_admin_workspace(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.workspace_id_for_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_read_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_write_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.portal_owns_workspace_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_read_workspace_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_write_workspace_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.safe_uuid(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.bind_client_dispute_tenant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_client_portal_item_tenant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_timeline_event_tenant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_chat_conversation_tenant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_chat_message_tenant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.protect_tenant_keys() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.protect_portal_update_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_selected_workspace_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_staff_client_workspace() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_dispute_letter_workspace() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.ensure_workspace_client_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bind_affiliate_click_tenant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.ensure_workspace_owner_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.prevent_workspace_owner_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.select_workspace(requested_workspace_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.workspace_memberships AS membership
    JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
    WHERE membership.workspace_id = requested_workspace_id
      AND membership.user_id = actor_id
      AND membership.status = 'active'
      AND workspace.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'workspace is not available to the current user';
  END IF;

  UPDATE public.workspace_memberships
  SET is_selected = false, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = actor_id AND is_selected IS TRUE;

  UPDATE public.workspace_memberships
  SET is_selected = true, updated_at = CURRENT_TIMESTAMP
  WHERE workspace_id = requested_workspace_id
    AND user_id = actor_id
    AND status = 'active';

  RETURN requested_workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.select_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_workspace(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_workspace_context()
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  workspace_owner_id uuid,
  member_role public.workspace_member_role,
  onboarding_completed boolean,
  subscription_status text,
  subscription_plan text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace.id,
         workspace.name,
         workspace.owner_id,
         membership.role,
         COALESCE(owner_profile.onboarding_completed, false),
         COALESCE(owner_profile.subscription_status, ''),
         COALESCE(owner_profile.subscription_plan, '')
  FROM public.workspace_memberships AS membership
  JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
  JOIN public.user_profiles AS owner_profile ON owner_profile.id = workspace.owner_id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active'
    AND membership.is_selected IS TRUE
    AND workspace.is_active IS TRUE
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_workspace_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_context() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.available_workspace_contexts()
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  member_role public.workspace_member_role,
  is_selected boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace.id, workspace.name, membership.role, membership.is_selected
  FROM public.workspace_memberships AS membership
  JOIN public.workspaces AS workspace ON workspace.id = membership.workspace_id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active'
    AND workspace.is_active IS TRUE
  ORDER BY membership.created_at, workspace.id
$$;

REVOKE ALL ON FUNCTION public.available_workspace_contexts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.available_workspace_contexts() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.available_portal_relationships()
RETURNS TABLE (
  workspace_client_id uuid,
  workspace_id uuid,
  staff_client_id uuid,
  client_account_id uuid,
  workspace_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT relationship.id,
         relationship.workspace_id,
         relationship.staff_client_id,
         relationship.client_account_id,
         workspace.name
  FROM public.workspace_client_memberships AS relationship
  JOIN public.client_accounts AS account ON account.id = relationship.client_account_id
  JOIN public.workspaces AS workspace ON workspace.id = relationship.workspace_id
  WHERE account.auth_user_id = (SELECT auth.uid())
    AND account.is_active IS TRUE
    AND relationship.status = 'active'
    AND workspace.is_active IS TRUE
  ORDER BY relationship.created_at, relationship.id
$$;

REVOKE ALL ON FUNCTION public.available_portal_relationships() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.available_portal_relationships() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_token text)
RETURNS public.workspace_invitation_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  actor_email text;
  invitation public.workspace_invitations%ROWTYPE;
  portal_account_id uuid;
  portal_account_actor uuid;
  relationship_id uuid;
BEGIN
  IF actor_id IS NULL OR invitation_token IS NULL OR length(invitation_token) < 32 THEN
    RAISE EXCEPTION 'a signed-in user and valid invitation token are required';
  END IF;

  SELECT lower(btrim(email)) INTO actor_email
  FROM auth.users
  WHERE id = actor_id;

  SELECT * INTO invitation
  FROM public.workspace_invitations
  WHERE token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > CURRENT_TIMESTAMP
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation is invalid, expired, accepted, or revoked';
  END IF;
  IF actor_email IS NULL OR actor_email <> lower(btrim(invitation.intended_email)) THEN
    RAISE EXCEPTION 'invitation does not belong to the signed-in identity';
  END IF;

  IF invitation.invitation_type = 'staff' THEN
    INSERT INTO public.workspace_memberships (
      workspace_id, user_id, role, status, is_selected, invited_by
    ) VALUES (
      invitation.workspace_id, actor_id, invitation.role, 'active', false, invitation.created_by
    )
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = CASE
          WHEN workspace_memberships.role = 'owner' THEN workspace_memberships.role
          ELSE EXCLUDED.role
        END,
        status = 'active',
        invited_by = EXCLUDED.invited_by,
        updated_at = CURRENT_TIMESTAMP;

    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_memberships
      WHERE user_id = actor_id AND is_selected IS TRUE AND status = 'active'
    ) THEN
      UPDATE public.workspace_memberships
      SET is_selected = true, updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = invitation.workspace_id AND user_id = actor_id;
    END IF;
  ELSE
    SELECT account.id INTO portal_account_id
    FROM public.client_accounts AS account
    WHERE account.auth_user_id = actor_id
    FOR UPDATE;

    IF portal_account_id IS NULL THEN
      SELECT account.id, account.auth_user_id
        INTO portal_account_id, portal_account_actor
      FROM public.client_accounts AS account
      WHERE lower(btrim(account.email)) = actor_email
      FOR UPDATE;

      IF portal_account_id IS NOT NULL AND portal_account_actor IS NOT NULL
         AND portal_account_actor IS DISTINCT FROM actor_id THEN
        RAISE EXCEPTION 'portal account is already bound to another Auth identity';
      ELSIF portal_account_id IS NOT NULL THEN
        UPDATE public.client_accounts
        SET auth_user_id = actor_id, updated_at = CURRENT_TIMESTAMP
        WHERE id = portal_account_id;
      ELSE
        INSERT INTO public.client_accounts (auth_user_id, email, full_name, is_active)
        SELECT actor_id,
               auth_user.email,
               COALESCE(auth_user.raw_user_meta_data->>'full_name', ''),
               true
        FROM auth.users AS auth_user
        WHERE auth_user.id = actor_id
        RETURNING id INTO portal_account_id;
      END IF;
    END IF;

    UPDATE public.workspace_client_memberships
    SET client_account_id = portal_account_id,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = invitation.workspace_id
      AND staff_client_id = invitation.staff_client_id
      AND (client_account_id IS NULL OR client_account_id = portal_account_id)
    RETURNING id INTO relationship_id;

    IF relationship_id IS NULL THEN
      RAISE EXCEPTION 'client relationship is already bound to another portal identity';
    END IF;
  END IF;

  UPDATE public.workspace_invitations
  SET accepted_at = CURRENT_TIMESTAMP, accepted_by = actor_id
  WHERE id = invitation.id;

  RETURN invitation.invitation_type;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_workspace_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated;

-- Auth identities marked as portal consumers receive a profile but no business
-- workspace. Business users continue to receive an owner workspace, whose
-- insert trigger creates the authoritative owner membership.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  workspace_name text;
  base_slug text;
  workspace_slug text;
  attribution jsonb := COALESCE(NEW.raw_user_meta_data->'attribution', '{}'::jsonb);
  first_touch timestamptz;
  is_portal_consumer boolean :=
    lower(COALESCE(NEW.raw_user_meta_data->>'is_client', 'false')) IN ('true', '1', 'yes')
    OR lower(COALESCE(NEW.raw_user_meta_data->>'account_type', '')) = 'consumer';
BEGIN
  IF COALESCE(attribution->>'first_touch_at', '') ~ '^\d{4}-\d{2}-\d{2}T' THEN
    BEGIN
      first_touch := (attribution->>'first_touch_at')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      first_touch := NULL;
    END;
  END IF;

  INSERT INTO public.user_profiles (
    id, email, full_name, company_name, plan, avatar_url, account_type,
    referral_code, referral_source, utm_source, utm_medium, utm_campaign,
    utm_content, utm_term, landing_page, first_touch_at,
    last_referral_code, last_utm_source, last_utm_medium,
    last_utm_campaign, last_landing_page, anonymous_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'plan', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE WHEN is_portal_consumer THEN 'consumer' ELSE 'business' END,
    COALESCE(attribution->>'referral_code', ''),
    COALESCE(attribution->>'referral_source', ''),
    COALESCE(attribution->>'utm_source', ''),
    COALESCE(attribution->>'utm_medium', ''),
    COALESCE(attribution->>'utm_campaign', ''),
    COALESCE(attribution->>'utm_content', ''),
    COALESCE(attribution->>'utm_term', ''),
    COALESCE(attribution->>'landing_page', ''),
    first_touch,
    COALESCE(attribution->>'referral_code', ''),
    COALESCE(attribution->>'last_utm_source', ''),
    COALESCE(attribution->>'last_utm_medium', ''),
    COALESCE(attribution->>'last_utm_campaign', ''),
    COALESCE(attribution->>'last_landing_page', ''),
    COALESCE(attribution->>'anonymous_id', '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT is_portal_consumer THEN
    workspace_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '');
    IF workspace_name IS NULL THEN
      workspace_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
    END IF;
    IF workspace_name IS NULL THEN
      workspace_name := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
    END IF;
    IF workspace_name IS NULL THEN workspace_name := 'Workspace'; END IF;

    base_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := btrim(base_slug, '-');
    IF base_slug IS NULL OR base_slug = '' THEN base_slug := 'workspace'; END IF;
    workspace_slug := left(base_slug, 48) || '-' || left(NEW.id::text, 8);

    INSERT INTO public.workspaces (owner_id, name, slug, is_active)
    VALUES (NEW.id, workspace_name, workspace_slug, true)
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;

  INSERT INTO public.product_analytics_events (
    user_id, event_name, properties, dedupe_key, occurred_at
  ) VALUES (
    NEW.id,
    'signup_completed',
    jsonb_strip_nulls(jsonb_build_object(
      'plan', NULLIF(COALESCE(NEW.raw_user_meta_data->>'plan', ''), ''),
      'source', NULLIF(COALESCE(attribution->>'utm_source', ''), ''),
      'campaign', NULLIF(COALESCE(attribution->>'utm_campaign', ''), ''),
      'landing_page', NULLIF(COALESCE(attribution->>'landing_page', ''), ''),
      'account_type', CASE WHEN is_portal_consumer THEN 'consumer' ELSE 'business' END
    )),
    'signup:' || NEW.id::text,
    COALESCE(first_touch, NEW.created_at, CURRENT_TIMESTAMP)
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role;
