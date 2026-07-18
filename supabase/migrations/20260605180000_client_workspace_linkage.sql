-- Client workspace linkage migration
-- Adds workspace_id to staff_clients and client_id to credit_report_uploads

-- 1. Add workspace_id to staff_clients (links client to workspace)
ALTER TABLE public.staff_clients
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 2. Add client_id to credit_report_uploads (links report to a specific client)
ALTER TABLE public.credit_report_uploads
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.staff_clients(id) ON DELETE SET NULL;

ALTER TABLE public.credit_report_uploads
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 3. Add analysis_status to staff_clients for tracking report parsing state
ALTER TABLE public.staff_clients
ADD COLUMN IF NOT EXISTS report_upload_id UUID REFERENCES public.credit_report_uploads(id) ON DELETE SET NULL;

ALTER TABLE public.staff_clients
ADD COLUMN IF NOT EXISTS report_analyzed BOOLEAN DEFAULT false;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_staff_clients_workspace_id ON public.staff_clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_report_uploads_client_id ON public.credit_report_uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_report_uploads_workspace_id ON public.credit_report_uploads(workspace_id);
