import { describe, expect, it } from 'vitest';
import {
  COUNSEL_PENDING, canUseConsumerCapability, isBusinessPurchaserVerified,
  isCounselApproved, isPersonalPacketFullyPerformed, mayCreateConsumerStripeInvoice,
  mayOpenNewPaidCheckout, preparePersonalInvoice, shouldSuspendForNonpayment,
  type CounselApproval, type PersonalPacketEvidence,
} from '@/lib/billing/completedService';

const DAY = 86_400_000;
const now = Date.parse('2026-09-21T12:00:00.000Z');
const iso = (offset: number) => new Date(now + offset * DAY).toISOString();
const part = (id: string) => ({ artifactId: id, sha256: 'a'.repeat(64), completedAt: iso(-1) });
const complete: PersonalPacketEvidence = {
  consumerId: 'consumer-1', cycleId: 'cycle-1', cycleStartAt: iso(-32), cycleEndAt: iso(-2),
  cancellationExpiresAt: iso(-33), contractVersion: 'review-only-v1', disclosureVersion: 'review-only-v1',
  sourceReceivedAt: iso(-32), sourceArtifactId: 'source-2', sourceSha256: 'b'.repeat(64),
  materiallyNewSource: true, parsingStatus: 'complete', analysisStatus: 'complete',
  analysisEngineVersion: 'engine-1', rulesetVersion: 'rules-1',
  findings: part('findings-1'), actionPlan: part('plan-1'),
  disputeDocuments: null, noSupportedDispute: part('none-supported-1'), packet: part('packet-1'),
  deliveryVerifiedAt: iso(0), deliveryNotificationEventId: 'notice-1', completionAuditEventId: 'event-1',
};

describe('completed Personal service', () => {
  it('requires the cancellation period, 30 days, complete evidence, delivery and audit', () => {
    expect(isPersonalPacketFullyPerformed(complete, now)).toBe(true);
    expect(preparePersonalInvoice(complete, now)).toMatchObject({
      amountCents: 3900, status: 'prepared', packetId: 'packet-1', stripeInvoiceId: null,
    });
    expect(isPersonalPacketFullyPerformed({ ...complete, cancellationExpiresAt: iso(-31) }, now)).toBe(false);
    expect(isPersonalPacketFullyPerformed({ ...complete, cycleStartAt: iso(-30) }, now)).toBe(false);
    expect(isPersonalPacketFullyPerformed({ ...complete, cycleEndAt: iso(1) }, now)).toBe(false);
  });

  it.each([
    { sourceReceivedAt: null }, { materiallyNewSource: false }, { parsingStatus: 'material_error' as const },
    { analysisStatus: 'pending' as const }, { findings: { ...part('findings-1'), sha256: null } },
    { actionPlan: { ...part('plan-1'), artifactId: null } }, { noSupportedDispute: null },
    { packet: { ...part('packet-1'), completedAt: null } }, { deliveryVerifiedAt: null },
    { deliveryNotificationEventId: null }, { completionAuditEventId: null },
  ])('never invoices incomplete or stale work: %o', difference => {
    const evidence = { ...complete, ...difference };
    expect(isPersonalPacketFullyPerformed(evidence, now)).toBe(false);
    expect(preparePersonalInvoice(evidence, now)).toBeNull();
  });

  it('never creates an actual invoice or checkout under this review branch', () => {
    expect(mayCreateConsumerStripeInvoice()).toBe(false);
    expect(mayOpenNewPaidCheckout()).toBe(false);
  });
});

describe('counsel and purchaser boundaries', () => {
  const approval: CounselApproval = {
    status: 'COUNSEL_APPROVED', jurisdictions: ['NY'], plans: ['starter'],
    approvedBillingModel: 'completed packet only', approvedCompletionDefinition: 'packet delivered',
    effectiveAt: iso(-1), reviewAt: iso(30), attorneyName: 'Attorney', attorneyFirm: 'Firm',
    writtenOpinionRef: 'opinion-ref', contractVersion: 'v1', disclosureVersion: 'v1',
    conditionsSatisfiedAt: null,
  };
  it('fails closed for every unapproved, expired, revoked or unsupported approval', () => {
    for (const status of [COUNSEL_PENDING, 'COUNSEL_REJECTED', 'EXPIRED', 'REVOKED', 'COUNSEL_APPROVED_WITH_CONDITIONS'] as const) {
      expect(isCounselApproved({ ...approval, status }, 'NY', 'starter', now)).toBe(false);
    }
    expect(isCounselApproved({ ...approval, reviewAt: iso(-1) }, 'NY', 'starter', now)).toBe(false);
    expect(isCounselApproved(approval, 'CA', 'starter', now)).toBe(false);
    expect(isCounselApproved(approval, 'NY', 'professional', now)).toBe(false);
  });
  it('requires verified business evidence and exact actor, workspace and plan', () => {
    const v = { workspaceId: 'w1', purchaserUserId: 'u1', status: 'verified' as const,
      planIds: ['professional'], attestedForBusiness: true,
      verificationChecks: { formation: true, identifier: true, address: true, representative: true, license_or_exemption: true },
      evidenceRef: 'e1', reviewerId: 'r1', reason: 'validated',
      verifiedAt: iso(-1), expiresAt: iso(30) };
    expect(isBusinessPurchaserVerified(v, 'w1', 'u1', 'professional', now)).toBe(true);
    expect(isBusinessPurchaserVerified(v, 'w1', 'u1', 'starter', now)).toBe(false);
    expect(isBusinessPurchaserVerified(v, 'w2', 'u1', 'professional', now)).toBe(false);
    expect(isBusinessPurchaserVerified(v, 'w1', 'u2', 'professional', now)).toBe(false);
    expect(isBusinessPurchaserVerified({ ...v, status: 'pending' }, 'w1', 'u1', 'professional', now)).toBe(false);
    expect(isBusinessPurchaserVerified({ ...v, verificationChecks: { ...v.verificationChecks, formation: false } }, 'w1', 'u1', 'professional', now)).toBe(false);
    expect(isBusinessPurchaserVerified({ ...v, expiresAt: iso(-1) }, 'w1', 'u1', 'professional', now)).toBe(false);
  });
});

describe('nonpayment', () => {
  const prepared = preparePersonalInvoice(complete, now)!;
  it('requires an actual overdue completed-service invoice past its grace period', () => {
    expect(shouldSuspendForNonpayment(null, now)).toBe(false);
    expect(shouldSuspendForNonpayment(prepared, now)).toBe(false);
    const open = { ...prepared, status: 'open' as const, stripeInvoiceId: 'in_1', dueAt: iso(-5), graceEndsAt: iso(-1) };
    expect(shouldSuspendForNonpayment(open, now)).toBe(true);
    expect(shouldSuspendForNonpayment({ ...open, status: 'paid' }, now)).toBe(false);
    expect(shouldSuspendForNonpayment({ ...open, graceEndsAt: iso(1) }, now)).toBe(false);
    expect(shouldSuspendForNonpayment({ ...open, stripeInvoiceId: null }, now)).toBe(false);
  });
  it('retains records, privacy, disputes and support while suspending only new work', () => {
    for (const capability of ['agreements', 'disclosures', 'invoices', 'receipts', 'prior_documents',
      'imported_data', 'privacy', 'export', 'deletion', 'billing_dispute', 'support'] as const) {
      expect(canUseConsumerCapability('suspended_nonpayment', capability)).toBe(true);
    }
    for (const capability of ['new_analysis', 'dispute_generation', 'new_paid_work', 'monitoring', 'premium_tools'] as const) {
      expect(canUseConsumerCapability('suspended_nonpayment', capability)).toBe(false);
      expect(canUseConsumerCapability('paid_completed_cycle', capability)).toBe(true);
    }
  });
});
