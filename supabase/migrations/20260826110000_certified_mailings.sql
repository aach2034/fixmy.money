-- Certified mailings for dispute letters.
-- No seed/demo data; stores only per-user mailing metadata and USPS tracking state.

CREATE TABLE IF NOT EXISTS public.certified_mailings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.staff_clients(id) ON DELETE CASCADE,
    dispute_letter_id UUID REFERENCES public.dispute_letters(id) ON DELETE SET NULL,
    generated_dispute_letter_id UUID REFERENCES public.generated_dispute_letters(id) ON DELETE SET NULL,
    dispute_round_id UUID REFERENCES public.dispute_rounds(id) ON DELETE SET NULL,
    bureau TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'usps',
    service_type TEXT NOT NULL DEFAULT 'certified_mail',
    return_receipt_electronic BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'not_mailed',
    tracking_number TEXT DEFAULT '',
    amount_paid_cents INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD',
    sender_address JSONB NOT NULL DEFAULT '{}'::JSONB,
    destination_address JSONB NOT NULL DEFAULT '{}'::JSONB,
    provider_request_id TEXT NOT NULL DEFAULT '',
    provider_label_id TEXT DEFAULT '',
    label_file_ref TEXT DEFAULT '',
    proof_of_delivery_ref TEXT DEFAULT '',
    return_receipt_status TEXT DEFAULT '',
    usps_status TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    mailed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    last_tracked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT certified_mailings_status_check CHECK (
      status IN ('not_mailed', 'ready_for_purchase', 'label_created', 'in_transit', 'delivered', 'delivery_issue', 'canceled')
    ),
    CONSTRAINT certified_mailings_one_letter_check CHECK (
      (dispute_letter_id IS NOT NULL AND generated_dispute_letter_id IS NULL)
      OR (dispute_letter_id IS NULL AND generated_dispute_letter_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_certified_mailings_owner ON public.certified_mailings(owner_id);
CREATE INDEX IF NOT EXISTS idx_certified_mailings_client ON public.certified_mailings(client_id);
CREATE INDEX IF NOT EXISTS idx_certified_mailings_round ON public.certified_mailings(dispute_round_id);
CREATE INDEX IF NOT EXISTS idx_certified_mailings_tracking ON public.certified_mailings(tracking_number);

CREATE UNIQUE INDEX IF NOT EXISTS certified_mailings_dispute_letter_once
ON public.certified_mailings(owner_id, dispute_letter_id)
WHERE dispute_letter_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certified_mailings_generated_letter_once
ON public.certified_mailings(owner_id, generated_dispute_letter_id)
WHERE generated_dispute_letter_id IS NOT NULL;

ALTER TABLE public.certified_mailings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_certified_mailings" ON public.certified_mailings;
CREATE POLICY "users_manage_own_certified_mailings"
ON public.certified_mailings
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_certified_mailings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_certified_mailings_updated_at ON public.certified_mailings;
CREATE TRIGGER trg_certified_mailings_updated_at
    BEFORE UPDATE ON public.certified_mailings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_certified_mailings_updated_at();
