import { test as base } from '@playwright/test';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { logNavigation } from '../utils/navigation-logger';
import { setupTestLogger, teardownTestLogger } from '../utils/logger-helpers';
import { viewports, type ViewportPreset } from './viewport';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';

// ---------------------------------------------------------------------------
// Best-practice fixtures: every test gets logging + page objects injected.
// No `page.goto` in specs — navigation lives in page objects.
// ---------------------------------------------------------------------------

type AppFixtures = {
  setViewport: (preset: ViewportPreset) => Promise<void>;
  clearSession: () => Promise<void>;
  homePage: HomePage;
  resultsPage: SearchResultsPage;
};

export const test = base.extend<AppFixtures>({
  page: async ({ page, baseURL }, use, testInfo) => {
    setupTestLogger(testInfo);
    logNavigation(
      `BASE booking=${env.bookingBaseUrl} api=${env.apiBaseUrl} | pw-baseURL=${baseURL ?? '(none)'}`,
    );
    await use(page);
    await teardownTestLogger(testInfo);
  },

  setViewport: async ({ page }, use) => {
    await use(async (preset: ViewportPreset) => {
      const size = viewports[preset];
      logger.step(`Viewport → ${preset} ${size.width}x${size.height}`);
      await page.setViewportSize(size);
    });
  },

  clearSession: async ({ page }, use) => {
    await use(async () => {
      await page.context().clearCookies();
      logNavigation(`Session cleared for ${env.bookingBaseUrl}`);
    });
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  resultsPage: async ({ page }, use) => {
    await use(new SearchResultsPage(page));
  },
});

export { expect } from '@playwright/test';
export type { ViewportPreset };
