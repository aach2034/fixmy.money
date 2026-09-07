export const REOPENING_DATE_DISPLAY = 'October 25, 2026';
export const REOPENING_DATE_ISO = '2026-10-25';
export const REOPENING_OFFER = 'reopening-one-month-free-2026-10-25';
export const SIGNUP_CLOSED_MESSAGE =
  `New account creation is temporarily unavailable while we improve FixMy.Money. ` +
  `Join the reopening list for ${REOPENING_DATE_DISPLAY} and reserve one month free.`;

const DEFAULT_SHUTDOWN_STARTED_AT = '2026-09-05T00:00:00-04:00';

export function getSignupShutdownStartedAt(): Date {
  const configured = process.env.SIGNUP_SHUTDOWN_STARTED_AT || DEFAULT_SHUTDOWN_STARTED_AT;
  const parsed = new Date(configured);
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_SHUTDOWN_STARTED_AT) : parsed;
}

export function isPreShutdownUser(createdAt: string | undefined | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  return !Number.isNaN(created.getTime()) && created < getSignupShutdownStartedAt();
}

export function signupClosedPayload() {
  return {
    error: SIGNUP_CLOSED_MESSAGE,
    code: 'SIGNUPS_CLOSED',
    waitlistUrl: '/#reopening-list',
    reopeningDate: REOPENING_DATE_ISO,
  } as const;
}
