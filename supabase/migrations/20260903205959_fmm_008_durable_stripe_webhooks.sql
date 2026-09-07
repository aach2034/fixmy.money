-- FMM-008: durable, replay-safe Stripe webhook processing and email delivery.
-- The public schema is used only so the server-side service-role client can
-- reach these tables through PostgREST. Browser roles receive no privileges.

CREATE TABLE public.stripe_webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  object_key text NOT NULL,
  stripe_customer_id text,
  stripe_created_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'retry', 'succeeded', 'dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 20),
  next_attempt_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at timestamptz,
  last_error text,
  processed_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT stripe_webhook_events_payload_limit
    CHECK (octet_length(payload::text) <= 262144)
);

CREATE INDEX stripe_webhook_events_due_idx
  ON public.stripe_webhook_events (next_attempt_at, stripe_created_at, created_at)
  WHERE status IN ('pending', 'retry');
CREATE INDEX stripe_webhook_events_failed_idx
  ON public.stripe_webhook_events (updated_at DESC)
  WHERE status IN ('retry', 'dead_letter');
CREATE INDEX stripe_webhook_events_customer_order_idx
  ON public.stripe_webhook_events (stripe_customer_id, stripe_created_at, created_at)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE public.stripe_webhook_customer_locks (
  stripe_customer_id text PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE
    REFERENCES public.stripe_webhook_events(stripe_event_id) ON DELETE CASCADE,
  locked_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.billing_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_stripe_event_id text NOT NULL
    REFERENCES public.stripe_webhook_events(stripe_event_id) ON DELETE RESTRICT,
  dedupe_key text NOT NULL UNIQUE,
  email_type text NOT NULL,
  recipient text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'retry', 'sent', 'dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 20),
  next_attempt_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT billing_email_outbox_recipient_limit CHECK (char_length(recipient) BETWEEN 3 AND 320),
  CONSTRAINT billing_email_outbox_payload_limit CHECK (octet_length(payload::text) <= 16384)
);

CREATE INDEX billing_email_outbox_due_idx
  ON public.billing_email_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'retry');
CREATE INDEX billing_email_outbox_failed_idx
  ON public.billing_email_outbox (updated_at DESC)
  WHERE status IN ('retry', 'dead_letter');

ALTER TABLE public.webhook_failures
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;
CREATE INDEX IF NOT EXISTS webhook_failures_unresolved_idx
  ON public.webhook_failures (created_at DESC)
  WHERE resolved IS FALSE;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_customer_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_email_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.webhook_failures FROM anon, authenticated;
GRANT SELECT ON TABLE public.webhook_failures TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.webhook_failures TO service_role;

REVOKE ALL ON TABLE
  public.stripe_webhook_events,
  public.stripe_webhook_customer_locks,
  public.billing_email_outbox
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.stripe_webhook_events,
  public.stripe_webhook_customer_locks,
  public.billing_email_outbox
TO service_role;

DROP POLICY IF EXISTS webhook_failures_select_platform_admins ON public.webhook_failures;
CREATE POLICY webhook_failures_select_platform_admins
ON public.webhook_failures FOR SELECT TO authenticated
USING (
  (SELECT private.is_active_platform_admin())
);

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  requested_event_id text DEFAULT NULL,
  lease_seconds integer DEFAULT 120
)
RETURNS SETOF public.stripe_webhook_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate public.stripe_webhook_events%ROWTYPE;
  lock_rows integer;
BEGIN
  IF lease_seconds < 30 OR lease_seconds > 600 THEN
    RAISE EXCEPTION 'invalid webhook lease';
  END IF;

  SELECT event.* INTO candidate
  FROM public.stripe_webhook_events AS event
  WHERE (requested_event_id IS NULL OR event.stripe_event_id = requested_event_id)
    AND event.attempt_count < event.max_attempts
    AND (
      (event.status IN ('pending', 'retry') AND event.next_attempt_at <= CURRENT_TIMESTAMP)
      OR (event.status = 'processing' AND event.locked_at < CURRENT_TIMESTAMP - make_interval(secs => lease_seconds))
    )
  ORDER BY event.stripe_created_at, event.created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF candidate.stripe_customer_id IS NOT NULL THEN
    INSERT INTO public.stripe_webhook_customer_locks (
      stripe_customer_id, stripe_event_id, locked_until
    ) VALUES (
      candidate.stripe_customer_id,
      candidate.stripe_event_id,
      CURRENT_TIMESTAMP + make_interval(secs => lease_seconds)
    )
    ON CONFLICT (stripe_customer_id) DO UPDATE
    SET stripe_event_id = EXCLUDED.stripe_event_id,
        locked_until = EXCLUDED.locked_until,
        created_at = CURRENT_TIMESTAMP
    WHERE public.stripe_webhook_customer_locks.locked_until <= CURRENT_TIMESTAMP
       OR public.stripe_webhook_customer_locks.stripe_event_id = EXCLUDED.stripe_event_id;
    GET DIAGNOSTICS lock_rows = ROW_COUNT;
    IF lock_rows = 0 THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  UPDATE public.stripe_webhook_events AS event
  SET status = 'processing',
      attempt_count = event.attempt_count + 1,
      locked_at = CURRENT_TIMESTAMP,
      last_error = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE event.stripe_event_id = candidate.stripe_event_id
  RETURNING event.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_stripe_webhook_event(completed_event_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.stripe_webhook_events
  SET status = 'succeeded',
      processed_at = CURRENT_TIMESTAMP,
      locked_at = NULL,
      last_error = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE stripe_event_id = completed_event_id
    AND status = 'processing';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'webhook event is not claimed';
  END IF;

  DELETE FROM public.stripe_webhook_customer_locks
  WHERE stripe_event_id = completed_event_id;

  UPDATE public.webhook_failures
  SET resolved = true,
      resolved_at = CURRENT_TIMESTAMP
  WHERE stripe_event_id = completed_event_id
    AND resolved IS FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_stripe_webhook_event(
  failed_event_id text,
  failure_message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  failed_event public.stripe_webhook_events%ROWTYPE;
  next_status text;
  retry_at timestamptz;
BEGIN
  SELECT * INTO STRICT failed_event
  FROM public.stripe_webhook_events
  WHERE stripe_event_id = failed_event_id
    AND status = 'processing'
  FOR UPDATE;

  next_status := CASE
    WHEN failed_event.attempt_count >= failed_event.max_attempts THEN 'dead_letter'
    ELSE 'retry'
  END;
  retry_at := CASE
    WHEN next_status = 'retry' THEN CURRENT_TIMESTAMP + make_interval(
      secs => LEAST(
        3600,
        30 * power(2, GREATEST(failed_event.attempt_count - 1, 0))
      )::double precision
    )
    ELSE CURRENT_TIMESTAMP
  END;

  UPDATE public.stripe_webhook_events
  SET status = next_status,
      next_attempt_at = retry_at,
      locked_at = NULL,
      last_error = left(COALESCE(failure_message, 'unknown processing failure'), 2000),
      dead_lettered_at = CASE WHEN next_status = 'dead_letter' THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
  WHERE stripe_event_id = failed_event_id;

  DELETE FROM public.stripe_webhook_customer_locks
  WHERE stripe_event_id = failed_event_id;

  INSERT INTO public.webhook_failures (
    stripe_event_id, event_type, error_message, raw_payload, retry_count,
    resolved, next_retry_at, dead_lettered_at
  ) VALUES (
    failed_event.stripe_event_id,
    failed_event.event_type,
    left(COALESCE(failure_message, 'unknown processing failure'), 2000),
    NULL,
    failed_event.attempt_count,
    false,
    CASE WHEN next_status = 'retry' THEN retry_at ELSE NULL END,
    CASE WHEN next_status = 'dead_letter' THEN CURRENT_TIMESTAMP ELSE NULL END
  );

  RETURN next_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_billing_email_outbox(
  requested_outbox_id uuid DEFAULT NULL,
  lease_seconds integer DEFAULT 120
)
RETURNS SETOF public.billing_email_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH candidate AS (
    SELECT email.id
    FROM public.billing_email_outbox AS email
    WHERE (requested_outbox_id IS NULL OR email.id = requested_outbox_id)
      AND email.attempt_count < email.max_attempts
      AND (
        (email.status IN ('pending', 'retry') AND email.next_attempt_at <= CURRENT_TIMESTAMP)
        OR (email.status = 'processing' AND email.locked_at < CURRENT_TIMESTAMP - make_interval(secs => lease_seconds))
      )
    ORDER BY email.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.billing_email_outbox AS email
  SET status = 'processing',
      attempt_count = email.attempt_count + 1,
      locked_at = CURRENT_TIMESTAMP,
      last_error = NULL,
      updated_at = CURRENT_TIMESTAMP
  FROM candidate
  WHERE email.id = candidate.id
  RETURNING email.*
$$;

CREATE OR REPLACE FUNCTION public.complete_billing_email_outbox(completed_outbox_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.billing_email_outbox
  SET status = 'sent',
      sent_at = CURRENT_TIMESTAMP,
      locked_at = NULL,
      last_error = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = completed_outbox_id
    AND status = 'processing';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'email outbox item is not claimed';
  END IF;

  UPDATE public.webhook_failures
  SET resolved = true,
      resolved_at = CURRENT_TIMESTAMP
  WHERE stripe_event_id = 'email:' || (
      SELECT dedupe_key FROM public.billing_email_outbox WHERE id = completed_outbox_id
    )
    AND resolved IS FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.replay_stripe_webhook_event(replay_event_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.stripe_webhook_events
  SET status = 'pending',
      attempt_count = 0,
      next_attempt_at = CURRENT_TIMESTAMP,
      locked_at = NULL,
      last_error = NULL,
      processed_at = NULL,
      dead_lettered_at = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE stripe_event_id = replay_event_id
    AND status IN ('retry', 'dead_letter');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'only retry or dead-letter webhook events may be replayed';
  END IF;

  DELETE FROM public.stripe_webhook_customer_locks
  WHERE stripe_event_id = replay_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_billing_email_outbox(
  failed_outbox_id uuid,
  failure_message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  failed_email public.billing_email_outbox%ROWTYPE;
  next_status text;
  retry_at timestamptz;
BEGIN
  SELECT * INTO STRICT failed_email
  FROM public.billing_email_outbox
  WHERE id = failed_outbox_id
    AND status = 'processing'
  FOR UPDATE;

  next_status := CASE
    WHEN failed_email.attempt_count >= failed_email.max_attempts THEN 'dead_letter'
    ELSE 'retry'
  END;
  retry_at := CASE
    WHEN next_status = 'retry' THEN CURRENT_TIMESTAMP + make_interval(
      secs => LEAST(
        3600,
        30 * power(2, GREATEST(failed_email.attempt_count - 1, 0))
      )::double precision
    )
    ELSE CURRENT_TIMESTAMP
  END;

  UPDATE public.billing_email_outbox
  SET status = next_status,
      next_attempt_at = retry_at,
      locked_at = NULL,
      last_error = left(COALESCE(failure_message, 'unknown email failure'), 2000),
      dead_lettered_at = CASE WHEN next_status = 'dead_letter' THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = failed_outbox_id;

  INSERT INTO public.webhook_failures (
    stripe_event_id, event_type, error_message, raw_payload, retry_count,
    resolved, next_retry_at, dead_lettered_at
  ) VALUES (
    'email:' || failed_email.dedupe_key,
    'email.' || failed_email.email_type,
    left(COALESCE(failure_message, 'unknown email failure'), 2000),
    NULL,
    failed_email.attempt_count,
    false,
    CASE WHEN next_status = 'retry' THEN retry_at ELSE NULL END,
    CASE WHEN next_status = 'dead_letter' THEN CURRENT_TIMESTAMP ELSE NULL END
  );

  RETURN next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_stripe_webhook_event(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_stripe_webhook_event(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_billing_email_outbox(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_billing_email_outbox(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_billing_email_outbox(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replay_stripe_webhook_event(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_webhook_event(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_stripe_webhook_event(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_billing_email_outbox(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_billing_email_outbox(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_billing_email_outbox(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.replay_stripe_webhook_event(text) TO service_role;

COMMENT ON TABLE public.stripe_webhook_events IS
  'FMM-008 durable inbox for verified Stripe events. Service role only; payloads are retained for bounded retry and replay.';
COMMENT ON TABLE public.billing_email_outbox IS
  'FMM-008 service-role-only transactional email outbox with idempotent delivery keys and dead-letter visibility.';
