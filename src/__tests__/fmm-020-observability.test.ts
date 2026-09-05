import { afterEach, describe, expect, it, vi } from 'vitest';
import { redactMetadata, requestId } from '@/lib/observability/server';
import { deliverOperationalAlert, operationalAlertPayload } from '@/lib/observability/alerts';
import fs from 'node:fs';

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('creates content-free provider-agnostic alert payloads', () => {
    expect(operationalAlertPayload({
      event: 'readiness degraded',
      severity: 'critical',
      state: 'triggered',
      requestId: 'req_12345678',
      metadata: {
        database: false,
        email: 'person@example.test',
        token: 'secret',
        dependency: { detail: 'person@example.test' },
      },
    })).toMatchObject({
      event: 'readiness_degraded',
      severity: 'critical',
      state: 'triggered',
      request_id: 'req_12345678',
      metadata: {
        database: false,
        email: '[REDACTED]',
        token: '[REDACTED]',
        dependency: { detail: '[REDACTED]' },
      },
    });
  });

  it('delivers triggered and resolved alerts without exposing its bearer credential', async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', send);
    const environment = {
      MONITORING_ALERT_WEBHOOK_URL: 'https://alerts.example.test/events',
      MONITORING_ALERT_WEBHOOK_TOKEN: 'server-only-token',
    };
    expect(await deliverOperationalAlert({
      event: 'monitoring_delivery_test', severity: 'warning', state: 'triggered', requestId: 'req_12345678',
    }, environment)).toBe('delivered');
    expect(await deliverOperationalAlert({
      event: 'monitoring_delivery_test', severity: 'warning', state: 'resolved', requestId: 'req_12345678',
    }, environment)).toBe('delivered');

    const sentRequest = send.mock.calls[0][1] as RequestInit;
    expect(sentRequest.headers).toMatchObject({ Authorization: 'Bearer server-only-token' });
    expect(String(sentRequest.body)).not.toContain('server-only-token');
  });

  it('fails closed for missing, insecure, or failing alert destinations', async () => {
    const alert = {
      event: 'test', severity: 'warning' as const, state: 'triggered' as const, requestId: 'req_12345678',
    };
    expect(await deliverOperationalAlert(alert, {})).toBe('not_configured');
    expect(await deliverOperationalAlert(alert, {
      MONITORING_ALERT_WEBHOOK_URL: 'http://alerts.example.test',
    })).toBe('failed');
    expect(await deliverOperationalAlert(alert, {
      MONITORING_ALERT_WEBHOOK_URL: 'https://embedded:credential@alerts.example.test',
    })).toBe('failed');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    expect(await deliverOperationalAlert(alert, {
      MONITORING_ALERT_WEBHOOK_URL: 'https://alerts.example.test',
    })).toBe('failed');
  });

  it('keeps the synthetic alert route authenticated and content-free', () => {
    const source = fs.readFileSync('src/app/api/internal/monitoring/test-alert/route.ts', 'utf8');
    expect(source).toContain('HEALTHCHECK_SECRET');
    expect(source).toContain("request.headers.get('x-healthcheck-secret')");
    expect(source).toContain("event: 'monitoring_delivery_test'");
    expect(source).not.toContain('email');
  });
});
