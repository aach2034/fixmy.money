import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_STEP_UP_COOKIE = '__Host-fmm-admin-step-up';
export const ADMIN_STEP_UP_MAX_AGE_SECONDS = 15 * 60;
export const ADMIN_DESTRUCTIVE_AUTH_COOKIE = '__Host-fmm-admin-destructive';
export const ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS = 2 * 60;

export type AdminStepUpBinding = {
  userId: string;
  sessionId: string;
  issuedAt: number;
};

export type AdminDestructiveAuthorizationBinding = AdminStepUpBinding & {
  action: string;
  targetId: string;
  materialHash: string;
  nonce: string;
  expiresAt: number;
};

export type AdminActionMaterial = Record<string, string | number | boolean | null>;

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function canonicalize(value: unknown): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Administrator action material numbers must be finite.');
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}

export function hashAdminActionMaterial(material: AdminActionMaterial): string {
  return createHash('sha256').update(canonicalize(material)).digest('base64url');
}

export function hashAdminActionNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('base64url');
}

export function readSessionId(accessToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] || '', 'base64url').toString('utf8')) as {
      session_id?: unknown;
    };
    return typeof payload.session_id === 'string' && payload.session_id.length > 0
      ? payload.session_id
      : null;
  } catch {
    return null;
  }
}

export function createAdminStepUpToken(binding: AdminStepUpBinding, secret: string): string {
  if (secret.length < 32) throw new Error('ADMIN_STEP_UP_SECRET must contain at least 32 characters.');
  const body = encode(JSON.stringify(binding));
  return `${body}.${sign(body, secret)}`;
}

export function verifyAdminStepUpToken(input: {
  token: string | undefined;
  secret: string;
  userId: string;
  sessionId: string;
  nowSeconds?: number;
}): AdminStepUpBinding | null {
  if (!input.token || input.secret.length < 32) return null;
  const [body, suppliedSignature, extra] = input.token.split('.');
  if (!body || !suppliedSignature || extra) return null;

  const expectedSignature = sign(body, input.secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const binding = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<AdminStepUpBinding>;
    const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (
      binding.userId !== input.userId ||
      binding.sessionId !== input.sessionId ||
      typeof binding.issuedAt !== 'number' ||
      !Number.isSafeInteger(binding.issuedAt) ||
      binding.issuedAt > now + 30 ||
      now - binding.issuedAt > ADMIN_STEP_UP_MAX_AGE_SECONDS
    ) {
      return null;
    }
    return binding as AdminStepUpBinding;
  } catch {
    return null;
  }
}

export function createAdminDestructiveAuthorizationToken(
  binding: AdminDestructiveAuthorizationBinding,
  secret: string
): string {
  if (secret.length < 32) throw new Error('ADMIN_STEP_UP_SECRET must contain at least 32 characters.');
  const body = encode(JSON.stringify(binding));
  return `${body}.${sign(body, secret)}`;
}

export function verifyAdminDestructiveAuthorizationToken(input: {
  token: string | undefined;
  secret: string;
  userId: string;
  sessionId: string;
  action: string;
  targetId: string;
  material: AdminActionMaterial;
  nowSeconds?: number;
}): AdminDestructiveAuthorizationBinding | null {
  if (!input.token || input.secret.length < 32) return null;
  const [body, suppliedSignature, extra] = input.token.split('.');
  if (!body || !suppliedSignature || extra) return null;

  const expectedSignature = sign(body, input.secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const binding = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<AdminDestructiveAuthorizationBinding>;
    const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (
      binding.userId !== input.userId ||
      binding.sessionId !== input.sessionId ||
      binding.action !== input.action ||
      binding.targetId !== input.targetId ||
      binding.materialHash !== hashAdminActionMaterial(input.material) ||
      typeof binding.nonce !== 'string' ||
      binding.nonce.length < 32 ||
      typeof binding.issuedAt !== 'number' ||
      !Number.isSafeInteger(binding.issuedAt) ||
      typeof binding.expiresAt !== 'number' ||
      !Number.isSafeInteger(binding.expiresAt) ||
      binding.issuedAt > now + 30 ||
      binding.expiresAt <= now ||
      binding.expiresAt - binding.issuedAt > ADMIN_DESTRUCTIVE_AUTH_MAX_AGE_SECONDS
    ) {
      return null;
    }
    return binding as AdminDestructiveAuthorizationBinding;
  } catch {
    return null;
  }
}
