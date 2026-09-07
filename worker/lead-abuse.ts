import { leadRateDecision } from './security-controls';

export interface D1RunResult {
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1RunResult>;
  first<T>(): Promise<T | null>;
}

export interface D1Binding {
  prepare(query: string): D1PreparedStatement;
}

export interface LeadAbuseEnv {
  DB?: D1Binding;
  LEAD_RATE_LIMIT_SALT?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export const LEAD_RATE_WINDOW_SECONDS = 600;
export const LEAD_RATE_LIMIT_RETENTION_HOURS = 24;
export const LEAD_RATE_LIMIT_CLEANUP_BATCH = 500;
export const TURNSTILE_ACTION = 'marketing_lead';

export function leadResponse(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

async function privacySafeRateKey(request: Request, salt: string): Promise<string> {
  const address = request.headers.get('cf-connecting-ip') || 'unknown';
  const bytes = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyChallenge(
  token: unknown,
  request: Request,
  env: LeadAbuseEnv,
): Promise<boolean> {
  if (
    typeof token !== 'string' ||
    token.length < 1 ||
    token.length > 2048 ||
    !env.TURNSTILE_SECRET_KEY
  ) {
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
    });
    const address = request.headers.get('cf-connecting-ip');
    if (address) body.set('remoteip', address);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean; action?: string };
    return result.success === true && result.action === TURNSTILE_ACTION;
  } catch {
    return false;
  }
}

export async function enforceLeadRateLimit(
  request: Request,
  env: LeadAbuseEnv,
  challenge: unknown,
): Promise<Response | null> {
  if (!env.DB || !env.LEAD_RATE_LIMIT_SALT) {
    console.error(JSON.stringify({ event: 'lead_rate_limit_unavailable' }));
    return leadResponse({ error: 'Email signup is temporarily unavailable.' }, 503);
  }

  const key = await privacySafeRateKey(request, env.LEAD_RATE_LIMIT_SALT);
  // Preserve the existing millisecond window keys so in-flight production
  // counters remain authoritative across this deployment.
  const windowMilliseconds = LEAD_RATE_WINDOW_SECONDS * 1000;
  const windowStart = Math.floor(Date.now() / windowMilliseconds) * windowMilliseconds;
  const row = await env.DB.prepare(
    `INSERT INTO lead_rate_limits (rate_key, window_start, request_count, updated_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(rate_key, window_start) DO UPDATE SET
       request_count = lead_rate_limits.request_count + 1,
       updated_at = CURRENT_TIMESTAMP
     RETURNING request_count`,
  )
    .bind(key, windowStart)
    .first<{ request_count: number }>();
  const count = Number(row?.request_count || 1);

  if (leadRateDecision(count, false) === 'deny') {
    console.warn(JSON.stringify({ event: 'lead_rate_limited', window: windowStart, threshold: 'hard' }));
    return leadResponse(
      { error: 'Too many requests. Try again later.' },
      429,
      { 'Retry-After': String(LEAD_RATE_WINDOW_SECONDS) },
    );
  }

  const challengePassed = count > 5
    ? await verifyChallenge(challenge, request, env)
    : false;
  if (leadRateDecision(count, challengePassed) === 'challenge') {
    console.warn(JSON.stringify({ event: 'lead_challenge_required', window: windowStart }));
    return leadResponse(
      { error: 'Additional verification required.', code: 'CHALLENGE_REQUIRED' },
      429,
      { 'Retry-After': '60' },
    );
  }

  return null;
}

export async function cleanupExpiredRateLimits(
  db: D1Binding,
  now = Date.now(),
): Promise<number> {
  const cutoff = new Date(now - LEAD_RATE_LIMIT_RETENTION_HOURS * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  const result = await db.prepare(
    `DELETE FROM lead_rate_limits
     WHERE rowid IN (
       SELECT rowid
       FROM lead_rate_limits
       WHERE updated_at < ?
       ORDER BY updated_at ASC
       LIMIT ?
     )`,
  )
    .bind(cutoff, LEAD_RATE_LIMIT_CLEANUP_BATCH)
    .run();
  return Number(result.meta?.changes || 0);
}
