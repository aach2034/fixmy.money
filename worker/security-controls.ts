export function immutableAssetCacheControl(pathname: string): string | null {
  if (/^\/assets\/(?:[^/]+\/)*[^/]+-[A-Za-z0-9_-]{8}\.(?:js|css|woff2)$/.test(pathname)) {
    return 'public, max-age=31536000, immutable';
  }

  if (/^\/_next\/static\/.+[.-][a-f0-9]{8,}\.(?:js|css|woff2)$/i.test(pathname)) {
    return 'public, max-age=31536000, immutable';
  }

  if (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/ocr/') ||
    pathname === '/_vinext/image'
  ) {
    return 'public, max-age=0, must-revalidate';
  }

  return null;
}

export function contentSecurityPolicyFor(requestUrl: string, nonce?: string): string {
  const hostname = new URL(requestUrl).hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const localSupabaseSources = isLocal
    ? ' http://127.0.0.1:54321 ws://127.0.0.1:54321 http://localhost:54321 ws://localhost:54321'
    : '';
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    `script-src 'self'${nonce ? ` 'nonce-${nonce}' 'strict-dynamic'` : ''} https://www.googletagmanager.com https://js.stripe.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com${localSupabaseSources}`,
    "frame-src 'self' https://www.googletagmanager.com https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
  ];
  if (!isLocal) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function leadRateDecision(count: number, challengePassed: boolean): 'allow' | 'challenge' | 'deny' {
  if (count > 20) return 'deny';
  if (count > 5 && !challengePassed) return 'challenge';
  return 'allow';
}
