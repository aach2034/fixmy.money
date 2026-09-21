const RECOVERY_STATE_VERSION = 1;
const RECOVERY_STATE_SIGNING_CONTEXT = 'fixmymoney-password-recovery-v1:';

export const PASSWORD_RECOVERY_COOKIE = 'fmm-password-recovery';
export const PASSWORD_RECOVERY_TTL_SECONDS = 15 * 60;

interface RecoveryStatePayload {
  version: number;
  userId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

interface SessionClaims {
  sub?: unknown;
  session_id?: unknown;
  exp?: unknown;
}

interface ParsedSessionClaims {
  sub: string;
  session_id: string;
  exp: number;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function parseSessionClaims(accessToken: string): ParsedSessionClaims {
  const encodedPayload = accessToken.split('.')[1];
  if (!encodedPayload) throw new Error('Recovery session token is malformed.');

  const claims = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(encodedPayload))
  ) as SessionClaims;

  if (
    typeof claims.sub !== 'string' ||
    typeof claims.session_id !== 'string' ||
    typeof claims.exp !== 'number'
  ) {
    throw new Error('Recovery session token is missing required claims.');
  }

  return {
    sub: claims.sub,
    session_id: claims.session_id,
    exp: claims.exp,
  };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  if (!secret.trim()) throw new Error('Recovery-state signing is not configured.');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signPayload(encodedPayload: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await importSigningKey(secret),
    new TextEncoder().encode(`${RECOVERY_STATE_SIGNING_CONTEXT}${encodedPayload}`)
  );
  return encodeBase64Url(new Uint8Array(signature));
}

export async function issuePasswordRecoveryState({
  accessToken,
  userId,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  accessToken: string;
  userId: string;
  secret: string;
  nowSeconds?: number;
}): Promise<string> {
  const claims = parseSessionClaims(accessToken);
  if (claims.sub !== userId || claims.exp <= nowSeconds) {
    throw new Error('Recovery session identity or expiration is invalid.');
  }

  const payload: RecoveryStatePayload = {
    version: RECOVERY_STATE_VERSION,
    userId,
    sessionId: claims.session_id,
    issuedAt: nowSeconds,
    expiresAt: Math.min(claims.exp, nowSeconds + PASSWORD_RECOVERY_TTL_SECONDS),
  };
  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return `${encodedPayload}.${await signPayload(encodedPayload, secret)}`;
}

export async function verifyPasswordRecoveryState({
  state,
  accessToken,
  userId,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  state: string;
  accessToken: string;
  userId: string;
  secret: string;
  nowSeconds?: number;
}): Promise<boolean> {
  try {
    const [encodedPayload, encodedSignature, extra] = state.split('.');
    if (!encodedPayload || !encodedSignature || extra) return false;

    const signatureValid = await crypto.subtle.verify(
      'HMAC',
      await importSigningKey(secret),
      toArrayBuffer(decodeBase64Url(encodedSignature)),
      new TextEncoder().encode(`${RECOVERY_STATE_SIGNING_CONTEXT}${encodedPayload}`)
    );
    if (!signatureValid) return false;

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload))
    ) as RecoveryStatePayload;
    const claims = parseSessionClaims(accessToken);

    return (
      payload.version === RECOVERY_STATE_VERSION &&
      payload.userId === userId &&
      payload.userId === claims.sub &&
      payload.sessionId === claims.session_id &&
      Number.isInteger(payload.issuedAt) &&
      Number.isInteger(payload.expiresAt) &&
      payload.issuedAt <= nowSeconds + 60 &&
      payload.expiresAt > nowSeconds &&
      payload.expiresAt <= claims.exp &&
      payload.expiresAt - payload.issuedAt <= PASSWORD_RECOVERY_TTL_SECONDS
    );
  } catch {
    return false;
  }
}
