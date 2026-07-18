-- Credit Report Onboarding Migration
-- Tables: credit_report_uploads, credit_report_analyses, dispute_recommendations

-- 1. Types
DROP TYPE IF EXISTS public.upload_status CASCADE;
CREATE TYPE public.upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');

DROP TYPE IF EXISTS public.negative_item_type CASCADE;
CREATE TYPE public.negative_item_type AS ENUM ('collection', 'charge_off', 'late_payment', 'repossession', 'bankruptcy', 'hard_inquiry', 'other');

DROP TYPE IF EXISTS public.dispute_priority CASCADE;
CREATE TYPE public.dispute_priority AS ENUM ('high', 'medium', 'low');

-- 2. Core Tables
CREATE TABLE IF NOT EXISTS public.credit_report_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT,
    source_bureau TEXT,
    upload_status public.upload_status DEFAULT 'pending'::public.upload_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.credit_report_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES public.credit_report_uploads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    total_negative_accounts INTEGER DEFAULT 0,
    total_collections INTEGER DEFAULT 0,
    total_charge_offs INTEGER DEFAULT 0,
    total_late_payments INTEGER DEFAULT 0,
    total_repossessions INTEGER DEFAULT 0,
    total_bankruptcies INTEGER DEFAULT 0,
    total_hard_inquiries INTEGER DEFAULT 0,
    estimated_score_impact INTEGER DEFAULT 0,
    improvement_opportunities INTEGER DEFAULT 0,
    raw_analysis JSONB,
    negative_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.dispute_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.credit_report_analyses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    item_type public.negative_item_type NOT NULL,
    creditor_name TEXT,
    account_number TEXT,
    dispute_reason TEXT NOT NULL,
    dispute_letter_template TEXT,
    priority public.dispute_priority DEFAULT 'medium'::public.dispute_priority,
    bureau TEXT,
    amount DECIMAL(12,2),
    date_reported DATE,
    is_disputed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_credit_report_uploads_user_id ON public.credit_report_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_report_analyses_upload_id ON public.credit_report_analyses(upload_id);
CREATE INDEX IF NOT EXISTS idx_credit_report_analyses_user_id ON public.credit_report_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_recommendations_analysis_id ON public.dispute_recommendations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_dispute_recommendations_user_id ON public.dispute_recommendations(user_id);

-- 4. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_credit_upload_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. Enable RLS
ALTER TABLE public.credit_report_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_report_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_recommendations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "users_manage_own_credit_report_uploads" ON public.credit_report_uploads;
CREATE POLICY "users_manage_own_credit_report_uploads"
ON public.credit_report_uploads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_credit_report_analyses" ON public.credit_report_analyses;
CREATE POLICY "users_manage_own_credit_report_analyses"
ON public.credit_report_analyses
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_dispute_recommendations" ON public.dispute_recommendations;
CREATE POLICY "users_manage_own_dispute_recommendations"
ON public.dispute_recommendations
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. Triggers
DROP TRIGGER IF EXISTS update_credit_upload_updated_at ON public.credit_report_uploads;
CREATE TRIGGER update_credit_upload_updated_at
    BEFORE UPDATE ON public.credit_report_uploads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_credit_upload_updated_at();
