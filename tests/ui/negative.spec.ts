import { test, expect } from '../../fixtures/fixtures';
import type { HomePage } from '../../pages/HomePage';
import type { SearchResultsPage } from '../../pages/SearchResultsPage';
import { HomeLocators } from '../../pages/locators/home.locators';
import { OccupancyLocators } from '../../pages/locators/occupancy.locators';
import { SearchFactory } from '../../data/factories/search.factory';
import { BookingTemplates } from '../../data/templates/booking.templates';
import { allure } from 'allure-playwright';

/**
 * After an unsearchable query, Booking may keep us on the homepage or land on
 * a results page with zero properties — both acceptable outcomes. Counts hotel
 * cards only when a results page was actually reached: the homepage renders
 * property cards for its own promos, so counting there would false-fail.
 */
const countHotelsAfterInvalidSearch = async (
  homePage: HomePage,
  resultsPage: SearchResultsPage,
): Promise<number> => {
  const navigated = await homePage.rawPage
    .waitForURL(/searchresults/, { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!navigated) {
    return 0;
  }
  await resultsPage.waitForResults(10_000).catch(() => undefined);
  return resultsPage.countHotels().catch(() => 0);
};

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
    // Clearing focuses the field and can open the autocomplete dropdown, which
    // overlays the Search button — dismiss it before clicking (risk R06).
    await homePage.press(HomeLocators.destinationInput, 'Escape', 'Dismiss autocomplete');
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
    await homePage.typeDestination(query.destination);
    await homePage.submitSearch({ expectNavigation: false });

    // Zero hotels — whether Booking validated us on the homepage or showed a
    // "no matches" results page (risk: never a hotel list for gibberish).
    expect(await countHotelsAfterInvalidSearch(homePage, resultsPage)).toBe(0);
  });

  test('TC-NEG-003 — Invalid currency code is rejected gracefully', async ({ homePage }) => {
    await allure.story('Unknown currency code is ignored');
    await allure.severity('minor');
    await allure.description(
      'Selecting the non-existent currency XXX must not change the page URL.',
    );

    const query = SearchFactory.invalidCurrency();
    await homePage.open();
    const before = homePage.rawPage.url();
    await homePage.selectCurrency(query.currency).catch(() => undefined);
    expect(homePage.rawPage.url()).toBe(before);
  });

  test('TC-NEG-004 — Adults can never drop below the minimum of 1', async ({ homePage }) => {
    await allure.story('Adults lower bound is enforced by the UI');
    await allure.severity('minor');
    await allure.description(
      "Booking's occupancy slider starts at min=1, so a query demanding 0 adults is unwinnable by design; the suite asserts the bound instead of pretending to set it.",
    );

    const [, zeroAdults] = BookingTemplates.negative();
    expect(zeroAdults.adults).toBe(0);

    await homePage.open();
    await homePage.occupancy.open();
    await expect(homePage.rawPage.locator(OccupancyLocators.adultsSlider)).toHaveAttribute(
      'min',
      '1',
    );
    expect(await homePage.occupancy.adultsValue()).toBeGreaterThanOrEqual(1);
  });

  test('TC-NEG-005 — Overlong + emoji destination does not break the app', async ({ homePage }) => {
    await allure.story('Hostile input length and unicode stay harmless');
    await allure.severity('minor');
    await allure.description(
      'Types a 250+ character destination with emoji, submits without expecting navigation and asserts the app is still on booking.com with a usable widget.',
    );

    const query = SearchFactory.longDestination();
    await homePage.open();
    await homePage.typeDestination(query.destination);
    await homePage.submitSearch({ expectNavigation: false });
    await homePage.rawPage.waitForTimeout(1_500);

    expect(homePage.rawPage.url()).toContain('booking.com');
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toBeVisible();
  });
});
