export const RECENT_AUTH_MAX_AGE_SECONDS = 15 * 60;

type AuthenticationMethod = {
  method: string;
  timestamp: number;
};

const PRIMARY_AUTHENTICATION_METHODS = new Set([
  'magiclink',
  'oauth',
  'otp',
  'password',
  'sso/saml',
]);

export function readAuthenticationMethods(accessToken: string): AuthenticationMethod[] {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] || '', 'base64url').toString('utf8')) as {
      amr?: unknown;
    };
    if (!Array.isArray(payload.amr)) return [];
    return payload.amr.flatMap((entry): AuthenticationMethod[] => {
      if (!entry || typeof entry !== 'object') return [];
      const method = 'method' in entry ? entry.method : null;
      const timestamp = 'timestamp' in entry ? entry.timestamp : null;
      return typeof method === 'string' &&
        typeof timestamp === 'number' &&
        Number.isSafeInteger(timestamp)
        ? [{ method, timestamp }]
        : [];
    });
  } catch {
    return [];
  }
}

export function hasRecentAuthenticationMethod(
  accessToken: string,
  allowedMethods: ReadonlySet<string>,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  return readAuthenticationMethods(accessToken).some(({ method, timestamp }) =>
    allowedMethods.has(method) &&
    timestamp <= nowSeconds + 30 &&
    nowSeconds - timestamp <= RECENT_AUTH_MAX_AGE_SECONDS
  );
}

export function readPrimaryAuthenticationTime(accessToken: string): number | null {
  const timestamps = readAuthenticationMethods(accessToken)
    .filter(({ method }) => PRIMARY_AUTHENTICATION_METHODS.has(method))
    .map(({ timestamp }) => timestamp);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

export function hasRecentPrimaryAuthentication(
  accessToken: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const timestamp = readPrimaryAuthenticationTime(accessToken);
  return timestamp !== null &&
    timestamp <= nowSeconds + 30 &&
    nowSeconds - timestamp <= RECENT_AUTH_MAX_AGE_SECONDS;
}

export function isAuthenticationAfterRevocation(
  accessToken: string,
  revokedAfterSeconds: number
): boolean {
  const timestamp = readPrimaryAuthenticationTime(accessToken);
  return timestamp !== null &&
    Number.isFinite(revokedAfterSeconds) &&
    timestamp > revokedAfterSeconds;
}
