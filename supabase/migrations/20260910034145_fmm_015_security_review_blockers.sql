-- FMM-015 independent-review blockers: one-time destructive authorization,
-- provider-authoritative factor revocation, clock-independent session denial,
-- and atomic sensitive mutation/audit records.

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS revoked_session_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS mfa_factor_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.admin_action_audit_logs
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_action_audit_logs_request_id
  ON public.admin_action_audit_logs(request_id)
  WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.admin_destructive_authorizations (
  nonce_hash text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 100),
  target_id text NOT NULL CHECK (length(target_id) BETWEEN 1 AND 500),
  material_hash text NOT NULL CHECK (length(material_hash) = 43),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at),
  CHECK (expires_at <= created_at + interval '2 minutes 30 seconds')
);

ALTER TABLE public.admin_destructive_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_destructive_authorizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.admin_destructive_authorizations TO service_role;

CREATE OR REPLACE FUNCTION public.issue_admin_destructive_authorization(
  p_nonce_hash text,
  p_user_id uuid,
  p_session_id uuid,
  p_action text,
  p_target_id text,
  p_material_hash text
)
RETURNS TABLE(issued_at_epoch bigint, expires_at_epoch bigint)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  issued_at timestamptz := clock_timestamp();
  expires_at timestamptz := issued_at + interval '2 minutes';
BEGIN
  INSERT INTO public.admin_destructive_authorizations (
    nonce_hash, admin_id, session_id, action, target_id, material_hash, created_at, expires_at
  )
  VALUES (
    p_nonce_hash, p_user_id, p_session_id, p_action, p_target_id, p_material_hash, issued_at, expires_at
  );

  RETURN QUERY SELECT
    floor(extract(epoch FROM issued_at))::bigint,
    floor(extract(epoch FROM expires_at))::bigint;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_admin_destructive_authorization(text, uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_admin_destructive_authorization(text, uuid, uuid, text, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.consume_admin_destructive_authorization(
  p_nonce_hash text,
  p_user_id uuid,
  p_session_id uuid,
  p_action text,
  p_target_id text,
  p_material_hash text
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  consumed_count integer;
BEGIN
  DELETE FROM public.admin_destructive_authorizations
  WHERE nonce_hash = p_nonce_hash
    AND admin_id = p_user_id
    AND session_id = p_session_id
    AND action = p_action
    AND target_id = p_target_id
    AND material_hash = p_material_hash
    AND expires_at > clock_timestamp();
  GET DIAGNOSTICS consumed_count = ROW_COUNT;
  RETURN consumed_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_admin_destructive_authorization(text, uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_admin_destructive_authorization(text, uuid, uuid, text, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_platform_admin_sessions(
  p_user_id uuid,
  p_action text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS timestamptz
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_revoked_at timestamptz := clock_timestamp();
  current_session_ids uuid[];
BEGIN
  SELECT coalesce(array_agg(session_row.id), '{}'::uuid[])
  INTO current_session_ids
  FROM auth.sessions AS session_row
  WHERE session_row.user_id = p_user_id;

  UPDATE public.platform_admins AS platform_admin
  SET sessions_revoked_after = v_revoked_at,
      revoked_session_ids = ARRAY(
        SELECT DISTINCT session_id
        FROM unnest(coalesce(platform_admin.revoked_session_ids, '{}'::uuid[]) || current_session_ids)
          AS revoked(session_id)
      )
  WHERE platform_admin.user_id = p_user_id
    AND platform_admin.active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active administrator was not found.';
  END IF;

  INSERT INTO public.admin_action_audit_logs (admin_id, customer_id, action, metadata)
  VALUES (
    p_user_id,
    NULL,
    p_action,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'scope', 'global',
      'revoked_at', v_revoked_at,
      'revoked_session_count', cardinality(current_session_ids)
    )
  );

  RETURN v_revoked_at;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_platform_admin_sessions(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_platform_admin_sessions(uuid, text, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_platform_admin_mfa_factors(
  p_user_id uuid,
  p_factor_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_factor_ids uuid[];
  verified_factor_ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT factor_id ORDER BY factor_id)
  INTO verified_factor_ids
  FROM unnest(coalesce(p_factor_ids, '{}'::uuid[])) AS verified(factor_id)
  WHERE factor_id IS NOT NULL;

  IF cardinality(coalesce(verified_factor_ids, '{}'::uuid[])) = 0 THEN
    RAISE EXCEPTION 'At least one verified administrator factor is required.';
  END IF;

  SELECT platform_admin.mfa_factor_ids
  INTO current_factor_ids
  FROM public.platform_admins AS platform_admin
  WHERE platform_admin.user_id = p_user_id
    AND platform_admin.active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active administrator was not found.';
  END IF;

  IF current_factor_ids IS DISTINCT FROM verified_factor_ids THEN
    UPDATE public.platform_admins
    SET mfa_factor_ids = verified_factor_ids
    WHERE user_id = p_user_id;

    INSERT INTO public.admin_action_audit_logs (admin_id, customer_id, action, metadata)
    VALUES (
      p_user_id,
      NULL,
      'admin_mfa_eligibility_confirmed',
      jsonb_build_object('verified_factor_count', cardinality(verified_factor_ids))
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_platform_admin_mfa_factors(uuid, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_platform_admin_mfa_factors(uuid, uuid[])
  TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_platform_admin_factor(
  p_user_id uuid,
  p_factor_id uuid,
  p_source text,
  p_auth_audit_entry_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  removed_registered_factor_count integer := 0;
BEGIN
  IF p_source NOT IN ('application_fallback', 'supabase_auth_audit') THEN
    RAISE EXCEPTION 'Unsupported administrator factor-revocation source.';
  END IF;

  UPDATE public.platform_admins
  SET mfa_factor_ids = array_remove(mfa_factor_ids, p_factor_id)
  WHERE user_id = p_user_id
    AND active = true
    AND p_factor_id = ANY(mfa_factor_ids);
  GET DIAGNOSTICS removed_registered_factor_count = ROW_COUNT;

  IF removed_registered_factor_count = 1 THEN
    PERFORM public.revoke_platform_admin_sessions(
      p_user_id,
      'admin_mfa_factor_removed_and_sessions_revoked',
      jsonb_strip_nulls(jsonb_build_object(
        'source', p_source,
        'auth_audit_entry_id', p_auth_audit_entry_id
      ))
    );
  END IF;

  RETURN removed_registered_factor_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_platform_admin_factor(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_platform_admin_factor(uuid, uuid, text, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION private.revoke_admin_after_factor_audit()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_user_id uuid;
  factor_id uuid;
  factor_id_text text;
BEGIN
  IF coalesce(NEW.payload ->> 'action', '') NOT IN ('factor_unenrolled', 'factor_deleted') THEN
    RETURN NEW;
  END IF;

  factor_id_text := NEW.payload -> 'traits' ->> 'factor_id';
  IF coalesce(factor_id_text, '') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  THEN
    RETURN NEW;
  END IF;
  factor_id := factor_id_text::uuid;

  SELECT platform_admin.user_id
  INTO affected_user_id
  FROM public.platform_admins AS platform_admin
  WHERE platform_admin.active = true
    AND factor_id = ANY(platform_admin.mfa_factor_ids)
  LIMIT 1;

  IF FOUND THEN
    PERFORM public.revoke_platform_admin_factor(
      affected_user_id,
      factor_id,
      'supabase_auth_audit',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.revoke_admin_after_factor_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS fmm_admin_factor_revocation ON auth.audit_log_entries;
CREATE TRIGGER fmm_admin_factor_revocation
AFTER INSERT ON auth.audit_log_entries
FOR EACH ROW
EXECUTE FUNCTION private.revoke_admin_after_factor_audit();

CREATE OR REPLACE FUNCTION private.is_active_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    AND EXISTS (
      SELECT 1
      FROM public.platform_admins AS platform_admin
      WHERE platform_admin.user_id = (SELECT auth.uid())
        AND platform_admin.active = true
        AND platform_admin.role IN ('platform_admin', 'platform_superadmin')
        AND cardinality(platform_admin.mfa_factor_ids) > 0
        AND CASE
          WHEN coalesce(auth.jwt() ->> 'session_id', '') ~
            '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
          THEN NOT (
            (auth.jwt() ->> 'session_id')::uuid = ANY(platform_admin.revoked_session_ids)
          )
          ELSE false
        END
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) AS method(entry)
          WHERE method.entry ->> 'method' IN ('magiclink', 'oauth', 'otp', 'password', 'sso/saml')
            AND jsonb_typeof(method.entry -> 'timestamp') = 'number'
            AND (method.entry ->> 'timestamp')::numeric
              > extract(epoch FROM platform_admin.sessions_revoked_after)
        )
    )
$$;

REVOKE ALL ON FUNCTION private.is_active_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_platform_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_retention_alert_atomic(
  p_admin_id uuid,
  p_customer_id uuid,
  p_alert_key text,
  p_status text,
  p_snoozed_until date,
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
  audit_action text;
  audit_metadata jsonb;
  existing_audit public.admin_action_audit_logs%ROWTYPE;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'A retention mutation request ID is required.';
  END IF;
  IF p_status NOT IN ('active', 'dismissed', 'contacted', 'snoozed') THEN
    RAISE EXCEPTION 'Invalid retention status.';
  END IF;

  audit_action := 'admin_retention_alert_' || p_status;
  audit_metadata := jsonb_strip_nulls(jsonb_build_object(
    'alert_key', p_alert_key,
    'reason', nullif(p_reason, ''),
    'snoozed_until', p_snoozed_until
  ));

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));
  SELECT * INTO existing_audit
  FROM public.admin_action_audit_logs
  WHERE request_id = p_request_id;
  IF FOUND THEN
    IF existing_audit.admin_id IS NOT DISTINCT FROM p_admin_id
      AND existing_audit.customer_id IS NOT DISTINCT FROM p_customer_id
      AND existing_audit.action = audit_action
      AND existing_audit.metadata = audit_metadata
    THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Retention mutation request ID was already used for another intent.';
  END IF;

  INSERT INTO public.admin_retention_alert_states (
    customer_id, alert_key, status, snoozed_until, reason, admin_id
  )
  VALUES (p_customer_id, p_alert_key, p_status, p_snoozed_until, nullif(p_reason, ''), p_admin_id)
  ON CONFLICT (customer_id, alert_key) DO UPDATE
  SET status = EXCLUDED.status,
      snoozed_until = EXCLUDED.snoozed_until,
      reason = EXCLUDED.reason,
      admin_id = EXCLUDED.admin_id;

  INSERT INTO public.admin_action_audit_logs (request_id, admin_id, customer_id, action, metadata)
  VALUES (
    p_request_id,
    p_admin_id,
    p_customer_id,
    audit_action,
    audit_metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_retention_alert_atomic(uuid, uuid, text, text, date, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_retention_alert_atomic(uuid, uuid, text, text, date, text, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_update_customer_classification_atomic(
  p_admin_id uuid,
  p_customer_id uuid,
  p_customer_type text,
  p_do_not_contact boolean,
  p_note text,
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count integer;
  audit_metadata jsonb;
  existing_audit public.admin_action_audit_logs%ROWTYPE;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'A classification mutation request ID is required.';
  END IF;
  IF p_customer_type NOT IN ('real', 'internal', 'qa', 'demo', 'test') THEN
    RAISE EXCEPTION 'Invalid customer type.';
  END IF;

  audit_metadata := jsonb_strip_nulls(jsonb_build_object(
    'customer_type', p_customer_type,
    'do_not_contact', p_do_not_contact,
    'note', nullif(p_note, '')
  ));

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));
  SELECT * INTO existing_audit
  FROM public.admin_action_audit_logs
  WHERE request_id = p_request_id;
  IF FOUND THEN
    IF existing_audit.admin_id IS NOT DISTINCT FROM p_admin_id
      AND existing_audit.customer_id IS NOT DISTINCT FROM p_customer_id
      AND existing_audit.action = 'admin_customer_classification_updated'
      AND existing_audit.metadata = audit_metadata
    THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Classification mutation request ID was already used for another intent.';
  END IF;

  UPDATE public.user_profiles
  SET customer_type = p_customer_type,
      do_not_contact = p_do_not_contact,
      admin_classification_note = nullif(p_note, '')
  WHERE id = p_customer_id;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'Customer was not found.';
  END IF;

  INSERT INTO public.admin_action_audit_logs (request_id, admin_id, customer_id, action, metadata)
  VALUES (
    p_request_id,
    p_admin_id,
    p_customer_id,
    'admin_customer_classification_updated',
    audit_metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_customer_classification_atomic(uuid, uuid, text, boolean, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_customer_classification_atomic(uuid, uuid, text, boolean, text, uuid)
  TO service_role;
