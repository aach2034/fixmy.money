import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration — FixMy.Money
 *
 * Covers all public routes, authenticated routes, and mobile viewports.
 * Run: npx playwright test
 * Run specific: npx playwright test tests/e2e/public-routes.spec.ts
 * Run headed: npx playwright test --headed
 * Run mobile: npx playwright test --project=mobile-chrome
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4028';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices?.['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices?.['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome-375',
      use: {
        ...devices?.['Pixel 5'],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: 'mobile-chrome-390',
      use: {
        ...devices?.['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet-768',
      use: {
        ...devices?.['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
