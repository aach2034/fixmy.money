-- Client Portal migration
-- Creates tables for client dispute tracking, timeline, documents, and updates

-- 1. ENUMs
DROP TYPE IF EXISTS public.dispute_status CASCADE;
CREATE TYPE public.dispute_status AS ENUM ('pending', 'in_review', 'submitted', 'resolved', 'closed');

DROP TYPE IF EXISTS public.document_status CASCADE;
CREATE TYPE public.document_status AS ENUM ('pending', 'uploaded', 'reviewed', 'approved', 'rejected');

-- 2. Core tables

-- Client portal accounts (separate from staff auth)
CREATE TABLE IF NOT EXISTS public.client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Disputes linked to client accounts
CREATE TABLE IF NOT EXISTS public.client_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
    case_number TEXT NOT NULL,
    title TEXT NOT NULL,
    bureau TEXT NOT NULL DEFAULT '',
    dispute_status public.dispute_status DEFAULT 'pending'::public.dispute_status,
    description TEXT DEFAULT '',
    opened_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Timeline events for each dispute
CREATE TABLE IF NOT EXISTS public.dispute_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES public.client_disputes(id) ON DELETE CASCADE,
    event_title TEXT NOT NULL,
    event_description TEXT DEFAULT '',
    event_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Automated updates / notifications for clients
CREATE TABLE IF NOT EXISTS public.client_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
    dispute_id UUID REFERENCES public.client_disputes(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Documents uploaded by clients
CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
    dispute_id UUID REFERENCES public.client_disputes(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT DEFAULT '',
    doc_status public.document_status DEFAULT 'uploaded'::public.document_status,
    notes TEXT DEFAULT '',
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_client_accounts_email ON public.client_accounts(email);
CREATE INDEX IF NOT EXISTS idx_client_disputes_client_id ON public.client_disputes(client_id);
CREATE INDEX IF NOT EXISTS idx_dispute_timeline_dispute_id ON public.dispute_timeline_events(dispute_id);
CREATE INDEX IF NOT EXISTS idx_client_updates_client_id ON public.client_updates(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_dispute_id ON public.client_documents(dispute_id);

-- 4. Functions
CREATE OR REPLACE FUNCTION public.update_client_portal_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. Enable RLS
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- client_accounts: clients can read their own account (matched by email via JWT)
DROP POLICY IF EXISTS "clients_read_own_account" ON public.client_accounts;
CREATE POLICY "clients_read_own_account"
ON public.client_accounts
FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "clients_update_own_account" ON public.client_accounts;
CREATE POLICY "clients_update_own_account"
ON public.client_accounts
FOR UPDATE
TO authenticated
USING (email = auth.jwt() ->> 'email')
WITH CHECK (email = auth.jwt() ->> 'email');

-- Staff (authenticated users with user_profiles) can manage all client data
DROP POLICY IF EXISTS "staff_manage_client_accounts" ON public.client_accounts;
CREATE POLICY "staff_manage_client_accounts"
ON public.client_accounts
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
    )
);

-- client_disputes
DROP POLICY IF EXISTS "clients_view_own_disputes" ON public.client_disputes;
CREATE POLICY "clients_view_own_disputes"
ON public.client_disputes
FOR SELECT
TO authenticated
USING (
    client_id IN (
        SELECT id FROM public.client_accounts WHERE email = auth.jwt() ->> 'email'
    )
);

DROP POLICY IF EXISTS "staff_manage_client_disputes" ON public.client_disputes;
CREATE POLICY "staff_manage_client_disputes"
ON public.client_disputes
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid())
);

-- dispute_timeline_events
DROP POLICY IF EXISTS "clients_view_own_timeline" ON public.dispute_timeline_events;
CREATE POLICY "clients_view_own_timeline"
ON public.dispute_timeline_events
FOR SELECT
TO authenticated
USING (
    dispute_id IN (
        SELECT cd.id FROM public.client_disputes cd
        JOIN public.client_accounts ca ON cd.client_id = ca.id
        WHERE ca.email = auth.jwt() ->> 'email'
    )
);

DROP POLICY IF EXISTS "staff_manage_timeline" ON public.dispute_timeline_events;
CREATE POLICY "staff_manage_timeline"
ON public.dispute_timeline_events
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid())
);

-- client_updates
DROP POLICY IF EXISTS "clients_manage_own_updates" ON public.client_updates;
CREATE POLICY "clients_manage_own_updates"
ON public.client_updates
FOR ALL
TO authenticated
USING (
    client_id IN (
        SELECT id FROM public.client_accounts WHERE email = auth.jwt() ->> 'email'
    )
)
WITH CHECK (
    client_id IN (
        SELECT id FROM public.client_accounts WHERE email = auth.jwt() ->> 'email'
    )
);

DROP POLICY IF EXISTS "staff_manage_client_updates" ON public.client_updates;
CREATE POLICY "staff_manage_client_updates"
ON public.client_updates
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid())
);

-- client_documents
DROP POLICY IF EXISTS "clients_manage_own_documents" ON public.client_documents;
CREATE POLICY "clients_manage_own_documents"
ON public.client_documents
FOR ALL
TO authenticated
USING (
    client_id IN (
        SELECT id FROM public.client_accounts WHERE email = auth.jwt() ->> 'email'
    )
)
WITH CHECK (
    client_id IN (
        SELECT id FROM public.client_accounts WHERE email = auth.jwt() ->> 'email'
    )
);

DROP POLICY IF EXISTS "staff_manage_client_documents" ON public.client_documents;
CREATE POLICY "staff_manage_client_documents"
ON public.client_documents
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid())
);

-- 7. Triggers
DROP TRIGGER IF EXISTS update_client_accounts_updated_at ON public.client_accounts;
CREATE TRIGGER update_client_accounts_updated_at
    BEFORE UPDATE ON public.client_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_portal_updated_at();

DROP TRIGGER IF EXISTS update_client_disputes_updated_at ON public.client_disputes;
CREATE TRIGGER update_client_disputes_updated_at
    BEFORE UPDATE ON public.client_disputes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_portal_updated_at();

-- 8. Demo data
DO $$
DECLARE
    demo_client_uuid UUID := gen_random_uuid();
    demo_dispute1_uuid UUID := gen_random_uuid();
    demo_dispute2_uuid UUID := gen_random_uuid();
    demo_auth_uuid UUID := gen_random_uuid();
BEGIN
    -- Create a demo auth user for the client portal
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES (
        demo_auth_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'client@demo.com', crypt('client123', gen_salt('bf', 10)), now(), now(), now(),
        jsonb_build_object('full_name', 'Sarah Johnson', 'is_client', true),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
        false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    ) ON CONFLICT (id) DO NOTHING;

    -- Create client account record
    INSERT INTO public.client_accounts (id, email, full_name, phone)
    VALUES (demo_client_uuid, 'client@demo.com', 'Sarah Johnson', '(555) 234-5678')
    ON CONFLICT (email) DO NOTHING;

    -- Get the actual client id in case it already existed
    SELECT id INTO demo_client_uuid FROM public.client_accounts WHERE email = 'client@demo.com' LIMIT 1;

    IF demo_client_uuid IS NOT NULL THEN
        -- Create disputes
        INSERT INTO public.client_disputes (id, client_id, case_number, title, bureau, dispute_status, description, opened_at)
        VALUES
            (demo_dispute1_uuid, demo_client_uuid, 'CF-2026-0041', 'Incorrect Late Payment - Capital One', 'Equifax',
             'in_review'::public.dispute_status,
             'Account shows a 30-day late payment in March 2025 that was paid on time. Bank statement confirms on-time payment.',
             now() - INTERVAL '18 days'),
            (demo_dispute2_uuid, demo_client_uuid, 'CF-2026-0038', 'Collection Account - Not Mine', 'TransUnion',
             'submitted'::public.dispute_status,
             'A collection account from ABC Collections appears on the report. This account does not belong to me.',
             now() - INTERVAL '32 days')
        ON CONFLICT (id) DO NOTHING;

        -- Timeline events for dispute 1
        INSERT INTO public.dispute_timeline_events (dispute_id, event_title, event_description, event_date)
        VALUES
            (demo_dispute1_uuid, 'Dispute Opened', 'Your dispute case has been created and assigned case number CF-2026-0041.', now() - INTERVAL '18 days'),
            (demo_dispute1_uuid, 'Documents Requested', 'We need your bank statement from March 2025 to support this dispute.', now() - INTERVAL '15 days'),
            (demo_dispute1_uuid, 'Documents Received', 'Bank statement received and verified. Dispute letter being prepared.', now() - INTERVAL '10 days'),
            (demo_dispute1_uuid, 'Under Review', 'Your dispute is currently under review by our team.', now() - INTERVAL '5 days')
        ON CONFLICT (id) DO NOTHING;

        -- Timeline events for dispute 2
        INSERT INTO public.dispute_timeline_events (dispute_id, event_title, event_description, event_date)
        VALUES
            (demo_dispute2_uuid, 'Dispute Opened', 'Your dispute case has been created and assigned case number CF-2026-0038.', now() - INTERVAL '32 days'),
            (demo_dispute2_uuid, 'Letter Submitted', 'Dispute letter submitted to TransUnion. Awaiting their response within 30 days.', now() - INTERVAL '25 days'),
            (demo_dispute2_uuid, 'Bureau Acknowledged', 'TransUnion has acknowledged receipt of your dispute and begun their investigation.', now() - INTERVAL '18 days')
        ON CONFLICT (id) DO NOTHING;

        -- Client updates / notifications
        INSERT INTO public.client_updates (client_id, dispute_id, subject, message, is_read)
        VALUES
            (demo_client_uuid, demo_dispute1_uuid, 'Documents Needed for CF-2026-0041',
             'Hi Sarah, we need your bank statement from March 2025 to proceed with your Capital One dispute. Please upload it at your earliest convenience.', true),
            (demo_client_uuid, demo_dispute1_uuid, 'Update: Dispute Under Review',
             'Great news! We have received your documents and your dispute is now under active review. We will notify you of any updates.', false),
            (demo_client_uuid, demo_dispute2_uuid, 'Dispute Letter Submitted to TransUnion',
             'Your dispute letter for the collection account has been submitted to TransUnion. They have up to 30 days to respond.', false)
        ON CONFLICT (id) DO NOTHING;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Demo data insertion failed: %', SQLERRM;
END $$;
