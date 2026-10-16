import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { BookingTemplates } from '../../data/templates/booking.templates';

test.describe('Smoke — Booking critical path', { tag: ['@smoke', '@ui'] }, () => {
  test('TC-SMOKE-001 — Homepage loads with search widget', async ({ homePage }) => {
    await test.step('Open homepage', async () => {
      await homePage.open();
    });

    await test.step('Search widget is visible', async () => {
      await expect(homePage.rawPage.locator(HomeLocators.destinationInput).first()).toBeVisible();
      await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeVisible();
      await expect(homePage.rawPage.locator(HomeLocators.currencyButton).first()).toBeVisible();
    });
  });

  test('TC-SMOKE-002 — Task happy path opens 3rd hotel availability', async ({
    homePage,
    resultsPage,
  }) => {
    const query = BookingTemplates.taskHappyPath();

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
