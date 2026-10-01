import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decidePersonalCapability } from '@/lib/personalPacket/capabilities';
import type { CompletedServiceInvoice } from '@/lib/billing/completedService';

const now = Date.parse('2026-09-21T12:00:00Z');
const valid: CompletedServiceInvoice = {
  cycleId: 'cycle-1', packetId: 'packet-1',
  completedPeriodStart: '2026-08-01T00:00:00Z',
  completedPeriodEnd: '2026-08-31T00:00:00Z',
  amountCents: 3900, status: 'open', stripeInvoiceId: 'in_test',
  dueAt: '2026-09-10T00:00:00Z', graceEndsAt: '2026-09-20T00:00:00Z',
};

describe('Personal capability wiring', () => {
  it('preserves existing customers and prevents account-age-only suspension', () => {
    expect(decidePersonalCapability(null, null, 'new_analysis', now)).toBe(true);
    expect(decidePersonalCapability('suspended_nonpayment', null, 'new_analysis', now)).toBe(true);
    expect(decidePersonalCapability('suspended_nonpayment', { ...valid, status: 'prepared' }, 'new_analysis', now)).toBe(true);
    expect(decidePersonalCapability('suspended_nonpayment', { ...valid, graceEndsAt: '2026-09-22T00:00:00Z' }, 'new_analysis', now)).toBe(true);
  });

  it('blocks only future paid work after a valid invoice passes grace', () => {
    for (const capability of ['new_analysis','dispute_generation','new_paid_work','monitoring','premium_tools'] as const) {
      expect(decidePersonalCapability('suspended_nonpayment', valid, capability, now)).toBe(false);
    }
    for (const capability of ['prior_documents','agreements','disclosures','invoices','receipts',
      'privacy','export','deletion','billing_dispute','support','imported_data'] as const) {
      expect(decidePersonalCapability('suspended_nonpayment', valid, capability, now)).toBe(true);
    }
    expect(decidePersonalCapability('paid_completed_cycle', valid, 'new_analysis', now)).toBe(true);
  });
  it('checks Personal new-work entry points while leaving historical packet access ungated', () => {
    for (const path of [
      'src/app/api/credit-report/import-upload/route.ts',
      'src/app/api/credit-report/parse-report/route.ts',
      'src/app/api/dispute-letters/generate/route.ts',
    ]) {
      expect(readFileSync(path, 'utf8')).toContain('requirePersonalWorkspaceCapability');
    }
    expect(readFileSync('src/lib/ai/server.ts', 'utf8')).toContain('requirePersonalCapability');
    expect(readFileSync('src/app/api/personal-packets/[cycleId]/route.ts', 'utf8'))
      .not.toContain('requirePersonalCapability');
  });
});
