import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: [
        'src/__tests__/auth-lifecycle.test.ts',
        'src/__tests__/cross-tenant-security.test.ts',
        'src/__tests__/stripe-live.test.ts',
      ],
      exclude: ['node_modules', '.next'],
    },
  })
);
