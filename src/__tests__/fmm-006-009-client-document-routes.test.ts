import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getAdminClient: vi.fn(),
  authorizeWorkspacePlanOperation: vi.fn(),
  adminFrom: vi.fn(),
  adminInsert: vi.fn(),
  adminUpdate: vi.fn(),
  adminDelete: vi.fn(),
  storageFrom: vi.fn(),
  storageUpload: vi.fn(),
  storageRemove: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock('@/lib/subscription/planServer', () => ({
  authorizeWorkspacePlanOperation: mocks.authorizeWorkspacePlanOperation,
}));

import { POST as uploadDocument } from '@/app/api/client-portal/documents/route';
import { GET as accessDocument } from '@/app/api/client-portal/documents/[documentId]/access/route';
import { DELETE as deleteDocument } from '@/app/api/client-portal/documents/[documentId]/route';
import { PlanAuthorizationError } from '@/lib/subscription/planEnforcement';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const ACCOUNT_ID = '20000000-0000-4000-8000-000000000002';
const WORKSPACE_ID = '30000000-0000-4000-8000-000000000003';
const RELATIONSHIP_ID = '40000000-0000-4000-8000-000000000004';
const DOCUMENT_ID = '50000000-0000-4000-8000-000000000005';
const UPLOAD_ID = '60000000-0000-4000-8000-000000000006';
const STORAGE_PATH = `${WORKSPACE_ID}/${RELATIONSHIP_ID}/${UPLOAD_ID}/report.pdf`;
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.neq.mockReturnValue(builder);
  return builder;
}

function serverClient(input: {
  user?: { id: string } | null;
  results?: Record<string, QueryResult[]>;
} = {}) {
  const queues = new Map(
    Object.entries(input.results ?? {}).map(([table, results]) => [table, [...results]]),
  );
  const from = vi.fn((table: string) => {
    const result = queues.get(table)?.shift() ?? { data: null, error: null };
    return query(result);
  });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: input.user === undefined ? { id: USER_ID } : input.user },
    error: null,
  });
  return { auth: { getUser }, from };
}

function portalResults(options: { document?: QueryResult } = {}) {
  return {
    client_accounts: [{ data: { id: ACCOUNT_ID }, error: null }],
    workspace_client_memberships: [{
      data: {
        id: RELATIONSHIP_ID,
        workspace_id: WORKSPACE_ID,
        client_account_id: ACCOUNT_ID,
        status: 'active',
      },
      error: null,
    }],
    ...(options.document ? { client_documents: [options.document] } : {}),
  };
}

function storedDocument() {
  return {
    id: DOCUMENT_ID,
    client_id: ACCOUNT_ID,
    workspace_id: WORKSPACE_ID,
    workspace_client_id: RELATIONSHIP_ID,
    file_name: 'report.pdf',
    file_url: STORAGE_PATH,
    file_size: PDF_BYTES.byteLength,
    mime_type: 'application/pdf',
    doc_status: 'uploaded',
    uploaded_at: '2026-09-12T12:00:00.000Z',
  };
}

function uploadRequest(origin = 'https://fixmy.money') {
  const body = new FormData();
  body.set('file', new File([PDF_BYTES], 'report.pdf', { type: 'application/pdf' }));
  body.set('relationshipId', RELATIONSHIP_ID);
  body.set('uploadId', UPLOAD_ID);
  return new NextRequest('https://fixmy.money/api/client-portal/documents', {
    method: 'POST',
    headers: { origin },
    body,
  });
}

function deleteRequest(origin = 'https://fixmy.money') {
  return new NextRequest(
    `https://fixmy.money/api/client-portal/documents/${DOCUMENT_ID}`,
    { method: 'DELETE', headers: { origin } },
  );
}

function documentParams() {
  return { params: Promise.resolve({ documentId: DOCUMENT_ID }) };
}

function installAdmin() {
  const storageBucket = {
    upload: mocks.storageUpload,
    remove: mocks.storageRemove,
    createSignedUrl: mocks.createSignedUrl,
  };
  const admin = {
    from: mocks.adminFrom,
    storage: { from: mocks.storageFrom },
  };
  mocks.storageFrom.mockReturnValue(storageBucket);
  mocks.getAdminClient.mockReturnValue(admin);
  return admin;
}

describe('FMM-006/FMM-009 client-document route boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';

    mocks.authorizeWorkspacePlanOperation.mockResolvedValue({ allowed: true });
    mocks.adminInsert.mockResolvedValue({ error: null });
    mocks.storageUpload.mockResolvedValue({ data: { path: STORAGE_PATH }, error: null });
    mocks.storageRemove.mockResolvedValue({ data: [], error: null });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://test-project.supabase.co/storage/v1/object/sign/client-documents/signed' },
      error: null,
    });
    mocks.adminUpdate.mockImplementation(() => query({ data: { id: UPLOAD_ID }, error: null }));
    mocks.adminDelete.mockImplementation(() => query({ data: { id: DOCUMENT_ID }, error: null }));
    mocks.adminFrom.mockImplementation((table: string) => {
      if (table !== 'client_documents') throw new Error(`Unexpected admin table: ${table}`);
      return {
        insert: mocks.adminInsert,
        update: mocks.adminUpdate,
        delete: mocks.adminDelete,
      };
    });
    installAdmin();
  });

  it('rejects cross-origin uploads and deletes before authentication or privileged access', async () => {
    const uploadResponse = await uploadDocument(uploadRequest('https://attacker.example'));
    const deleteResponse = await deleteDocument(
      deleteRequest('https://attacker.example'),
      documentParams(),
    );

    expect(uploadResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated upload before tenant, plan, database, or Storage access', async () => {
    const client = serverClient({ user: null });
    mocks.createClient.mockResolvedValue(client);

    const response = await uploadDocument(uploadRequest());

    expect(response.status).toBe(401);
    expect(client.from).not.toHaveBeenCalled();
    expect(mocks.authorizeWorkspacePlanOperation).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it('fails a cross-tenant upload closed before entitlement or privileged writes', async () => {
    const client = serverClient({
      results: {
        client_accounts: [{ data: { id: ACCOUNT_ID }, error: null }],
        workspace_client_memberships: [{ data: null, error: null }],
      },
    });
    mocks.createClient.mockResolvedValue(client);

    const response = await uploadDocument(uploadRequest());

    expect(response.status).toBe(403);
    expect(mocks.authorizeWorkspacePlanOperation).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  it('uploads a valid document only after tenant, entitlement, and quota checks', async () => {
    const client = serverClient({
      results: portalResults({ document: { data: null, error: null } }),
    });
    mocks.createClient.mockResolvedValue(client);

    const response = await uploadDocument(uploadRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      idempotent: false,
      document: { id: UPLOAD_ID, fileName: 'report.pdf', status: 'uploaded' },
    });
    expect(mocks.authorizeWorkspacePlanOperation).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      feature: 'client_portal',
      limit: 'storage_bytes',
      increment: PDF_BYTES.byteLength,
    });
    expect(mocks.adminInsert).toHaveBeenCalledWith(expect.objectContaining({
      id: UPLOAD_ID,
      workspace_client_id: RELATIONSHIP_ID,
      doc_status: 'pending',
    }));
    expect(mocks.storageFrom).toHaveBeenCalledWith('client-documents');
    expect(mocks.storageUpload).toHaveBeenCalledWith(
      STORAGE_PATH,
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: 'application/pdf', upsert: false }),
    );
    expect(mocks.adminUpdate).toHaveBeenCalledWith({ doc_status: 'uploaded' });
    expect(mocks.adminInsert.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.storageUpload.mock.invocationCallOrder[0]);
    expect(mocks.storageUpload.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.adminUpdate.mock.invocationCallOrder[0]);
  });

  it.each([
    ['ENTITLEMENT_REQUIRED', 403],
    ['STORAGE_BYTES_LIMIT_REACHED', 409],
  ] as const)('denies %s before creating a privileged client or writing state', async (code, status) => {
    const client = serverClient({ results: portalResults() });
    mocks.createClient.mockResolvedValue(client);
    mocks.authorizeWorkspacePlanOperation.mockRejectedValue(new PlanAuthorizationError(code, status));

    const response = await uploadDocument(uploadRequest());

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ code });
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
    expect(mocks.adminInsert).not.toHaveBeenCalled();
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  it('issues a short-lived signed download only after authorized tenant and entitlement checks', async () => {
    const client = serverClient({
      results: { client_documents: [{ data: storedDocument(), error: null }] },
    });
    mocks.createClient.mockResolvedValue(client);

    const response = await accessDocument(
      new NextRequest(`https://fixmy.money/api/client-portal/documents/${DOCUMENT_ID}/access`),
      documentParams(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: 'https://test-project.supabase.co/storage/v1/object/sign/client-documents/signed',
      expiresIn: 60,
    });
    expect(mocks.authorizeWorkspacePlanOperation).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      feature: 'client_portal',
    });
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      STORAGE_PATH,
      60,
      { download: 'report.pdf' },
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('does not sign or delete a cross-tenant document hidden by RLS', async () => {
    const accessClient = serverClient({
      results: { client_documents: [{ data: null, error: null }] },
    });
    mocks.createClient.mockResolvedValueOnce(accessClient);
    const accessResponse = await accessDocument(
      new NextRequest(`https://fixmy.money/api/client-portal/documents/${DOCUMENT_ID}/access`),
      documentParams(),
    );

    const deleteClient = serverClient({
      results: portalResults({ document: { data: null, error: null } }),
    });
    mocks.createClient.mockResolvedValueOnce(deleteClient);
    const deleteResponse = await deleteDocument(deleteRequest(), documentParams());

    expect(accessResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
    expect(mocks.storageRemove).not.toHaveBeenCalled();
    expect(mocks.adminDelete).not.toHaveBeenCalled();
  });

  it('deletes the authorized Storage object before deleting its exact metadata row', async () => {
    const client = serverClient({
      results: portalResults({ document: { data: storedDocument(), error: null } }),
    });
    mocks.createClient.mockResolvedValue(client);

    const response = await deleteDocument(deleteRequest(), documentParams());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.storageRemove).toHaveBeenCalledWith([STORAGE_PATH]);
    expect(mocks.adminDelete).toHaveBeenCalledTimes(1);
    expect(mocks.storageRemove.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.adminDelete.mock.invocationCallOrder[0]);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
