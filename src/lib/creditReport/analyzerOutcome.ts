export const ANALYZER_CONFIDENCE_THRESHOLDS = {
  provider: 60,
  overall: 60,
  accounts: 50,
} as const;

export type AnalyzerOutcomeState = 'success' | 'needs_review' | 'failed';

export type AnalyzerOutcome = {
  state: AnalyzerOutcomeState;
  reasons: string[];
  requiresHumanReview: boolean;
  canPersistDraft: boolean;
  canMarkAnalyzed: boolean;
};

type OutcomeInput = {
  provider?: string;
  detectedProvider?: string;
  providerConfidence?: number;
  overallConfidence?: number;
  sectionConfidence?: { overall?: number; accounts?: number };
  accounts?: readonly unknown[];
  accountsRejected?: number;
  warnings?: readonly { severity?: string }[];
  negativeClassificationRan?: boolean;
  sectionStatuses?: { accounts?: string; chargeOffs?: string };
  diagnostics?: {
    stageFailures?: readonly { stage?: string; fatal?: boolean }[];
    preservedUnclassifiedBlocks?: number;
  };
};

function addReason(reasons: string[], condition: boolean, reason: string): void {
  if (condition && !reasons.includes(reason)) reasons.push(reason);
}

export function determineAnalyzerOutcome(report: OutcomeInput): AnalyzerOutcome {
  const failedReasons: string[] = [];
  const reviewReasons: string[] = [];
  const provider = report.provider ?? report.detectedProvider ?? 'unknown';
  const providerConfidence = report.providerConfidence ?? 0;
  const overallConfidence = report.overallConfidence ?? report.sectionConfidence?.overall ?? 0;
  const accountConfidence = report.sectionConfidence?.accounts ?? 0;
  const accounts = report.accounts ?? [];
  const stageFailures = report.diagnostics?.stageFailures ?? [];

  addReason(failedReasons, stageFailures.some(failure => failure.fatal === true), 'PARSER_FATAL');
  addReason(failedReasons, report.sectionStatuses?.accounts === 'parser_failed', 'ACCOUNT_PARSER_FAILED');
  addReason(failedReasons, accounts.length === 0, 'NO_ACCOUNTS_PARSED');

  addReason(reviewReasons, provider === 'unknown' || providerConfidence < ANALYZER_CONFIDENCE_THRESHOLDS.provider, 'PROVIDER_UNCERTAIN');
  addReason(reviewReasons, overallConfidence < ANALYZER_CONFIDENCE_THRESHOLDS.overall, 'OVERALL_CONFIDENCE_BELOW_THRESHOLD');
  addReason(reviewReasons, accountConfidence < ANALYZER_CONFIDENCE_THRESHOLDS.accounts, 'ACCOUNT_CONFIDENCE_BELOW_THRESHOLD');
  addReason(reviewReasons, report.sectionStatuses?.accounts === 'section_unreadable', 'ACCOUNT_SECTION_UNREADABLE');
  addReason(reviewReasons, report.sectionStatuses?.chargeOffs === 'parser_failed', 'NEGATIVE_CLASSIFICATION_FAILED');
  addReason(reviewReasons, report.negativeClassificationRan === false, 'NEGATIVE_CLASSIFICATION_NOT_RUN');
  addReason(reviewReasons, (report.accountsRejected ?? 0) > 0, 'ACCOUNT_CANDIDATES_REJECTED');
  addReason(reviewReasons, (report.diagnostics?.preservedUnclassifiedBlocks ?? 0) > 0, 'UNRESOLVED_REPORT_BLOCKS');
  addReason(reviewReasons, stageFailures.some(failure => failure.stage === 'text_extraction'), 'TEXT_EXTRACTION_INCOMPLETE');
  addReason(reviewReasons, (report.warnings ?? []).some(warning => warning.severity === 'error'), 'PARSER_ERROR_REPORTED');

  const reasons = failedReasons.length > 0 ? failedReasons : reviewReasons;
  const state: AnalyzerOutcomeState = failedReasons.length > 0
    ? 'failed'
    : reviewReasons.length > 0
      ? 'needs_review'
      : 'success';

  return {
    state,
    reasons,
    requiresHumanReview: state !== 'success',
    canPersistDraft: state !== 'failed',
    canMarkAnalyzed: state === 'success',
  };
}

export function isStoredReportEligibleForAutomatedAnalysis(report: Record<string, unknown>): boolean {
  const overallConfidence = Number(report.overall_confidence ?? 0);
  const accounts = report.all_accounts;
  return Number.isFinite(overallConfidence)
    && overallConfidence >= ANALYZER_CONFIDENCE_THRESHOLDS.overall
    && Array.isArray(accounts)
    && accounts.length > 0;
}
