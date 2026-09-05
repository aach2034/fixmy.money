import type { ParsedCreditReport } from './parser';

export type PersistedReportItem = {
  id?: string | null;
  bureau?: string | null;
  creditor_name?: string | null;
  account_number_masked?: string | null;
  account_type?: string | null;
  negative_category?: string | null;
  is_negative?: boolean | null;
  is_collection?: boolean | null;
};

export type PersistedClassificationSummary = {
  accounts: number;
  negatives: number;
  collections: number;
  chargeOffs: number;
  inquiries: number;
  duplicates: number;
};

export function getActionableUnmatchedBlocks(report: ParsedCreditReport): string[] {
  const reconciledCount = report.diagnostics?.readableTextBlocksRejected;
  if (typeof reconciledCount === 'number') {
    return reconciledCount > 0 ? report.unparsedBlocks.slice(0, reconciledCount) : [];
  }

  const dispositions = report.blockDispositions ?? report.diagnostics?.blockDispositions;
  if (Array.isArray(dispositions)) {
    return dispositions
      .filter(block => block.finalDisposition === 'preserved-unclassified')
      .map(block => block.normalizedText || block.rawText)
      .filter(Boolean);
  }

  return report.unparsedBlocks;
}

export function summarizePersistedReportItems(items: PersistedReportItem[]): PersistedClassificationSummary {
  const accountRows = items.filter(item => item.negative_category !== 'hard_inquiry' && item.account_type !== 'Hard Inquiry');
  const inquiries = items.filter(item => item.negative_category === 'hard_inquiry' || item.account_type === 'Hard Inquiry');
  const keys = items.map(item => [
    item.bureau ?? '',
    item.creditor_name?.trim().toLowerCase() ?? '',
    item.account_number_masked?.trim().toLowerCase() ?? '',
    item.negative_category ?? '',
  ].join('|'));

  return {
    accounts: accountRows.length,
    negatives: accountRows.filter(item => item.is_negative === true).length,
    collections: accountRows.filter(item => item.is_collection === true || item.negative_category === 'collection').length,
    chargeOffs: accountRows.filter(item => item.negative_category === 'charge_off').length,
    inquiries: inquiries.length,
    duplicates: keys.length - new Set(keys).size,
  };
}
