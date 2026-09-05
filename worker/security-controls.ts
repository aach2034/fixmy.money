export function immutableAssetCacheControl(pathname: string): string | null {
  return /\/(?:assets|_next|ocr)\/.*(?:[.-][a-f0-9]{8,}|worker\.min)\.[a-z0-9]+$/i.test(pathname)
    ? 'public, max-age=31536000, immutable'
    : null;
}

export function contentSecurityPolicyFor(requestUrl: string): string {
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
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com${localSupabaseSources}`,
    "frame-src 'self' https://www.googletagmanager.com https://js.stripe.com https://hooks.stripe.com",
  ];
  if (!isLocal) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function leadRateDecision(count: number, challengePassed: boolean): 'allow' | 'challenge' | 'deny' {
  if (count > 20) return 'deny';
  if (count > 5 && !challengePassed) return 'challenge';
  return 'allow';
}
