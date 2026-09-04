import { describe, expect, it } from 'vitest';
import { immutableAssetCacheControl } from '../../worker/security-controls';

describe('FMM-017 immutable asset delivery', () => {
  it('immutably caches content-hashed build assets', () => {
    expect(immutableAssetCacheControl('/assets/app-a1b2c3d4.js')).toBe('public, max-age=31536000, immutable');
  });

  it('does not apply immutable caching to dynamic documents', () => {
    expect(immutableAssetCacheControl('/pricing')).toBeNull();
  });
});
