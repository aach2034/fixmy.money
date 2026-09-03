import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { AIGatewayDependencies } from '@/lib/ai/gateway';
import {
  ANALYZER_CONFIDENCE_THRESHOLDS,
  determineAnalyzerOutcome,
  isStoredReportEligibleForAutomatedAnalysis,
} from '@/lib/creditReport/analyzerOutcome';
import { parseCreditReport, type SupportedProvider } from '@/lib/creditReport/parser';
import {
  validateCreditReportFileContent,
  validateCreditReportFileMetadata,
} from '@/lib/creditReport/reportFileValidation';
import { FMM002_DISCLOSURE_VERSION } from '@/lib/creditReport/aiPrivacy';
import {
  handleCreditReportAnalysisPost,
  type CreditReportAnalysisRouteDependencies,
} from '@/lib/creditReport/reportAnalysisRoute';

const encoder = new TextEncoder();
const fixture = (bureau: string) => readFileSync(
  join(process.cwd(), 'src/__tests__/fixtures/credit-reports', `${bureau}.txt`),
  'utf8',
);

describe('FMM-005 deterministic analyzer outcomes', () => {
  const successfulReport = {
    provider: 'experian',
    providerConfidence: ANALYZER_CONFIDENCE_THRESHOLDS.provider,
    overallConfidence: ANALYZER_CONFIDENCE_THRESHOLDS.overall,
    sectionConfidence: { overall: ANALYZER_CONFIDENCE_THRESHOLDS.overall, accounts: ANALYZER_CONFIDENCE_THRESHOLDS.accounts },
    accounts: [{}],
    accountsRejected: 0,
    warnings: [],
    negativeClassificationRan: true,
    sectionStatuses: { accounts: 'parsed_with_results', chargeOffs: 'parsed_none_reported' },
    diagnostics: { stageFailures: [], preservedUnclassifiedBlocks: 0 },
  };

  it('marks only a complete threshold-clearing parse successful', () => {
    expect(determineAnalyzerOutcome(successfulReport)).toEqual({
      state: 'success',
      reasons: [],
      requiresHumanReview: false,
      canPersistDraft: true,
      canMarkAnalyzed: true,
    });
  });

  it('routes low-confidence and incomplete extraction to review', () => {
    const result = determineAnalyzerOutcome({
      ...successfulReport,
      overallConfidence: ANALYZER_CONFIDENCE_THRESHOLDS.overall - 1,
      diagnostics: { stageFailures: [{ stage: 'text_extraction', fatal: false }], preservedUnclassifiedBlocks: 1 },
    });
    expect(result.state).toBe('needs_review');
    expect(result.canMarkAnalyzed).toBe(false);
    expect(result.reasons).toEqual([
      'OVERALL_CONFIDENCE_BELOW_THRESHOLD',
      'UNRESOLVED_REPORT_BLOCKS',
      'TEXT_EXTRACTION_INCOMPLETE',
    ]);
  });

  it('fails closed when no account was parsed or a fatal stage failed', () => {
    expect(determineAnalyzerOutcome({ ...successfulReport, accounts: [] }).state).toBe('failed');
    expect(determineAnalyzerOutcome({
      ...successfulReport,
      diagnostics: { stageFailures: [{ stage: 'account_parsing', fatal: true }], preservedUnclassifiedBlocks: 0 },
    }).state).toBe('failed');
  });

  it('blocks automated analysis of missing or low-confidence stored reports', () => {
    expect(isStoredReportEligibleForAutomatedAnalysis({ overall_confidence: 59, all_accounts: [{}] })).toBe(false);
    expect(isStoredReportEligibleForAutomatedAnalysis({ overall_confidence: 90, all_accounts: [] })).toBe(false);
    expect(isStoredReportEligibleForAutomatedAnalysis({ overall_confidence: 60, all_accounts: [{}] })).toBe(true);
  });

  it('returns an explicit review-required response without invoking AI', async () => {
    const gateway: AIGatewayDependencies = {
      reserve: vi.fn(async () => ({ allowed: true, usageId: 'unused', reason: null, retryAfterSeconds: null })),
      complete: vi.fn(async () => undefined),
      invoke: vi.fn(async () => ({ content: 'must not run', inputTokens: 1, outputTokens: 1 })),
    };
    const dependencies: CreditReportAnalysisRouteDependencies = {
      enabled: () => true,
      processorPolicyApproved: () => true,
      authorize: vi.fn(async () => ({ actorId: 'actor-1', workspaceId: 'workspace-1', workspaceOwnerId: 'owner-1', planId: 'starter' })),
      loadReport: vi.fn(async () => ({ overall_confidence: 59, all_accounts: [{}] })),
      gateway,
    };
    const response = await handleCreditReportAnalysisPost(new Request('https://example.test/api/credit-report/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parsedReportId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        consent: true,
        disclosureVersion: FMM002_DISCLOSURE_VERSION,
      }),
    }), dependencies);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'REPORT_AI_REQUIRES_REVIEW' });
    expect(gateway.reserve).not.toHaveBeenCalled();
    expect(gateway.invoke).not.toHaveBeenCalled();
  });
});

describe('FMM-005 supported report formats', () => {
  it.each([
    ['report.pdf', 'application/pdf', 'pdf'],
    ['report.txt', 'text/plain', 'text'],
    ['report.html', 'text/html', 'html'],
    ['report.json', 'application/json', 'json'],
  ] as const)('accepts the declared %s contract', (fileName, mimeType, format) => {
    expect(validateCreditReportFileMetadata({ fileName, mimeType, size: 100 })).toMatchObject({ valid: true, format });
  });

  it('rejects unsupported or mismatched formats', () => {
    expect(validateCreditReportFileMetadata({ fileName: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 100 })).toMatchObject({ valid: false, code: 'UNSUPPORTED_EXTENSION' });
    expect(validateCreditReportFileMetadata({ fileName: 'report.pdf', mimeType: 'text/plain', size: 100 })).toMatchObject({ valid: false, code: 'MIME_EXTENSION_MISMATCH' });
  });

  it('validates signatures and structured text before parsing', () => {
    const pdf = validateCreditReportFileMetadata({ fileName: 'report.pdf', mimeType: 'application/pdf', size: 100 });
    const json = validateCreditReportFileMetadata({ fileName: 'report.json', mimeType: 'application/json', size: 100 });
    if (!pdf.valid || !json.valid) throw new Error('test metadata invalid');

    expect(validateCreditReportFileContent(pdf, encoder.encode('%PDF-1.7 synthetic')).valid).toBe(true);
    expect(validateCreditReportFileContent(pdf, encoder.encode('not a pdf'))).toMatchObject({ valid: false, code: 'INVALID_FILE_SIGNATURE' });
    expect(validateCreditReportFileContent(json, encoder.encode('{"provider":"Experian","accounts":[]}')).valid).toBe(true);
    expect(validateCreditReportFileContent(json, encoder.encode('{invalid json report content'))).toMatchObject({ valid: false, code: 'INVALID_JSON' });
  });
});

describe('FMM-005 representative bureau fixtures', () => {
  it.each([
    ['experian', 'Experian'],
    ['equifax', 'Equifax'],
    ['transunion', 'TransUnion'],
  ] as const)('parses the synthetic %s fixture without a false failure', (provider, bureau) => {
    const parsed = parseCreditReport(fixture(provider), provider as SupportedProvider);
    expect(parsed.provider).toBe(provider);
    expect(parsed.accounts).toEqual(expect.arrayContaining([
      expect.objectContaining({ bureau }),
    ]));
    expect(parsed.analysisOutcome?.state).not.toBe('failed');
  });
});
