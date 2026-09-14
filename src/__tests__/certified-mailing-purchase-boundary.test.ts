import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getAdminClient: vi.fn(),
  loadCertifiedMailingContext: vi.fn(),
  parseLetterSource: vi.fn(),
  assertNoDuplicateCertifiedMailing: vi.fn(),
  createProviderLabelId: vi.fn(),
  createTestCertifiedTrackingNumber: vi.fn(),
  getCertifiedMailSetupStatus: vi.fn(),
  quoteCertifiedMailing: vi.fn(),
  authorizeLetterClient: vi.fn(),
  assertLettersMailable: vi.fn(),
  markLettersMailed: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: mocks.getAdminClient }));
vi.mock('@/lib/mailing/certifiedMailingRecords', () => ({
  loadCertifiedMailingContext: mocks.loadCertifiedMailingContext,
  parseLetterSource: mocks.parseLetterSource,
}));
vi.mock('@/lib/mailing/certifiedMailing', () => ({
  assertNoDuplicateCertifiedMailing: mocks.assertNoDuplicateCertifiedMailing,
  createProviderLabelId: mocks.createProviderLabelId,
  createTestCertifiedTrackingNumber: mocks.createTestCertifiedTrackingNumber,
  getCertifiedMailSetupStatus: mocks.getCertifiedMailSetupStatus,
  quoteCertifiedMailing: mocks.quoteCertifiedMailing,
}));
vi.mock('@/lib/disputes/serverLetterOperations', () => ({
  authorizeLetterClient: mocks.authorizeLetterClient,
  assertLettersMailable: mocks.assertLettersMailable,
  markLettersMailed: mocks.markLettersMailed,
}));

import { POST } from '@/app/api/mailings/certified/purchase/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const OWNER_ID = '20000000-0000-4000-8000-000000000002';
const CLIENT_ID = '30000000-0000-4000-8000-000000000003';
const WORKSPACE_ID = '40000000-0000-4000-8000-000000000004';
const LETTER_ID = '50000000-0000-4000-8000-000000000005';
const MAILING_ID = '60000000-0000-4000-8000-000000000006';

function request() {
  return new NextRequest('https://fixmy.money/api/mailings/certified/purchase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      letterId: LETTER_ID,
      letterSource: 'dispute_letters',
      returnReceiptElectronic: true,
    }),
  });
}

function browserClient() {
  const table: any = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    insert: vi.fn(() => table),
    single: vi.fn(async () => ({ data: { id: MAILING_ID }, error: null })),
  };
  return {
    client: {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: USER_ID } } })) },
      from: vi.fn(() => table),
    },
    table,
  };
}

function adminClient() {
  const filters: Array<[string, unknown]> = [];
  const deletion: any = {
    delete: vi.fn(() => deletion),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return deletion;
    }),
    then: (fulfilled: (value: { error: null }) => unknown, rejected?: (reason: unknown) => unknown) =>
      Promise.resolve({ error: null }).then(fulfilled, rejected),
  };
  return { client: { from: vi.fn(() => deletion) }, deletion, filters };
}

describe('certified-mailing letter-state boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseLetterSource.mockReturnValue('dispute_letters');
    mocks.loadCertifiedMailingContext.mockResolvedValue({
      context: {
        idempotencyKey: 'synthetic-mailing-boundary',
        letter: { id: LETTER_ID, owner_id: OWNER_ID, client_id: CLIENT_ID, round_id: null },
        draft: {
          bureau: 'Equifax',
          returnReceiptElectronic: true,
          senderAddress: { line1: '1 Synthetic Way' },
          destinationAddress: { line1: '2 Synthetic Way' },
        },
      },
      error: null,
      status: 200,
    });
    mocks.authorizeLetterClient.mockResolvedValue({
      actorUserId: USER_ID,
      clientId: CLIENT_ID,
      workspaceId: WORKSPACE_ID,
      workspaceOwnerId: OWNER_ID,
      role: 'owner',
    });
    mocks.getCertifiedMailSetupStatus.mockReturnValue({ mode: 'test' });
    mocks.quoteCertifiedMailing.mockReturnValue({ available: true, amountCents: 995, currency: 'usd' });
    mocks.createTestCertifiedTrackingNumber.mockReturnValue('9400000000000000000000');
    mocks.createProviderLabelId.mockReturnValue('synthetic-label');
    mocks.markLettersMailed.mockResolvedValue([]);
  });

  it('validates stored letter evidence before creating a certified-mailing record', async () => {
    const browser = browserClient();
    const admin = adminClient();
    mocks.createClient.mockResolvedValue(browser.client);
    mocks.getAdminClient.mockReturnValue(admin.client);
    mocks.assertLettersMailable.mockRejectedValue(new Error('This draft requires regeneration before mailing.'));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.assertLettersMailable).toHaveBeenCalledOnce();
    expect(browser.table.insert).not.toHaveBeenCalled();
    expect(mocks.markLettersMailed).not.toHaveBeenCalled();
  });

  it('removes only the newly created tenant-bound mailing if the atomic transition fails', async () => {
    const browser = browserClient();
    const admin = adminClient();
    mocks.createClient.mockResolvedValue(browser.client);
    mocks.getAdminClient.mockReturnValue(admin.client);
    mocks.assertLettersMailable.mockResolvedValue(undefined);
    mocks.markLettersMailed.mockRejectedValue(new Error('Letter status changed before mailing.'));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.assertLettersMailable.mock.invocationCallOrder[0])
      .toBeLessThan(browser.table.insert.mock.invocationCallOrder[0]);
    expect(admin.deletion.delete).toHaveBeenCalledOnce();
    expect(admin.filters).toEqual([
      ['id', MAILING_ID],
      ['owner_id', OWNER_ID],
      ['client_id', CLIENT_ID],
    ]);
  });
});
