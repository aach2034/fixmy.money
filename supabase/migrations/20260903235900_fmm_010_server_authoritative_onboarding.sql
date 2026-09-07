-- FMM-010: only the trusted server may transition onboarding to complete.
-- Users retain ordinary profile editing, but cannot grant themselves access to
-- gated application routes by writing onboarding_completed from the browser.

ALTER TABLE public.user_profiles
  ADD COLUMN onboarding_company_completed boolean NOT NULL DEFAULT false;

-- Existing completed profiles remain completed; no customer field is deleted
-- or rewritten. New/incomplete profiles must use the server workflow below.
UPDATE public.user_profiles
SET onboarding_company_completed = true
WHERE onboarding_completed IS TRUE;

CREATE OR REPLACE FUNCTION private.enforce_server_onboarding_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.onboarding_completed IS TRUE AND OLD.onboarding_completed IS DISTINCT FROM TRUE
      OR NEW.onboarding_company_completed IS TRUE AND OLD.onboarding_company_completed IS DISTINCT FROM TRUE)
     AND (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ONBOARDING_COMPLETION_REQUIRES_SERVER';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_server_onboarding_completion() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER user_profiles_server_onboarding_completion
BEFORE UPDATE OF onboarding_completed, onboarding_company_completed ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION private.enforce_server_onboarding_completion();

CREATE OR REPLACE FUNCTION public.save_onboarding_company_server(
  p_user_id uuid,
  p_workspace_id uuid,
  p_company_name text,
  p_owner_name text,
  p_slug text,
  p_phone text,
  p_website text,
  p_address text,
  p_city text,
  p_state text,
  p_zip text,
  p_business_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVER_ROLE_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    JOIN public.workspace_memberships m ON m.workspace_id = w.id
    WHERE w.id = p_workspace_id AND w.owner_id = p_user_id
      AND m.user_id = p_user_id AND m.role = 'owner' AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKSPACE_OWNER_REQUIRED';
  END IF;
  IF length(btrim(p_company_name)) NOT BETWEEN 1 AND 160
     OR length(btrim(p_owner_name)) NOT BETWEEN 1 AND 160
     OR length(btrim(p_business_type)) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_COMPANY_SETUP';
  END IF;

  UPDATE public.workspaces SET
    name = btrim(p_company_name), slug = p_slug, phone = p_phone,
    website = p_website, address = p_address, city = p_city,
    state = p_state, zip = p_zip, business_type = btrim(p_business_type),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_workspace_id AND owner_id = p_user_id;

  UPDATE public.user_profiles SET
    full_name = btrim(p_owner_name), company_name = btrim(p_company_name),
    onboarding_company_completed = true, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PROFILE_NOT_FOUND';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_onboarding_company_server(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_onboarding_company_server(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text
) TO service_role;
