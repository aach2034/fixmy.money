-- Generated with Supabase CLI; version ordered after the already-applied FMM-004 migrations.
DO $$
BEGIN
  IF to_regclass('public.ai_usage_events_legacy_fmm001') IS NOT NULL THEN
    RAISE EXCEPTION 'FMM-001 legacy AI usage archive already exists';
  END IF;

  IF to_regclass('public.ai_usage_events') IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_attribute
       WHERE attrelid = 'public.ai_usage_events'::regclass
         AND attname = 'user_id'
         AND NOT attisdropped
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_attribute
       WHERE attrelid = 'public.ai_usage_events'::regclass
         AND attname = 'feature'
         AND NOT attisdropped
     )
  THEN
    RAISE EXCEPTION 'expected legacy AI usage table shape was not found';
  END IF;

  LOCK TABLE public.ai_usage_events IN ACCESS EXCLUSIVE MODE;
  ALTER TABLE public.ai_usage_events RENAME TO ai_usage_events_legacy_fmm001;
  ALTER TABLE public.ai_usage_events_legacy_fmm001
    RENAME CONSTRAINT ai_usage_events_pkey TO ai_usage_events_legacy_fmm001_pkey;
END;
$$;

DROP POLICY IF EXISTS ai_usage_events_select_members
  ON public.ai_usage_events_legacy_fmm001;
DROP POLICY IF EXISTS "ai_usage_events_select"
  ON public.ai_usage_events_legacy_fmm001;
DROP POLICY IF EXISTS "ai_usage_events_insert"
  ON public.ai_usage_events_legacy_fmm001;
DROP POLICY IF EXISTS "ai_usage_events_no_update"
  ON public.ai_usage_events_legacy_fmm001;
DROP POLICY IF EXISTS "ai_usage_events_no_delete"
  ON public.ai_usage_events_legacy_fmm001;

ALTER TABLE public.ai_usage_events_legacy_fmm001 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_usage_events_legacy_fmm001
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.ai_usage_events_legacy_fmm001 TO service_role;

COMMENT ON TABLE public.ai_usage_events_legacy_fmm001 IS
  'Read-only archive of the pre-FMM-001 AI usage ledger; retained without data loss.';

CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operation text NOT NULL CHECK (operation = 'agency_assistant'),
  model text NOT NULL CHECK (model = 'gpt-5.4-mini'),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'succeeded', 'failed')),
  input_chars integer NOT NULL CHECK (input_chars BETWEEN 1 AND 4000),
  estimated_input_tokens integer NOT NULL CHECK (estimated_input_tokens BETWEEN 1 AND 2000),
  max_output_tokens integer NOT NULL CHECK (max_output_tokens BETWEEN 1 AND 512),
  input_tokens integer CHECK (input_tokens BETWEEN 0 AND 10000000),
  output_tokens integer CHECK (output_tokens BETWEEN 0 AND 10000000),
  error_code text CHECK (char_length(error_code) <= 64),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CONSTRAINT ai_usage_events_completion_shape CHECK (
    (status = 'reserved' AND completed_at IS NULL AND input_tokens IS NULL AND output_tokens IS NULL)
    OR
    (status IN ('succeeded', 'failed') AND completed_at IS NOT NULL
      AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL)
  )
);

CREATE INDEX ai_usage_events_workspace_created_idx
  ON public.ai_usage_events (workspace_id, created_at DESC);

CREATE INDEX ai_usage_events_active_reservations_idx
  ON public.ai_usage_events (workspace_id, created_at)
  WHERE status = 'reserved';

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_usage_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_usage_events TO service_role;

COMMENT ON TABLE public.ai_usage_events IS
  'Server-owned reservations and final usage accounting for the allowlisted AI gateway.';

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(
  p_workspace_id uuid,
  p_actor_id uuid,
  p_operation text,
  p_model text,
  p_input_chars integer,
  p_estimated_input_tokens integer,
  p_max_output_tokens integer,
  p_requests_per_minute integer,
  p_requests_per_day integer,
  p_requests_per_month integer,
  p_tokens_per_month integer,
  p_max_concurrency integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_usage_id uuid;
  v_minute_requests bigint;
  v_day_requests bigint;
  v_month_requests bigint;
  v_month_tokens bigint;
  v_concurrency bigint;
  v_projected_tokens bigint;
BEGIN
  IF p_operation <> 'agency_assistant'
     OR p_model <> 'gpt-5.4-mini'
     OR p_input_chars NOT BETWEEN 1 AND 4000
     OR p_estimated_input_tokens NOT BETWEEN 1 AND 2000
     OR p_max_output_tokens NOT BETWEEN 1 AND 512
     OR p_requests_per_minute NOT BETWEEN 1 AND 1000
     OR p_requests_per_day NOT BETWEEN 1 AND 100000
     OR p_requests_per_month NOT BETWEEN 1 AND 1000000
     OR p_tokens_per_month NOT BETWEEN 1 AND 1000000000
     OR p_max_concurrency NOT BETWEEN 1 AND 100
  THEN
    RAISE EXCEPTION 'invalid AI reservation parameters' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_memberships AS membership
    WHERE membership.workspace_id = p_workspace_id
      AND membership.user_id = p_actor_id
      AND membership.status = 'active'
  ) THEN
    RAISE EXCEPTION 'active workspace membership required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_workspace_id::text, 0)
  );

  SELECT
    count(*) FILTER (WHERE created_at >= v_now - interval '1 minute'),
    count(*) FILTER (WHERE created_at >= date_trunc('day', v_now)),
    count(*) FILTER (WHERE created_at >= date_trunc('month', v_now)),
    count(*) FILTER (
      WHERE status = 'reserved'
        AND created_at >= v_now - interval '120 seconds'
    ),
    COALESCE(sum(
      CASE
        WHEN status = 'reserved'
          THEN estimated_input_tokens + max_output_tokens
        ELSE input_tokens + output_tokens
      END
    ) FILTER (WHERE created_at >= date_trunc('month', v_now)), 0)
  INTO
    v_minute_requests,
    v_day_requests,
    v_month_requests,
    v_concurrency,
    v_month_tokens
  FROM public.ai_usage_events
  WHERE workspace_id = p_workspace_id
    AND created_at >= date_trunc('month', v_now);

  v_projected_tokens := v_month_tokens + p_estimated_input_tokens + p_max_output_tokens;

  IF v_concurrency >= p_max_concurrency THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_id', null,
      'reason', 'AI_CONCURRENCY_LIMIT',
      'retry_after_seconds', 5
    );
  ELSIF v_minute_requests >= p_requests_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_id', null,
      'reason', 'AI_RATE_LIMIT',
      'retry_after_seconds', 60
    );
  ELSIF v_day_requests >= p_requests_per_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_id', null,
      'reason', 'AI_DAILY_QUOTA',
      'retry_after_seconds', 3600
    );
  ELSIF v_month_requests >= p_requests_per_month THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_id', null,
      'reason', 'AI_MONTHLY_QUOTA',
      'retry_after_seconds', 86400
    );
  ELSIF v_projected_tokens > p_tokens_per_month THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_id', null,
      'reason', 'AI_TOKEN_QUOTA',
      'retry_after_seconds', 86400
    );
  END IF;

  INSERT INTO public.ai_usage_events (
    workspace_id,
    actor_id,
    operation,
    model,
    input_chars,
    estimated_input_tokens,
    max_output_tokens
  ) VALUES (
    p_workspace_id,
    p_actor_id,
    p_operation,
    p_model,
    p_input_chars,
    p_estimated_input_tokens,
    p_max_output_tokens
  )
  RETURNING id INTO v_usage_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'usage_id', v_usage_id,
    'reason', null,
    'retry_after_seconds', null
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_ai_usage(
  p_usage_id uuid,
  p_status text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_error_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('succeeded', 'failed')
     OR p_input_tokens NOT BETWEEN 0 AND 10000000
     OR p_output_tokens NOT BETWEEN 0 AND 10000000
     OR char_length(p_error_code) > 64
  THEN
    RAISE EXCEPTION 'invalid AI finalization parameters' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ai_usage_events
  SET status = p_status,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      error_code = p_error_code,
      completed_at = clock_timestamp()
  WHERE id = p_usage_id
    AND status = 'reserved';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_usage(
  uuid, uuid, text, text, integer, integer, integer,
  integer, integer, integer, integer, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(
  uuid, uuid, text, text, integer, integer, integer,
  integer, integer, integer, integer, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_ai_usage(
  uuid, text, integer, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ai_usage(
  uuid, text, integer, integer, text
) TO service_role;

COMMENT ON FUNCTION public.reserve_ai_usage(
  uuid, uuid, text, text, integer, integer, integer,
  integer, integer, integer, integer, integer
) IS 'Atomically enforces AI request, token, and concurrency limits before provider use.';

COMMENT ON FUNCTION public.finalize_ai_usage(
  uuid, text, integer, integer, text
) IS 'Records actual token usage for a previously reserved server-side AI request.';
