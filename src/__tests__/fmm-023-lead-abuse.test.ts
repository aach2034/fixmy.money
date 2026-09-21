import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  cleanupExpiredRateLimits,
  emitLeadSecurityEvent,
  enforceLeadRateLimit,
  LEAD_RATE_LIMIT_RETENTION_HOURS,
  type D1Binding,
  type D1PreparedStatement,
} from '../../worker/lead-abuse';
import {
  captureReopeningWaitlist,
  LEAD_REQUEST_MAX_BYTES,
} from '../../worker/lead-capture';
import {
  addRuntimePublicAttributesToHtml,
  getRuntimePublicAttributes,
} from '../../worker/runtime-public-config';
import {
  getRuntimeTurnstileSiteKey,
  initialLeadChallengeState,
  leadChallengeReducer,
} from '@/lib/marketing/leadChallenge';

class FakeD1 implements D1Binding {
  requestCount: number;
  lastWindowStart: number | null = null;
  rateRows: Array<{ updated_at: string }>;
  marketingLeads: string[];
  prepareCount = 0;
  leadWrites = 0;

  constructor({
    requestCount = 0,
    rateRows = [],
    marketingLeads = [],
  }: {
    requestCount?: number;
    rateRows?: Array<{ updated_at: string }>;
    marketingLeads?: string[];
  } = {}) {
    this.requestCount = requestCount;
    this.rateRows = rateRows;
    this.marketingLeads = marketingLeads;
  }

  prepare(query: string): D1PreparedStatement {
    this.prepareCount += 1;
    return this.bound(query, []);
  }

  private bound(query: string, bindings: unknown[]): D1PreparedStatement {
    return {
      bind: (...values: unknown[]) => this.bound(query, values),
      first: async <T>() => {
        if (!query.includes('INSERT INTO lead_rate_limits')) return null;
        this.lastWindowStart = Number(bindings[1]);
        this.requestCount += 1;
        return { request_count: this.requestCount } as T;
      },
      run: async () => {
        if (query.includes('INSERT INTO marketing_leads')) {
          this.leadWrites += 1;
          return { meta: { changes: 1 } };
        }
        if (!query.includes('DELETE FROM lead_rate_limits')) return { meta: { changes: 0 } };
        const cutoff = String(bindings[0]);
        const limit = Number(bindings[1]);
        const expired = this.rateRows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => row.updated_at < cutoff)
          .slice(0, limit);
        const removed = new Set(expired.map(({ index }) => index));
        this.rateRows = this.rateRows.filter((_, index) => !removed.has(index));
        return { meta: { changes: removed.size } };
      },
    };
  }
}

const request = () => new Request('https://example.test/api/marketing/lead', {
  headers: { 'cf-connecting-ip': '192.0.2.10' },
});

const environment = (db: FakeD1) => ({
  DB: db,
  LEAD_RATE_LIMIT_SALT: 'local-test-salt',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  TURNSTILE_SECRET_KEY: 'server-only-test-secret',
});

function leadRequest(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/reopening-waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
    duplex: 'half',
  } as RequestInit);
}

function streamedLeadRequest(
  chunks: string[],
  headers: Record<string, string> = {},
): Request {
  const encoder = new TextEncoder();
  return leadRequest(new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  }), headers);
}

function jsonBodyWithByteLength(bytes: number): string {
  const prefix = '{"email":"boundary@example.test","padding":"';
  const suffix = '"}';
  return `${prefix}${'a'.repeat(bytes - prefix.length - suffix.length)}${suffix}`;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FMM-023 lead abuse controls', () => {
  it('allows legitimate traffic below the threshold without a challenge request', async () => {
    const db = new FakeD1();
    const challengeVerifier = vi.fn();
    vi.stubGlobal('fetch', challengeVerifier);
    expect(await enforceLeadRateLimit(request(), environment(db), undefined)).toBeNull();
    expect(db.requestCount).toBe(1);
    expect(db.lastWindowStart).toBeGreaterThan(1_000_000_000_000);
    expect(challengeVerifier).not.toHaveBeenCalled();
  });

  it('requires a challenge at the soft threshold and rejects missing or invalid tokens', async () => {
    const missingDb = new FakeD1({ requestCount: 5 });
    const missing = await enforceLeadRateLimit(request(), environment(missingDb), undefined);
    expect(missing?.status).toBe(429);
    await expect(missing?.json()).resolves.toMatchObject({ code: 'CHALLENGE_REQUIRED' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      success: false,
      action: 'marketing_lead',
    })));
    const invalidDb = new FakeD1({ requestCount: 5 });
    expect((await enforceLeadRateLimit(
      request(),
      environment(invalidDb),
      'invalid-token',
    ))?.status).toBe(429);
  });

  it('allows one valid challenge retry while preserving its incremented rate state', async () => {
    const db = new FakeD1({ requestCount: 5 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      success: true,
      action: 'marketing_lead',
    })));
    const challenge = await enforceLeadRateLimit(request(), environment(db), undefined);
    expect(challenge?.status).toBe(429);
    expect(await enforceLeadRateLimit(request(), environment(db), 'fresh-token')).toBeNull();
    expect(db.requestCount).toBe(7);
  });

  it('cannot reuse an expired or already-redeemed challenge token', async () => {
    const db = new FakeD1({ requestCount: 5 });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ success: true, action: 'marketing_lead' }))
      .mockResolvedValueOnce(Response.json({ success: false, action: 'marketing_lead' })));
    expect(await enforceLeadRateLimit(request(), environment(db), 'single-use-token')).toBeNull();
    expect((await enforceLeadRateLimit(request(), environment(db), 'single-use-token'))?.status).toBe(429);
    expect(db.requestCount).toBe(7);
  });

  it('fails closed when Turnstile uses the wrong action or is unavailable', async () => {
    const wrongActionDb = new FakeD1({ requestCount: 5 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      success: true,
      action: 'unrelated_action',
    })));
    expect((await enforceLeadRateLimit(
      request(), environment(wrongActionDb), 'wrong-action-token',
    ))?.status).toBe(429);

    const unavailableDb = new FakeD1({ requestCount: 5 });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await enforceLeadRateLimit(
      request(), environment(unavailableDb), 'token',
    ))?.status).toBe(429);
  });

  it('hard-limits abusive traffic without attempting challenge verification', async () => {
    const db = new FakeD1({ requestCount: 20 });
    const challengeVerifier = vi.fn();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', challengeVerifier);
    expect((await enforceLeadRateLimit(request(), environment(db), 'token'))?.status).toBe(429);
    expect((await enforceLeadRateLimit(request(), environment(db), 'token'))?.status).toBe(429);
    expect(challengeVerifier).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(warning.mock.calls[0]?.[0]))).toMatchObject({
      schema_version: 1,
      severity: 'warning',
      event: 'lead_rate_limited',
      activity: 'sustained',
      threshold: 'hard',
    });
    expect(String(warning.mock.calls[0]?.[0])).not.toMatch(
      /192\.0\.2\.10|local-test-salt|server-only-test-secret|token/,
    );
  });

  it('fails closed before rate-state writes when Turnstile configuration is missing', async () => {
    const db = new FakeD1();
    const failure = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await enforceLeadRateLimit(
      request(),
      { ...environment(db), NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' },
      undefined,
    );
    expect(response?.status).toBe(503);
    expect(db.requestCount).toBe(0);
    expect(JSON.parse(String(failure.mock.calls[0]?.[0]))).toEqual({
      schema_version: 1,
      severity: 'error',
      event: 'lead_turnstile_configuration_failure',
    });
  });

  it('prevents automatic or concurrent client retry loops', () => {
    const required = leadChallengeReducer(initialLeadChallengeState, { type: 'challenge_required' });
    const retrying = leadChallengeReducer(required, { type: 'token_received' });
    expect(retrying).toMatchObject({ phase: 'retrying', retryCount: 1 });
    expect(leadChallengeReducer(retrying, { type: 'token_received' })).toEqual(retrying);
    expect(leadChallengeReducer(retrying, { type: 'challenge_rejected' })).toMatchObject({
      phase: 'required', widgetGeneration: 1, retryCount: 1,
    });
  });

  it('keeps the secret server-only and configures the public site key separately', () => {
    const client = fs.readFileSync('src/app/homepage/components/LeadCaptureSection.tsx', 'utf8');
    const waitlist = fs.readFileSync('src/components/ReopeningWaitlistForm.tsx', 'utf8');
    const widget = fs.readFileSync('src/components/TurnstileChallenge.tsx', 'utf8');
    expect(client).toContain('getRuntimeTurnstileSiteKey');
    expect(waitlist).toContain('getRuntimeTurnstileSiteKey');
    expect(client).not.toContain('TURNSTILE_SECRET_KEY');
    expect(waitlist).not.toContain('TURNSTILE_SECRET_KEY');
    expect(widget).not.toContain('TURNSTILE_SECRET_KEY');
    expect(widget).toContain("action = 'marketing_lead'");
    expect(widget).toContain('action,');
  });

  it('injects only the public Turnstile key into runtime browser configuration', () => {
    const environmentWithSecret = {
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-site-key<&"',
      TURNSTILE_SECRET_KEY: 'never-expose-this-secret',
    };
    const attributes = getRuntimePublicAttributes(environmentWithSecret);
    expect(attributes).toEqual({ 'data-turnstile-site-key': 'public-site-key<&"' });
    const html = addRuntimePublicAttributesToHtml('<html><body></body></html>', attributes);
    expect(html).toContain('data-turnstile-site-key="public-site-key&lt;&amp;&quot;"');
    expect(html).not.toContain(environmentWithSecret.TURNSTILE_SECRET_KEY);
    expect(getRuntimeTurnstileSiteKey({
      getAttribute: name => attributes?.[name] || null,
    })).toBe(environmentWithSecret.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'public-build-fallback');
    expect(getRuntimeTurnstileSiteKey(null)).toBe('public-build-fallback');
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
    expect(getRuntimeTurnstileSiteKey(null)).toBe('');
  });

  it('enforces the actual 4 KiB body limit before any D1 access', async () => {
    const validDb = new FakeD1();
    const validBody = jsonBodyWithByteLength(LEAD_REQUEST_MAX_BYTES);
    expect(new TextEncoder().encode(validBody)).toHaveLength(LEAD_REQUEST_MAX_BYTES);
    expect((await captureReopeningWaitlist(
      leadRequest(validBody),
      environment(validDb),
    )).status).toBe(200);
    expect(validDb.leadWrites).toBe(1);

    const oversized = jsonBodyWithByteLength(LEAD_REQUEST_MAX_BYTES + 1);
    const cases = [
      leadRequest('{"email":"small@example.test"}', {
        'content-length': String(LEAD_REQUEST_MAX_BYTES + 1),
      }),
      leadRequest(oversized),
      leadRequest(oversized, { 'content-length': '1' }),
      streamedLeadRequest(
        [oversized.slice(0, 2048), oversized.slice(2048, 4096), oversized.slice(4096)],
        { 'transfer-encoding': 'chunked' },
      ),
    ];
    for (const oversizedRequest of cases) {
      const db = new FakeD1();
      const response = await captureReopeningWaitlist(oversizedRequest, environment(db));
      expect(response.status).toBe(413);
      expect(db.prepareCount).toBe(0);
      expect(db.leadWrites).toBe(0);
    }

    const multibyteDb = new FakeD1();
    const multibyte = JSON.stringify({ email: 'small@example.test', padding: '€'.repeat(1400) });
    expect(multibyte.length).toBeLessThan(LEAD_REQUEST_MAX_BYTES);
    expect(new TextEncoder().encode(multibyte).length).toBeGreaterThan(LEAD_REQUEST_MAX_BYTES);
    expect((await captureReopeningWaitlist(
      leadRequest(multibyte),
      environment(multibyteDb),
    )).status).toBe(413);
    expect(multibyteDb.prepareCount).toBe(0);
  });

  it('rejects malformed framing and JSON before D1 access', async () => {
    const requests = [
      leadRequest('{}', { 'content-length': 'not-a-number' }),
      leadRequest(''),
      leadRequest('null'),
      leadRequest('[]'),
      leadRequest('{'),
    ];
    for (const invalidRequest of requests) {
      const db = new FakeD1();
      const response = await captureReopeningWaitlist(invalidRequest, environment(db));
      expect(response.status).toBe(400);
      expect(db.prepareCount).toBe(0);
    }

    const abortedDb = new FakeD1();
    const abortedRequest = leadRequest(new ReadableStream({
      start(controller) {
        controller.error(new Error('client disconnected'));
      },
    }));
    expect((await captureReopeningWaitlist(
      abortedRequest,
      environment(abortedDb),
    )).status).toBe(400);
    expect(abortedDb.prepareCount).toBe(0);
  });

  it('emits fixed privacy-safe cleanup alerts and packages the hourly trigger', async () => {
    const failure = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await emitLeadSecurityEvent(
      { event: 'lead_rate_limit_cleanup_failed' },
      {},
    );
    expect(JSON.parse(String(failure.mock.calls[0]?.[0]))).toEqual({
      schema_version: 1,
      severity: 'error',
      event: 'lead_rate_limit_cleanup_failed',
    });
    const worker = fs.readFileSync('worker/index.ts', 'utf8');
    const vite = fs.readFileSync('vite.config.ts', 'utf8');
    expect(worker).toContain("event: 'lead_rate_limit_cleanup_failed'");
    expect(vite).toContain('crons: ["0 * * * *"]');
  });

  it('delivers FMM-023 events through the existing privacy-safe HTTPS adapter', async () => {
    const delivery = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));

    expect(await emitLeadSecurityEvent({
      event: 'lead_rate_limited',
      activity: 'sustained',
      threshold: 'hard',
      window: 1_789_280_000_000,
    }, {
      MONITORING_ALERT_WEBHOOK_URL: 'https://alerts.example.test/events',
    })).toBe('delivered');

    expect(delivery).toHaveBeenCalledTimes(1);
    const [destination, request] = delivery.mock.calls[0] as [URL, RequestInit];
    expect(destination.href).toBe('https://alerts.example.test/events');
    const payload = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      schema_version: 1,
      event: 'lead_rate_limited',
      severity: 'warning',
      state: 'triggered',
    });
    expect(JSON.stringify(payload)).not.toMatch(/email|ip|token|secret|turnstile|request_body/i);
  });

  it('removes only rows older than 24 hours and preserves boundary rows and leads', async () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    const db = new FakeD1({
      rateRows: [
        { updated_at: '2026-09-04 11:59:59' },
        { updated_at: '2026-09-04 12:00:00' },
        { updated_at: '2026-09-05 11:55:00' },
      ],
      marketingLeads: ['preserve@example.test'],
    });
    expect(LEAD_RATE_LIMIT_RETENTION_HOURS).toBe(24);
    expect(await cleanupExpiredRateLimits(db, now)).toBe(1);
    expect(db.rateRows).toEqual([
      { updated_at: '2026-09-04 12:00:00' },
      { updated_at: '2026-09-05 11:55:00' },
    ]);
    expect(db.marketingLeads).toEqual(['preserve@example.test']);
    expect(await cleanupExpiredRateLimits(db, now)).toBe(0);
  });

  it('uses bounded indexed cleanup and never targets marketing_leads', () => {
    const worker = fs.readFileSync('worker/lead-abuse.ts', 'utf8');
    const schema = fs.readFileSync('drizzle/0000_marketing_leads.sql', 'utf8');
    expect(worker).toContain('LIMIT ?');
    expect(worker).not.toContain('DELETE FROM marketing_leads');
    expect(schema).toContain('lead_rate_limits_updated_at_idx');
  });
});
