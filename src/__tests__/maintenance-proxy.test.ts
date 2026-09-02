import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy, shouldRedirectForMaintenance } from '@/proxy';

function request(pathname: string, init?: RequestInit) {
  return new NextRequest(`https://fixmy.money${pathname}`, {
    headers: { accept: 'text/html', ...init?.headers },
    ...init,
  });
}

describe('v158 maintenance proxy compatibility', () => {
  it('redirects visitor pages to the notice with non-cacheable headers', async () => {
    const response = await proxy(request('/dashboard?filter=active'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://fixmy.money/maintenance');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('does not redirect the maintenance page to itself', () => {
    expect(shouldRedirectForMaintenance(request('/maintenance'))).toBe(false);
  });

  it('can evaluate maintenance-inactive behavior without changing production mode', () => {
    expect(shouldRedirectForMaintenance(request('/dashboard'), false)).toBe(false);
  });

  it.each([
    '/api/ai/chat-completion',
    '/api/credit-report/analyze',
    '/api/ai/usage',
    '/api/stripe/restore-purchase',
    '/api/stripe/webhook',
    '/api/health',
    '/auth/callback?type=recovery&next=/reset-password',
    '/forgot-password',
    '/reset-password',
  ])('keeps required API and recovery path available: %s', pathname => {
    expect(shouldRedirectForMaintenance(request(pathname))).toBe(false);
  });

  it('does not redirect machine requests, non-HTML assets, or non-GET methods', () => {
    expect(
      shouldRedirectForMaintenance(request('/api/health', { headers: { accept: 'application/json' } }))
    ).toBe(false);
    expect(
      shouldRedirectForMaintenance(request('/fonts/app.woff2', { headers: { accept: 'font/woff2' } }))
    ).toBe(false);
    expect(shouldRedirectForMaintenance(request('/dashboard', { method: 'POST' }))).toBe(false);
  });

  it.each([
    '/%6daintenance',
    '/maintenance/dashboard',
    '/maintenance%2F..%2Fdashboard',
  ])('normalizes alternate maintenance-looking paths to the canonical notice: %s', pathname => {
    expect(shouldRedirectForMaintenance(request(pathname))).toBe(true);
  });

  it('does not read or log request bodies', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/proxy.ts'), 'utf8');
    expect(source).not.toMatch(/request\.(?:json|text|formData|arrayBuffer)\s*\(/);
    expect(source).not.toMatch(/console\.(?:log|info|warn|error)/);
  });
});
