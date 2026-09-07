-- FMM-007: replace email- and owner-identity tenancy with explicit workspace
-- membership and workspace/client relationships.
--
-- This migration is deliberately additive. It does not delete, merge, or
-- reassign a customer, Auth identity, document, payment, subscription, or
-- session. It aborts if an existing row cannot be bound unambiguously.

DO $$
BEGIN
  CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'admin', 'specialist', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.workspace_membership_status AS ENUM ('invited', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.workspace_client_status AS ENUM ('pending', 'active', 'suspended', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.workspace_invitation_type AS ENUM ('staff', 'client_portal');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

-- Composite foreign keys below make the tenant columns inseparable.
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_id_owner_id_key UNIQUE (id, owner_id);

CREATE TABLE public.workspace_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_member_role NOT NULL,
  status public.workspace_membership_status NOT NULL DEFAULT 'invited',
  is_selected boolean NOT NULL DEFAULT false,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workspace_memberships_workspace_user_key UNIQUE (workspace_id, user_id),
  CONSTRAINT workspace_memberships_id_workspace_key UNIQUE (id, workspace_id)
);

CREATE INDEX workspace_memberships_user_status_idx
  ON public.workspace_memberships (user_id, status, workspace_id);
CREATE INDEX workspace_memberships_workspace_role_idx
  ON public.workspace_memberships (workspace_id, role, status);
CREATE INDEX workspace_memberships_invited_by_idx
  ON public.workspace_memberships (invited_by) WHERE invited_by IS NOT NULL;
CREATE UNIQUE INDEX workspace_memberships_one_selected_per_user
  ON public.workspace_memberships (user_id)
  WHERE is_selected IS TRUE;

INSERT INTO public.workspace_memberships (
  workspace_id, user_id, role, status, is_selected, invited_by
)
SELECT workspace.id, workspace.owner_id, 'owner', 'active', true, workspace.owner_id
FROM public.workspaces AS workspace
ON CONFLICT (workspace_id, user_id) DO UPDATE
SET role = 'owner', status = 'active', is_selected = true, updated_at = CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION private.ensure_workspace_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION private.prevent_workspace_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'workspace ownership transfer requires the audited transfer workflow';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_workspace_owner_membership ON public.workspaces;
CREATE TRIGGER ensure_workspace_owner_membership
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION private.ensure_workspace_owner_membership();

DROP TRIGGER IF EXISTS prevent_workspace_owner_change ON public.workspaces;
CREATE TRIGGER prevent_workspace_owner_change
BEFORE UPDATE OF owner_id ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION private.prevent_workspace_owner_change();

-- Existing dossiers must already resolve to exactly one owner workspace. The
-- update only fills a missing key; it never changes a non-null association.
UPDATE public.staff_clients AS client
SET workspace_id = workspace.id
FROM public.workspaces AS workspace
WHERE client.workspace_id IS NULL
  AND workspace.owner_id = client.owner_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.staff_clients AS client
    LEFT JOIN public.workspaces AS workspace
      ON workspace.id = client.workspace_id
     AND workspace.owner_id = client.owner_id
    WHERE client.workspace_id IS NULL OR workspace.id IS NULL
  ) THEN
    RAISE EXCEPTION 'FMM-007 stopped: staff_clients contains an unbound or mismatched workspace';
  END IF;
END;
$$;

ALTER TABLE public.staff_clients
  DROP CONSTRAINT IF EXISTS staff_clients_workspace_id_fkey;
ALTER TABLE public.staff_clients
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT staff_clients_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  ADD CONSTRAINT staff_clients_workspace_owner_fkey
    FOREIGN KEY (workspace_id, owner_id)
    REFERENCES public.workspaces(id, owner_id) ON DELETE RESTRICT,
  ADD CONSTRAINT staff_clients_id_workspace_key UNIQUE (id, workspace_id),
  ADD CONSTRAINT staff_clients_id_owner_key UNIQUE (id, owner_id);

-- A portal identity is a human identity. The agency/client relation lives in
-- workspace_client_memberships and can therefore exist in multiple agencies.
ALTER TABLE public.client_accounts
  ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX client_accounts_auth_user_id_key
  ON public.client_accounts (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

WITH unambiguous_auth AS (
  SELECT account.id AS client_account_id, min(auth_user.id::text)::uuid AS auth_user_id
  FROM public.client_accounts AS account
  JOIN auth.users AS auth_user
    ON lower(btrim(auth_user.email)) = lower(btrim(account.email))
  GROUP BY account.id
  HAVING count(*) = 1
)
UPDATE public.client_accounts AS account
SET auth_user_id = candidate.auth_user_id
FROM unambiguous_auth AS candidate
WHERE account.id = candidate.client_account_id
  AND account.auth_user_id IS NULL;

CREATE TABLE public.workspace_client_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  staff_client_id uuid NOT NULL,
  client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  status public.workspace_client_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workspace_client_memberships_staff_client_key UNIQUE (staff_client_id),
  CONSTRAINT workspace_client_memberships_workspace_account_key
    UNIQUE (workspace_id, client_account_id),
  CONSTRAINT workspace_client_memberships_id_workspace_key UNIQUE (id, workspace_id),
  CONSTRAINT workspace_client_memberships_id_workspace_staff_key
    UNIQUE (id, workspace_id, staff_client_id),
  CONSTRAINT workspace_client_memberships_id_account_key
    UNIQUE (id, client_account_id),
  CONSTRAINT workspace_client_memberships_staff_workspace_fkey
    FOREIGN KEY (staff_client_id, workspace_id)
    REFERENCES public.staff_clients(id, workspace_id) ON DELETE RESTRICT
);

CREATE INDEX workspace_client_memberships_account_status_idx
  ON public.workspace_client_memberships (client_account_id, status, workspace_id);
CREATE INDEX workspace_client_memberships_workspace_status_idx
  ON public.workspace_client_memberships (workspace_id, status, staff_client_id);
CREATE INDEX workspace_client_memberships_staff_workspace_idx
  ON public.workspace_client_memberships (staff_client_id, workspace_id);
CREATE INDEX workspace_client_memberships_created_by_idx
  ON public.workspace_client_memberships (created_by) WHERE created_by IS NOT NULL;

INSERT INTO public.workspace_client_memberships (
  workspace_id, staff_client_id, status, created_by
)
SELECT client.workspace_id, client.id, 'active', client.owner_id
FROM public.staff_clients AS client
ON CONFLICT (staff_client_id) DO NOTHING;

ALTER TABLE public.affiliate_link_clicks
  ADD COLUMN workspace_client_id uuid;

UPDATE public.affiliate_link_clicks AS click
SET workspace_client_id = relationship.id,
    agency_id = relationship.workspace_id
FROM public.workspace_client_memberships AS relationship
WHERE relationship.staff_client_id = click.client_id
  AND click.client_id IS NOT NULL
  AND click.workspace_client_id IS NULL;

-- An email may seed a relationship only when it names one dossier globally.
-- Shared emails are intentionally left unlinked for an explicit invitation.
WITH unambiguous_relationship AS (
  SELECT account.id AS client_account_id,
         min(relationship.id::text)::uuid AS workspace_client_id
  FROM public.client_accounts AS account
  JOIN public.staff_clients AS client
    ON lower(btrim(client.email)) = lower(btrim(account.email))
  JOIN public.workspace_client_memberships AS relationship
    ON relationship.staff_client_id = client.id
  GROUP BY account.id
  HAVING count(*) = 1
)
UPDATE public.workspace_client_memberships AS relationship
SET client_account_id = candidate.client_account_id,
    updated_at = CURRENT_TIMESTAMP
FROM unambiguous_relationship AS candidate
WHERE relationship.id = candidate.workspace_client_id
  AND relationship.client_account_id IS NULL;

-- Invitations are delivery artifacts, not authorization identities. Only the
-- SHA-256 token digest is stored, and acceptance binds the authenticated Auth
-- UUID to a membership or exact workspace/client relationship.
CREATE TABLE public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  invitation_type public.workspace_invitation_type NOT NULL,
  intended_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  role public.workspace_member_role,
  staff_client_id uuid,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workspace_invitations_shape_check CHECK (
    (invitation_type = 'staff' AND role IS NOT NULL AND role <> 'owner' AND staff_client_id IS NULL)
    OR
    (invitation_type = 'client_portal' AND role IS NULL AND staff_client_id IS NOT NULL)
  ),
  CONSTRAINT workspace_invitations_staff_workspace_fkey
    FOREIGN KEY (staff_client_id, workspace_id)
    REFERENCES public.staff_clients(id, workspace_id) ON DELETE RESTRICT
);

CREATE INDEX workspace_invitations_workspace_pending_idx
  ON public.workspace_invitations (workspace_id, invitation_type, expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX workspace_invitations_recipient_pending_idx
  ON public.workspace_invitations (lower(btrim(intended_email)), expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX workspace_invitations_staff_workspace_idx
  ON public.workspace_invitations (staff_client_id, workspace_id)
  WHERE staff_client_id IS NOT NULL;
CREATE INDEX workspace_invitations_created_by_idx
  ON public.workspace_invitations (created_by);
CREATE INDEX workspace_invitations_accepted_by_idx
  ON public.workspace_invitations (accepted_by) WHERE accepted_by IS NOT NULL;

-- Portal records now bind to the exact agency relationship. Legacy identity
-- columns remain nullable for compatibility but are no longer authorization
-- keys.
ALTER TABLE public.client_disputes
  ADD COLUMN workspace_client_id uuid,
  ADD COLUMN staff_client_id uuid;
ALTER TABLE public.client_updates
  ADD COLUMN workspace_client_id uuid,
  ADD COLUMN workspace_id uuid,
  ADD COLUMN staff_client_id uuid;
ALTER TABLE public.client_documents
  ADD COLUMN workspace_client_id uuid,
  ADD COLUMN workspace_id uuid,
  ADD COLUMN staff_client_id uuid;
ALTER TABLE public.dispute_timeline_events
  ADD COLUMN workspace_client_id uuid,
  ADD COLUMN workspace_id uuid;
ALTER TABLE public.chat_conversations
  ADD COLUMN workspace_client_id uuid,
  ADD COLUMN workspace_id uuid,
  ADD COLUMN staff_client_id uuid;
ALTER TABLE public.chat_messages
  ADD COLUMN workspace_client_id uuid,
  ADD COLUMN workspace_id uuid,
  ADD COLUMN sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

WITH candidates AS (
  SELECT dispute.id AS row_id,
         min(relationship.id::text)::uuid AS workspace_client_id,
         min(relationship.workspace_id::text)::uuid AS workspace_id,
         min(relationship.staff_client_id::text)::uuid AS staff_client_id
  FROM public.client_disputes AS dispute
  JOIN public.workspace_client_memberships AS relationship
    ON relationship.client_account_id = dispute.client_id
   AND (dispute.workspace_id IS NULL OR dispute.workspace_id = relationship.workspace_id)
  JOIN public.staff_clients AS client
    ON client.id = relationship.staff_client_id
   AND (dispute.owner_id IS NULL OR dispute.owner_id = client.owner_id)
  GROUP BY dispute.id
  HAVING count(*) = 1
)
UPDATE public.client_disputes AS dispute
SET workspace_client_id = candidate.workspace_client_id,
    workspace_id = candidate.workspace_id,
    staff_client_id = candidate.staff_client_id,
    owner_id = client.owner_id
FROM candidates AS candidate
JOIN public.staff_clients AS client ON client.id = candidate.staff_client_id
WHERE dispute.id = candidate.row_id;

WITH candidates AS (
  SELECT item.id AS row_id,
         min(relationship.id::text)::uuid AS workspace_client_id,
         min(relationship.workspace_id::text)::uuid AS workspace_id,
         min(relationship.staff_client_id::text)::uuid AS staff_client_id
  FROM public.client_updates AS item
  JOIN public.workspace_client_memberships AS relationship
    ON relationship.client_account_id = item.client_id
  GROUP BY item.id
  HAVING count(*) = 1
)
UPDATE public.client_updates AS item
SET workspace_client_id = candidate.workspace_client_id,
    workspace_id = candidate.workspace_id,
    staff_client_id = candidate.staff_client_id
FROM candidates AS candidate
WHERE item.id = candidate.row_id;

WITH candidates AS (
  SELECT item.id AS row_id,
         min(relationship.id::text)::uuid AS workspace_client_id,
         min(relationship.workspace_id::text)::uuid AS workspace_id,
         min(relationship.staff_client_id::text)::uuid AS staff_client_id
  FROM public.client_documents AS item
  JOIN public.workspace_client_memberships AS relationship
    ON relationship.client_account_id = item.client_id
  GROUP BY item.id
  HAVING count(*) = 1
)
UPDATE public.client_documents AS item
SET workspace_client_id = candidate.workspace_client_id,
    workspace_id = candidate.workspace_id,
    staff_client_id = candidate.staff_client_id
FROM candidates AS candidate
WHERE item.id = candidate.row_id;

WITH candidates AS (
  SELECT item.id AS row_id,
         min(relationship.id::text)::uuid AS workspace_client_id,
         min(relationship.workspace_id::text)::uuid AS workspace_id,
         min(relationship.staff_client_id::text)::uuid AS staff_client_id
  FROM public.chat_conversations AS item
  JOIN public.workspace_client_memberships AS relationship
    ON relationship.client_account_id = item.client_account_id
  GROUP BY item.id
  HAVING count(*) = 1
)
UPDATE public.chat_conversations AS item
SET workspace_client_id = candidate.workspace_client_id,
    workspace_id = candidate.workspace_id,
    staff_client_id = candidate.staff_client_id
FROM candidates AS candidate
WHERE item.id = candidate.row_id;

UPDATE public.dispute_timeline_events AS event
SET workspace_client_id = dispute.workspace_client_id,
    workspace_id = dispute.workspace_id
FROM public.client_disputes AS dispute
WHERE dispute.id = event.dispute_id;

UPDATE public.chat_messages AS message
SET workspace_client_id = conversation.workspace_client_id,
    workspace_id = conversation.workspace_id,
    sender_user_id = CASE
      WHEN message.sender_type = 'client' THEN account.auth_user_id
      WHEN message.sender_type = 'specialist'
        AND message.sender_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN message.sender_id::uuid
      ELSE NULL
    END
FROM public.chat_conversations AS conversation
JOIN public.workspace_client_memberships AS relationship
  ON relationship.id = conversation.workspace_client_id
LEFT JOIN public.client_accounts AS account
  ON account.id = relationship.client_account_id
WHERE conversation.id = message.conversation_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.client_disputes
    WHERE workspace_client_id IS NULL OR workspace_id IS NULL OR staff_client_id IS NULL OR owner_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.client_updates
    WHERE workspace_client_id IS NULL OR workspace_id IS NULL OR staff_client_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.client_documents
    WHERE workspace_client_id IS NULL OR workspace_id IS NULL OR staff_client_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.dispute_timeline_events
    WHERE workspace_client_id IS NULL OR workspace_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE workspace_client_id IS NULL OR workspace_id IS NULL OR staff_client_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE workspace_client_id IS NULL OR workspace_id IS NULL OR sender_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'FMM-007 stopped: an existing portal row has no single tenant relationship';
  END IF;
END;
$$;
