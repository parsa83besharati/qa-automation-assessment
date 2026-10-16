import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Booking.com search-results page (full flow lands in Step 5). */
export class SearchResultsPage extends BasePage {
  public constructor(page: Page) {
    super(page);
  }
}
