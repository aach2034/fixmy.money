-- Credit Report Import Workflow Migration
-- Adds: credit_report_imports, credit_report_snapshots, import_comparisons
-- Extends: parsed_credit_reports with import workflow fields
-- Extends: negative_items with tagging workflow fields

-- ─── Extend parsed_credit_reports ────────────────────────────────────────────

ALTER TABLE public.parsed_credit_reports
  ADD COLUMN IF NOT EXISTS import_method TEXT DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS tagged_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS all_inquiries JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS public_records JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS section_confidence JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS all_accounts JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS snapshot_saved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS audit_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS importing_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_date TEXT DEFAULT '';

-- ─── Extend negative_items with tagging fields ────────────────────────────────

ALTER TABLE public.negative_items
  ADD COLUMN IF NOT EXISTS tag_status TEXT DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS is_negative BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_collection BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tagged_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_import_id UUID REFERENCES public.parsed_credit_reports(id) ON DELETE SET NULL;

-- ─── credit_report_imports ────────────────────────────────────────────────────
-- Tracks each import attempt with metadata

CREATE TABLE IF NOT EXISTS public.credit_report_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    import_method TEXT NOT NULL DEFAULT 'upload',
    provider TEXT NOT NULL DEFAULT 'unknown',
    provider_confidence INTEGER DEFAULT 0,
    detected_provider TEXT DEFAULT 'unknown',
    parser_adapter TEXT DEFAULT 'generic',
    parser_version TEXT DEFAULT '1.0.0',
    file_name TEXT DEFAULT '',
    file_type TEXT DEFAULT '',
    file_size_bytes INTEGER DEFAULT 0,
    import_status TEXT NOT NULL DEFAULT 'pending',
    sections_detected TEXT[] DEFAULT ARRAY[]::TEXT[],
    accounts_parsed INTEGER DEFAULT 0,
    accounts_rejected INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    tagged_count INTEGER DEFAULT 0,
    duplicate_matches INTEGER DEFAULT 0,
    unmatched_records INTEGER DEFAULT 0,
    unicode_warnings INTEGER DEFAULT 0,
    save_result TEXT DEFAULT '',
    wizard_items_count INTEGER DEFAULT 0,
    parsed_report_id UUID REFERENCES public.parsed_credit_reports(id) ON DELETE SET NULL,
    error_code TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    diagnostic_log JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_imports_owner ON public.credit_report_imports(owner_id);
CREATE INDEX IF NOT EXISTS idx_credit_imports_client ON public.credit_report_imports(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_imports_status ON public.credit_report_imports(import_status);

-- ─── credit_report_snapshots ──────────────────────────────────────────────────
-- Immutable snapshot of a parsed report at save time

CREATE TABLE IF NOT EXISTS public.credit_report_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    import_id UUID REFERENCES public.credit_report_imports(id) ON DELETE SET NULL,
    parsed_report_id UUID REFERENCES public.parsed_credit_reports(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'unknown',
    report_date TEXT DEFAULT '',
    snapshot_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    scores JSONB DEFAULT '[]'::JSONB,
    personal_info JSONB DEFAULT '{}'::JSONB,
    accounts_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    tagged_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_snapshots_owner ON public.credit_report_snapshots(owner_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_client ON public.credit_report_snapshots(client_id);

-- ─── import_comparisons ───────────────────────────────────────────────────────
-- Stores diff between a new import and the previous snapshot

CREATE TABLE IF NOT EXISTS public.import_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    new_import_id UUID REFERENCES public.credit_report_imports(id) ON DELETE CASCADE,
    previous_snapshot_id UUID REFERENCES public.credit_report_snapshots(id) ON DELETE SET NULL,
    deleted_accounts JSONB DEFAULT '[]'::JSONB,
    corrected_accounts JSONB DEFAULT '[]'::JSONB,
    updated_accounts JSONB DEFAULT '[]'::JSONB,
    verified_accounts JSONB DEFAULT '[]'::JSONB,
    newly_negative JSONB DEFAULT '[]'::JSONB,
    newly_added JSONB DEFAULT '[]'::JSONB,
    balance_changes JSONB DEFAULT '[]'::JSONB,
    status_changes JSONB DEFAULT '[]'::JSONB,
    score_changes JSONB DEFAULT '{}'::JSONB,
    new_inquiries JSONB DEFAULT '[]'::JSONB,
    removed_inquiries JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comparisons_owner ON public.import_comparisons(owner_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_client ON public.import_comparisons(client_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.credit_report_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_credit_imports" ON public.credit_report_imports;
CREATE POLICY "owner_credit_imports" ON public.credit_report_imports
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_snapshots" ON public.credit_report_snapshots;
CREATE POLICY "owner_snapshots" ON public.credit_report_snapshots
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_comparisons" ON public.import_comparisons;
CREATE POLICY "owner_comparisons" ON public.import_comparisons
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ─── Triggers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_import_workflow_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_credit_imports_updated_at ON public.credit_report_imports;
CREATE TRIGGER trg_credit_imports_updated_at BEFORE UPDATE ON public.credit_report_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_import_workflow_updated_at();
