import { defineConfig, devices } from '@playwright/test';
import type { AllureReporterOptions } from 'allure-playwright';
import os from 'node:os';
import { env, logEnvOnce } from './config/env';

logEnvOnce('playwright.config');

// Make resolved values visible to workers (config/env.ts also loads dotenv).
process.env.BOOKING_BASE_URL = env.bookingBaseUrl;
process.env.API_BASE_URL = env.apiBaseUrl;

const allureOptions: AllureReporterOptions = {
  outputFolder: 'allure-results',
  detail: true,
  suiteTitle: true,
  environmentInfo: {
    Project: 'qa-automation-assessment',
    Framework: 'Playwright + Page Object Model',
    Node: process.version,
    Platform: `${os.platform()} ${os.release()} (${os.arch()})`,
  },
  categories: [
    { name: 'Failed assertion', messageRegex: '.*expect\\(.*' },
    { name: 'Test timeout', messageRegex: '.*Timeout.*' },
    {
      name: 'Network / infrastructure issue',
      messageRegex:
        '.*(ECONNREFUSED|ECONNRESET|net::ERR_|getaddrinfo|502 Bad Gateway|503 Service|429 Too Many).*',
    },
  ],
};

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
      // API-only project. The `request` fixture is browser-agnostic, so these
      // tests must run exactly once instead of being duplicated by every
      // browser project (and they need no browser binaries at all).
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: {
        baseURL: env.apiBaseUrl,
      },
    },
    {
      name: 'chromium',
      testIgnore: 'api/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: 'api/**',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: 'api/**',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  reporter: [
    ['list'],
    ['allure-playwright', allureOptions],
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
    [
      'junit',
      {
        outputFile: 'test-results/junit.xml',
      },
    ],
  ],
});
