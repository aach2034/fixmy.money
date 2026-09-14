-- Dispute letters are generated from structured evidence by trusted server
-- routes. Browser sessions may read tenant-scoped rows, but may not author or
-- rewrite letter content through the Data API.

ALTER TABLE public.dispute_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_dispute_letters ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.dispute_letters,
  public.generated_dispute_letters
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.dispute_letters,
  public.generated_dispute_letters
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.dispute_letters,
  public.generated_dispute_letters
TO service_role;

DO $$
DECLARE
  target_table text;
  policy_record record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['dispute_letters', 'generated_dispute_letters']
  LOOP
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        policy_record.policyname,
        target_table
      );
    END LOOP;
  END LOOP;
END;
$$;

CREATE POLICY workspace_members_select_dispute_letters
ON public.dispute_letters
FOR SELECT
TO authenticated
USING (private.can_read_owner(owner_id));

CREATE POLICY workspace_members_select_generated_dispute_letters
ON public.generated_dispute_letters
FOR SELECT
TO authenticated
USING (private.can_read_owner(owner_id));

CREATE OR REPLACE FUNCTION private.enforce_dispute_letter_server_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF (
    to_jsonb(NEW) - ARRAY[
      'letter_status', 'sent_date', 'response_due_date',
      'days_remaining', 'updated_at'
    ]::text[]
  ) IS DISTINCT FROM (
    to_jsonb(OLD) - ARRAY[
      'letter_status', 'sent_date', 'response_due_date',
      'days_remaining', 'updated_at'
    ]::text[]
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'generated dispute letter facts are immutable';
  END IF;

  IF OLD.letter_status IS DISTINCT FROM 'draft'::public.letter_status
     OR NEW.letter_status IS DISTINCT FROM 'sent'::public.letter_status THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'invalid dispute letter status transition';
  END IF;

  NEW.sent_date := CURRENT_DATE;
  NEW.response_due_date := CURRENT_DATE + 30;
  NEW.days_remaining := 30;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_generated_dispute_letter_server_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF (
    to_jsonb(NEW) - ARRAY['status', 'mailed_at', 'updated_at']::text[]
  ) IS DISTINCT FROM (
    to_jsonb(OLD) - ARRAY['status', 'mailed_at', 'updated_at']::text[]
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'generated dispute letter facts and provenance are immutable';
  END IF;

  IF OLD.status IS DISTINCT FROM 'generated'::public.dispute_workflow_status
     OR NEW.status IS DISTINCT FROM 'sent'::public.dispute_workflow_status THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'invalid generated dispute letter status transition';
  END IF;

  NEW.mailed_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Keep the user-visible letter and its round in one database transaction. The
-- function is reachable through the Data API only for the server-held
-- service-role credential; browser roles cannot invoke it.
CREATE OR REPLACE FUNCTION public.mark_dispute_letters_mailed_server(
  p_source text,
  p_owner_id uuid,
  p_client_id uuid,
  p_workspace_id uuid,
  p_letter_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  requested_ids uuid[];
  found_ids uuid[];
  round_ids uuid[];
  found_round_ids uuid[];
  statuses_valid boolean;
  round_statuses_valid boolean;
  marked_at timestamptz := statement_timestamp();
BEGIN
  IF current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'server authorization required';
  END IF;
  IF p_source IS NULL
     OR p_source NOT IN ('dispute_letters', 'generated_dispute_letters')
     OR p_owner_id IS NULL
     OR p_client_id IS NULL
     OR p_workspace_id IS NULL
     OR p_letter_ids IS NULL
     OR cardinality(p_letter_ids) < 1
     OR cardinality(p_letter_ids) > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid letter transition request';
  END IF;

  SELECT array_agg(letter_id ORDER BY letter_id)
  INTO requested_ids
  FROM (
    SELECT DISTINCT letter_id
    FROM unnest(p_letter_ids) AS requested(letter_id)
  ) AS unique_ids;
  IF cardinality(requested_ids) IS DISTINCT FROM cardinality(p_letter_ids) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'duplicate letter identifiers are not allowed';
  END IF;

  IF p_source = 'dispute_letters' THEN
    PERFORM letter.id
    FROM public.dispute_letters AS letter
    WHERE letter.owner_id = p_owner_id
      AND letter.client_id = p_client_id
      AND letter.workspace_id = p_workspace_id
      AND letter.id = ANY(requested_ids)
    FOR UPDATE;

    SELECT array_agg(letter.id ORDER BY letter.id),
           bool_and(letter.letter_status IN ('draft', 'sent'))
    INTO found_ids, statuses_valid
    FROM public.dispute_letters AS letter
    WHERE letter.owner_id = p_owner_id
      AND letter.client_id = p_client_id
      AND letter.workspace_id = p_workspace_id
      AND letter.id = ANY(requested_ids);
    IF found_ids IS DISTINCT FROM requested_ids THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'letter not found or access denied';
    END IF;
    IF statuses_valid IS DISTINCT FROM true THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'invalid dispute letter status transition';
    END IF;

    UPDATE public.dispute_letters AS letter
    SET letter_status = 'sent'
    WHERE letter.owner_id = p_owner_id
      AND letter.client_id = p_client_id
      AND letter.workspace_id = p_workspace_id
      AND letter.id = ANY(requested_ids)
      AND letter.letter_status = 'draft';
    RETURN;
  END IF;

  PERFORM letter.id
  FROM public.generated_dispute_letters AS letter
  WHERE letter.owner_id = p_owner_id
    AND letter.client_id = p_client_id
    AND letter.id = ANY(requested_ids)
  FOR UPDATE;

  SELECT array_agg(letter.id ORDER BY letter.id),
         bool_and(letter.status IN ('generated', 'sent')),
         array_agg(DISTINCT letter.round_id ORDER BY letter.round_id)
           FILTER (WHERE letter.round_id IS NOT NULL)
  INTO found_ids, statuses_valid, round_ids
  FROM public.generated_dispute_letters AS letter
  WHERE letter.owner_id = p_owner_id
    AND letter.client_id = p_client_id
    AND letter.id = ANY(requested_ids);
  IF found_ids IS DISTINCT FROM requested_ids THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'letter not found or access denied';
  END IF;
  IF statuses_valid IS DISTINCT FROM true THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'invalid generated dispute letter status transition';
  END IF;

  IF cardinality(round_ids) > 0 THEN
    PERFORM round_record.id
    FROM public.dispute_rounds AS round_record
    WHERE round_record.owner_id = p_owner_id
      AND round_record.client_id = p_client_id
      AND round_record.id = ANY(round_ids)
    FOR UPDATE;
    SELECT array_agg(round_record.id ORDER BY round_record.id),
           bool_and(round_record.status IN ('generated', 'sent'))
    INTO found_round_ids, round_statuses_valid
    FROM public.dispute_rounds AS round_record
    WHERE round_record.owner_id = p_owner_id
      AND round_record.client_id = p_client_id
      AND round_record.id = ANY(round_ids);
    IF found_round_ids IS DISTINCT FROM round_ids THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'linked dispute round not found or access denied';
    END IF;
    IF round_statuses_valid IS DISTINCT FROM true THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'invalid linked dispute round status transition';
    END IF;
  END IF;

  UPDATE public.generated_dispute_letters AS letter
  SET status = 'sent'
  WHERE letter.owner_id = p_owner_id
    AND letter.client_id = p_client_id
    AND letter.id = ANY(requested_ids)
    AND letter.status = 'generated';

  IF cardinality(round_ids) > 0 THEN
    UPDATE public.dispute_rounds AS round_record
    SET status = 'sent',
        mailed_at = marked_at,
        follow_up_date = marked_at + interval '30 days'
    WHERE round_record.owner_id = p_owner_id
      AND round_record.client_id = p_client_id
      AND round_record.id = ANY(round_ids)
      AND round_record.status = 'generated';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_dispute_letter_server_transition()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_generated_dispute_letter_server_transition()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_dispute_letters_mailed_server(text, uuid, uuid, uuid, uuid[])
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_dispute_letters_mailed_server(text, uuid, uuid, uuid, uuid[])
TO service_role;

DROP TRIGGER IF EXISTS enforce_dispute_letter_server_transition
ON public.dispute_letters;
CREATE TRIGGER enforce_dispute_letter_server_transition
BEFORE UPDATE ON public.dispute_letters
FOR EACH ROW
EXECUTE FUNCTION private.enforce_dispute_letter_server_transition();

DROP TRIGGER IF EXISTS enforce_generated_dispute_letter_server_transition
ON public.generated_dispute_letters;
CREATE TRIGGER enforce_generated_dispute_letter_server_transition
BEFORE UPDATE ON public.generated_dispute_letters
FOR EACH ROW
EXECUTE FUNCTION private.enforce_generated_dispute_letter_server_transition();

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.dispute_letters', 'INSERT')
     OR has_table_privilege('authenticated', 'public.dispute_letters', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.dispute_letters', 'DELETE')
     OR has_table_privilege('authenticated', 'public.generated_dispute_letters', 'INSERT')
     OR has_table_privilege('authenticated', 'public.generated_dispute_letters', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.generated_dispute_letters', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated dispute-letter mutation privileges remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('dispute_letters', 'generated_dispute_letters')
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      AND (
        roles @> ARRAY['authenticated']::name[]
        OR roles @> ARRAY['public']::name[]
      )
  ) THEN
    RAISE EXCEPTION 'authenticated dispute-letter mutation policy remains';
  END IF;
END;
$$;
