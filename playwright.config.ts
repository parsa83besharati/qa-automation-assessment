import { defineConfig, devices } from '@playwright/test';
import type { AllureReporterOptions } from 'allure-playwright';
import os from 'node:os';
import { env, logEnvOnce } from './config/env';

logEnvOnce('playwright.config');

// Make resolved values visible to workers (config/env.ts also loads dotenv).
process.env.BOOKING_BASE_URL = env.bookingBaseUrl;
process.env.API_BASE_URL = env.apiBaseUrl;

// Egress proxy for the UI browser projects only. Booking.com geo-restricts
// many networks ("access from your location is not possible"), which makes
// every Task 1 case fail at step one; PROXY_SERVER routes the browsers through
// an allowed region. The `api` project stays direct (AutomationExercise is not
// geo-blocked and the SLO assertions must not pay proxy latency).
// See PROXY_SERVER in .env.example.
type ProxyConfig = NonNullable<(typeof env)['proxy']>;
const uiUse: { proxy?: ProxyConfig } = env.proxy ? { proxy: env.proxy } : {};

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
  // Serial execution: the UI suite drives a public third-party site (Booking.com)
  // through a single shared egress IP — parallel sessions get rate-limited and
  // render the widget/autocomplete unreliably, which shows up as click timeouts.
  workers: 1,
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
      use: { ...devices['Desktop Chrome'], ...uiUse },
    },
    {
      name: 'firefox',
      testIgnore: 'api/**',
      use: { ...devices['Desktop Firefox'], ...uiUse },
    },
    {
      name: 'webkit',
      testIgnore: 'api/**',
      use: { ...devices['Desktop Safari'], ...uiUse },
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
