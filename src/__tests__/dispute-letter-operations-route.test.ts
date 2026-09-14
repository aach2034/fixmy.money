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

import { POST } from '@/app/api/dispute-letters/operations/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const OWNER_ID = '20000000-0000-4000-8000-000000000002';
const CLIENT_ID = '30000000-0000-4000-8000-000000000003';
const WORKSPACE_ID = '40000000-0000-4000-8000-000000000004';
const LETTER_ID = '50000000-0000-4000-8000-000000000005';
const ROUND_ID = '60000000-0000-4000-8000-000000000006';

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
  operation: 'select' | 'update' | 'delete';
  payload?: unknown;
  filters: Array<{ method: string; column: string; value: unknown }>;
}

function adminClient(results: Record<string, QueryResult[]>) {
  const queues = new Map(Object.entries(results).map(([table, values]) => [table, [...values]]));
  const operations: Operation[] = [];
  const rpcCalls: Array<{ name: string; payload: unknown }> = [];
  const from = vi.fn((table: string) => {
    let operation: Operation['operation'] = 'select';
    let payload: unknown;
    const filters: Operation['filters'] = [];
    const resolve = () => queues.get(table)?.shift() ?? { data: null, error: null };
    const builder: any = {
      select: vi.fn(() => builder),
      update: vi.fn((value: unknown) => {
        operation = 'update';
        payload = value;
        operations.push({ table, operation, payload, filters });
        return builder;
      }),
      delete: vi.fn(() => {
        operation = 'delete';
        operations.push({ table, operation, filters });
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ method: 'eq', column, value });
        return builder;
      }),
      in: vi.fn((column: string, value: unknown) => {
        filters.push({ method: 'in', column, value });
        return builder;
      }),
      then: (fulfilled: (value: QueryResult) => unknown, rejected?: (reason: unknown) => unknown) =>
        Promise.resolve(resolve()).then(fulfilled, rejected),
    };
    return builder;
  });
  const rpc = vi.fn(async (name: string, payload: unknown) => {
    rpcCalls.push({ name, payload });
    return { data: null, error: null };
  });
  return { from, operations, rpc, rpcCalls };
}

function request(body: unknown, origin = 'https://fixmy.money') {
  return new NextRequest('https://fixmy.money/api/dispute-letters/operations', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function disputeRow(status = 'draft') {
  return {
    id: LETTER_ID,
    owner_id: OWNER_ID,
    client_id: CLIENT_ID,
    workspace_id: WORKSPACE_ID,
    letter_status: status,
    sent_date: null,
    response_due_date: null,
    days_remaining: 0,
    generation_error: null,
    auto_generated: false,
    dispute_reason: 'Stored balance discrepancy',
    letter_content: 'Supported synthetic content',
  };
}

describe('server-authoritative dispute-letter operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
    });
    mocks.authorizeStaffClient.mockResolvedValue(authorization);
  });

  it('rejects cross-origin and unauthenticated operations before privileged access', async () => {
    const admin = adminClient({});
    mocks.getAdminClient.mockReturnValue(admin);
    const crossOrigin = await POST(request({
      action: 'mark_mailed', source: 'dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }, 'https://attacker.invalid'));
    expect(crossOrigin.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();

    mocks.createClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });
    const unauthenticated = await POST(request({
      action: 'mark_mailed', source: 'dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }));
    expect(unauthenticated.status).toBe(401);
    expect(admin.operations).toEqual([]);
  });

  it('marks only a tenant-bound draft mailed with a status-only server write', async () => {
    const updated = { ...disputeRow('sent'), sent_date: '2026-09-13', response_due_date: '2026-10-13', days_remaining: 30 };
    const admin = adminClient({ dispute_letters: [
      { data: [disputeRow()], error: null },
      { data: [updated], error: null },
    ] });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request({
      action: 'mark_mailed', source: 'dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }));
    expect(response.status).toBe(200);
    expect(mocks.authorizeStaffClient).toHaveBeenCalledWith(admin, USER_ID, CLIENT_ID, 'write');
    expect(admin.rpcCalls).toEqual([{
      name: 'mark_dispute_letters_mailed_server',
      payload: {
        p_source: 'dispute_letters',
        p_owner_id: OWNER_ID,
        p_client_id: CLIENT_ID,
        p_workspace_id: WORKSPACE_ID,
        p_letter_ids: [LETTER_ID],
      },
    }]);
  });

  it('rejects backward and cross-tenant operations without a write', async () => {
    const closedAdmin = adminClient({ dispute_letters: [{ data: [disputeRow('closed')], error: null }] });
    mocks.getAdminClient.mockReturnValueOnce(closedAdmin);
    const backward = await POST(request({
      action: 'mark_mailed', source: 'dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }));
    expect(backward.status).toBe(409);
    expect(closedAdmin.operations).toEqual([]);

    const foreignAdmin = adminClient({ dispute_letters: [{ data: [], error: null }] });
    mocks.getAdminClient.mockReturnValueOnce(foreignAdmin);
    const foreign = await POST(request({
      action: 'mark_mailed', source: 'dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }));
    expect(foreign.status).toBe(404);
    expect(foreignAdmin.operations).toEqual([]);
  });

  it('fails closed for an unpersisted unsafe legacy date rationale', async () => {
    const unsafe = {
      ...disputeRow(),
      auto_generated: true,
      dispute_reason: 'The reporting date is missing, making the information unverifiable.',
    };
    const admin = adminClient({
      dispute_letters: [{ data: [unsafe], error: null }],
      negative_items: [{ data: [], error: null }],
    });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request({
      action: 'mark_mailed', source: 'dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }));
    expect(response.status).toBe(409);
    expect(admin.operations).toEqual([]);
  });

  it('marks only generated round letters and validates their linked round', async () => {
    const row = { id: LETTER_ID, owner_id: OWNER_ID, client_id: CLIENT_ID, round_id: ROUND_ID, status: 'generated', mailed_at: null };
    const updated = { ...row, status: 'sent', mailed_at: '2026-09-13T20:00:00.000Z' };
    const admin = adminClient({
      generated_dispute_letters: [{ data: [row], error: null }, { data: [updated], error: null }],
      dispute_rounds: [{ data: [{ id: ROUND_ID, owner_id: OWNER_ID, client_id: CLIENT_ID }], error: null }],
    });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request({
      action: 'mark_mailed', source: 'generated_dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }));
    expect(response.status).toBe(200);
    expect(admin.rpcCalls).toEqual([expect.objectContaining({
      name: 'mark_dispute_letters_mailed_server',
      payload: expect.objectContaining({ p_source: 'generated_dispute_letters', p_letter_ids: [LETTER_ID] }),
    })]);
  });

  it('deletes only tenant-bound drafts with no mailing history', async () => {
    const admin = adminClient({
      dispute_letters: [{ data: [disputeRow()], error: null }, { data: [{ id: LETTER_ID }], error: null }],
      certified_mailings: [{ data: [], error: null }],
    });
    mocks.getAdminClient.mockReturnValue(admin);
    const response = await POST(request({
      action: 'delete_drafts', source: 'dispute_letters', clientId: CLIENT_ID, letterIds: [LETTER_ID],
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'deleted', deletedIds: [LETTER_ID] });
    const deletion = admin.operations.find(value => value.table === 'dispute_letters' && value.operation === 'delete');
    expect(deletion?.filters).toEqual(expect.arrayContaining([
      { method: 'eq', column: 'owner_id', value: OWNER_ID },
      { method: 'eq', column: 'letter_status', value: 'draft' },
    ]));
  });
});
