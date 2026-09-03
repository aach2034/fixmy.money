import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { parseAIGatewayRequest, type AIGatewayDependencies } from '@/lib/ai/gateway';
import {
  FMM002_DISCLOSURE_VERSION,
  FMM002_EXTERNAL_SCHEMA_VERSION,
  isReportAIProcessorPolicyApproved,
  minimizeReportForExternalAI,
  parseCreditReportAnalysisRequest,
  stripRawReportArtifacts,
} from '@/lib/creditReport/aiPrivacy';
import {
  handleCreditReportAnalysisPost,
  type CreditReportAnalysisRouteDependencies,
} from '@/lib/creditReport/reportAnalysisRoute';

const reportId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function request(body: unknown) {
  return new Request('https://example.test/api/credit-report/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function dependencies(
  overrides: Partial<CreditReportAnalysisRouteDependencies> = {},
): CreditReportAnalysisRouteDependencies {
  const gateway: AIGatewayDependencies = {
    reserve: vi.fn(async () => ({
      allowed: true,
      usageId: 'usage-fmm002',
      reason: null,
      retryAfterSeconds: null,
    })),
    complete: vi.fn(async () => undefined),
    invoke: vi.fn(async () => ({ content: 'Review late-payment categories.', inputTokens: 40, outputTokens: 8 })),
  };
  return {
    enabled: () => true,
    processorPolicyApproved: () => true,
    authorize: vi.fn(async () => ({ actorId: 'actor-1', workspaceId: 'workspace-1', workspaceOwnerId: 'owner-1', planId: 'starter' })),
    loadReport: vi.fn(async () => ({
      provider: 'SmartCredit',
      overall_confidence: 82,
      scores: [{ bureau: 'Experian', score: 610, ssn: '123-45-6789' }],
      all_accounts: [{
        bureau: 'Experian',
        creditorName: 'Private Bank',
        accountNumberMasked: '****1234',
        accountType: 'Credit Card',
        accountStatus: 'Late',
        balance: 2_400,
        pastDue: 600,
        isNegative: true,
        isLate: true,
        rawText: 'Jane Doe 123 Main Street 123-45-6789',
        remarks: ['consumer disputes'],
      }],
      all_inquiries: [{ bureau: 'Experian', creditor: 'Private Lender', type: 'hard' }],
      public_records: [{ type: 'bankruptcy', rawText: 'private court record' }],
    })),
    gateway,
    ...overrides,
  };
}

const approvedRequest = {
  parsedReportId: reportId,
  consent: true,
  disclosureVersion: FMM002_DISCLOSURE_VERSION,
};

describe('FMM-002 strict consent and processor policy', () => {
  it('accepts only the current exact consent contract', () => {
    expect(parseCreditReportAnalysisRequest(approvedRequest)).toEqual(approvedRequest);
    expect(() => parseCreditReportAnalysisRequest({ ...approvedRequest, consent: false })).toThrow(/consent/i);
    expect(() => parseCreditReportAnalysisRequest({ ...approvedRequest, rawText: 'secret' })).toThrow(/Expected only/);
  });

  it('requires an approved no-training policy with retention capped at 30 days', () => {
    expect(isReportAIProcessorPolicyApproved({
      REPORT_AI_PROCESSOR_POLICY_VERSION: FMM002_DISCLOSURE_VERSION,
      REPORT_AI_PROCESSOR_NO_TRAINING: 'true',
      REPORT_AI_PROCESSOR_RETENTION_DAYS: '30',
    } as NodeJS.ProcessEnv)).toBe(true);
    expect(isReportAIProcessorPolicyApproved({
      REPORT_AI_PROCESSOR_POLICY_VERSION: FMM002_DISCLOSURE_VERSION,
      REPORT_AI_PROCESSOR_NO_TRAINING: 'true',
      REPORT_AI_PROCESSOR_RETENTION_DAYS: '31',
    } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('keeps the internal report operation unavailable to the generic client gateway', () => {
    expect(() => parseAIGatewayRequest({
      operation: 'credit_report_analysis',
      input: { prompt: 'raw report text' },
    })).toThrow(/Unknown AI operation/);
  });
});

describe('FMM-002 deterministic minimization', () => {
  it('emits only aggregate categorical data and strips identifiers/free text', () => {
    const minimized = minimizeReportForExternalAI({
      provider: 'SmartCredit',
      overall_confidence: 82,
      scores: [{ bureau: 'Experian', score: 610, name: 'Jane Doe' }],
      all_accounts: [{
        bureau: 'Experian',
        creditorName: 'Private Bank',
        accountNumberMasked: '****1234',
        accountType: 'Credit Card',
        accountStatus: 'Late',
        balance: 2_400,
        pastDue: 600,
        isNegative: true,
        isLate: true,
        rawText: 'Jane Doe 123 Main Street 123-45-6789',
      }],
      all_inquiries: [{ bureau: 'Experian', creditor: 'Private Lender', type: 'hard' }],
      public_records: [{ type: 'bankruptcy', notes: 'private details' }],
    });
    const serialized = JSON.stringify(minimized);

    expect(minimized.schemaVersion).toBe(FMM002_EXTERNAL_SCHEMA_VERSION);
    expect(minimized.accountGroups[0]).toMatchObject({
      bureau: 'experian',
      accountClass: 'revolving',
      statusClass: 'late',
      balanceBand: '2000_9999',
      pastDueBand: '500_1999',
      flags: ['negative', 'late'],
      count: 1,
    });
    for (const secret of ['Jane Doe', 'Private Bank', 'Private Lender', '1234', '123-45-6789', 'private details']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('recursively removes raw extraction artifacts before normalized persistence', () => {
    expect(stripRawReportArtifacts({
      creditorName: 'retained normalized value',
      rawText: 'remove',
      nested: [{ raw_text_source: 'remove', status: 'current' }],
      unparsedBlocks: ['remove'],
    })).toEqual({
      creditorName: 'retained normalized value',
      nested: [{ status: 'current' }],
    });
  });
});

describe('FMM-002 fail-closed report route', () => {
  it('does not parse or invoke when the processor policy is unapproved', async () => {
    const deps = dependencies({ processorPolicyApproved: () => false });
    const response = await handleCreditReportAnalysisPost(request(approvedRequest), deps);
    expect(response.status).toBe(503);
    expect(deps.loadReport).not.toHaveBeenCalled();
    expect(deps.gateway.invoke).not.toHaveBeenCalled();
  });

  it('does not invoke without current explicit consent', async () => {
    const deps = dependencies();
    const response = await handleCreditReportAnalysisPost(request({ ...approvedRequest, consent: false }), deps);
    expect(response.status).toBe(400);
    expect(deps.loadReport).not.toHaveBeenCalled();
    expect(deps.gateway.invoke).not.toHaveBeenCalled();
  });

  it('loads by workspace and sends only the minimized server-built prompt', async () => {
    const deps = dependencies();
    const response = await handleCreditReportAnalysisPost(request(approvedRequest), deps);
    const body = await response.json();
    const invoke = vi.mocked(deps.gateway.invoke);
    const providerPrompt = invoke.mock.calls[0][0].prompt;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ schemaVersion: FMM002_EXTERNAL_SCHEMA_VERSION, requiresHumanReview: true });
    expect(deps.loadReport).toHaveBeenCalledWith({ parsedReportId: reportId, workspaceOwnerId: 'owner-1' });
    expect(providerPrompt).toContain(FMM002_EXTERNAL_SCHEMA_VERSION);
    for (const secret of ['Jane Doe', 'Private Bank', 'Private Lender', '1234', '123-45-6789', 'private court record']) {
      expect(providerPrompt).not.toContain(secret);
    }
  });
});

describe('FMM-002 persistence controls', () => {
  it('removes cached OCR persistence and raw-text writes from active import paths', () => {
    const root = process.cwd();
    const importPage = fs.readFileSync(path.join(root, 'src/app/credit-report-import/components/CreditReportImportContent.tsx'), 'utf8');
    const parseRoute = fs.readFileSync(path.join(root, 'src/app/api/credit-report/parse-report/route.ts'), 'utf8');
    const tagRoute = fs.readFileSync(path.join(root, 'src/app/api/credit-report/tag-and-save/route.ts'), 'utf8');
    expect(importPage).not.toContain("storage.from(OCR_STORAGE_BUCKET)");
    expect(importPage).toContain("raw_text: ''");
    expect(importPage).toContain("raw_text_source: ''");
    expect(parseRoute).toContain("raw_text: ''");
    expect(tagRoute).toContain("raw_text_source: ''");
  });

  it('prepares irreversible cleanup and database constraints without executing production changes', () => {
    const root = process.cwd();
    const migration = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260903181039_fmm_002_report_privacy_controls.sql'),
      'utf8',
    );
    expect(migration).toContain("SET raw_text = ''");
    expect(migration).toContain("SET raw_text_source = ''");
    expect(migration).toContain('parsed_credit_reports_no_raw_report_artifacts');
    expect(migration).toContain("operation IN ('agency_assistant', 'credit_report_analysis')");
    expect(migration).toContain("p_operation NOT IN ('agency_assistant', 'credit_report_analysis')");
  });
});
