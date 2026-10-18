import { test, expect } from '../../fixtures/fixtures';
import { HomeLocators } from '../../pages/locators/home.locators';
import { CurrencyLocators } from '../../pages/locators/currency.locators';
import { DateLocators } from '../../pages/locators/date.locators';
import { ResultsLocators } from '../../pages/locators/results.locators';
import { BookingTemplates } from '../../data/templates/booking.templates';
import { env } from '../../config/env';
import { allure } from 'allure-playwright';

test.describe(
  'Regression — Booking search building blocks',
  { tag: ['@regression', '@ui'] },
  () => {
    test.beforeEach(async () => {
      await allure.epic('Task 1 — Booking.com UI automation');
      await allure.feature('Regression suite');
      await allure.owner('QA Automation');
      await allure.tags('@regression', '@ui');
    });

    test('TC-REG-001 — Currency can be switched to TRY', async ({ homePage }) => {
      await allure.story('Currency picker switches to TRY');
      await allure.severity('normal');
      await allure.description(
        'Opens the currency picker, selects TRY (Turkish Lira) and asserts the header currency button reflects the choice.',
      );

      const query = BookingTemplates.taskHappyPath();
      await homePage.open();
      await homePage.selectCurrency(query.currency);
      await expect(homePage.rawPage.locator(CurrencyLocators.trigger).first()).toContainText(
        query.currency,
      );
    });

    test('TC-REG-002 — Destination London shows suggestions', async ({ homePage }) => {
      await allure.story('Destination input suggests the first London option');
      await allure.severity('normal');
      await allure.description(
        'Types "London" into the destination field and asserts the suggestion list becomes visible with the first option selectable.',
      );

      const query = BookingTemplates.taskHappyPath();
      await homePage.open();
      await homePage.typeDestination(query.destination);
      // Assert while the autocomplete is open — picking a suggestion closes it.
      await expect(homePage.rawPage.locator(HomeLocators.suggestionList).first()).toBeVisible();
      await homePage.pickFirstSuggestion();
    });

    test('TC-REG-003 — Flexible current-month dates can be selected', async ({ homePage }) => {
      await allure.story('Calendar accepts flexible current-month dates');
      await allure.severity('normal');
      await allure.description(
        'Uses "I\'m flexible" → "A month" → current month (' +
          env.currentMonth.label +
          ') → "Select dates" and asserts the occupancy trigger is ready.',
      );

      await homePage.open();
      await homePage.selectFlexibleDatesCurrentMonth(env.currentMonth.label);
      // Outcome, not just "no crash": the calendar must close and the trigger
      // must stop showing its default "Check-in date — Check-out date" state.
      await expect(homePage.rawPage.locator(DateLocators.panel)).toBeHidden();
      expect(await homePage.dates.containerText()).not.toContain('Check-in date');
    });

    test('TC-REG-004 — Occupancy supports 8 adults plus pets', async ({ homePage }) => {
      await allure.story('Occupancy stepper reaches 8 adults and enables pets');
      await allure.severity('normal');
      await allure.description(
        'Raises the adult count to 8, switches on "Travelling with pets" and asserts Search stays enabled.',
      );

      const query = BookingTemplates.taskHappyPath();
      await homePage.open();
      await homePage.setAdults(query.adults);
      expect(await homePage.occupancy.adultsValue()).toBe(query.adults);
      await homePage.setTravellingWithPets(query.travellingWithPets);
      expect(await homePage.occupancy.petsEnabled()).toBe(true);
      await expect(homePage.rawPage.locator(HomeLocators.searchButton).first()).toBeEnabled();
      await homePage.occupancy.done();
    });

    test('TC-REG-005 — Results render hotel cards with availability', async ({
      homePage,
      resultsPage,
    }) => {
      await allure.story('Results page lists hotels with See availability');
      await allure.severity('normal');
      await allure.description(
        'Runs the search flow and asserts at least one hotel card renders with a visible "See availability" button.',
      );

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
