-- Acquisition attribution for first-touch and last-touch signup/checkout tracking.
-- Additive only; user_profiles already has owner-scoped RLS policies.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_source TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_page TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_touch_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_referral_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_utm_source TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_utm_medium TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_utm_campaign TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_landing_page TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_utm_campaign ON public.user_profiles(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_user_profiles_first_touch_at ON public.user_profiles(first_touch_at);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    attribution jsonb := COALESCE(NEW.raw_user_meta_data->'attribution', '{}'::jsonb);
BEGIN
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        company_name,
        plan,
        avatar_url,
        referral_code,
        referral_source,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        landing_page,
        first_touch_at,
        last_referral_code,
        last_utm_source,
        last_utm_medium,
        last_utm_campaign,
        last_landing_page,
        anonymous_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'plan', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(attribution->>'referral_code', ''),
        COALESCE(attribution->>'referral_source', ''),
        COALESCE(attribution->>'utm_source', ''),
        COALESCE(attribution->>'utm_medium', ''),
        COALESCE(attribution->>'utm_campaign', ''),
        COALESCE(attribution->>'utm_content', ''),
        COALESCE(attribution->>'utm_term', ''),
        COALESCE(attribution->>'landing_page', ''),
        NULLIF(attribution->>'first_touch_at', '')::timestamptz,
        COALESCE(attribution->>'referral_code', ''),
        COALESCE(attribution->>'last_utm_source', ''),
        COALESCE(attribution->>'last_utm_medium', ''),
        COALESCE(attribution->>'last_utm_campaign', ''),
        COALESCE(attribution->>'last_landing_page', ''),
        COALESCE(attribution->>'anonymous_id', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;
