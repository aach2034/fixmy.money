-- Staff-side clients roster and dispute letters migration
-- Provides live data for dashboard, client roster, and dispute letter tables

-- 1. ENUMs
DROP TYPE IF EXISTS public.case_stage CASCADE;
CREATE TYPE public.case_stage AS ENUM ('lead', 'enrolled', 'active', 'onhold', 'completed', 'churned');

DROP TYPE IF EXISTS public.subscription_status CASCADE;
CREATE TYPE public.subscription_status AS ENUM ('paid', 'overdue', 'pending');

DROP TYPE IF EXISTS public.letter_status CASCADE;
CREATE TYPE public.letter_status AS ENUM ('draft', 'sent', 'awaiting', 'received', 'escalated', 'closed');

-- 2. Core tables

-- Staff-managed client roster (separate from client_accounts portal)
CREATE TABLE IF NOT EXISTS public.staff_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    enrolled_date DATE DEFAULT CURRENT_DATE,
    case_stage public.case_stage DEFAULT 'lead'::public.case_stage,
    active_disputes INTEGER DEFAULT 0,
    items_deleted INTEGER DEFAULT 0,
    subscription_status public.subscription_status DEFAULT 'pending'::public.subscription_status,
    plan TEXT DEFAULT 'Starter',
    last_activity TEXT DEFAULT 'Just added',
    next_task_due TEXT DEFAULT '',
    next_task_label TEXT DEFAULT '',
    assigned_staff TEXT DEFAULT '',
    bureaus TEXT[] DEFAULT ARRAY[]::TEXT[],
    credit_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Dispute letters table
CREATE TABLE IF NOT EXISTS public.dispute_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    letter_id TEXT NOT NULL DEFAULT '',
    client_name TEXT NOT NULL DEFAULT '',
    bureau TEXT NOT NULL DEFAULT '',
    items_count INTEGER DEFAULT 1,
    round INTEGER DEFAULT 1,
    sent_date DATE DEFAULT CURRENT_DATE,
    response_due_date DATE,
    days_remaining INTEGER DEFAULT 30,
    letter_status public.letter_status DEFAULT 'draft'::public.letter_status,
    assigned_staff TEXT DEFAULT '',
    template TEXT DEFAULT 'FCRA Section 611',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard metrics snapshot (aggregated KPIs per workspace owner)
CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    active_clients INTEGER DEFAULT 0,
    disputes_in_flight INTEGER DEFAULT 0,
    items_deleted_mtd INTEGER DEFAULT 0,
    overdue_tasks INTEGER DEFAULT 0,
    mrr NUMERIC(12,2) DEFAULT 0,
    bureau_response_rate NUMERIC(5,2) DEFAULT 0,
    letters_sent_mtd INTEGER DEFAULT 0,
    new_clients_this_month INTEGER DEFAULT 0,
    new_clients_this_week INTEGER DEFAULT 0,
    disputes_due_this_week INTEGER DEFAULT 0,
    critical_overdue_tasks INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Disputes by bureau chart data (monthly)
CREATE TABLE IF NOT EXISTS public.disputes_by_bureau (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    month TEXT NOT NULL DEFAULT '',
    equifax INTEGER DEFAULT 0,
    experian INTEGER DEFAULT 0,
    transunion INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_staff_clients_owner_id ON public.staff_clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_clients_case_stage ON public.staff_clients(case_stage);
CREATE INDEX IF NOT EXISTS idx_dispute_letters_owner_id ON public.dispute_letters(owner_id);
CREATE INDEX IF NOT EXISTS idx_dispute_letters_status ON public.dispute_letters(letter_status);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_owner_id ON public.dashboard_metrics(owner_id);
CREATE INDEX IF NOT EXISTS idx_disputes_by_bureau_owner_id ON public.disputes_by_bureau(owner_id);

-- 4. Functions
CREATE OR REPLACE FUNCTION public.update_staff_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. Enable RLS
ALTER TABLE public.staff_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes_by_bureau ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "users_manage_own_staff_clients" ON public.staff_clients;
CREATE POLICY "users_manage_own_staff_clients"
ON public.staff_clients
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_dispute_letters" ON public.dispute_letters;
CREATE POLICY "users_manage_own_dispute_letters"
ON public.dispute_letters
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_dashboard_metrics" ON public.dashboard_metrics;
CREATE POLICY "users_manage_own_dashboard_metrics"
ON public.dashboard_metrics
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_disputes_by_bureau" ON public.disputes_by_bureau;
CREATE POLICY "users_manage_own_disputes_by_bureau"
ON public.disputes_by_bureau
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 7. Triggers
DROP TRIGGER IF EXISTS update_staff_clients_updated_at ON public.staff_clients;
CREATE TRIGGER update_staff_clients_updated_at
    BEFORE UPDATE ON public.staff_clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_staff_updated_at();

DROP TRIGGER IF EXISTS update_dispute_letters_updated_at ON public.dispute_letters;
CREATE TRIGGER update_dispute_letters_updated_at
    BEFORE UPDATE ON public.dispute_letters
    FOR EACH ROW
    EXECUTE FUNCTION public.update_staff_updated_at();

-- Production migrations intentionally contain no seed data.
-- Synthetic fixtures live exclusively in src/lib/demo/demoData.ts.
