import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { SearchFactory } from '../../data/factories/search.factory';

test.describe('Negative — Booking invalid inputs', { tag: ['@negative', '@ui'] }, () => {
  test('TC-NEG-001 — Empty destination blocks search or shows validation', async ({ homePage }) => {
    await homePage.open();
    await homePage.clear(HomeLocators.destinationInput, 'Clear destination');
    await homePage.click(HomeLocators.searchButton, 'Attempt search with empty destination');
    await expect(homePage.rawPage).not.toHaveURL(/searchresults/);
  });

  test('TC-NEG-002 — Gibberish destination yields no results or stays put', async ({
    homePage,
    resultsPage,
  }) => {
    const query = SearchFactory.invalidDestination();
    await homePage.open();
    await homePage.selectCurrency(query.currency);
    await homePage.fillDestination(query.destination);
    await homePage.submitSearch();
    await resultsPage.waitForResults().catch(() => undefined);
    const count = await resultsPage.countHotels().catch(() => 0);
    expect(count).toBe(0);
  });

  test('TC-NEG-003 — Invalid currency code is rejected gracefully', async ({ homePage }) => {
    await homePage.open();
    const before = homePage.rawPage.url();
    await homePage.selectCurrency('XXX').catch(() => undefined);
    expect(homePage.rawPage.url()).toBe(before);
  });
});
