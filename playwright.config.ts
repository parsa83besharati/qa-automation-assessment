import { defineConfig, devices } from '@playwright/test';
import { env, logEnvOnce } from './config/env';

logEnvOnce('playwright.config');

// Make resolved values visible to workers (config/env.ts also loads dotenv).
process.env.BOOKING_BASE_URL = env.bookingBaseUrl;
process.env.API_BASE_URL = env.apiBaseUrl;

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup'),
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: 'test-results',

  use: {
    baseURL: env.bookingBaseUrl,
    headless: env.headless,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  reporter: [
    ['list'],
    [
      'playwright-enhanced-reporter',
      {
        title: 'Mohaymen QA Assessment — Test Report',
        includeCharts: true,
        theme: 'dark',
        outputFolder: 'enhanced-report',
      },
    ],
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never',
      },
    ],
  ],
});
