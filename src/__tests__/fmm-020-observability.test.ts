import { describe, expect, it } from 'vitest';
import { redactMetadata, requestId } from '@/lib/observability/server';
import fs from 'node:fs';

describe('FMM-020 PII-safe observability', () => {
  it('accepts a safe correlation id and rejects unsafe input', () => {
    expect(requestId(new Request('https://example.test', { headers: { 'x-request-id': 'req_12345678' } }))).toBe('req_12345678');
    expect(requestId(new Request('https://example.test', { headers: { 'x-request-id': 'bad value' } }))).not.toBe('bad value');
  });

  it('redacts content and credential-shaped metadata', () => {
    expect(redactMetadata({ email: 'person@example.test', authorization: 'Bearer x', code: 'SAFE', detail: 'ok' })).toEqual({
      email: '[REDACTED]', authorization: '[REDACTED]', code: 'SAFE', detail: 'ok',
    });
  });

  it('keeps dependency readiness private and fail-closed', () => {
    const source = fs.readFileSync('src/app/api/health/route.ts', 'utf8');
    expect(source).toContain("url.searchParams.get('ready')");
    expect(source).toContain("request.headers.get('x-healthcheck-secret')");
    expect(source).toContain('status: ready ? 200 : 503');
    expect(source).not.toContain('missing_required');
  });
});
