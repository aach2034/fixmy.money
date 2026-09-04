import { describe, expect, it } from 'vitest';
import { leadRateDecision } from '../../worker/security-controls';
import fs from 'node:fs';

describe('FMM-023 lead abuse controls', () => {
  it('allows normal bounded traffic', () => {
    expect(leadRateDecision(1, false)).toBe('allow');
    expect(leadRateDecision(5, false)).toBe('allow');
  });

  it('requires challenge escalation after the soft threshold', () => {
    expect(leadRateDecision(6, false)).toBe('challenge');
    expect(leadRateDecision(6, true)).toBe('allow');
  });

  it('hard-limits abusive traffic even with a challenge', () => {
    expect(leadRateDecision(21, true)).toBe('deny');
  });

  it('uses durable privacy-safe state, telemetry, and retry guidance', () => {
    const worker = fs.readFileSync('worker/index.ts', 'utf8');
    const schema = fs.readFileSync('drizzle/0000_marketing_leads.sql', 'utf8');
    expect(worker).toContain("crypto.subtle.digest('SHA-256'");
    expect(worker).toContain("code: 'CHALLENGE_REQUIRED'");
    expect(worker).toContain("'Retry-After': '600'");
    expect(worker).toContain("event: 'lead_rate_limited'");
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS lead_rate_limits');
  });

  it('preserves idempotent persistence and honeypot handling', () => {
    const worker = fs.readFileSync('worker/index.ts', 'utf8');
    expect(worker).toContain('ON CONFLICT(email, offer) DO UPDATE');
    expect(worker).toContain('Honeypot fields are treated as successful');
  });
});
