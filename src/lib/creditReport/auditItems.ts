export interface SavedAuditItem {
  creditor_name?: string | null;
  negative_category?: string | null;
  bureau?: string | null;
  bureaus_reporting?: string[] | null;
  balance?: number | string | null;
  dispute_reason?: string | null;
  negative_reason?: string | null;
  dispute_status?: string | null;
  is_negative?: boolean | null;
  parser_confidence?: number | null;
  account_number_masked?: string | null;
  date_reported?: string | null;
}

const BUREAU_NAMES: Record<string, string> = {
  equifax: 'Equifax',
  eq: 'Equifax',
  experian: 'Experian',
  ex: 'Experian',
  transunion: 'TransUnion',
  'trans union': 'TransUnion',
  tu: 'TransUnion',
};

export function getReportingBureaus(item: SavedAuditItem): string[] {
  const supplied = Array.isArray(item.bureaus_reporting) ? item.bureaus_reporting : [];
  const values = supplied.length > 0 ? supplied : [item.bureau];

  return [...new Set(values
    .map(value => typeof value === 'string' ? BUREAU_NAMES[value.trim().toLowerCase()] : undefined)
    .filter((value): value is string => Boolean(value))
  )];
}

const PDF_GARBAGE = /(?:endstream|endobj|xref|startxref|\/xobject|\/dctdecode|\/flatedecode|\bjfif\b|\btrailer\b)/i;
const SECTION_LABEL = /^(?:for more details|account history|personal information|credit report|hard inquiries?|soft inquiries?|inquiries?|page \d+)\.?$/i;

export function hasPlausibleCreditorName(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 120) return false;
  if (PDF_GARBAGE.test(name) || SECTION_LABEL.test(name)) return false;
  if (/[^\x20-\x7E]/.test(name)) return false;
  if (/[^A-Za-z0-9\s.,&'()\/-]/.test(name)) return false;
  if ((name.match(/[A-Za-z]/g) ?? []).length < 3) return false;
  return /[A-Za-z]{2,}/.test(name);
}

function isUsableItem(item: SavedAuditItem): boolean {
  if (['deleted', 'closed'].includes(item.dispute_status ?? '')) return false;
  if (!hasPlausibleCreditorName(item.creditor_name)) return false;

  if (item.negative_category === 'hard_inquiry') {
    // Inquiry rows do not receive an account parser-confidence score, so a
    // usable creditor and reported date are the minimum reliable evidence.
    return Boolean(item.date_reported?.trim());
  }

  // Account rows are persisted even when the parser is uncertain. The audit is
  // a decision surface, so only include rows with actual negative status and
  // enough extracted fields to clear the parser's confidence threshold.
  return item.is_negative === true && (item.parser_confidence ?? 0) >= 40;
}

export function selectReliableAuditItems(items: SavedAuditItem[]): SavedAuditItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!isUsableItem(item)) return false;
    const key = [
      item.negative_category ?? '',
      item.bureau ?? '',
      item.creditor_name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '',
      item.account_number_masked ?? '',
      item.date_reported ?? '',
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
