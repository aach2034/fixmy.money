import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { shouldRedirectForMaintenance } from '@/proxy';

function request(pathname: string, init?: RequestInit) {
  return new NextRequest(`https://fixmy.money${pathname}`, {
    headers: { accept: 'text/html', ...init?.headers },
    ...init,
  });
}

describe('maintenance proxy control', () => {
  it('keeps production visitor routes open when maintenance mode is inactive', () => {
    expect(shouldRedirectForMaintenance(request('/dashboard'))).toBe(false);
  });

  it('retains the maintenance redirect behavior if it is re-enabled', () => {
    expect(shouldRedirectForMaintenance(request('/dashboard'), true)).toBe(true);
  });

  it('does not redirect the maintenance page to itself', () => {
    expect(shouldRedirectForMaintenance(request('/maintenance'))).toBe(false);
  });

  it('can explicitly evaluate maintenance-inactive behavior', () => {
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
  ])('normalizes alternate maintenance-looking paths when maintenance is enabled: %s', pathname => {
    expect(shouldRedirectForMaintenance(request(pathname), true)).toBe(true);
  });

  it('does not read or log request bodies', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/proxy.ts'), 'utf8');
    expect(source).not.toMatch(/request\.(?:json|text|formData|arrayBuffer)\s*\(/);
    expect(source).not.toMatch(/console\.(?:log|info|warn|error)/);
  });
});
