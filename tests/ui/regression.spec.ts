import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { ResultsLocators } from '../../pages/locators/results.locators';
import { BookingTemplates } from '../../data/templates/booking.templates';
import { env } from '../../config/env';

test.describe(
  'Regression — Booking search building blocks',
  { tag: ['@regression', '@ui'] },
  () => {
    test('TC-REG-001 — Currency can be switched to TRY', async ({ homePage }) => {
      const query = BookingTemplates.taskHappyPath();
      await homePage.open();
      await homePage.selectCurrency(query.currency);
      await expect(homePage.rawPage.locator(HomeLocators.currencyButton).first()).toContainText(
        query.currency,
      );
    });

    test('TC-REG-002 — Destination London shows suggestions', async ({ homePage }) => {
      const query = BookingTemplates.taskHappyPath();
      await homePage.open();
      await homePage.fillDestination(query.destination);
      await expect(homePage.rawPage.locator(HomeLocators.suggestionList).first()).toBeVisible();
    });

    test('TC-REG-003 — Flexible current-month dates can be selected', async ({ homePage }) => {
      await homePage.open();
      await homePage.selectFlexibleDatesCurrentMonth(env.currentMonth.label);
      await expect(homePage.rawPage.locator(HomeLocators.occupancyTrigger).first()).toBeVisible();
    });

    test('TC-REG-004 — Occupancy supports 8 adults plus pets', async ({ homePage }) => {
      const query = BookingTemplates.taskHappyPath();
      await homePage.open();
      await homePage.setAdults(query.adults);
      await homePage.setTravellingWithPets(query.travellingWithPets);
      await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeEnabled();
    });

    test('TC-REG-005 — Results render hotel cards with availability', async ({
      homePage,
      resultsPage,
    }) => {
      await homePage.searchFlow(BookingTemplates.taskHappyPath());
      await resultsPage.waitForResults();
      const count = await resultsPage.countHotels();
      expect(count).toBeGreaterThan(0);
      await expect(
        resultsPage.rawPage.locator(ResultsLocators.seeAvailability).first(),
      ).toBeVisible();
    });
  },
);
