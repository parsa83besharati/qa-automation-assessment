import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Booking.com homepage + search widget (full flow lands in Step 5). */
export class HomePage extends BasePage {
  public constructor(page: Page) {
    super(page);
  }

  public async open(): Promise<void> {
    await this.gotoHome();
  }
}
