import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { logger } from '../utils/logger';
import {
  ResultsLocators,
  hotelCardByIndex,
  seeAvailabilityByIndex,
} from './locators/results.locators';

/**
 * Booking.com search-results page (Task 1 tail: open Nth hotel).
 */
export class SearchResultsPage extends BasePage {
  public constructor(page: Page) {
    super(page);
  }

  public async waitForResults(): Promise<void> {
    await this.dismissPopupIfPresent();
    await this.waitForVisible(ResultsLocators.resultsList, 30_000);
    await this.waitForNetworkIdle();
    const count = await this.countHotels();
    logger.success(`Results loaded → ${count} hotels visible`);
  }

  public async countHotels(): Promise<number> {
    return this.getCount(ResultsLocators.resultsList);
  }

  public async hotelTitleByIndex(oneBasedIndex: number): Promise<string> {
    const card = hotelCardByIndex(oneBasedIndex);
    const title = await this.rawPage
      .locator(`${card} >> ${ResultsLocators.hotelTitle}`)
      .first()
      .textContent();
    return (title ?? '').trim();
  }

  /**
   * Click "See availability" on the Nth hotel (Task: 3rd).
   * Booking usually opens the hotel in a new tab — returns that page,
   * otherwise returns the current page for chaining.
   */
  public async openHotelByIndex(oneBasedIndex: number): Promise<Page> {
    await this.waitForResults();
    const title = await this.hotelTitleByIndex(oneBasedIndex).catch(() => `#${oneBasedIndex}`);
    logger.step(`Open hotel #${oneBasedIndex} → "${title}"`);

    const target = seeAvailabilityByIndex(oneBasedIndex);
    await this.scrollIntoView(target, `Scroll to hotel #${oneBasedIndex}`);
    await this.dismissPopupIfPresent();

    const context = this.rawPage.context();
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 10_000 }).catch(() => null),
      this.click(target, `See availability (hotel #${oneBasedIndex})`),
    ]);

    if (newPage) {
      await newPage
        .waitForLoadState('domcontentloaded', { timeout: 30_000 })
        .catch(() => undefined);
      logger.success(`Hotel opened in new tab → ${newPage.url()}`);
      return newPage;
    }
    await this.waitForNetworkIdle();
    logger.success(`Hotel opened in same tab → ${this.rawPage.url()}`);
    return this.rawPage;
  }
}
