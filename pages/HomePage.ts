import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { CommonLocators } from './locators/common.locators';
import { HomeLocators, suggestionByIndex } from './locators/home.locators';
import type { SearchQuery } from '../data/entities/search-query.entity';

/**
 * Booking.com homepage + search widget (Task 1).
 * All values flow in via {@link SearchQuery} — nothing hard-coded.
 */
export class HomePage extends BasePage {
  public constructor(page: Page) {
    super(page);
  }

  public async open(): Promise<void> {
    await this.gotoHome();
    await this.dismissPopupIfPresent();
    await this.acceptCookiesIfPresent();
  }

  public async acceptCookiesIfPresent(): Promise<boolean> {
    if (await this.exists(CommonLocators.cookieAccept)) {
      await this.click(CommonLocators.cookieAccept, 'Accept cookies');
      return true;
    }
    return false;
  }

  public async selectCurrency(code: string): Promise<void> {
    logger.step(`Currency → ${code}`);
    await this.click(HomeLocators.currencyButton, 'Open currency picker');
    await this.waitForVisible(HomeLocators.currencyOption(code), 15_000);
    await this.click(HomeLocators.currencyOption(code), `Select currency ${code}`);
    logger.success(`Currency ✔ ${code}`);
  }

  public async fillDestination(destination: string): Promise<void> {
    logger.step(`Destination → ${destination}`);
    await this.click(HomeLocators.destinationInput, 'Focus destination field');
    await this.clear(HomeLocators.destinationInput, 'Clear destination');
    await this.fill(HomeLocators.destinationInput, destination, 'Type destination');
    await this.waitForVisible(HomeLocators.suggestionList, 15_000);
    await this.click(suggestionByIndex(0), `Pick first suggestion for "${destination}"`);
    logger.success(`Destination ✔ ${destination} (first suggestion)`);
  }

  public async selectFlexibleDatesCurrentMonth(monthLabel?: string): Promise<void> {
    const label = monthLabel ?? env.currentMonth.label;
    logger.step(`Flexible dates → A month → ${label}`);
    await this.click(HomeLocators.dateTrigger, 'Open calendar');
    await this.click(HomeLocators.flexibleTab, "Open 'I'm flexible'");
    await this.click(HomeLocators.monthOption, "Select 'A month'");
    await this.click(HomeLocators.monthCard(label), `Select month ${label}`);
    await this.click(HomeLocators.selectDatesButton, 'Confirm Select dates');
    logger.success(`Dates ✔ ${label}`);
  }

  public async setAdults(target: number): Promise<void> {
    logger.step(`Adults → ${target}`);
    await this.click(HomeLocators.occupancyTrigger, 'Open occupancy');
    const current = await this.readAdultsCount();
    let diff = target - current;
    let guard = 40;
    while (diff !== 0 && guard-- > 0) {
      if (diff > 0) {
        await this.click(HomeLocators.adultsIncrease, 'Increase adults');
        diff -= 1;
      } else {
        await this.click(HomeLocators.adultsDecrease, 'Decrease adults');
        diff += 1;
      }
    }
    logger.success(`Adults ✔ ${target}`);
  }

  public async setTravellingWithPets(enabled: boolean): Promise<void> {
    if (!(await this.exists(HomeLocators.petsCheckbox))) {
      logger.warn('Pets checkbox not present on this layout — skipping');
      return;
    }
    const checked = await this.rawPage.isChecked(HomeLocators.petsCheckbox).catch(() => false);
    if (enabled && !checked) {
      await this.check(HomeLocators.petsCheckbox, 'Enable travelling with pets');
    } else if (!enabled && checked) {
      await this.uncheck(HomeLocators.petsCheckbox, 'Disable travelling with pets');
    } else {
      logger.info(`🐾 Pets already ${enabled ? 'enabled' : 'disabled'} — skipping`);
    }
  }

  public async submitSearch(): Promise<void> {
    await this.dismissPopupIfPresent();
    await this.click(HomeLocators.searchButton, 'Submit search');
    await this.waitForUrl('searchresults');
    await this.waitForNetworkIdle();
    logger.success('Search submitted → results page');
  }

  /** Full Task 1 flow in one call — used by the happy-path spec. */
  public async searchFlow(query: SearchQuery): Promise<void> {
    await this.open();
    await this.selectCurrency(query.currency);
    await this.fillDestination(query.destination);
    await this.selectFlexibleDatesCurrentMonth(query.flexibleMonthLabel ?? env.currentMonth.label);
    await this.setAdults(query.adults);
    await this.setTravellingWithPets(query.travellingWithPets);
    await this.submitSearch();
  }

  private async readAdultsCount(): Promise<number> {
    try {
      const raw = await this.getAttribute(HomeLocators.adultsCount, 'value');
      const parsed = Number.parseInt(raw ?? '', 10);
      return Number.isNaN(parsed) ? 2 : parsed;
    } catch {
      return 2;
    }
  }
}
