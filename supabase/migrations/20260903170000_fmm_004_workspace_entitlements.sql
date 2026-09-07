-- FMM-004: make a workspace-bound, Stripe-verified record the only billing
-- authority used to grant application access.
--
-- This migration is additive. It preserves every profile, workspace,
-- customer/subscription reference, payment record, and billing event. Legacy
-- user_profiles billing fields are copied only as reconciliation inputs and
-- never grant access without a fresh Stripe verification.

CREATE TABLE public.workspace_entitlements (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text NOT NULL DEFAULT 'none'
    CHECK (stripe_status IN (
      'none', 'trialing', 'active', 'past_due', 'unpaid', 'paused',
      'canceled', 'incomplete', 'incomplete_expired'
    )),
  access_state text NOT NULL DEFAULT 'expired'
    CHECK (access_state IN ('active', 'trial', 'grace', 'expired')),
  plan_id text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  grace_ends_at timestamptz,
  last_verified_at timestamptz,
  last_stripe_event_created_at timestamptz,
  last_reconciliation_error text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workspace_entitlements_customer_shape CHECK (
    stripe_subscription_id IS NULL OR stripe_customer_id IS NOT NULL
  ),
  CONSTRAINT workspace_entitlements_verified_access_shape CHECK (
    access_state = 'expired' OR last_verified_at IS NOT NULL
  ),
  CONSTRAINT workspace_entitlements_trial_shape CHECK (
    access_state <> 'trial' OR (stripe_status = 'trialing' AND trial_ends_at IS NOT NULL)
  ),
  CONSTRAINT workspace_entitlements_active_shape CHECK (
    access_state <> 'active' OR (stripe_status = 'active' AND current_period_ends_at IS NOT NULL)
  ),
  CONSTRAINT workspace_entitlements_grace_shape CHECK (
    access_state <> 'grace' OR (stripe_status = 'past_due' AND grace_ends_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX workspace_entitlements_stripe_customer_key
  ON public.workspace_entitlements (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX workspace_entitlements_stripe_subscription_key
  ON public.workspace_entitlements (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX workspace_entitlements_reconciliation_idx
  ON public.workspace_entitlements (last_verified_at, workspace_id)
  WHERE stripe_customer_id IS NOT NULL;

INSERT INTO public.workspace_entitlements (
  workspace_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_status,
  access_state,
  plan_id,
  trial_ends_at,
  grace_ends_at
)
SELECT
  workspace.id,
  NULLIF(btrim(profile.stripe_customer_id), ''),
  NULLIF(btrim(profile.subscription_id), ''),
  CASE lower(COALESCE(NULLIF(btrim(profile.subscription_status), ''), 'none'))
    WHEN 'trial_active' THEN 'trialing'
    WHEN 'trialing' THEN 'trialing'
    WHEN 'active' THEN 'active'
    WHEN 'past_due' THEN 'past_due'
    WHEN 'unpaid' THEN 'unpaid'
    WHEN 'paused' THEN 'paused'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'incomplete' THEN 'incomplete'
    WHEN 'incomplete_expired' THEN 'incomplete_expired'
    ELSE 'none'
  END,
  'expired',
  NULLIF(btrim(profile.subscription_plan), ''),
  profile.trial_end,
  CASE
    WHEN lower(COALESCE(profile.subscription_status, '')) = 'past_due'
    THEN (
      SELECT min(failure.stripe_created_at) + interval '3 days'
      FROM public.billing_events AS failure
      WHERE failure.workspace_id = workspace.id
        AND failure.event_type = 'invoice.payment_failed'
        AND failure.stripe_created_at > COALESCE((
          SELECT max(success.stripe_created_at)
          FROM public.billing_events AS success
          WHERE success.workspace_id = workspace.id
            AND success.event_type = 'invoice.payment_succeeded'
        ), '-infinity'::timestamptz)
    )
    ELSE NULL
  END
FROM public.workspaces AS workspace
LEFT JOIN public.user_profiles AS profile ON profile.id = workspace.owner_id;

ALTER TABLE public.workspace_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.workspace_entitlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.workspace_entitlements TO service_role;

COMMENT ON TABLE public.workspace_entitlements IS
  'FMM-004 workspace billing authority. Rows grant access only after current Stripe verification.';
