import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { allure } from 'allure-playwright';

const XSS = '<script>alert("xss")</script>';
const SQLI = "' OR '1'='1";

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
      'Types a <script>alert("xss")</script> probe into the destination field and asserts it is not injected as executable markup.',
    );

    await homePage.open();
    await homePage.fill(HomeLocators.destinationInput, XSS, 'Type XSS probe');
    const bodyHtml = await homePage.rawPage.locator('body').innerHTML();
    expect(bodyHtml).not.toContain('<script>alert("xss")</script><script>');
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toBeVisible();
  });

  test('TC-SEC-003 — SQL-injection probe is treated as plain text', async ({ homePage }) => {
    await allure.story('SQLi probe round-trips as plain text');
    await allure.severity('critical');
    await allure.description(
      "Types ' OR '1'='1 into the destination field and asserts it stays literal input value.",
    );

    await homePage.open();
    await homePage.fill(HomeLocators.destinationInput, SQLI, 'Type SQLi probe');
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toHaveValue(SQLI);
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
