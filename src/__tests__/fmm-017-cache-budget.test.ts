import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { immutableAssetCacheControl } from '../../worker/security-controls';

describe('FMM-017 immutable asset delivery', () => {
  const immutable = 'public, max-age=31536000, immutable';
  const revalidate = 'public, max-age=0, must-revalidate';

  it.each([
    '/assets/ReopeningWaitlistForm-BIo4gVo7.js',
    '/assets/mail-_HQsAr13.js',
    '/assets/message-square-DZGW-6pQ.js',
    '/assets/upload-BAWHqJd-.js',
    '/assets/index-CMsiLM6T.css',
    '/assets/plus-jakarta-sans-latin-ext-wght-normal-DmpS2jIq.woff2',
    '/assets/_vinext_fonts/plus-jakarta-sans-31a15fd7aedb/plus-jakarta-sans-305d441d.woff2',
    '/_next/static/chunks/app-a1b2c3d4.js',
  ])('immutably caches a genuinely fingerprinted build asset: %s', pathname => {
    expect(immutableAssetCacheControl(pathname)).toBe(immutable);
  });

  it.each([
    '/assets/images/homepage-business-credit.png',
    '/assets/images/fix_my_money_logo-1780535345534.png',
    '/assets/app-Ab1_2cD.js',
    '/assets/app-Ab1_2cD34.js',
    '/ocr/worker.min.js',
    '/_vinext/image',
  ])('requires revalidation for a stable or non-fingerprinted asset: %s', pathname => {
    expect(immutableAssetCacheControl(pathname)).toBe(revalidate);
  });

  it.each(['/pdf.worker.min.mjs', '/favicon.ico', '/pricing', '/api/health'])(
    'does not replace the route or default static-asset cache policy: %s',
    pathname => {
      expect(immutableAssetCacheControl(pathname)).toBeNull();
    },
  );

  it('routes only generated asset classes through the header-authoritative Worker', () => {
    const nextConfig = readFileSync('next.config.mjs', 'utf8');
    const staticHeaders = readFileSync('public/_headers', 'utf8');
    const viteConfig = readFileSync('vite.config.ts', 'utf8');

    expect(nextConfig).not.toMatch(/source:\s*['"]\/(?:_next\/static|assets)\//);
    expect(viteConfig).toContain('binding: "ASSETS"');
    expect(viteConfig).toContain('"/assets/*.css"');
    expect(viteConfig).toContain('"/assets/*.js"');
    expect(viteConfig).toContain('"/assets/*.woff2"');
    expect(viteConfig).not.toContain('"/assets/*"');
    expect(staticHeaders).toContain('/assets/*');
    expect(staticHeaders).toContain('public, max-age=0, must-revalidate');
    expect(staticHeaders).not.toContain('immutable');
  });

});
