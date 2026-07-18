-- Auto-disputes from credit report analysis
-- Adds columns to existing client_disputes table and enhances dispute_letters with item-level tracking

-- 1. Add columns to dispute_letters for item-level tracking
ALTER TABLE public.dispute_letters
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.staff_clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS creditor_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS account_number TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS negative_item_type TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS date_reported DATE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS workspace_id UUID,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES public.credit_report_analyses(id) ON DELETE SET NULL;

-- 2. Add missing columns to existing client_disputes table
ALTER TABLE public.client_disputes
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS workspace_id UUID,
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES public.credit_report_analyses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS letter_id UUID REFERENCES public.dispute_letters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS creditor_name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS account_number TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS negative_item_type TEXT NOT NULL DEFAULT 'other',
ADD COLUMN IF NOT EXISTS dispute_reason TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS dispute_letter_template TEXT DEFAULT 'FCRA Section 611',
ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS date_reported DATE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS response_due_date DATE,
ADD COLUMN IF NOT EXISTS days_remaining INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT true;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_dispute_letters_client_id ON public.dispute_letters(client_id);
CREATE INDEX IF NOT EXISTS idx_dispute_letters_auto_generated ON public.dispute_letters(auto_generated);
CREATE INDEX IF NOT EXISTS idx_client_disputes_owner_id ON public.client_disputes(owner_id);
CREATE INDEX IF NOT EXISTS idx_client_disputes_analysis_id ON public.client_disputes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_client_disputes_bureau ON public.client_disputes(bureau);
CREATE INDEX IF NOT EXISTS idx_client_disputes_status ON public.client_disputes(dispute_status);

-- 4. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_client_disputes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. Enable RLS (already enabled, safe to re-run)
ALTER TABLE public.client_disputes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies — use client_id -> staff_clients.owner_id for rows without owner_id,
--    and owner_id directly when set
DROP POLICY IF EXISTS "users_manage_own_client_disputes" ON public.client_disputes;
CREATE POLICY "users_manage_own_client_disputes"
ON public.client_disputes
FOR ALL
TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.staff_clients sc
        WHERE sc.id = client_disputes.client_id
          AND sc.owner_id = auth.uid()
    )
)
WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.staff_clients sc
        WHERE sc.id = client_disputes.client_id
          AND sc.owner_id = auth.uid()
    )
);

-- 7. Triggers
DROP TRIGGER IF EXISTS update_client_disputes_updated_at ON public.client_disputes;
CREATE TRIGGER update_client_disputes_updated_at
    BEFORE UPDATE ON public.client_disputes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_disputes_updated_at();
