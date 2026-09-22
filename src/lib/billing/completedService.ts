/** Server-owned review model. This module never calls Stripe or grants access. */
export const COUNSEL_PENDING = 'OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING' as const;

export type ApprovalStatus = typeof COUNSEL_PENDING | 'COUNSEL_APPROVED_WITH_CONDITIONS' |
  'COUNSEL_APPROVED' | 'COUNSEL_REJECTED' | 'EXPIRED' | 'REVOKED';

export type ConsumerCycleState = 'cancellation_period' | 'active_unbilled_service' |
  'service_completion_pending' | 'invoice_eligible' | 'invoice_due' |
  'suspended_nonpayment' | 'paid_completed_cycle' | 'compliance_hold' | 'closed';

export interface CounselApproval {
  status: ApprovalStatus;
  jurisdictions: readonly string[];
  plans: readonly string[];
  approvedBillingModel: string | null;
  approvedCompletionDefinition: string | null;
  effectiveAt: string | null;
  reviewAt: string | null;
  attorneyName: string | null;
  attorneyFirm: string | null;
  writtenOpinionRef: string | null;
  contractVersion: string | null;
  disclosureVersion: string | null;
  conditionsSatisfiedAt: string | null;
}

export interface ComponentEvidence {
  completedAt: string | null;
  artifactId: string | null;
  sha256: string | null;
}

export interface PersonalPacketEvidence {
  consumerId: string;
  cycleId: string;
  cycleStartAt: string;
  cycleEndAt: string;
  cancellationExpiresAt: string;
  contractVersion: string;
  disclosureVersion: string;
  sourceReceivedAt: string | null;
  sourceArtifactId: string | null;
  sourceSha256: string | null;
  materiallyNewSource: boolean;
  parsingStatus: 'pending' | 'complete' | 'material_error';
  analysisStatus: 'pending' | 'complete' | 'material_error';
  analysisEngineVersion: string | null;
  rulesetVersion: string | null;
  findings: ComponentEvidence;
  actionPlan: ComponentEvidence;
  disputeDocuments: ComponentEvidence | null;
  noSupportedDispute: ComponentEvidence | null;
  packet: ComponentEvidence;
  deliveryVerifiedAt: string | null;
  deliveryNotificationEventId: string | null;
  completionAuditEventId: string | null;
}

const validTime = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const completeComponent = (part: ComponentEvidence | null): boolean =>
  !!part && !!part.artifactId && /^[a-f0-9]{64}$/i.test(part.sha256 || '') && validTime(part.completedAt) !== null;

export function isPersonalPacketFullyPerformed(e: PersonalPacketEvidence, now = Date.now()): boolean {
  const start = validTime(e.cycleStartAt);
  const end = validTime(e.cycleEndAt);
  const cancel = validTime(e.cancellationExpiresAt);
  const received = validTime(e.sourceReceivedAt);
  const delivered = validTime(e.deliveryVerifiedAt);
  const completed = validTime(e.packet.completedAt);
  if (start === null || end === null || cancel === null || received === null || delivered === null || completed === null) return false;
  if (end - start < 30 * 24 * 60 * 60 * 1000 || now < end || start < cancel || received < start || completed < end || delivered < completed || delivered > now) return false;
  if (!e.consumerId || !e.cycleId || !e.contractVersion || !e.disclosureVersion || !e.materiallyNewSource) return false;
  if (!e.sourceArtifactId || !/^[a-f0-9]{64}$/i.test(e.sourceSha256 || '')) return false;
  if (e.parsingStatus !== 'complete' || e.analysisStatus !== 'complete' || !e.analysisEngineVersion || !e.rulesetVersion) return false;
  if (!completeComponent(e.findings) || !completeComponent(e.actionPlan) || !completeComponent(e.packet)) return false;
  if (!completeComponent(e.disputeDocuments) && !completeComponent(e.noSupportedDispute)) return false;
  if (!e.deliveryNotificationEventId || !e.completionAuditEventId) return false;
  return true;
}

export function isCounselApproved(a: CounselApproval | null, jurisdiction: string, plan: string, now = Date.now()): boolean {
  if (!a || !['COUNSEL_APPROVED', 'COUNSEL_APPROVED_WITH_CONDITIONS'].includes(a.status)) return false;
  if (a.status === 'COUNSEL_APPROVED_WITH_CONDITIONS' && !validTime(a.conditionsSatisfiedAt)) return false;
  const effective = validTime(a.effectiveAt);
  const review = validTime(a.reviewAt);
  return effective !== null && effective <= now && (review === null || review > now) &&
    a.jurisdictions.includes(jurisdiction) && a.plans.includes(plan) && !!a.approvedBillingModel &&
    !!a.approvedCompletionDefinition && !!a.attorneyName && !!a.attorneyFirm && !!a.writtenOpinionRef &&
    !!a.contractVersion && !!a.disclosureVersion;
}

export interface CompletedServiceInvoice {
  cycleId: string;
  packetId: string;
  completedPeriodStart: string;
  completedPeriodEnd: string;
  amountCents: 3900;
  status: 'prepared' | 'open' | 'paid' | 'void';
  dueAt: string | null;
  graceEndsAt: string | null;
  stripeInvoiceId: string | null;
}

export function preparePersonalInvoice(e: PersonalPacketEvidence, now = Date.now()): CompletedServiceInvoice | null {
  if (!isPersonalPacketFullyPerformed(e, now)) return null;
  return {
    cycleId: e.cycleId,
    packetId: e.packet.artifactId!,
    completedPeriodStart: e.cycleStartAt,
    completedPeriodEnd: e.cycleEndAt,
    amountCents: 3900,
    status: 'prepared',
    dueAt: null,
    graceEndsAt: null,
    stripeInvoiceId: null,
  };
}

export function shouldSuspendForNonpayment(invoice: CompletedServiceInvoice | null, now = Date.now()): boolean {
  if (!invoice || invoice.status !== 'open' || !invoice.stripeInvoiceId) return false;
  const due = validTime(invoice.dueAt);
  const grace = validTime(invoice.graceEndsAt);
  return due !== null && grace !== null && grace > due && now > grace;
}

export type ConsumerCapability = 'new_analysis' | 'dispute_generation' | 'new_paid_work' |
  'monitoring' | 'premium_tools' | 'agreements' | 'disclosures' | 'invoices' |
  'receipts' | 'prior_documents' | 'imported_data' | 'privacy' | 'export' |
  'deletion' | 'billing_dispute' | 'support';

const SUSPENDED_CAPABILITIES = new Set<ConsumerCapability>([
  'new_analysis', 'dispute_generation', 'new_paid_work', 'monitoring', 'premium_tools',
]);

export function canUseConsumerCapability(state: ConsumerCycleState, capability: ConsumerCapability): boolean {
  return state !== 'suspended_nonpayment' || !SUSPENDED_CAPABILITIES.has(capability);
}

export type BusinessVerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired' | 'manual_review';
export interface BusinessVerification {
  workspaceId: string;
  purchaserUserId: string;
  status: BusinessVerificationStatus;
  planIds: readonly string[];
  attestedForBusiness: boolean;
  verificationChecks: Readonly<Record<'formation' | 'identifier' | 'address' | 'representative' | 'license_or_exemption', boolean>>;
  evidenceRef: string | null;
  reviewerId: string | null;
  reason: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
}

const BUSINESS_CHECKS = ['formation', 'identifier', 'address', 'representative', 'license_or_exemption'] as const;

export function isBusinessPurchaserVerified(v: BusinessVerification | null, workspaceId: string, userId: string, planId: string, now = Date.now()): boolean {
  return !!v && v.status === 'verified' && v.workspaceId === workspaceId && v.purchaserUserId === userId &&
    (planId === 'professional' || planId === 'agency') && v.planIds.includes(planId) &&
    v.attestedForBusiness && BUSINESS_CHECKS.every(key => v.verificationChecks?.[key] === true) &&
    !!v.evidenceRef && !!v.reviewerId && validTime(v.verifiedAt) !== null &&
    validTime(v.verifiedAt)! <= now && validTime(v.expiresAt) !== null && validTime(v.expiresAt)! > now;
}

/** Separate operations authorization remains hard-off even if counsel approves a record. */
export function mayCreateConsumerStripeInvoice(): false { return false; }
export function mayOpenNewPaidCheckout(): false { return false; }
