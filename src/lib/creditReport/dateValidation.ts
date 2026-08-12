const FUTURE_DATE_CLAIM = /\b(?:future(?:-dated)?|in the future|after (?:today|the current date)|has not (?:yet )?occurred)\b/i;

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function validIsoDate(year: string, month: string, day: string): string | null {
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');
  const date = new Date(Date.UTC(Number(year), Number(paddedMonth) - 1, Number(paddedDay)));
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(paddedMonth) - 1
    || date.getUTCDate() !== Number(paddedDay)
  ) return null;

  return `${year}-${paddedMonth}-${paddedDay}`;
}

export function normalizeCreditReportDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return validIsoDate(iso[1], iso[2], iso[3]);

  const us = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (us) return validIsoDate(us[3], us[1], us[2]);

  const named = trimmed.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (named) {
    const month = MONTHS[named[1].toLowerCase().slice(0, 3)];
    return month ? validIsoDate(named[3], month, named[2]) : null;
  }

  return null;
}

const DATE_VALUE = '(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}|[A-Za-z]+\\.?\\s+\\d{1,2},?\\s+\\d{4})';

export function extractCreditReportDate(text: unknown): string {
  if (typeof text !== 'string') return '';
  const labels = [
    'report\\s+(?:date|generated)',
    'date\\s+generated',
    'generated\\s+(?:on|date)',
    'as\\s+of',
  ];

  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:#-]?\\s*${DATE_VALUE}`, 'i'));
    const normalized = normalizeCreditReportDate(match?.[1]);
    if (normalized) return normalized;
  }

  return '';
}

export function currentIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isFalseFutureDateClaim(
  dateReported: unknown,
  explanation: unknown,
  today = currentIsoDate(),
): boolean {
  if (typeof explanation !== 'string' || !FUTURE_DATE_CLAIM.test(explanation)) return false;
  const reported = normalizeCreditReportDate(dateReported);
  const reference = normalizeCreditReportDate(today);
  return Boolean(reported && reference && reported <= reference);
}
