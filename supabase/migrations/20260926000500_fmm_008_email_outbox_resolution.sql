-- FMM-008 follow-up: audited operational resolution for billing email dead letters.
-- Dead letters must be explicitly replayed or closed; neither action may be
-- performed by a browser role or represented as a successful delivery.

ALTER TABLE public.billing_email_outbox
  DROP CONSTRAINT IF EXISTS billing_email_outbox_status_check;

ALTER TABLE public.billing_email_outbox
  ADD CONSTRAINT billing_email_outbox_status_check
    CHECK (status IN ('pending', 'processing', 'retry', 'sent', 'dead_letter', 'cancelled')),
  ADD COLUMN IF NOT EXISTS replayed_at timestamptz,
  ADD COLUMN IF NOT EXISTS replayed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replay_reason text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS close_reason text;

ALTER TABLE public.billing_email_outbox
  DROP CONSTRAINT IF EXISTS billing_email_outbox_replay_reason_limit,
  DROP CONSTRAINT IF EXISTS billing_email_outbox_close_shape;

ALTER TABLE public.billing_email_outbox
  ADD CONSTRAINT billing_email_outbox_replay_reason_limit
    CHECK (replay_reason IS NULL OR char_length(trim(replay_reason)) BETWEEN 8 AND 500),
  ADD CONSTRAINT billing_email_outbox_close_shape
    CHECK (
      (
        status = 'cancelled'
        AND closed_at IS NOT NULL
        AND closed_by IS NOT NULL
        AND char_length(trim(close_reason)) BETWEEN 8 AND 500
      )
      OR
      (
        status <> 'cancelled'
        AND closed_at IS NULL
        AND closed_by IS NULL
        AND close_reason IS NULL
      )
    );

CREATE OR REPLACE FUNCTION public.admin_replay_billing_email_atomic(
  p_outbox_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  outbox_row public.billing_email_outbox%ROWTYPE;
  customer_id uuid;
  audit_metadata jsonb;
  existing_audit public.admin_action_audit_logs%ROWTYPE;
BEGIN
  IF p_outbox_id IS NULL OR p_admin_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Outbox, administrator, and request IDs are required.';
  END IF;
  IF char_length(trim(coalesce(p_reason, ''))) NOT BETWEEN 8 AND 500 THEN
    RAISE EXCEPTION 'Replay reason must contain between 8 and 500 characters.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.platform_admins AS administrator
    WHERE administrator.user_id = p_admin_id
      AND administrator.active = true
      AND administrator.role IN ('platform_admin', 'platform_superadmin')
  ) THEN
    RAISE EXCEPTION 'An active platform administrator is required.';
  END IF;

  audit_metadata := jsonb_build_object(
    'outbox_id', p_outbox_id,
    'reason', trim(p_reason)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));
  SELECT * INTO existing_audit
  FROM public.admin_action_audit_logs
  WHERE request_id = p_request_id;
  IF FOUND THEN
    IF existing_audit.admin_id IS NOT DISTINCT FROM p_admin_id
      AND existing_audit.action = 'billing_email_dead_letter_replayed'
      AND existing_audit.metadata = audit_metadata
    THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Billing email resolution request ID was already used for another intent.';
  END IF;

  SELECT * INTO STRICT outbox_row
  FROM public.billing_email_outbox
  WHERE id = p_outbox_id
    AND status = 'dead_letter'
  FOR UPDATE;

  SELECT profile.id INTO STRICT customer_id
  FROM auth.users AS identity
  JOIN public.user_profiles AS profile ON profile.id = identity.id
  WHERE lower(identity.email) = lower(outbox_row.recipient);

  UPDATE public.billing_email_outbox
  SET status = 'pending',
      attempt_count = 0,
      next_attempt_at = CURRENT_TIMESTAMP,
      locked_at = NULL,
      last_error = NULL,
      dead_lettered_at = NULL,
      replayed_at = CURRENT_TIMESTAMP,
      replayed_by = p_admin_id,
      replay_reason = trim(p_reason),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_outbox_id;

  INSERT INTO public.admin_action_audit_logs (
    request_id, admin_id, customer_id, action, metadata
  ) VALUES (
    p_request_id, p_admin_id, customer_id,
    'billing_email_dead_letter_replayed', audit_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_billing_email_atomic(
  p_outbox_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  outbox_row public.billing_email_outbox%ROWTYPE;
  customer_id uuid;
  audit_metadata jsonb;
  existing_audit public.admin_action_audit_logs%ROWTYPE;
BEGIN
  IF p_outbox_id IS NULL OR p_admin_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Outbox, administrator, and request IDs are required.';
  END IF;
  IF char_length(trim(coalesce(p_reason, ''))) NOT BETWEEN 8 AND 500 THEN
    RAISE EXCEPTION 'Close reason must contain between 8 and 500 characters.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.platform_admins AS administrator
    WHERE administrator.user_id = p_admin_id
      AND administrator.active = true
      AND administrator.role IN ('platform_admin', 'platform_superadmin')
  ) THEN
    RAISE EXCEPTION 'An active platform administrator is required.';
  END IF;

  audit_metadata := jsonb_build_object(
    'outbox_id', p_outbox_id,
    'reason', trim(p_reason)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));
  SELECT * INTO existing_audit
  FROM public.admin_action_audit_logs
  WHERE request_id = p_request_id;
  IF FOUND THEN
    IF existing_audit.admin_id IS NOT DISTINCT FROM p_admin_id
      AND existing_audit.action = 'billing_email_dead_letter_closed'
      AND existing_audit.metadata = audit_metadata
    THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Billing email resolution request ID was already used for another intent.';
  END IF;

  SELECT * INTO STRICT outbox_row
  FROM public.billing_email_outbox
  WHERE id = p_outbox_id
    AND status = 'dead_letter'
  FOR UPDATE;

  SELECT profile.id INTO STRICT customer_id
  FROM auth.users AS identity
  JOIN public.user_profiles AS profile ON profile.id = identity.id
  WHERE lower(identity.email) = lower(outbox_row.recipient);

  UPDATE public.billing_email_outbox
  SET status = 'cancelled',
      locked_at = NULL,
      closed_at = CURRENT_TIMESTAMP,
      closed_by = p_admin_id,
      close_reason = trim(p_reason),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_outbox_id;

  UPDATE public.webhook_failures
  SET resolved = true,
      resolved_at = CURRENT_TIMESTAMP
  WHERE stripe_event_id = 'email:' || outbox_row.dedupe_key
    AND resolved IS FALSE;

  INSERT INTO public.admin_action_audit_logs (
    request_id, admin_id, customer_id, action, metadata
  ) VALUES (
    p_request_id, p_admin_id, customer_id,
    'billing_email_dead_letter_closed', audit_metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_replay_billing_email_atomic(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_close_billing_email_atomic(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replay_billing_email_atomic(uuid, uuid, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_close_billing_email_atomic(uuid, uuid, text, uuid)
  TO service_role;

COMMENT ON FUNCTION public.admin_replay_billing_email_atomic(uuid, uuid, text, uuid) IS
  'Service-role-only, idempotent and audited replay of one dead-lettered billing email.';
COMMENT ON FUNCTION public.admin_close_billing_email_atomic(uuid, uuid, text, uuid) IS
  'Service-role-only, idempotent and audited closure of one obsolete or unsafe billing email.';
COMMENT ON COLUMN public.billing_email_outbox.close_reason IS
  'Administrator-supplied reason that a dead-lettered email was intentionally not delivered.';
