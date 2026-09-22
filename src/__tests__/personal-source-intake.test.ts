import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  cycleId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  state: 'active_unbilled_service',
  existing: false,
  confidence: 90,
  inserts: [] as Record<string, unknown>[],
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mocks.userId ? { id: mocks.userId } : null }, error: null }) },
}) }));
vi.mock('@/lib/creditReport/adapters', () => ({ parseWithAdapter: () => ({
  detectedProvider: 'experian', providerConfidence: mocks.confidence,
  parserVersion: 'test-v1', sectionConfidence: { overall: mocks.confidence, accounts: mocks.confidence },
  warnings: [], unsupportedSections: [], accounts: [{ id: 'account-1', isNegative: false, rawText: 'secret' }],
  inquiries: [], publicRecords: [], collections: [], clientInfo: {}, scores: [], reportDate: '',
}) }));
vi.mock('@/lib/creditReport/aiPrivacy', () => ({ stripRawReportArtifacts: (accounts: { id: string }[]) =>
  accounts.map(({ id }) => ({ id })) }));
vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: () => ({
  from: (table: string) => {
    if (table === 'consumer_service_cycles') {
      const filters: Record<string, string> = {};
      const q = { select: () => q, eq: (k: string, v: string) => { filters[k] = v; return q; },
        maybeSingle: async () => ({ data: filters.id === mocks.cycleId && filters.consumer_id === mocks.ownerId ? {
          id: mocks.cycleId, state: mocks.state,
          cycle_started_at: '2026-01-01T00:00:00Z', cycle_ends_at: '2030-01-01T00:00:00Z',
          cancellation_expires_at: '2025-12-31T00:00:00Z',
        } : null, error: null }) };
      return q;
    }
    const q = { select: () => q, eq: () => q, is: () => q,
      maybeSingle: async () => ({ data: mocks.existing ? { id: 'report-1', status: 'saved' } : null, error: null }),
      insert: (record: Record<string, unknown>) => { mocks.inserts.push(record); return {
        select: () => ({ single: async () => ({ data: { id: 'report-1', status: 'saved' }, error: null }) }),
      }; }, };
    return q;
  },
}) }));

import { POST } from '@/app/api/personal-packets/[cycleId]/source/route';
const context = () => ({ params: Promise.resolve({ cycleId: mocks.cycleId }) });
const request = (textContent = 'A'.repeat(200), origin = 'https://fixmy.money') => new NextRequest(
  `https://fixmy.money/api/personal-packets/${mocks.cycleId}/source`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'experian', textContent }),
  });

describe('consumer Personal source intake', () => {
  beforeEach(() => {
    process.env.PERSONAL_PACKET_WORKFLOW_ENABLED = 'true';
    mocks.userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    mocks.ownerId = mocks.userId;
    mocks.state = 'active_unbilled_service';
    mocks.existing = false;
    mocks.confidence = 90;
    mocks.inserts.length = 0;
  });
  it('stays disabled by default and rejects cross-origin requests', async () => {
    delete process.env.PERSONAL_PACKET_WORKFLOW_ENABLED;
    expect((await POST(request(), context())).status).toBe(503);
    process.env.PERSONAL_PACKET_WORKFLOW_ENABLED = 'true';
    expect((await POST(request(undefined, 'https://evil.test'), context())).status).toBe(403);
    expect(mocks.inserts).toHaveLength(0);
  });
  it('rejects unauthenticated, cross-tenant, and inactive cycles', async () => {
    mocks.userId = '';
    expect((await POST(request(), context())).status).toBe(401);
    mocks.userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    expect((await POST(request(), context())).status).toBe(404);
    mocks.ownerId = mocks.userId;
    mocks.state = 'service_completion_pending';
    expect((await POST(request(), context())).status).toBe(409);
    expect(mocks.inserts).toHaveLength(0);
  });
  it('does not save unreadable or low-confidence source material', async () => {
    expect((await POST(request('short'), context())).status).toBe(400);
    mocks.confidence = 40;
    expect((await POST(request(), context())).status).toBe(422);
    expect(mocks.inserts).toHaveLength(0);
  });
  it('saves a consumer-owned report without raw text and reuses identical commits', async () => {
    const response = await POST(request(), context());
    expect(response.status).toBe(201);
    expect((await response.json()).reportId).toBe('report-1');
    expect(mocks.inserts).toHaveLength(1);
    expect(mocks.inserts[0]).toMatchObject({ owner_id: mocks.userId, client_id: null,
      status: 'saved', raw_text: '', all_accounts: [{ id: 'account-1' }] });
    expect(mocks.inserts[0].import_commit_key).toMatch(/^personal:[a-f0-9]{64}$/);
    mocks.existing = true;
    expect((await (await POST(request(), context())).json()).reused).toBe(true);
    expect(mocks.inserts).toHaveLength(1);
  });
});
