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

-- 8. Seed data (linked to existing user_profiles)
DO $$
DECLARE
    existing_user_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN
        SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;

        IF existing_user_id IS NOT NULL THEN

            -- Seed staff_clients
            INSERT INTO public.staff_clients (id, owner_id, name, email, phone, enrolled_date, case_stage, active_disputes, items_deleted, subscription_status, plan, last_activity, next_task_due, next_task_label, assigned_staff, bureaus, credit_score)
            VALUES
                (gen_random_uuid(), existing_user_id, 'Darnell Washington', 'darnell.w@gmail.com', '(404) 555-0182', '2026-03-14', 'active'::public.case_stage, 7, 4, 'paid'::public.subscription_status, 'Growth', '1 hr ago', 'Jun 4', 'Review EQ response', 'Keisha James', ARRAY['EQ','EX','TU'], 582),
                (gen_random_uuid(), existing_user_id, 'Priya Nambiar', 'priya.nambiar@outlook.com', '(512) 555-0247', '2026-02-28', 'active'::public.case_stage, 5, 9, 'paid'::public.subscription_status, 'Growth', '3 hr ago', 'Jun 4', 'Send TU round 2', 'Marcus Reed', ARRAY['EQ','TU'], 614),
                (gen_random_uuid(), existing_user_id, 'Marcus Holloway', 'm.holloway@yahoo.com', '(213) 555-0391', '2026-01-10', 'active'::public.case_stage, 3, 12, 'paid'::public.subscription_status, 'Agency', 'Today', 'Jun 5', 'Draft EX letter', 'Keisha James', ARRAY['EX','TU'], 658),
                (gen_random_uuid(), existing_user_id, 'Tanisha Brooks', 'tanisha.b@gmail.com', '(678) 555-0114', '2026-05-20', 'enrolled'::public.case_stage, 0, 0, 'paid'::public.subscription_status, 'Starter', '2 days ago', 'Jun 3', 'Pull credit report', 'Keisha James', ARRAY[]::TEXT[], 521),
                (gen_random_uuid(), existing_user_id, 'Roberto Fuentes', 'rfuentes@gmail.com', '(305) 555-0673', '2025-11-05', 'active'::public.case_stage, 2, 18, 'paid'::public.subscription_status, 'Growth', 'Yesterday', 'Jun 7', 'EQ round 3 review', 'Marcus Reed', ARRAY['EQ','EX','TU'], 697),
                (gen_random_uuid(), existing_user_id, 'Shaniqua Davis', 'shaniqua.d@hotmail.com', '(770) 555-0829', '2026-04-02', 'onhold'::public.case_stage, 1, 3, 'overdue'::public.subscription_status, 'Starter', '7 days ago', 'Overdue', 'Collect payment', 'Marcus Reed', ARRAY['EQ'], 544),
                (gen_random_uuid(), existing_user_id, 'Adriana Morales', 'adriana.m@gmail.com', '(626) 555-0456', '2026-03-01', 'active'::public.case_stage, 4, 7, 'paid'::public.subscription_status, 'Growth', '12 min ago', 'Jun 6', 'EX response review', 'Keisha James', ARRAY['EQ','EX'], 601),
                (gen_random_uuid(), existing_user_id, 'Jermaine Patterson', 'j.patterson@gmail.com', '(404) 555-0223', '2026-05-28', 'lead'::public.case_stage, 0, 0, 'pending'::public.subscription_status, 'Starter', '1 day ago', 'Jun 3', 'Send welcome email', 'Marcus Reed', ARRAY[]::TEXT[], 498),
                (gen_random_uuid(), existing_user_id, 'Keisha Thornton', 'keisha.t@yahoo.com', '(901) 555-0781', '2025-12-15', 'completed'::public.case_stage, 0, 23, 'paid'::public.subscription_status, 'Growth', '3 days ago', '', '', 'Keisha James', ARRAY['EQ','EX','TU'], 742),
                (gen_random_uuid(), existing_user_id, 'Devon Clarke', 'devon.c@gmail.com', '(617) 555-0349', '2026-02-14', 'active'::public.case_stage, 6, 5, 'paid'::public.subscription_status, 'Agency', '4 hr ago', 'Jun 5', 'TU round 2 letter', 'Marcus Reed', ARRAY['EQ','EX','TU'], 567),
                (gen_random_uuid(), existing_user_id, 'Monique Simmons', 'monique.s@gmail.com', '(312) 555-0512', '2026-04-18', 'active'::public.case_stage, 3, 6, 'paid'::public.subscription_status, 'Growth', '6 hr ago', 'Jun 8', 'EQ follow-up', 'Keisha James', ARRAY['EQ','TU'], 589),
                (gen_random_uuid(), existing_user_id, 'Tyler Nguyen', 'tyler.n@outlook.com', '(832) 555-0187', '2026-01-22', 'churned'::public.case_stage, 0, 2, 'overdue'::public.subscription_status, 'Starter', '3 weeks ago', '', '', 'Marcus Reed', ARRAY['EX'], 511)
            ON CONFLICT (id) DO NOTHING;

            -- Seed dispute_letters
            INSERT INTO public.dispute_letters (id, owner_id, letter_id, client_name, bureau, items_count, round, sent_date, response_due_date, days_remaining, letter_status, assigned_staff, template)
            VALUES
                (gen_random_uuid(), existing_user_id, 'EQ-2847', 'Darnell Washington', 'Equifax', 3, 2, '2026-05-15', '2026-06-14', 12, 'awaiting'::public.letter_status, 'Keisha James', 'FCRA Section 611'),
                (gen_random_uuid(), existing_user_id, 'TU-1923', 'Priya Nambiar', 'TransUnion', 5, 1, '2026-05-19', '2026-06-18', 16, 'awaiting'::public.letter_status, 'Marcus Reed', 'Goodwill Deletion'),
                (gen_random_uuid(), existing_user_id, 'EX-3341', 'Marcus Holloway', 'Experian', 2, 2, '2026-05-02', '2026-06-01', -1, 'received'::public.letter_status, 'Keisha James', 'FCRA Section 611'),
                (gen_random_uuid(), existing_user_id, 'EQ-2901', 'Roberto Fuentes', 'Equifax', 4, 3, '2026-05-22', '2026-06-21', 19, 'sent'::public.letter_status, 'Marcus Reed', 'Method of Verification'),
                (gen_random_uuid(), existing_user_id, 'EX-3190', 'Adriana Morales', 'Experian', 4, 1, '2026-05-28', '2026-06-27', 25, 'sent'::public.letter_status, 'Keisha James', 'FCRA Section 611'),
                (gen_random_uuid(), existing_user_id, 'TU-1887', 'Devon Clarke', 'TransUnion', 6, 2, '2026-04-28', '2026-05-28', -5, 'escalated'::public.letter_status, 'Marcus Reed', 'Debt Validation'),
                (gen_random_uuid(), existing_user_id, 'EQ-2756', 'Monique Simmons', 'Equifax', 3, 1, '2026-05-10', '2026-06-09', 7, 'awaiting'::public.letter_status, 'Keisha James', 'FCRA Section 611'),
                (gen_random_uuid(), existing_user_id, 'EX-3055', 'Keisha Thornton', 'Experian', 2, 3, '2026-04-01', '2026-05-01', -32, 'closed'::public.letter_status, 'Keisha James', 'Goodwill Deletion'),
                (gen_random_uuid(), existing_user_id, 'TU-2011', 'Shaniqua Davis', 'TransUnion', 1, 1, '2026-05-30', '2026-06-29', 27, 'draft'::public.letter_status, 'Marcus Reed', 'FCRA Section 611'),
                (gen_random_uuid(), existing_user_id, 'EQ-2799', 'Devon Clarke', 'Equifax', 3, 1, '2026-05-05', '2026-06-04', 2, 'awaiting'::public.letter_status, 'Marcus Reed', 'Method of Verification'),
                (gen_random_uuid(), existing_user_id, 'EX-3280', 'Darnell Washington', 'Experian', 2, 1, '2026-05-25', '2026-06-24', 22, 'sent'::public.letter_status, 'Keisha James', 'FCRA Section 611'),
                (gen_random_uuid(), existing_user_id, 'TU-1955', 'Roberto Fuentes', 'TransUnion', 5, 2, '2026-04-15', '2026-05-15', -18, 'closed'::public.letter_status, 'Marcus Reed', 'Goodwill Deletion')
            ON CONFLICT (id) DO NOTHING;

            -- Seed dashboard_metrics
            INSERT INTO public.dashboard_metrics (id, owner_id, active_clients, disputes_in_flight, items_deleted_mtd, overdue_tasks, mrr, bureau_response_rate, letters_sent_mtd, new_clients_this_month, new_clients_this_week, disputes_due_this_week, critical_overdue_tasks)
            VALUES (gen_random_uuid(), existing_user_id, 147, 84, 312, 18, 24780.00, 73.2, 209, 12, 23, 7, 5)
            ON CONFLICT (id) DO NOTHING;

            -- Seed disputes_by_bureau chart data
            INSERT INTO public.disputes_by_bureau (id, owner_id, month, equifax, experian, transunion)
            VALUES
                (gen_random_uuid(), existing_user_id, 'Jan', 28, 34, 22),
                (gen_random_uuid(), existing_user_id, 'Feb', 31, 29, 27),
                (gen_random_uuid(), existing_user_id, 'Mar', 42, 38, 35),
                (gen_random_uuid(), existing_user_id, 'Apr', 38, 44, 31),
                (gen_random_uuid(), existing_user_id, 'May', 51, 47, 42),
                (gen_random_uuid(), existing_user_id, 'Jun', 44, 52, 38)
            ON CONFLICT (id) DO NOTHING;

        ELSE
            RAISE NOTICE 'No users found in user_profiles — seed data skipped.';
        END IF;
    ELSE
        RAISE NOTICE 'Table user_profiles does not exist — seed data skipped.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Seed data insertion failed: %', SQLERRM;
END $$;
