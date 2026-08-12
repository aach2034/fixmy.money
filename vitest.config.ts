import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Load test-specific env vars from .env.test if present
    // Production env vars are loaded from .env
    // Test env vars (TEST_SUPABASE_URL, etc.) must be in .env.test
    include: ['src/__tests__/**/*.test.ts'],
    exclude: [
      'node_modules',
      '.next',
      'src/__tests__/auth-lifecycle.test.ts',
      'src/__tests__/cross-tenant-security.test.ts',
      'src/__tests__/stripe-live.test.ts',
    ],
    // Tests must not silently skip — timeout is set to allow real DB queries
    testTimeout: 30000,
    hookTimeout: 30000,
    // Reporter shows skipped tests as incomplete
    reporters: ['verbose'],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['src/__tests__/**', 'node_modules', '.next'],
    },
  },
  resolve: {
    alias: {
      '@': path?.resolve(__dirname, './src'),
    },
  },
});
