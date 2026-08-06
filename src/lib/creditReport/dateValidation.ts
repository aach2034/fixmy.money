const FUTURE_DATE_CLAIM = /\b(?:future(?:-dated)?|in the future|after (?:today|the current date)|has not (?:yet )?occurred)\b/i;

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(month) - 1
    || date.getUTCDate() !== Number(day)
  ) return null;

  return `${year}-${month}-${day}`;
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
  const reported = normalizeIsoDate(dateReported);
  const reference = normalizeIsoDate(today);
  return Boolean(reported && reference && reported <= reference);
}
