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

export function hasPlausibleInquiryDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = value.trim();
  let year = 0;
  let month = 0;
  let day = 0;

  const iso = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const us = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (us) {
    month = Number(us[1]);
    day = Number(us[2]);
    year = Number(us[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
  } else {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return year >= 1900 && year <= 2100 &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

export function isReliableInquiry(item: Pick<SavedAuditItem, 'creditor_name' | 'bureau' | 'bureaus_reporting' | 'date_reported'>): boolean {
  return hasPlausibleCreditorName(item.creditor_name) &&
    hasPlausibleInquiryDate(item.date_reported) &&
    getReportingBureaus(item).length > 0;
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
    return isReliableInquiry(item);
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
