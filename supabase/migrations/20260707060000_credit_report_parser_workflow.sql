-- Credit Report Parser Workflow Migration
-- Adds: parsed_credit_reports, negative_items, dispute_rounds, dispute_round_items, generated_dispute_letters
-- No seed data, no demo data, full tenant isolation by owner_id

-- ─── ENUMs ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.dispute_workflow_status AS ENUM (
    'draft', 'ready', 'generated', 'sent', 'waiting_for_response',
    'updated', 'deleted', 'verified', 'escalated', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.negative_item_category AS ENUM (
    'collection', 'charge_off', 'late_payment', 'repossession',
    'foreclosure', 'bankruptcy', 'public_record', 'hard_inquiry',
    'derogatory', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── parsed_credit_reports ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parsed_credit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'unknown',
    provider_confidence INTEGER DEFAULT 0,
    parser_version TEXT DEFAULT '2.0.0',
    overall_confidence INTEGER DEFAULT 0,
    sections_parsed TEXT[] DEFAULT ARRAY[]::TEXT[],
    sections_missed TEXT[] DEFAULT ARRAY[]::TEXT[],
    warnings JSONB DEFAULT '[]'::JSONB,
    personal_info JSONB DEFAULT '{}'::JSONB,
    scores JSONB DEFAULT '[]'::JSONB,
    accounts_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    collections_count INTEGER DEFAULT 0,
    inquiries_count INTEGER DEFAULT 0,
    public_records_count INTEGER DEFAULT 0,
    raw_text TEXT DEFAULT '',
    file_name TEXT DEFAULT '',
    file_type TEXT DEFAULT '',
    status TEXT DEFAULT 'pending_review',
    reviewed_at TIMESTAMPTZ,
    saved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parsed_reports_owner ON public.parsed_credit_reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_parsed_reports_client ON public.parsed_credit_reports(client_id);

-- ─── negative_items ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.negative_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.parsed_credit_reports(id) ON DELETE SET NULL,
    bureau TEXT NOT NULL DEFAULT 'Unknown',
    creditor_name TEXT NOT NULL DEFAULT '',
    furnisher_name TEXT DEFAULT '',
    account_number_masked TEXT DEFAULT '',
    account_type TEXT DEFAULT '',
    status TEXT DEFAULT '',
    balance NUMERIC(12,2),
    past_due NUMERIC(12,2),
    date_opened TEXT DEFAULT '',
    date_reported TEXT DEFAULT '',
    date_last_activity TEXT DEFAULT '',
    negative_reason TEXT DEFAULT '',
    negative_category public.negative_item_category DEFAULT 'other'::public.negative_item_category,
    dispute_reason TEXT DEFAULT '',
    dispute_instruction TEXT DEFAULT '',
    dispute_status public.dispute_workflow_status DEFAULT 'draft'::public.dispute_workflow_status,
    is_selected BOOLEAN DEFAULT FALSE,
    raw_text_source TEXT DEFAULT '',
    parser_confidence INTEGER DEFAULT 0,
    remarks TEXT[] DEFAULT ARRAY[]::TEXT[],
    bureaus_reporting TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_negative_items_owner ON public.negative_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_negative_items_client ON public.negative_items(client_id);
CREATE INDEX IF NOT EXISTS idx_negative_items_report ON public.negative_items(report_id);
CREATE INDEX IF NOT EXISTS idx_negative_items_bureau ON public.negative_items(bureau);
CREATE INDEX IF NOT EXISTS idx_negative_items_status ON public.negative_items(dispute_status);

-- ─── dispute_rounds ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dispute_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    round_number INTEGER DEFAULT 1,
    title TEXT DEFAULT '',
    status public.dispute_workflow_status DEFAULT 'draft'::public.dispute_workflow_status,
    items_count INTEGER DEFAULT 0,
    bureaus TEXT[] DEFAULT ARRAY[]::TEXT[],
    letters_generated INTEGER DEFAULT 0,
    mailed_at TIMESTAMPTZ,
    follow_up_date TIMESTAMPTZ,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dispute_rounds_owner ON public.dispute_rounds(owner_id);
CREATE INDEX IF NOT EXISTS idx_dispute_rounds_client ON public.dispute_rounds(client_id);

-- ─── dispute_round_items ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dispute_round_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES public.dispute_rounds(id) ON DELETE CASCADE,
    negative_item_id UUID REFERENCES public.negative_items(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    bureau TEXT NOT NULL DEFAULT 'Unknown',
    creditor_name TEXT DEFAULT '',
    account_number_masked TEXT DEFAULT '',
    account_type TEXT DEFAULT '',
    negative_reason TEXT DEFAULT '',
    dispute_reason TEXT DEFAULT '',
    dispute_instruction TEXT DEFAULT '',
    status public.dispute_workflow_status DEFAULT 'draft'::public.dispute_workflow_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_round_items_round ON public.dispute_round_items(round_id);
CREATE INDEX IF NOT EXISTS idx_round_items_owner ON public.dispute_round_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_round_items_client ON public.dispute_round_items(client_id);

-- ─── generated_dispute_letters ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.generated_dispute_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.dispute_rounds(id) ON DELETE CASCADE,
    bureau TEXT NOT NULL DEFAULT 'Unknown',
    letter_content TEXT DEFAULT '',
    items_count INTEGER DEFAULT 0,
    items_summary JSONB DEFAULT '[]'::JSONB,
    status public.dispute_workflow_status DEFAULT 'generated'::public.dispute_workflow_status,
    mailed_at TIMESTAMPTZ,
    response_due_date DATE,
    days_remaining INTEGER,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gen_letters_owner ON public.generated_dispute_letters(owner_id);
CREATE INDEX IF NOT EXISTS idx_gen_letters_client ON public.generated_dispute_letters(client_id);
CREATE INDEX IF NOT EXISTS idx_gen_letters_round ON public.generated_dispute_letters(round_id);
CREATE INDEX IF NOT EXISTS idx_gen_letters_bureau ON public.generated_dispute_letters(bureau);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.parsed_credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negative_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_round_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_dispute_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_parsed_reports" ON public.parsed_credit_reports;
CREATE POLICY "owner_parsed_reports" ON public.parsed_credit_reports
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_negative_items" ON public.negative_items;
CREATE POLICY "owner_negative_items" ON public.negative_items
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_dispute_rounds" ON public.dispute_rounds;
CREATE POLICY "owner_dispute_rounds" ON public.dispute_rounds
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_round_items" ON public.dispute_round_items;
CREATE POLICY "owner_round_items" ON public.dispute_round_items
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_gen_letters" ON public.generated_dispute_letters;
CREATE POLICY "owner_gen_letters" ON public.generated_dispute_letters
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ─── Triggers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_parser_workflow_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_parsed_reports_updated_at ON public.parsed_credit_reports;
CREATE TRIGGER trg_parsed_reports_updated_at BEFORE UPDATE ON public.parsed_credit_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_parser_workflow_updated_at();

DROP TRIGGER IF EXISTS trg_negative_items_updated_at ON public.negative_items;
CREATE TRIGGER trg_negative_items_updated_at BEFORE UPDATE ON public.negative_items
  FOR EACH ROW EXECUTE FUNCTION public.update_parser_workflow_updated_at();

DROP TRIGGER IF EXISTS trg_dispute_rounds_updated_at ON public.dispute_rounds;
CREATE TRIGGER trg_dispute_rounds_updated_at BEFORE UPDATE ON public.dispute_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_parser_workflow_updated_at();

DROP TRIGGER IF EXISTS trg_round_items_updated_at ON public.dispute_round_items;
CREATE TRIGGER trg_round_items_updated_at BEFORE UPDATE ON public.dispute_round_items
  FOR EACH ROW EXECUTE FUNCTION public.update_parser_workflow_updated_at();

DROP TRIGGER IF EXISTS trg_gen_letters_updated_at ON public.generated_dispute_letters;
CREATE TRIGGER trg_gen_letters_updated_at BEFORE UPDATE ON public.generated_dispute_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_parser_workflow_updated_at();
