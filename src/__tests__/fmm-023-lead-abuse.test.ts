import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  cleanupExpiredRateLimits,
  enforceLeadRateLimit,
  LEAD_RATE_LIMIT_RETENTION_HOURS,
  type D1Binding,
  type D1PreparedStatement,
} from '../../worker/lead-abuse';
import { initialLeadChallengeState, leadChallengeReducer } from '@/lib/marketing/leadChallenge';

class FakeD1 implements D1Binding {
  requestCount: number;
  lastWindowStart: number | null = null;
  rateRows: Array<{ updated_at: string }>;
  marketingLeads: string[];

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
  TURNSTILE_SECRET_KEY: 'server-only-test-secret',
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    vi.stubGlobal('fetch', challengeVerifier);
    expect((await enforceLeadRateLimit(request(), environment(db), 'token'))?.status).toBe(429);
    expect(challengeVerifier).not.toHaveBeenCalled();
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
    const widget = fs.readFileSync('src/components/TurnstileChallenge.tsx', 'utf8');
    expect(client).toContain('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
    expect(client).not.toContain('TURNSTILE_SECRET_KEY');
    expect(widget).not.toContain('TURNSTILE_SECRET_KEY');
    expect(widget).toContain("action: 'marketing_lead'");
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
