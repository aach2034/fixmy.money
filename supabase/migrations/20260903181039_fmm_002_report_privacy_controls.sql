-- FMM-002: remove persisted raw report/OCR artifacts and allow only the
-- server-owned, minimized report-analysis operation in the existing gateway.

CREATE OR REPLACE FUNCTION private.fmm002_contains_raw_report_artifact(input_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  item record;
BEGIN
  IF input_value IS NULL THEN
    RETURN false;
  END IF;

  IF pg_catalog.jsonb_typeof(input_value) = 'object' THEN
    FOR item IN
      SELECT entry_key, entry_value
      FROM pg_catalog.jsonb_each(input_value) AS entries(entry_key, entry_value)
    LOOP
      IF item.entry_key = ANY (ARRAY[
        'rawText', 'raw_text', 'raw_text_source', 'textContent',
        'unparsedBlocks', 'rawBlocks', 'blockDispositions', 'normalizedText'
      ]) OR private.fmm002_contains_raw_report_artifact(item.entry_value) THEN
        RETURN true;
      END IF;
    END LOOP;
  ELSIF pg_catalog.jsonb_typeof(input_value) = 'array' THEN
    FOR item IN
      SELECT array_element
      FROM pg_catalog.jsonb_array_elements(input_value) AS elements(array_element)
    LOOP
      IF private.fmm002_contains_raw_report_artifact(item.array_element) THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.fmm002_strip_raw_report_artifacts(input_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  item record;
  result jsonb;
BEGIN
  IF input_value IS NULL THEN
    RETURN NULL;
  END IF;

  IF pg_catalog.jsonb_typeof(input_value) = 'object' THEN
    result := '{}'::jsonb;
    FOR item IN
      SELECT entry_key, entry_value
      FROM pg_catalog.jsonb_each(input_value) AS entries(entry_key, entry_value)
    LOOP
      IF item.entry_key <> ALL (ARRAY[
        'rawText', 'raw_text', 'raw_text_source', 'textContent',
        'unparsedBlocks', 'rawBlocks', 'blockDispositions', 'normalizedText'
      ]) THEN
        result := result || pg_catalog.jsonb_build_object(
          item.entry_key,
          private.fmm002_strip_raw_report_artifacts(item.entry_value)
        );
      END IF;
    END LOOP;
    RETURN result;
  ELSIF pg_catalog.jsonb_typeof(input_value) = 'array' THEN
    SELECT COALESCE(
      pg_catalog.jsonb_agg(private.fmm002_strip_raw_report_artifacts(array_element)),
      '[]'::jsonb
    )
    INTO result
    FROM pg_catalog.jsonb_array_elements(input_value) AS elements(array_element);
    RETURN result;
  END IF;

  RETURN input_value;
END;
$$;

REVOKE ALL ON FUNCTION private.fmm002_contains_raw_report_artifact(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.fmm002_strip_raw_report_artifacts(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fmm002_contains_raw_report_artifact(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.fmm002_strip_raw_report_artifacts(jsonb) TO service_role;

UPDATE public.parsed_credit_reports
SET raw_text = '',
    all_accounts = private.fmm002_strip_raw_report_artifacts(all_accounts),
    all_inquiries = private.fmm002_strip_raw_report_artifacts(all_inquiries),
    public_records = private.fmm002_strip_raw_report_artifacts(public_records)
WHERE COALESCE(raw_text, '') <> ''
   OR private.fmm002_contains_raw_report_artifact(all_accounts)
   OR private.fmm002_contains_raw_report_artifact(all_inquiries)
   OR private.fmm002_contains_raw_report_artifact(public_records);

UPDATE public.negative_items
SET raw_text_source = ''
WHERE COALESCE(raw_text_source, '') <> '';

UPDATE public.credit_report_snapshots
SET snapshot_data = private.fmm002_strip_raw_report_artifacts(snapshot_data)
WHERE private.fmm002_contains_raw_report_artifact(snapshot_data);

UPDATE public.report_snapshots
SET snapshot_data = private.fmm002_strip_raw_report_artifacts(snapshot_data)
WHERE private.fmm002_contains_raw_report_artifact(snapshot_data);

UPDATE public.credit_accounts
SET normalized_fields = private.fmm002_strip_raw_report_artifacts(normalized_fields)
WHERE private.fmm002_contains_raw_report_artifact(normalized_fields);

UPDATE public.bureau_tradelines
SET raw_tradeline = private.fmm002_strip_raw_report_artifacts(raw_tradeline)
WHERE private.fmm002_contains_raw_report_artifact(raw_tradeline);

ALTER TABLE public.parsed_credit_reports
  DROP CONSTRAINT IF EXISTS parsed_credit_reports_no_raw_report_artifacts;
ALTER TABLE public.parsed_credit_reports
  ADD CONSTRAINT parsed_credit_reports_no_raw_report_artifacts CHECK (
    COALESCE(raw_text, '') = ''
    AND NOT private.fmm002_contains_raw_report_artifact(all_accounts)
    AND NOT private.fmm002_contains_raw_report_artifact(all_inquiries)
    AND NOT private.fmm002_contains_raw_report_artifact(public_records)
  );

ALTER TABLE public.negative_items
  DROP CONSTRAINT IF EXISTS negative_items_no_raw_report_artifacts;
ALTER TABLE public.negative_items
  ADD CONSTRAINT negative_items_no_raw_report_artifacts
  CHECK (COALESCE(raw_text_source, '') = '');

ALTER TABLE public.credit_report_snapshots
  DROP CONSTRAINT IF EXISTS credit_report_snapshots_no_raw_report_artifacts;
ALTER TABLE public.credit_report_snapshots
  ADD CONSTRAINT credit_report_snapshots_no_raw_report_artifacts
  CHECK (NOT private.fmm002_contains_raw_report_artifact(snapshot_data));

ALTER TABLE public.report_snapshots
  DROP CONSTRAINT IF EXISTS report_snapshots_no_raw_report_artifacts;
ALTER TABLE public.report_snapshots
  ADD CONSTRAINT report_snapshots_no_raw_report_artifacts
  CHECK (NOT private.fmm002_contains_raw_report_artifact(snapshot_data));

ALTER TABLE public.credit_accounts
  DROP CONSTRAINT IF EXISTS credit_accounts_no_raw_report_artifacts;
ALTER TABLE public.credit_accounts
  ADD CONSTRAINT credit_accounts_no_raw_report_artifacts
  CHECK (NOT private.fmm002_contains_raw_report_artifact(normalized_fields));

ALTER TABLE public.bureau_tradelines
  DROP CONSTRAINT IF EXISTS bureau_tradelines_no_raw_report_artifacts;
ALTER TABLE public.bureau_tradelines
  ADD CONSTRAINT bureau_tradelines_no_raw_report_artifacts
  CHECK (NOT private.fmm002_contains_raw_report_artifact(raw_tradeline));

ALTER TABLE public.ai_usage_events
  DROP CONSTRAINT IF EXISTS ai_usage_events_operation_check;
ALTER TABLE public.ai_usage_events
  ADD CONSTRAINT ai_usage_events_operation_check
  CHECK (operation IN ('agency_assistant', 'credit_report_analysis'));

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
  IF p_operation NOT IN ('agency_assistant', 'credit_report_analysis')
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
    RETURN jsonb_build_object('allowed', false, 'usage_id', null, 'reason', 'AI_CONCURRENCY_LIMIT', 'retry_after_seconds', 5);
  ELSIF v_minute_requests >= p_requests_per_minute THEN
    RETURN jsonb_build_object('allowed', false, 'usage_id', null, 'reason', 'AI_RATE_LIMIT', 'retry_after_seconds', 60);
  ELSIF v_day_requests >= p_requests_per_day THEN
    RETURN jsonb_build_object('allowed', false, 'usage_id', null, 'reason', 'AI_DAILY_QUOTA', 'retry_after_seconds', 3600);
  ELSIF v_month_requests >= p_requests_per_month THEN
    RETURN jsonb_build_object('allowed', false, 'usage_id', null, 'reason', 'AI_MONTHLY_QUOTA', 'retry_after_seconds', 86400);
  ELSIF v_projected_tokens > p_tokens_per_month THEN
    RETURN jsonb_build_object('allowed', false, 'usage_id', null, 'reason', 'AI_TOKEN_QUOTA', 'retry_after_seconds', 86400);
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

REVOKE ALL ON FUNCTION public.reserve_ai_usage(
  uuid, uuid, text, text, integer, integer, integer,
  integer, integer, integer, integer, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(
  uuid, uuid, text, text, integer, integer, integer,
  integer, integer, integer, integer, integer
) TO service_role;

COMMENT ON FUNCTION private.fmm002_contains_raw_report_artifact(jsonb) IS
  'Detects forbidden raw report/OCR fields in normalized report JSON.';
COMMENT ON FUNCTION private.fmm002_strip_raw_report_artifacts(jsonb) IS
  'Recursively removes raw report/OCR fields while retaining normalized service data.';
