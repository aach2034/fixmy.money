export function immutableAssetCacheControl(pathname: string): string | null {
  return /\/(?:assets|_next|ocr)\/.*(?:[.-][a-f0-9]{8,}|worker\.min)\.[a-z0-9]+$/i.test(pathname)
    ? 'public, max-age=31536000, immutable'
    : null;
}

export function leadRateDecision(count: number, challengePassed: boolean): 'allow' | 'challenge' | 'deny' {
  if (count > 20) return 'deny';
  if (count > 5 && !challengePassed) return 'challenge';
  return 'allow';
}
