import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { SearchFactory } from '../../data/factories/search.factory';
import { allure } from 'allure-playwright';

test.describe('Negative — Booking invalid inputs', { tag: ['@negative', '@ui'] }, () => {
  test.beforeEach(async () => {
    await allure.epic('Task 1 — Booking.com UI automation');
    await allure.feature('Negative suite');
    await allure.owner('QA Automation');
    await allure.tags('@negative', '@ui');
  });

  test('TC-NEG-001 — Empty destination blocks search or shows validation', async ({ homePage }) => {
    await allure.story('Empty destination never reaches results');
    await allure.severity('minor');
    await allure.description(
      'Clears the destination field and attempts to search; the URL must not navigate to searchresults.',
    );

    await homePage.open();
    await homePage.clear(HomeLocators.destinationInput, 'Clear destination');
    await homePage.click(HomeLocators.searchButton, 'Attempt search with empty destination');
    await expect(homePage.rawPage).not.toHaveURL(/searchresults/);
  });

  test('TC-NEG-002 — Gibberish destination yields no results or stays put', async ({
    homePage,
    resultsPage,
  }) => {
    await allure.story('Unsearchable destination returns zero hotels');
    await allure.severity('minor');
    await allure.description(
      'Searches for a nonsense destination ("!!!NoSuchPlace123"); the results list must stay empty.',
    );

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
    await allure.story('Unknown currency code is ignored');
    await allure.severity('minor');
    await allure.description(
      'Selecting the non-existent currency XXX must not change the page URL.',
    );

    await homePage.open();
    const before = homePage.rawPage.url();
    await homePage.selectCurrency('XXX').catch(() => undefined);
    expect(homePage.rawPage.url()).toBe(before);
  });
});
