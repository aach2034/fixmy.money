-- Migration: billing_events schema hardening
-- Timestamp: 20260701120000
-- Priority 2: Verify and complete billing_events schema, add unique constraint, add indexes
-- Priority 4: Create platform_admins table for database-backed admin authorization
-- Priority 5: Create ai_usage_events table for server-side AI usage tracking

-- ─── Ensure billing_events has all required columns ────────────────────────

DO $$
BEGIN
  -- stripe_invoice_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_invoice_id'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN stripe_invoice_id text;
  END IF;

  -- stripe_payment_intent_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN stripe_payment_intent_id text;
  END IF;

  -- amount (rename amount_cents to amount if amount_cents exists and amount does not)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'amount_cents'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.billing_events RENAME COLUMN amount_cents TO amount;
  END IF;

  -- amount (add if neither amount nor amount_cents exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN amount integer;
  END IF;

  -- metadata (rename payload to metadata if payload exists and metadata does not)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'payload'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.billing_events RENAME COLUMN payload TO metadata;
  END IF;

  -- metadata (add if neither exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN metadata jsonb;
  END IF;

  -- error_state (rename error_message to error_state if error_message exists and error_state does not)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'error_message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'error_state'
  ) THEN
    ALTER TABLE public.billing_events RENAME COLUMN error_message TO error_state;
  END IF;

  -- error_state (add if neither exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'error_state'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN error_state text;
  END IF;

  -- stripe_created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_created_at'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN stripe_created_at timestamptz;
  END IF;

  -- processed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN processed_at timestamptz;
  END IF;

  -- stripe_subscription_id (may already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN stripe_subscription_id text;
  END IF;

  -- stripe_customer_id (may already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN stripe_customer_id text;
  END IF;

  -- currency (may already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.billing_events ADD COLUMN currency text DEFAULT 'usd';
  END IF;

END $$;

-- ─── Unique constraint on stripe_event_id (idempotency) ────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'billing_events'
      AND constraint_name = 'billing_events_stripe_event_id_unique'
  ) THEN
    -- Only add if stripe_event_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_event_id'
    ) THEN
      ALTER TABLE public.billing_events
        ADD CONSTRAINT billing_events_stripe_event_id_unique UNIQUE (stripe_event_id);
    END IF;
  END IF;
END $$;

-- ─── Additional indexes for query performance ───────────────────────────────

CREATE INDEX IF NOT EXISTS billing_events_event_type_idx ON public.billing_events(event_type);
CREATE INDEX IF NOT EXISTS billing_events_status_idx ON public.billing_events(status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'processed_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS billing_events_processed_at_idx ON public.billing_events(processed_at DESC)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_customer_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS billing_events_stripe_customer_id_idx ON public.billing_events(stripe_customer_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'billing_events' AND column_name = 'stripe_subscription_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS billing_events_stripe_subscription_id_idx ON public.billing_events(stripe_subscription_id)';
  END IF;
END $$;

-- ─── Webhook failure records table ─────────────────────────────────────────
-- Admin-visible table for webhook processing failures

CREATE TABLE IF NOT EXISTS public.webhook_failures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id text,
  event_type text,
  error_message text NOT NULL,
  raw_payload jsonb,
  retry_count integer DEFAULT 0,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz
);

ALTER TABLE public.webhook_failures ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (webhooks use service role)
DROP POLICY IF EXISTS "webhook_failures_insert" ON public.webhook_failures;
CREATE POLICY "webhook_failures_insert"
  ON public.webhook_failures
  FOR INSERT
  WITH CHECK (false); -- Service role bypasses RLS

-- No authenticated user can delete webhook failure records
DROP POLICY IF EXISTS "webhook_failures_no_delete" ON public.webhook_failures;
CREATE POLICY "webhook_failures_no_delete"
  ON public.webhook_failures
  FOR DELETE
  USING (false);

CREATE INDEX IF NOT EXISTS webhook_failures_created_at_idx ON public.webhook_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_failures_resolved_idx ON public.webhook_failures(resolved);

-- ─── Platform admins table (Priority 4) ────────────────────────────────────
-- Database-backed platform administrator role — replaces email-only auth

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'platform_admin' CHECK (role IN ('platform_admin', 'platform_superadmin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  notes text,
  UNIQUE (user_id)
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view the platform_admins table
DROP POLICY IF EXISTS "platform_admins_select" ON public.platform_admins;
CREATE POLICY "platform_admins_select"
  ON public.platform_admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() AND pa.active = true
    )
  );

-- Only service role can insert/update/delete platform_admins
DROP POLICY IF EXISTS "platform_admins_insert" ON public.platform_admins;
CREATE POLICY "platform_admins_insert"
  ON public.platform_admins
  FOR INSERT
  WITH CHECK (false); -- Service role only

DROP POLICY IF EXISTS "platform_admins_update" ON public.platform_admins;
CREATE POLICY "platform_admins_update"
  ON public.platform_admins
  FOR UPDATE
  USING (false); -- Service role only

DROP POLICY IF EXISTS "platform_admins_delete" ON public.platform_admins;
CREATE POLICY "platform_admins_delete"
  ON public.platform_admins
  FOR DELETE
  USING (false); -- Service role only

CREATE INDEX IF NOT EXISTS platform_admins_user_id_idx ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS platform_admins_active_idx ON public.platform_admins(active);

-- ─── AI usage events table (Priority 5) ────────────────────────────────────
-- Server-side AI usage tracking — no full prompts, no credit report data

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  feature text NOT NULL,
  model text NOT NULL,
  units integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'cancelled', 'rate_limited')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- NOTE: Full prompts and credit report contents are NEVER stored in this table.
-- Only feature name, model, unit count, and status are recorded.

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

-- Workspace owners can view their own AI usage
DROP POLICY IF EXISTS "ai_usage_events_select" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_select"
  ON public.ai_usage_events
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- Authenticated users can insert their own usage events (server-side only via service role)
DROP POLICY IF EXISTS "ai_usage_events_insert" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_insert"
  ON public.ai_usage_events
  FOR INSERT
  WITH CHECK (false); -- Service role only — prevents client-side manipulation

-- No user can update or delete AI usage events
DROP POLICY IF EXISTS "ai_usage_events_no_update" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_no_update"
  ON public.ai_usage_events
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "ai_usage_events_no_delete" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_no_delete"
  ON public.ai_usage_events
  FOR DELETE
  USING (false);

CREATE INDEX IF NOT EXISTS ai_usage_events_workspace_id_idx ON public.ai_usage_events(workspace_id);
CREATE INDEX IF NOT EXISTS ai_usage_events_user_id_idx ON public.ai_usage_events(user_id);
CREATE INDEX IF NOT EXISTS ai_usage_events_feature_idx ON public.ai_usage_events(feature);
CREATE INDEX IF NOT EXISTS ai_usage_events_created_at_idx ON public.ai_usage_events(created_at DESC);
