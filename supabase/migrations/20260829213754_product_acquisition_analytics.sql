-- Preserve first/last-touch attribution through signup and record the
-- authenticated activation funnel without storing credit-report contents or PII.

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

CREATE TABLE IF NOT EXISTS public.product_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'signup_completed',
    'onboarding_started',
    'onboarding_completed',
    'credit_report_import_started',
    'credit_report_import_completed',
    'credit_audit_viewed',
    'dispute_wizard_started',
    'dispute_created',
    'letter_generated',
    'checkout_started',
    'trial_started',
    'subscription_started',
    'subscription_upgraded',
    'subscription_cancelled'
  )),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS product_analytics_events_name_time_idx
  ON public.product_analytics_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_analytics_events_user_time_idx
  ON public.product_analytics_events(user_id, occurred_at DESC);

ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_analytics_events FROM anon, authenticated;
GRANT ALL ON TABLE public.product_analytics_events TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth, extensions
AS $$
DECLARE
  workspace_name TEXT;
  base_slug TEXT;
  workspace_slug TEXT;
  attribution JSONB := COALESCE(NEW.raw_user_meta_data->'attribution', '{}'::jsonb);
  first_touch TIMESTAMPTZ;
BEGIN
  IF COALESCE(attribution->>'first_touch_at', '') ~ '^\d{4}-\d{2}-\d{2}T' THEN
    BEGIN
      first_touch := (attribution->>'first_touch_at')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      first_touch := NULL;
    END;
  END IF;

  INSERT INTO public.user_profiles (
    id, email, full_name, company_name, plan, avatar_url,
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

  workspace_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '');
  IF workspace_name IS NULL THEN
    workspace_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  END IF;
  IF workspace_name IS NULL THEN
    workspace_name := NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), '');
  END IF;
  IF workspace_name IS NULL THEN workspace_name := 'Workspace'; END IF;

  base_slug := LOWER(REGEXP_REPLACE(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  IF base_slug IS NULL OR base_slug = '' THEN base_slug := 'workspace'; END IF;
  workspace_slug := LEFT(base_slug, 48) || '-' || LEFT(NEW.id::text, 8);

  INSERT INTO public.workspaces (owner_id, name, slug, is_active)
  VALUES (NEW.id, workspace_name, workspace_slug, true)
  ON CONFLICT (owner_id) DO NOTHING;

  INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
  VALUES (
    NEW.id,
    'signup_completed',
    jsonb_strip_nulls(jsonb_build_object(
      'plan', NULLIF(COALESCE(NEW.raw_user_meta_data->>'plan', ''), ''),
      'source', NULLIF(COALESCE(attribution->>'utm_source', ''), ''),
      'campaign', NULLIF(COALESCE(attribution->>'utm_campaign', ''), ''),
      'landing_page', NULLIF(COALESCE(attribution->>'landing_page', ''), '')
    )),
    'signup:' || NEW.id::text,
    COALESCE(first_touch, NEW.created_at, CURRENT_TIMESTAMP)
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role;

-- Backfill attribution only when canonical fields are still blank. Never
-- overwrite application data that has already been captured.
UPDATE public.user_profiles AS profile
SET
  referral_code = CASE WHEN COALESCE(profile.referral_code, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'referral_code', '') ELSE profile.referral_code END,
  referral_source = CASE WHEN COALESCE(profile.referral_source, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'referral_source', '') ELSE profile.referral_source END,
  utm_source = CASE WHEN COALESCE(profile.utm_source, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'utm_source', '') ELSE profile.utm_source END,
  utm_medium = CASE WHEN COALESCE(profile.utm_medium, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'utm_medium', '') ELSE profile.utm_medium END,
  utm_campaign = CASE WHEN COALESCE(profile.utm_campaign, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'utm_campaign', '') ELSE profile.utm_campaign END,
  utm_content = CASE WHEN COALESCE(profile.utm_content, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'utm_content', '') ELSE profile.utm_content END,
  utm_term = CASE WHEN COALESCE(profile.utm_term, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'utm_term', '') ELSE profile.utm_term END,
  landing_page = CASE WHEN COALESCE(profile.landing_page, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'landing_page', '') ELSE profile.landing_page END,
  last_referral_code = CASE WHEN COALESCE(profile.last_referral_code, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'referral_code', '') ELSE profile.last_referral_code END,
  last_utm_source = CASE WHEN COALESCE(profile.last_utm_source, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'last_utm_source', '') ELSE profile.last_utm_source END,
  last_utm_medium = CASE WHEN COALESCE(profile.last_utm_medium, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'last_utm_medium', '') ELSE profile.last_utm_medium END,
  last_utm_campaign = CASE WHEN COALESCE(profile.last_utm_campaign, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'last_utm_campaign', '') ELSE profile.last_utm_campaign END,
  last_landing_page = CASE WHEN COALESCE(profile.last_landing_page, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'last_landing_page', '') ELSE profile.last_landing_page END,
  anonymous_id = CASE WHEN COALESCE(profile.anonymous_id, '') = '' THEN COALESCE(auth_user.raw_user_meta_data->'attribution'->>'anonymous_id', '') ELSE profile.anonymous_id END
FROM auth.users AS auth_user
WHERE auth_user.id = profile.id;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT
  profile.id,
  'signup_completed',
  jsonb_strip_nulls(jsonb_build_object(
    'plan', NULLIF(COALESCE(profile.plan, ''), ''),
    'source', NULLIF(COALESCE(profile.utm_source, ''), ''),
    'campaign', NULLIF(COALESCE(profile.utm_campaign, ''), ''),
    'landing_page', NULLIF(COALESCE(profile.landing_page, ''), ''),
    'historical_backfill', true
  )),
  'signup:' || profile.id::text,
  COALESCE(profile.created_at, CURRENT_TIMESTAMP)
FROM public.user_profiles AS profile
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT profile.id, 'onboarding_completed', jsonb_build_object('historical_backfill', true),
       'onboarding:' || profile.id::text, COALESCE(profile.updated_at, profile.created_at, CURRENT_TIMESTAMP)
FROM public.user_profiles AS profile
WHERE profile.onboarding_completed IS TRUE
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT report.owner_id, 'credit_report_import_completed', jsonb_build_object('historical_backfill', true),
       'first_import:' || report.owner_id::text, COALESCE(MIN(COALESCE(report.saved_at, report.created_at)), CURRENT_TIMESTAMP)
FROM public.parsed_credit_reports AS report
WHERE report.owner_id IS NOT NULL
GROUP BY report.owner_id
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT round.owner_id, 'dispute_created', jsonb_build_object('historical_backfill', true),
       'first_dispute:' || round.owner_id::text, COALESCE(MIN(round.created_at), CURRENT_TIMESTAMP)
FROM public.dispute_rounds AS round
WHERE round.owner_id IS NOT NULL
GROUP BY round.owner_id
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT letter.owner_id, 'letter_generated', jsonb_build_object('historical_backfill', true),
       'first_letter:' || letter.owner_id::text, COALESCE(MIN(letter.created_at), CURRENT_TIMESTAMP)
FROM public.generated_dispute_letters AS letter
WHERE letter.owner_id IS NOT NULL
GROUP BY letter.owner_id
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT workspace.owner_id, 'trial_started', jsonb_build_object('historical_backfill', true),
       'first_trial:' || workspace.owner_id::text,
       COALESCE(MIN(COALESCE(billing.stripe_created_at, billing.created_at)), CURRENT_TIMESTAMP)
FROM public.billing_events AS billing
JOIN public.workspaces AS workspace ON workspace.id = billing.workspace_id
WHERE billing.event_type = 'checkout.session.completed'
GROUP BY workspace.owner_id
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT profile.id, 'subscription_started', jsonb_build_object('historical_backfill', true, 'plan', profile.subscription_plan),
       'active_subscription:' || profile.id::text,
       COALESCE(profile.updated_at, profile.created_at, CURRENT_TIMESTAMP)
FROM public.user_profiles AS profile
WHERE LOWER(COALESCE(profile.subscription_status, '')) = 'active'
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.product_analytics_events (user_id, event_name, properties, dedupe_key, occurred_at)
SELECT workspace.owner_id, 'subscription_cancelled', jsonb_build_object('historical_backfill', true),
       'first_cancellation:' || workspace.owner_id::text,
       COALESCE(MIN(COALESCE(billing.stripe_created_at, billing.created_at)), CURRENT_TIMESTAMP)
FROM public.billing_events AS billing
JOIN public.workspaces AS workspace ON workspace.id = billing.workspace_id
WHERE billing.event_type = 'customer.subscription.deleted'
GROUP BY workspace.owner_id
ON CONFLICT (dedupe_key) DO NOTHING;
