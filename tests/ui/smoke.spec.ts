import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { CurrencyLocators } from '../../pages/locators/currency.locators';
import { BookingTemplates } from '../../data/templates/booking.templates';
import { allure } from 'allure-playwright';

test.describe('Smoke — Booking critical path', { tag: ['@smoke', '@ui'] }, () => {
  test.beforeEach(async () => {
    await allure.epic('Task 1 — Booking.com UI automation');
    await allure.feature('Smoke suite');
    await allure.owner('QA Automation');
    await allure.tags('@smoke', '@ui');
  });

  test('TC-SMOKE-001 — Homepage loads with search widget', async ({ homePage }) => {
    await allure.story('Homepage renders the search widget');
    await allure.severity('critical');
    await allure.description(
      'Opens https://www.booking.com/ and asserts the destination input, Search button and currency picker are visible.',
    );

    await test.step('Open homepage', async () => {
      await homePage.open();
    });

    await test.step('Search widget is visible', async () => {
      await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toBeVisible();
      await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeVisible();
      await expect(homePage.rawPage.locator(CurrencyLocators.trigger).first()).toBeVisible();
    });
  });

  test('TC-SMOKE-002 — Task happy path opens 3rd hotel availability', async ({
    homePage,
    resultsPage,
  }) => {
    const query = BookingTemplates.taskHappyPath();

    await allure.story('Full Task 1 flow ends on the 3rd hotel');
    await allure.severity('critical');
    await allure.description(
      'Runs the required scenario end to end: currency TRY → London with first suggestion → "I\'m flexible" → "A month" → current month → "Select dates" → 8 adults → "Travelling with pets" → Search → "See availability" on the 3rd hotel in the list.',
    );

    await test.step('Run full Task 1 search flow', async () => {
      await homePage.searchFlow(query);
    });

    await test.step('Results load with at least 3 hotels', async () => {
      await resultsPage.waitForResults();
      const count = await resultsPage.countHotels();
      expect(count).toBeGreaterThanOrEqual(query.targetHotelIndex);
    });

    await test.step('Open 3rd hotel availability', async () => {
      const hotelPage = await resultsPage.openHotelByIndex(query.targetHotelIndex);
      await expect(hotelPage).toHaveURL(/booking\.com\/hotel\//);
    });
  });
});
