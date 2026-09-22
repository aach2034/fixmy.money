import { describe, expect, it } from 'vitest';
import { buildPersonalPacket, normalizePacketAccounts, PacketInputError } from '@/lib/personalPacket/generator';

const base = {
  reportId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  source: [
    { id: 'acct-1', creditorName: 'Example Bank', bureau: 'Equifax',
      accountNumberMasked: '****1234', accountStatus: 'Open', balance: 100 },
    { id: 'acct-2', creditorName: 'Example Bank', bureau: 'Experian',
      accountNumberMasked: '****1234', accountStatus: 'Closed', balance: 100 },
  ],
  cycleStartAt: '2026-08-01T00:00:00Z', cycleEndAt: '2026-08-31T00:00:00Z',
};
const documentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Personal packet generation', () => {
  it('fails closed on absent, unreadable, or malformed parsed account data', () => {
    for (const source of [null, [], 'unreadable', [{}], [{ creditorName: 'Bank' }]]) {
      expect(() => normalizePacketAccounts(source)).toThrow(PacketInputError);
    }
  });

  it('separates source facts, detected differences, and system inferences without calling an automated flag an error', () => {
    const packet = buildPersonalPacket({ ...base, claims: [] });
    expect(packet.findings).toContain('SOURCE FACTS');
    expect(packet.findings).toContain('DETECTED INCONSISTENCIES');
    expect(packet.findings).toContain('SYSTEM INFERENCES');
    expect(packet.findings).toContain('not a verified error');
    expect(packet.noSupportedDispute).toContain('NO SUPPORTED DISPUTE');
    expect(packet.disputeDocuments).toBeNull();
    expect(packet.packet).toContain('PERSONAL ACTION PLAN');
    expect(packet.packet).not.toContain('****1234');
    expect(packet.packet).toContain('ending 1234');
  });

  it('produces an explicit no-findings report when values do not differ', () => {
    const packet = buildPersonalPacket({ ...base, source: [base.source[0]], claims: [] });
    expect(packet.findings).toContain('No cross-bureau inconsistency was detected');
    expect(packet.noSupportedDispute).not.toBeNull();
  });

  it('generates only consumer-confirmed, linked-document drafts for an account in the source', () => {
    const packet = buildPersonalPacket({ ...base, claims: [
      { accountId: 'acct-1', assertion: 'My statement shows the balance was paid.',
        evidenceDocumentId: documentId, confirmedByConsumer: true },
      { accountId: 'acct-2', assertion: 'Automated flag only, no user confirmation.',
        evidenceDocumentId: documentId, confirmedByConsumer: false },
      { accountId: 'missing', assertion: 'Unsupported account reference.',
        evidenceDocumentId: documentId, confirmedByConsumer: true },
    ] });
    expect(packet.disputeDocuments).toContain('My statement shows the balance was paid.');
    expect(packet.disputeDocuments).not.toContain('Automated flag');
    expect(packet.disputeDocuments).not.toContain('Unsupported account');
    expect(packet.disputeDocuments).toContain('NOT SENT');
    expect(packet.noSupportedDispute).toBeNull();
  });

  it('rejects frivolous or unsupported claims and returns stable hashes on retries', () => {
    const claims = [{ accountId: 'acct-1', assertion: 'Bad', evidenceDocumentId: documentId,
      confirmedByConsumer: true }];
    const a = buildPersonalPacket({ ...base, claims });
    const b = buildPersonalPacket({ ...base, claims });
    expect(a.disputeDocuments).toBeNull();
    expect(a.hashes).toEqual(b.hashes);
    expect(a.sourceSha256).toBe(b.sourceSha256);
    expect(a.hashes.packet).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a dispute draft when an account reference is ambiguous', () => {
    const packet = buildPersonalPacket({ ...base,
      source: [{ ...base.source[0] }, { ...base.source[1], id: 'acct-1' }],
      claims: [{ accountId: 'acct-1', assertion: 'My statement shows the balance was paid.',
        evidenceDocumentId: documentId, confirmedByConsumer: true }],
    });
    expect(packet.disputeDocuments).toBeNull();
    expect(packet.noSupportedDispute).not.toBeNull();
  });
});
