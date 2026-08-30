import { describe, expect, it } from 'vitest';
import { getReportingBureaus, hasPlausibleCreditorName, hasPlausibleInquiryDate, isReliableInquiry, scoreDisputeStrength, selectReliableAuditItems } from '../lib/creditReport/auditItems';

describe('credit audit item quality gate', () => {
  it('rejects PDF stream fragments and garbled creditor names', () => {
    expect(hasPlausibleCreditorName('endstream')).toBe(false);
    expect(hasPlausibleCreditorName('uUv+')).toBe(false);
    expect(hasPlausibleCreditorName('R 5. OI ޔL')).toBe(false);
    expect(hasPlausibleCreditorName('v Zt 1 v l$5 gX[')).toBe(false);
    expect(hasPlausibleCreditorName('YENDO INC')).toBe(true);
  });

  it('keeps only reliable, unique negative accounts and dated inquiries', () => {
    const reliable = selectReliableAuditItems([
      { creditor_name: 'YENDO INC', negative_category: 'collection', bureau: 'Equifax', is_negative: true, parser_confidence: 70, account_number_masked: '***1234' },
      { creditor_name: 'YENDO INC', negative_category: 'collection', bureau: 'Equifax', is_negative: true, parser_confidence: 70, account_number_masked: '***1234' },
      { creditor_name: 'endstream', negative_category: 'collection', bureau: 'Equifax', is_negative: true, parser_confidence: 90 },
      { creditor_name: 'CAPITAL ONE', negative_category: 'other', bureau: 'Experian', is_negative: false, parser_confidence: 90 },
      { creditor_name: 'DISCOVER BANK', negative_category: 'hard_inquiry', bureau: 'TransUnion', date_reported: '2026-01-10' },
      { creditor_name: 'UNKNOWN LENDER', negative_category: 'hard_inquiry', bureau: 'TransUnion', date_reported: '' },
      { creditor_name: 'EDUCATIONAL PROSE ABOUT CREDIT FILES', negative_category: 'hard_inquiry', bureau: 'Unknown', date_reported: '2026-01-10' },
    ]);

    expect(reliable.map(item => item.creditor_name)).toEqual(['YENDO INC', 'DISCOVER BANK']);
  });

  it('requires a real calendar date and recognized bureau for inquiries', () => {
    expect(hasPlausibleInquiryDate('2024-02-29')).toBe(true);
    expect(hasPlausibleInquiryDate('02/29/2024')).toBe(true);
    expect(hasPlausibleInquiryDate('2024-02-30')).toBe(false);
    expect(isReliableInquiry({ creditor_name: 'DISCOVER BANK', bureau: 'Equifax', date_reported: '01/15/2024' })).toBe(true);
    expect(isReliableInquiry({ creditor_name: 'DISCOVER BANK', bureau: 'Unknown', date_reported: '01/15/2024' })).toBe(false);
  });

  it('uses every supplied reporting bureau instead of only the primary bureau', () => {
    expect(getReportingBureaus({
      bureau: 'Equifax',
      bureaus_reporting: ['Equifax', 'Experian', 'TransUnion'],
    })).toEqual(['Equifax', 'Experian', 'TransUnion']);
  });

  it('normalizes bureau abbreviations and falls back to the primary bureau', () => {
    expect(getReportingBureaus({ bureau: 'TU' })).toEqual(['TransUnion']);
    expect(getReportingBureaus({ bureau: 'Equifax', bureaus_reporting: ['EQ', 'EX', 'TU', 'TU'] }))
      .toEqual(['Equifax', 'Experian', 'TransUnion']);
  });

  it('scores objective cross-bureau discrepancies as stronger first-round disputes', () => {
    const scored = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'eq',
        creditor_name: 'Capital One',
        furnisher_name: 'Capital One',
        negative_category: 'charge_off',
        bureau: 'Equifax',
        is_negative: true,
        parser_confidence: 90,
        account_number_masked: '****1234',
        account_type: 'Credit Card',
        status: 'Charge-off',
        balance: 4812,
        date_opened: '2021-04-15',
      },
      {
        id: 'tu',
        creditor_name: 'Capital One',
        furnisher_name: 'Capital One',
        negative_category: 'charge_off',
        bureau: 'TransUnion',
        is_negative: true,
        parser_confidence: 90,
        account_number_masked: '****1234',
        account_type: 'Credit Card',
        status: 'Paid charge-off',
        balance: 0,
        date_opened: '2021-04-15',
      },
    ]));

    expect(scored).toHaveLength(2);
    expect(scored[0].disputeStrength.strengthLabel).toBe('Strong');
    expect(scored[0].disputeStrength.isRecommended).toBe(true);
    expect(scored[0].disputeStrength.strongestAnomaly.toLowerCase()).toMatch(/balance|status/);
    expect(scored[0].disputeStrength.disputeBasis).toContain('Please investigate');
    expect(scored[0].disputeStrength.reportedDataSummary).toMatch(/Equifax: \$4,812/);
    expect(scored[0].disputeStrength.reportedDataSummary).toMatch(/TransUnion: \$0/);
  });

  it('generates balance-specific audit and dispute wording', () => {
    const [scored] = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'eq-balance', creditor_name: 'Capital One', furnisher_name: 'Capital One',
        negative_category: 'other', bureau: 'Equifax', is_negative: true,
        parser_confidence: 90, account_number_masked: '****1234', account_type: 'Credit Card',
        status: 'Open', balance: 4812, date_opened: '2021-04-15',
      },
      {
        id: 'ex-balance', creditor_name: 'Capital One', furnisher_name: 'Capital One',
        negative_category: 'other', bureau: 'Experian', is_negative: true,
        parser_confidence: 90, account_number_masked: '****1234', account_type: 'Credit Card',
        status: 'Open', balance: 0, date_opened: '2021-04-15',
      },
    ]));

    expect(scored.disputeStrength.issueType).toBe('balance_discrepancy');
    expect(scored.disputeStrength.anomalyTitle).toBe('Account balance mismatch');
    expect(scored.disputeStrength.strongestAnomaly).toContain('balance differs');
    expect(scored.disputeStrength.reportedDataSummary).toContain('Current Balance');
    expect(scored.disputeStrength.factualBasis).toContain('conflicting balance information');
    expect(scored.disputeStrength.disputeReason).toContain('account balance');
    expect(scored.disputeStrength.disputeBasis).not.toContain('different account statuses');
  });

  it('does not automatically rate an unsubstantiated status difference Strong', () => {
    const [scored] = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'eq-open', creditor_name: 'Capital One', furnisher_name: 'Capital One',
        negative_category: 'other', bureau: 'Equifax', is_negative: true,
        parser_confidence: 90, account_number_masked: '****1234', account_type: 'Credit Card',
        status: 'Open', balance: 0, date_opened: '2021-04-15',
      },
      {
        id: 'ex-closed', creditor_name: 'Capital One', furnisher_name: 'Capital One',
        negative_category: 'other', bureau: 'Experian', is_negative: true,
        parser_confidence: 90, account_number_masked: '****1234', account_type: 'Credit Card',
        status: 'Closed', balance: 0, date_opened: '2021-04-15',
      },
    ]));

    expect(scored.disputeStrength.issueType).toBe('status_discrepancy');
    expect(scored.disputeStrength.strengthLabel).toBe('Moderate');
    expect(scored.disputeStrength.isRecommended).toBe(false);
  });

  it('converts generic paid-balance findings into evidence-specific letter language', () => {
    const [scored] = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'eq-paid-balance',
        creditor_name: 'Yendo Inc',
        furnisher_name: 'Yendo Inc',
        negative_category: 'collection',
        bureau: 'Equifax',
        is_negative: true,
        parser_confidence: 92,
        account_number_masked: '****8812',
        status: 'Paid/Closed',
        balance: 1284,
      },
    ]));

    expect(scored.disputeStrength.strongestAnomaly).toBe('A tradeline that appears paid, settled, or closed is also reporting a positive balance.');
    expect(scored.disputeStrength.reportedDataSummary).toContain('Equifax');
    expect(scored.disputeStrength.reportedDataSummary).toContain('Status: Paid/Closed');
    expect(scored.disputeStrength.reportedDataSummary).toContain('Current Balance: $1,284');
    expect(scored.disputeStrength.disputeBasis).toContain('paid, settled, or closed status');
    expect(scored.disputeStrength.disputeBasis).toContain('positive outstanding balance');
  });

  it('shows both bureau values for cross-bureau status conflicts', () => {
    const scored = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'ex-status',
        creditor_name: 'Yendo Inc',
        furnisher_name: 'Yendo Inc',
        negative_category: 'collection',
        bureau: 'Experian',
        is_negative: true,
        parser_confidence: 90,
        account_number_masked: '****8812',
        status: 'Paid/Closed',
        balance: 0,
        date_opened: '2022-02-01',
      },
      {
        id: 'tu-status',
        creditor_name: 'Yendo Inc',
        furnisher_name: 'Yendo Inc',
        negative_category: 'collection',
        bureau: 'TransUnion',
        is_negative: true,
        parser_confidence: 90,
        account_number_masked: '****8812',
        status: 'Closed',
        balance: 0,
        date_opened: '2022-02-01',
      },
    ]));

    const summaries = scored.map(item => item.disputeStrength.reportedDataSummary).join('\n');
    expect(summaries).toContain('Experian');
    expect(summaries).toContain('TransUnion');
    expect(summaries).toMatch(/Paid\/Closed|Closed/);
  });

  it('does not score a missing bureau status as a strong cross-bureau dispute', () => {
    const scored = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'eq-placeholder', creditor_name: 'Yendo Inc', furnisher_name: 'Yendo Inc',
        negative_category: 'collection', bureau: 'Equifax', is_negative: true,
        parser_confidence: 90, account_number_masked: '****8812', account_type: 'Collection',
        status: '- - -', balance: 0, date_opened: '2022-02-01',
      },
      {
        id: 'ex-closed', creditor_name: 'Yendo Inc', furnisher_name: 'Yendo Inc',
        negative_category: 'collection', bureau: 'Experian', is_negative: true,
        parser_confidence: 90, account_number_masked: '****8812', account_type: 'Collection',
        status: 'Closed', balance: 0, date_opened: '2022-02-01',
      },
      {
        id: 'tu-closed', creditor_name: 'Yendo Inc', furnisher_name: 'Yendo Inc',
        negative_category: 'collection', bureau: 'TransUnion', is_negative: true,
        parser_confidence: 90, account_number_masked: '****8812', account_type: 'Collection',
        status: 'Closed', balance: 0, date_opened: '2022-02-01',
      },
    ]));

    expect(scored.every(item => item.disputeStrength.issueType !== 'status_discrepancy')).toBe(true);
    expect(scored.every(item => item.disputeStrength.strengthLabel !== 'Strong')).toBe(true);
    expect(scored.map(item => item.disputeStrength.reportedDataSummary).join('\n')).not.toContain('- - -');
  });

  it('does not invent missing values in evidence summaries', () => {
    const [scored] = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'eq-missing-payment',
        creditor_name: 'Yendo Inc',
        negative_category: 'collection',
        bureau: 'Equifax',
        is_negative: true,
        parser_confidence: 92,
        account_number_masked: '****8812',
        status: 'Paid/Closed',
        balance: 1284,
      },
    ]));

    expect(scored.disputeStrength.reportedDataSummary).not.toContain('Payment Status');
    expect(scored.disputeStrength.reportedDataSummary).not.toContain('Unknown');
    expect(scored.disputeStrength.reportedDataSummary).not.toContain('null');
    expect(scored.disputeStrength.reportedDataSummary).not.toContain('undefined');
  });

  it('does not leak another account values into a letter-ready evidence summary', () => {
    const scored = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'target',
        creditor_name: 'Yendo Inc',
        negative_category: 'collection',
        bureau: 'Equifax',
        is_negative: true,
        parser_confidence: 92,
        account_number_masked: '****8812',
        status: 'Paid/Closed',
        balance: 1284,
      },
      {
        id: 'other',
        creditor_name: 'Capital One',
        negative_category: 'charge_off',
        bureau: 'Equifax',
        is_negative: true,
        parser_confidence: 92,
        account_number_masked: '****9999',
        status: 'Charge-off',
        balance: 4812,
      },
    ]));

    const target = scored.find(item => item.id === 'target');
    expect(target?.disputeStrength.reportedDataSummary).toContain('$1,284');
    expect(target?.disputeStrength.reportedDataSummary).not.toContain('$4,812');
    expect(target?.disputeStrength.reportedDataSummary).not.toContain('Capital One');
  });

  it('does not mark a negative item strong without a detected factual anomaly', () => {
    const [scored] = scoreDisputeStrength(selectReliableAuditItems([
      {
        id: 'single',
        creditor_name: 'Midland Credit',
        negative_category: 'collection',
        bureau: 'Experian',
        is_negative: true,
        parser_confidence: 85,
        account_number_masked: '****7788',
        status: 'Collection',
        balance: 600,
      },
    ]));

    expect(scored.disputeStrength.strengthLabel).toBe('Weak');
    expect(scored.disputeStrength.isRecommended).toBe(false);
    expect(scored.disputeStrength.strongestAnomaly).toBe('No factual anomaly detected');
  });
});
