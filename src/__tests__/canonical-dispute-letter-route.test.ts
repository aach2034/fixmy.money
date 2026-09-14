import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getAdminClient: vi.fn(),
  authorizeStaffClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: mocks.getAdminClient }));
vi.mock('@/lib/workspaces/authorization', async () => {
  const actual = await vi.importActual<typeof import('@/lib/workspaces/authorization')>('@/lib/workspaces/authorization');
  return { ...actual, authorizeStaffClient: mocks.authorizeStaffClient };
});

import { GET, POST } from '@/app/api/dispute-letters/generate/route';
import { createEvidenceLetterRequest, createRoundLetterRequest } from '@/lib/disputes/letterGenerationBoundary';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const OWNER_ID = '20000000-0000-4000-8000-000000000002';
const CLIENT_ID = '30000000-0000-4000-8000-000000000003';
const WORKSPACE_ID = '40000000-0000-4000-8000-000000000004';
const TARGET_ID = '50000000-0000-4000-8000-000000000005';
const COMPARISON_ID = '60000000-0000-4000-8000-000000000006';
const LOW_ID = '70000000-0000-4000-8000-000000000007';
const ACCOUNT_ID = '80000000-0000-4000-8000-000000000008';
const LOW_ACCOUNT_ID = '90000000-0000-4000-8000-000000000009';
const ROUND_ID = 'a0000000-0000-4000-8000-00000000000a';
const AUDIT_ID = 'b0000000-0000-4000-8000-00000000000b';
const DOCUMENT_ID = 'c0000000-0000-4000-8000-00000000000c';
const MISSING_DOCUMENT_ID = 'd0000000-0000-4000-8000-00000000000d';

const authorization = {
  actorUserId: USER_ID,
  clientId: CLIENT_ID,
  workspaceId: WORKSPACE_ID,
  workspaceOwnerId: OWNER_ID,
  role: 'owner' as const,
};

type QueryResult = { data: any; error: any };
interface Operation {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  payload?: unknown;
  filters: Array<{ method: string; column: string; value: unknown }>;
}

function adminClient(results: Record<string, QueryResult[]>, objectExists: Record<string, boolean> = {}) {
  const queues = new Map(Object.entries(results).map(([table, values]) => [table, [...values]]));
  const operations: Operation[] = [];
  const from = vi.fn((table: string) => {
    let operation: Operation['operation'] = 'select';
    let payload: unknown;
    const filters: Operation['filters'] = [];
    const resolve = () => queues.get(table)?.shift() ?? { data: null, error: null };
    const builder: any = {
      select: vi.fn(() => { operation = 'select'; return builder; }),
      insert: vi.fn((value: unknown) => { operation = 'insert'; payload = value; operations.push({ table, operation, payload, filters }); return builder; }),
      update: vi.fn((value: unknown) => { operation = 'update'; payload = value; operations.push({ table, operation, payload, filters }); return builder; }),
      delete: vi.fn(() => { operation = 'delete'; operations.push({ table, operation, filters }); return builder; }),
      eq: vi.fn((column: string, value: unknown) => { filters.push({ method: 'eq', column, value }); return builder; }),
      neq: vi.fn((column: string, value: unknown) => { filters.push({ method: 'neq', column, value }); return builder; }),
      in: vi.fn((column: string, value: unknown) => { filters.push({ method: 'in', column, value }); return builder; }),
      order: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => resolve()),
      then: (fulfilled: (value: QueryResult) => unknown, rejected?: (reason: unknown) => unknown) => Promise.resolve(resolve()).then(fulfilled, rejected),
    };
    return builder;
  });
  const exists = vi.fn(async (path: string) => ({ data: objectExists[path] === true, error: null }));
  return { from, storage: { from: vi.fn(() => ({ exists })) }, operations, exists };
}

function evidence(id: string, bureau: 'Equifax' | 'Experian', balance: number, parserConfidence = 95) {
  return {
    id,
    owner_id: OWNER_ID,
    client_id: CLIENT_ID,
    report_id: 'e0000000-0000-4000-8000-00000000000e',
    bureau,
    creditor_name: 'Synthetic Bank',
    furnisher_name: 'Synthetic Bank',
    account_number_masked: '****1234',
    account_type: 'credit card',
    status: 'Open',
    payment_status: 'Current',
    balance,
    past_due: 0,
    date_opened: '2024-01-15',
    date_reported: '2026-09-01',
    negative_category: 'derogatory',
    negative_reason: 'Stored report flag',
    is_negative: true,
    parser_confidence: parserConfidence,
  };
}

const target = evidence(TARGET_ID, 'Equifax', 1284);
const comparison = evidence(COMPARISON_ID, 'Experian', 0);
const low = { ...evidence(LOW_ID, 'Equifax', 400, 60), account_number_masked: '****5678' };
const accountLinks = [
  { owner_id: OWNER_ID, client_id: CLIENT_ID, source_negative_item_id: TARGET_ID, credit_account_id: ACCOUNT_ID },
  { owner_id: OWNER_ID, client_id: CLIENT_ID, source_negative_item_id: COMPARISON_ID, credit_account_id: ACCOUNT_ID },
  { owner_id: OWNER_ID, client_id: CLIENT_ID, source_negative_item_id: LOW_ID, credit_account_id: LOW_ACCOUNT_ID },
];

function clientRow() {
  return {
    id: CLIENT_ID, owner_id: OWNER_ID, workspace_id: WORKSPACE_ID, name: 'Synthetic Consumer',
    email: 'consumer@test.invalid', phone: '', address: '100 Test Avenue', city: 'Testville', state: 'NY', zip: '10001',
  };
}

function happyResults(entryPoint: 'management' | 'wizard' | 'round', selected = [target]) {
  const results: Record<string, QueryResult[]> = {
    staff_clients: [{ data: clientRow(), error: null }],
    negative_items: [
      { data: selected, error: null },
      { data: [target, comparison, low], error: null },
      { data: null, error: null },
    ],
    bureau_tradelines: [{ data: accountLinks, error: null }],
    audit_logs: [{ data: [{ id: AUDIT_ID }], error: null }],
    dispute_letters: [{ data: null, error: null }],
    generated_dispute_letters: [{ data: null, error: null }],
  };
  if (entryPoint === 'round') {
    results.dispute_rounds = [
      { data: { id: ROUND_ID, owner_id: OWNER_ID, client_id: CLIENT_ID, round_number: 1 }, error: null },
      { data: null, error: null },
    ];
    results.dispute_round_items = [
      { data: [{ id: 'round-item', owner_id: OWNER_ID, client_id: CLIENT_ID, round_id: ROUND_ID, negative_item_id: TARGET_ID, bureau: 'Equifax' }], error: null },
      { data: null, error: null },
    ];
  }
  return results;
}

function request(body: unknown, origin = 'https://fixmy.money') {
  return new NextRequest('https://fixmy.money/api/dispute-letters/generate', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('canonical dispute-letter server route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) } });
    mocks.authorizeStaffClient.mockResolvedValue(authorization);
  });

  it('rejects cross-origin and unauthenticated requests before privileged writes', async () => {
    const admin = adminClient({});
    mocks.getAdminClient.mockReturnValue(admin);
    const crossOrigin = await POST(request({ entryPoint: 'round', clientId: CLIENT_ID, roundId: ROUND_ID }, 'https://attacker.test'));
    expect(crossOrigin.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(admin.operations).toEqual([]);

    mocks.createClient.mockResolvedValueOnce({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } });
    const unauthenticated = await POST(request(createRoundLetterRequest({ clientId: CLIENT_ID, roundId: ROUND_ID })));
    expect(unauthenticated.status).toBe(403);
    expect(admin.operations).toEqual([]);
  });

  it('runs management, wizard, and round through equivalent server-built provenance', async () => {
    const requests = [
      createEvidenceLetterRequest({ entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1, evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }] }),
      createEvidenceLetterRequest({ entryPoint: 'wizard', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1, evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }] }),
      createRoundLetterRequest({ clientId: CLIENT_ID, roundId: ROUND_ID }),
    ];
    const provenances: unknown[] = [];
    for (const [index, body] of requests.entries()) {
      const entryPoint = index === 0 ? 'management' : index === 1 ? 'wizard' : 'round';
      const admin = adminClient(happyResults(entryPoint));
      mocks.getAdminClient.mockReturnValueOnce(admin);
      const response = await POST(request(body));
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.status).toBe('ready');
      provenances.push(payload.letters[0].provenance);
    }
    expect(new Set(provenances.map(value => JSON.stringify(value))).size).toBe(1);
  });

  it('does no writes for cross-tenant evidence', async () => {
    const foreign = { ...target, owner_id: 'f0000000-0000-4000-8000-00000000000f' };
    const admin = adminClient({
      staff_clients: [{ data: clientRow(), error: null }],
      negative_items: [{ data: [foreign], error: null }],
    });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createEvidenceLetterRequest({
      entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }],
    })));
    expect(response.status).toBe(403);
    expect(admin.operations.filter(value => value.operation !== 'select')).toEqual([]);
  });

  it('does not inspect Storage or write when a selected enclosure is outside the tenant query', async () => {
    const admin = adminClient({
      staff_clients: [{ data: clientRow(), error: null }],
      evidence_documents: [{ data: [], error: null }],
      evidence_facts: [{ data: [], error: null }],
    });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createEvidenceLetterRequest({
      entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }],
      enclosureIds: [DOCUMENT_ID],
    })));
    expect(response.status).toBe(403);
    expect(admin.exists).not.toHaveBeenCalled();
    expect(admin.operations.filter(value => value.operation !== 'select')).toEqual([]);
  });

  it('returns review-required with no writes when every selected row fails support checks', async () => {
    const admin = adminClient(happyResults('management', [low]));
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createEvidenceLetterRequest({
      entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: LOW_ID, source: 'negative_items' }],
    })));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.status).toBe('review_required');
    expect(payload.letters).toEqual([]);
    expect(payload.exclusions).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceEvidenceId: LOW_ID, code: 'low_confidence' }),
    ]));
    expect(admin.operations.filter(value => value.operation !== 'select')).toEqual([]);
  });

  it('surfaces an unsupported round bureau for review without generating or writing a letter', async () => {
    const results = happyResults('round');
    results.dispute_round_items = [{
      data: [{
        id: 'round-item', owner_id: OWNER_ID, client_id: CLIENT_ID,
        round_id: ROUND_ID, negative_item_id: TARGET_ID, bureau: 'Unknown Bureau',
      }],
      error: null,
    }];
    const admin = adminClient(results);
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createRoundLetterRequest({ clientId: CLIENT_ID, roundId: ROUND_ID })));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ status: 'review_required', letters: [] });
    expect(payload.exclusions).toEqual([
      expect.objectContaining({ sourceEvidenceId: TARGET_ID, code: 'unsupported_bureau' }),
    ]);
    expect(admin.operations.filter(value => value.operation !== 'select')).toEqual([]);
  });

  it('prevents draft insertion when provenance audit persistence fails', async () => {
    const results = happyResults('management');
    results.audit_logs = [{ data: null, error: { message: 'synthetic audit failure' } }];
    const admin = adminClient(results);
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createEvidenceLetterRequest({
      entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }],
    })));
    expect(response.status).toBe(500);
    expect(admin.operations.some(value => value.table === 'dispute_letters' && value.operation === 'insert')).toBe(false);
  });

  it('compensates the exact audit record when draft insertion fails', async () => {
    const results = happyResults('management');
    results.audit_logs = [
      { data: [{ id: AUDIT_ID }], error: null },
      { data: null, error: null },
    ];
    results.dispute_letters = [{ data: null, error: { message: 'synthetic letter failure' } }];
    const admin = adminClient(results);
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createEvidenceLetterRequest({
      entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }],
    })));
    expect(response.status).toBe(500);
    const cleanup = admin.operations.find(value => value.table === 'audit_logs' && value.operation === 'delete');
    expect(cleanup?.filters).toContainEqual({ method: 'in', column: 'id', value: [AUDIT_ID] });
  });

  it('advances only selected evidence represented in persisted provenance', async () => {
    const admin = adminClient(happyResults('management', [target, low]));
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createEvidenceLetterRequest({
      entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [
        { id: TARGET_ID, source: 'negative_items' },
        { id: LOW_ID, source: 'negative_items' },
      ],
    })));
    expect(response.status).toBe(200);
    const statusUpdate = admin.operations.find(value => value.table === 'negative_items' && value.operation === 'update');
    expect(statusUpdate?.filters).toContainEqual({ method: 'in', column: 'id', value: [TARGET_ID] });
    expect(statusUpdate?.filters).not.toContainEqual({ method: 'in', column: 'id', value: expect.arrayContaining([LOW_ID]) });
  });

  it('ignores untrusted free-form allegations and persists exactly the server-built provenance', async () => {
    const admin = adminClient(happyResults('management'));
    mocks.getAdminClient.mockReturnValue(admin);
    const body = {
      ...createEvidenceLetterRequest({
        entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
        evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }],
      }),
      allegation: 'Invented identity theft and fraud allegation',
      letterContent: 'Browser-authored letter body',
    };
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(JSON.stringify(payload)).not.toContain('Invented identity theft');
    expect(JSON.stringify(payload)).not.toContain('Browser-authored letter body');
    const auditWrite = admin.operations.find(value => value.table === 'audit_logs' && value.operation === 'insert');
    const letterWrite = admin.operations.find(value => value.table === 'dispute_letters' && value.operation === 'insert');
    const auditPayload = (auditWrite?.payload as Array<{ metadata: { paragraphs: unknown } }>)[0];
    const letterPayload = (letterWrite?.payload as Array<{ letter_content: string }>)[0];
    expect(auditPayload.metadata.paragraphs).toEqual(payload.letters[0].provenance);
    expect(letterPayload.letter_content).toBe(payload.letters[0].letterContent);
  });

  it('persists and renders only a selected verified enclosure', async () => {
    const storagePath = `${OWNER_ID}/documents/verified.pdf`;
    const results = happyResults('management');
    results.evidence_documents = [{ data: [{
      id: DOCUMENT_ID,
      owner_id: OWNER_ID,
      client_id: CLIENT_ID,
      document_name: 'Verified synthetic statement',
      storage_bucket: 'evidence-documents',
      storage_path: storagePath,
      user_confirmed_facts: [{ field: 'balance', value: '0' }],
    }], error: null }];
    results.evidence_facts = [{ data: [], error: null }];
    const admin = adminClient(results, { [storagePath]: true });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request(createEvidenceLetterRequest({
      entryPoint: 'management', clientId: CLIENT_ID, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: TARGET_ID, source: 'negative_items' }],
      enclosureIds: [DOCUMENT_ID],
    })));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.letters[0].letterContent).toContain('Verified synthetic statement');
    const auditWrite = admin.operations.find(value => value.table === 'audit_logs' && value.operation === 'insert');
    expect((auditWrite?.payload as Array<{ metadata: { enclosures: unknown } }>)[0].metadata.enclosures).toEqual([
      expect.objectContaining({ documentId: DOCUMENT_ID, label: 'Verified synthetic statement' }),
    ]);
  });

  it('lists only verified documents whose owned private Storage object exists', async () => {
    const goodPath = `${OWNER_ID}/documents/good.pdf`;
    const missingPath = `${OWNER_ID}/documents/missing.pdf`;
    const documents = [
      { id: DOCUMENT_ID, owner_id: OWNER_ID, client_id: CLIENT_ID, document_name: 'Verified evidence', storage_bucket: 'evidence-documents', storage_path: goodPath, user_confirmed_facts: [{ field: 'balance', value: '0' }] },
      { id: MISSING_DOCUMENT_ID, owner_id: OWNER_ID, client_id: CLIENT_ID, document_name: 'Missing evidence', storage_bucket: 'evidence-documents', storage_path: missingPath, user_confirmed_facts: [{ field: 'balance', value: '0' }] },
    ];
    const admin = adminClient({
      evidence_documents: [
        { data: documents.map(value => ({ id: value.id })), error: null },
        { data: documents, error: null },
      ],
      evidence_facts: [{ data: [], error: null }],
    }, { [goodPath]: true, [missingPath]: false });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await GET(new NextRequest(`https://fixmy.money/api/dispute-letters/generate?clientId=${CLIENT_ID}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ documents: [{ id: DOCUMENT_ID, label: 'Verified evidence' }] });
    expect(admin.exists).toHaveBeenCalledTimes(2);
  });
});
