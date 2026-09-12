import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/__tests__/auth-lifecycle.test.ts',
      'src/__tests__/cross-tenant-security.test.ts',
      'src/__tests__/fmm-006-009-storage-boundary.integration.test.ts',
      'src/__tests__/stripe-live.test.ts',
    ],
    exclude: ['node_modules', '.next'],
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
