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
