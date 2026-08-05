-- Editable SEO overrides for public content. This supplements existing content
-- records and never stores private customer or dispute data.
CREATE TABLE IF NOT EXISTS public.public_content_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path text NOT NULL UNIQUE CHECK (route_path LIKE '/%'),
  content_type text NOT NULL DEFAULT 'page',
  content_record_id uuid,
  seo_title text,
  meta_description text,
  slug text,
  canonical_url text,
  primary_keyword text,
  secondary_keywords text[] NOT NULL DEFAULT '{}',
  og_image_url text,
  index_status text NOT NULL DEFAULT 'index' CHECK (index_status IN ('index', 'noindex')),
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_content_seo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_content_seo FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_content_seo TO authenticated;

CREATE POLICY "seo_platform_admin_select" ON public.public_content_seo
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true));

CREATE POLICY "seo_platform_admin_insert" ON public.public_content_seo
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true));

CREATE POLICY "seo_platform_admin_update" ON public.public_content_seo
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true));

CREATE POLICY "seo_platform_admin_delete" ON public.public_content_seo
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = (SELECT auth.uid()) AND pa.active = true));

CREATE INDEX IF NOT EXISTS public_content_seo_status_idx ON public.public_content_seo(index_status);
CREATE INDEX IF NOT EXISTS public_content_seo_slug_idx ON public.public_content_seo(slug);
