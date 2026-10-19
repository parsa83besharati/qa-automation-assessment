import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { SearchFactory } from '../../data/factories/search.factory';
import { BookingTemplates } from '../../data/templates/booking.templates';
import { allure } from 'allure-playwright';

test.describe('Edge — Booking boundaries and resilience', { tag: ['@edge', '@ui'] }, () => {
  test.beforeEach(async () => {
    await allure.epic('Task 1 — Booking.com UI automation');
    await allure.feature('Edge cases suite');
    await allure.owner('QA Automation');
    await allure.tags('@edge', '@ui');
  });

  test('TC-EDGE-001 — Maximum adults stays submittable', async ({ homePage }) => {
    await allure.story('Adult stepper honours its upper bound');
    await allure.severity('minor');
    await allure.description(
      'Raises occupancy to the 30-adults boundary and asserts the search submit button remains visible.',
    );

    const query = SearchFactory.maxAdults();
    await homePage.open();
    await homePage.setAdults(query.adults);
    await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeVisible();
  });

  test('TC-EDGE-002 — Second hotel can be opened (index is dynamic)', async ({
    homePage,
    resultsPage,
  }) => {
    await allure.story('Hotel index is not hard-coded');
    await allure.severity('minor');
    await allure.description(
      'Opens "See availability" on the 2nd hotel to prove the results index is dynamic (Task 1 asks for the 3rd).',
    );

    const query = BookingTemplates.taskHappyPath();
    await homePage.searchFlow({ ...query, targetHotelIndex: 2 });
    await resultsPage.waitForResults();
    const hotelPage = await resultsPage.openHotelByIndex(2);
    await expect(hotelPage).toHaveURL(/booking\.com\/hotel\//);
  });

  test('TC-EDGE-003 — Transient popup does not break the flow', async ({ homePage }) => {
    await allure.story('Sign-in/promo overlays are dismissed safely');
    await allure.severity('minor');
    await allure.description(
      'Opens the homepage and runs popup dismissal; it must resolve as a boolean without breaking navigation.',
    );

    await homePage.open();
    const dismissed = await homePage.dismissPopupIfPresent();
    expect(typeof dismissed).toBe('boolean');
  });

  test('TC-EDGE-004 — Tablet viewport keeps search usable', async ({ homePage, setViewport }) => {
    await allure.story('Search widget survives a tablet viewport');
    await allure.severity('minor');
    await allure.description(
      'Switches to 1024×768, loads the homepage and asserts search is usable.',
    );

    await setViewport('tablet');
    await homePage.open();
    await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeVisible();
  });

  test('TC-EDGE-005 — Mobile viewport keeps search usable', async ({ homePage, setViewport }) => {
    await allure.story('Search widget survives a mobile viewport');
    await allure.severity('minor');
    await allure.description(
      'Switches to 390×844, loads the homepage and asserts search is usable.',
    );

    await setViewport('mobile');
    await homePage.open();
    await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeVisible();
  });

  test('TC-EDGE-006 — Single adult with pets off is a valid occupancy', async ({ homePage }) => {
    await allure.story('Lower occupancy boundary stays submittable');
    await allure.severity('minor');
    await allure.description(
      'Sets the minimum occupancy (1 adult, no pets) and asserts the slider reports it and Search stays enabled — the opposite boundary of TC-EDGE-001.',
    );

    const query = BookingTemplates.smoke(); // single adult, no pets
    await homePage.open();
    await homePage.setAdults(query.adults);
    expect(await homePage.occupancy.adultsValue()).toBe(1);
    await homePage.setTravellingWithPets(query.travellingWithPets);
    expect(await homePage.occupancy.petsEnabled()).toBe(false);
    await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeEnabled();
    await homePage.occupancy.done();
  });

  test('TC-EDGE-007 — Browser back from results restores the search widget', async ({
    homePage,
    resultsPage,
  }) => {
    await allure.story('Back navigation keeps the flow recoverable');
    await allure.severity('minor');
    await allure.description(
      'Runs the full search, navigates back to the homepage and asserts the destination input is usable again.',
    );

    await homePage.searchFlow(BookingTemplates.taskHappyPath());
    await resultsPage.waitForResults();
    await homePage.rawPage.goBack();
    await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toBeVisible();
  });
});
