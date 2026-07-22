export type ReadinessStatus =
  | 'ready_to_dispute'
  | 'needs_evidence'
  | 'needs_clarification'
  | 'not_recommended';

export type ReadinessFactors = {
  clearDocumentContradiction?: boolean;
  crossBureauMismatch?: boolean;
  creditorCorrectionOrPaymentProof?: boolean;
  identityTheftDocumentation?: boolean;
  impossibleOrMissingData?: boolean;
  generalDenialOnly?: boolean;
  hasSupportingEvidence?: boolean;
  previouslyVerifiedWithoutNewEvidence?: boolean;
  appearsAccurate?: boolean;
  userClarificationNeeded?: boolean;
};

export type ReadinessResult = {
  score: number;
  status: ReadinessStatus;
  reasons: string[];
};

export function calculateReadiness(input: ReadinessFactors): ReadinessResult {
  if (input.appearsAccurate) {
    return {
      score: 0,
      status: 'not_recommended',
      reasons: ['The information appears accurate; negative information alone is not a dispute basis.'],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const add = (enabled: boolean | undefined, points: number, reason: string) => {
    if (!enabled) return;
    score += points;
    reasons.push(reason);
  };

  add(input.clearDocumentContradiction, 30, 'A supporting document directly contradicts the reported information.');
  add(input.crossBureauMismatch, 20, 'The same account is reported differently across bureaus.');
  add(input.creditorCorrectionOrPaymentProof, 25, 'Creditor correspondence or payment evidence supports a correction.');
  add(input.identityTheftDocumentation, 25, 'Identity-theft documentation supports the consumer statement.');
  add(input.impossibleOrMissingData, 15, 'A date, balance, or other required field is missing or internally inconsistent.');
  add(input.generalDenialOnly, -20, 'The consumer provided only a general denial.');
  add(input.hasSupportingEvidence === false, -15, 'No supporting evidence has been attached.');
  add(input.previouslyVerifiedWithoutNewEvidence, -20, 'The item was previously verified and no new evidence was supplied.');

  score = Math.max(0, Math.min(100, score));
  const hasStrongEvidence = Boolean(
    input.clearDocumentContradiction ||
    input.creditorCorrectionOrPaymentProof ||
    input.identityTheftDocumentation
  );

  if (input.userClarificationNeeded) {
    return { score, status: 'needs_clarification', reasons: [...reasons, 'The consumer must clarify a conflicting or incomplete fact.'] };
  }
  if (score >= 40 && hasStrongEvidence) return { score, status: 'ready_to_dispute', reasons };
  return { score, status: 'needs_evidence', reasons: reasons.length ? reasons : ['No documented factual inconsistency has been identified yet.'] };
}

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  ready_to_dispute: 'Ready to dispute',
  needs_evidence: 'Needs evidence',
  needs_clarification: 'Needs user clarification',
  not_recommended: 'Not recommended',
};
