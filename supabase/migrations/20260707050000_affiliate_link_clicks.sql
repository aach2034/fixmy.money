-- Affiliate link clicks tracking table
CREATE TABLE IF NOT EXISTS public.affiliate_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.staff_clients(id) ON DELETE SET NULL,
  agency_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  provider text NOT NULL,
  source_page text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  report_uploaded_afterward boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.affiliate_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_own_clicks" ON public.affiliate_link_clicks
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Report providers settings table (per agency)
CREATE TABLE IF NOT EXISTS public.report_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  provider_name text NOT NULL,
  affiliate_url text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  is_preferred boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider_key)
);

ALTER TABLE public.report_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_own_provider_settings" ON public.report_provider_settings
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Affiliate disclosure text per workspace
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS affiliate_disclosure text DEFAULT 'Disclosure: FixMy.Money or your credit specialist may receive compensation if you sign up through this link. You are not required to use this provider. You may upload a report from another supported provider.';
