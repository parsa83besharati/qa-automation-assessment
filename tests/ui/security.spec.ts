import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { SearchFactory } from '../../data/factories/search.factory';
import { allure } from 'allure-playwright';

/** Collects every native dialog (alert/confirm/promise) the page fires. */
const captureDialogs = (page: Page): string[] => {
  const fired: string[] = [];
  page.on('dialog', (dialog) => {
    fired.push(`${dialog.type()}: ${dialog.message()}`);
    void dialog.dismiss().catch(() => undefined);
  });
  return fired;
};

test.describe('Security — Booking basic guards', { tag: ['@security', '@ui'] }, () => {
  test.beforeEach(async () => {
    await allure.epic('Task 1 — Booking.com UI automation');
    await allure.feature('Security suite');
    await allure.owner('QA Automation');
    await allure.tags('@security', '@ui');
  });

  test('TC-SEC-001 — Site is served over HTTPS', async ({ homePage }) => {
    await allure.story('All traffic is encrypted');
    await allure.severity('critical');
    await allure.description('The homepage URL must use the https:// scheme.');

    await homePage.open();
    expect(homePage.rawPage.url()).toMatch(/^https:\/\//);
  });

  test('TC-SEC-002 — XSS payload in destination does not execute', async ({ homePage }) => {
    await allure.story('Reflected XSS stays inert in the DOM');
    await allure.severity('critical');
    await allure.description(
      'Types an <script>alert("xss")</script> probe into the destination, submits the search and asserts: no dialog ever fires, the payload is never injected as executable markup, and the app stays on booking.com.',
    );

    const dialogs = captureDialogs(homePage.rawPage);
    await homePage.open();
    await homePage.typeDestination(SearchFactory.xssProbe());
    await homePage.submitSearch({ expectNavigation: false });
    // Give any (asynchronous) payload a chance to fire before asserting.
    await homePage.rawPage.waitForTimeout(2_000);

    expect(dialogs, 'No alert/confirm dialog may fire from the payload').toEqual([]);
    const bodyHtml = await homePage.rawPage.locator('body').innerHTML();
    expect(bodyHtml, 'Payload must never become executable markup').not.toContain(
      '<script>alert("xss")</script>',
    );
    expect(homePage.rawPage.url()).toContain('booking.com');
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toBeVisible();
  });

  test('TC-SEC-003 — SQL-injection probe is treated as plain text', async ({ homePage }) => {
    await allure.story('SQLi probe round-trips as plain text');
    await allure.severity('critical');
    await allure.description(
      "Types ' OR '1'='1 into the destination, submits and asserts: the payload stays a literal value, no dialog fires, no database error leaks into the page, and the app stays on booking.com.",
    );

    const probe = SearchFactory.sqliProbe();
    const dialogs = captureDialogs(homePage.rawPage);
    await homePage.open();
    await homePage.typeDestination(probe);
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toHaveValue(
      probe,
    );
    await homePage.submitSearch({ expectNavigation: false });
    await homePage.rawPage.waitForTimeout(1_500);

    expect(dialogs).toEqual([]);
    const bodyText = ((await homePage.rawPage.locator('body').textContent()) ?? '').toLowerCase();
    expect(bodyText, 'No database error may leak to the UI').not.toMatch(
      /sql syntax|mysql_|ora-\d|pg_exec|sqlite|stack trace/,
    );
    expect(homePage.rawPage.url()).toContain('booking.com');
  });

  test('TC-SEC-004 — Cookies exist and session can be cleared', async ({
    homePage,
    clearSession,
  }) => {
    await allure.story('Session cookies can be wiped');
    await allure.severity('normal');
    await allure.description(
      'Loads the homepage (cookies present), clears the session and asserts zero cookies remain.',
    );

    await homePage.open();
    const before = await homePage.rawPage.context().cookies();
    expect(before).not.toHaveLength(0);
    await clearSession();
    const after = await homePage.rawPage.context().cookies();
    expect(after).toHaveLength(0);
  });
});
