-- Migration: Verify and strengthen RLS tenant isolation
-- Timestamp: 20260630180000
-- Purpose: Ensure all sensitive tables have RLS enabled and proper org-scoped policies

-- ─── Enable RLS on tables that exist in this schema ────────────────────────

DO $$
BEGIN
  -- workspaces
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    EXECUTE 'ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY';
  END IF;

  -- billing_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_events') THEN
    EXECUTE 'ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY';
  END IF;

  -- audit_logs (if it exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
  END IF;

END $$;

-- ─── Billing events audit log table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  event_type text NOT NULL,
  stripe_event_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount_cents integer,
  currency text DEFAULT 'usd',
  status text NOT NULL DEFAULT 'received',
  payload jsonb,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for workspace queries
CREATE INDEX IF NOT EXISTS billing_events_workspace_id_idx ON public.billing_events(workspace_id);
CREATE INDEX IF NOT EXISTS billing_events_stripe_event_id_idx ON public.billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS billing_events_created_at_idx ON public.billing_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies: billing_events ──────────────────────────────────────────

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "billing_events_workspace_select" ON public.billing_events;
DROP POLICY IF EXISTS "billing_events_workspace_insert" ON public.billing_events;

-- Workspace owners can view their own billing events
-- Uses workspaces table (owner_id = auth.uid()) — the actual schema pattern
CREATE POLICY "billing_events_workspace_select"
  ON public.billing_events
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- Only service role can insert billing events (webhooks use service role)
-- Standard users cannot insert billing events directly
CREATE POLICY "billing_events_workspace_insert"
  ON public.billing_events
  FOR INSERT
  WITH CHECK (false); -- Blocked for all authenticated users; service role bypasses RLS

-- ─── Audit log: prevent standard user deletion ─────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    -- Drop existing delete policy if any
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs';
    
    -- Prevent any authenticated user from deleting audit log entries
    EXECUTE '
      CREATE POLICY "audit_logs_no_delete"
        ON public.audit_logs
        FOR DELETE
        USING (false)
    ';
    
    -- Prevent any authenticated user from updating audit log entries
    EXECUTE '
      CREATE POLICY "audit_logs_no_update"
        ON public.audit_logs
        FOR UPDATE
        USING (false)
    ';
  END IF;
END $$;

-- ─── Indexes for performance ────────────────────────────────────────────────

DO $$
BEGIN
  -- staff_clients workspace index (actual table name in this schema)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_clients') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS staff_clients_owner_id_idx ON public.staff_clients(owner_id)';
  END IF;

  -- dispute_letters index
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispute_letters') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS dispute_letters_owner_id_idx ON public.dispute_letters(owner_id)';
  END IF;

  -- dashboard_metrics index
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dashboard_metrics') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS dashboard_metrics_owner_id_idx ON public.dashboard_metrics(owner_id)';
  END IF;

  -- audit_logs workspace index (only if workspace_id column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'workspace_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_logs_workspace_id_idx ON public.audit_logs(workspace_id)';
  END IF;

  -- audit_logs created_at index (only if created_at column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC)';
  END IF;
END $$;
