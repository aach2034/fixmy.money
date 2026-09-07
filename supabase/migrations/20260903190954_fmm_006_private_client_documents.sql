-- FMM-006: private, tenant-scoped client document storage.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS client_documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS client_documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS client_documents_storage_update ON storage.objects;
DROP POLICY IF EXISTS client_documents_storage_delete ON storage.objects;

CREATE POLICY client_documents_storage_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = private.safe_uuid((storage.foldername(name))[2])
      AND relationship.workspace_id = private.safe_uuid((storage.foldername(name))[1])
      AND private.can_read_workspace_client(relationship.id)
  )
);

CREATE POLICY client_documents_storage_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = private.safe_uuid((storage.foldername(name))[2])
      AND relationship.workspace_id = private.safe_uuid((storage.foldername(name))[1])
      AND (
        private.can_write_workspace_client(relationship.id)
        OR private.portal_owns_workspace_client(relationship.id)
      )
  )
);

CREATE POLICY client_documents_storage_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = private.safe_uuid((storage.foldername(name))[2])
      AND relationship.workspace_id = private.safe_uuid((storage.foldername(name))[1])
      AND (
        private.can_write_workspace_client(relationship.id)
        OR private.portal_owns_workspace_client(relationship.id)
      )
  )
)
WITH CHECK (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = private.safe_uuid((storage.foldername(name))[2])
      AND relationship.workspace_id = private.safe_uuid((storage.foldername(name))[1])
      AND (
        private.can_write_workspace_client(relationship.id)
        OR private.portal_owns_workspace_client(relationship.id)
      )
  )
);

CREATE POLICY client_documents_storage_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1
    FROM public.workspace_client_memberships AS relationship
    WHERE relationship.id = private.safe_uuid((storage.foldername(name))[2])
      AND relationship.workspace_id = private.safe_uuid((storage.foldername(name))[1])
      AND (
        private.can_write_workspace_client(relationship.id)
        OR private.portal_owns_workspace_client(relationship.id)
      )
  )
);
