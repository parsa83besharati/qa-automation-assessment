import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';

const XSS = '<script>alert("xss")</script>';
const SQLI = "' OR '1'='1";

test.describe('Security — Booking basic guards', { tag: ['@security', '@ui'] }, () => {
  test('TC-SEC-001 — Site is served over HTTPS', async ({ homePage }) => {
    await homePage.open();
    expect(homePage.rawPage.url()).toMatch(/^https:\/\//);
  });

  test('TC-SEC-002 — XSS payload in destination does not execute', async ({ homePage }) => {
    await homePage.open();
    await homePage.fill(HomeLocators.destinationInput, XSS, 'Type XSS probe');
    const bodyHtml = await homePage.rawPage.locator('body').innerHTML();
    expect(bodyHtml).not.toContain('<script>alert("xss")</script><script>');
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toBeVisible();
  });

  test('TC-SEC-003 — SQL-injection probe is treated as plain text', async ({ homePage }) => {
    await homePage.open();
    await homePage.fill(HomeLocators.destinationInput, SQLI, 'Type SQLi probe');
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toHaveValue(SQLI);
  });

  test('TC-SEC-004 — Cookies exist and session can be cleared', async ({
    homePage,
    clearSession,
  }) => {
    await homePage.open();
    const before = await homePage.rawPage.context().cookies();
    expect(before).not.toHaveLength(0);
    await clearSession();
    const after = await homePage.rawPage.context().cookies();
    expect(after).toHaveLength(0);
  });
});
