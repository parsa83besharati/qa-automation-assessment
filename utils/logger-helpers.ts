import type { TestInfo } from '@playwright/test';
import { logger } from './logger';

/**
 * Per-test logger lifecycle (used by the `page` fixture override).
 *
 * - Creates `logs/<test-name>-<timestamp>.log` for every test.
 * - Attaches that file to the Playwright HTML report.
 * - Always detaches the transport so later tests don't leak file handles.
 */
export function setupTestLogger(testInfo: TestInfo): string {
  const logFilePath = logger.attachTestFile(testInfo.title);
  (testInfo as unknown as Record<string, unknown>).__logFilePath = logFilePath;

  const tags = testInfo.tags.length > 0 ? ` [${testInfo.tags.join(', ')}]` : '';
  logger.step(`START ▶ ${testInfo.title}${tags} (${testInfo.file})`);
  return logFilePath;
}

export async function teardownTestLogger(testInfo: TestInfo): Promise<void> {
  const status = (testInfo.status ?? 'unknown').toUpperCase();
  if (testInfo.status === 'passed') {
    logger.success(`DONE ✔ ${testInfo.title} [${status}] (${testInfo.duration}ms)`);
  } else {
    logger.error(`DONE ✘ ${testInfo.title} [${status}] (${testInfo.duration}ms)`);
  }

  const logFilePath = (testInfo as unknown as Record<string, unknown>).__logFilePath as
    string | undefined;

  if (logFilePath !== undefined) {
    // Give Winston time to flush before Playwright attaches the file.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await testInfo.attach('Test Execution Log', {
      path: logFilePath,
      contentType: 'text/plain',
    });
    logger.detachTestFile(logFilePath);
  }
}

/**
 * Pretty step wrapper — logs start/end with timing and rethrows on failure.
 * Use inside page objects and tests for readable reports.
 */
export async function runLoggedStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  logger.step(`START ▶ ${name}`);
  try {
    const result = await fn();
    logger.success(`DONE ✔ ${name} (${Date.now() - started}ms)`);
    return result;
  } catch (err) {
    logger.error(`FAIL ✘ ${name} (${Date.now() - started}ms)`, err);
    throw err;
  }
}
