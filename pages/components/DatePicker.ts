import type { Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { DateLocators } from '../locators/date.locators';
import { logger } from '../../utils/logger';

/**
 * Search-widget datepicker (Task 1: "I'm flexible" → "A month" → current
 * Gregorian month → "Select dates"). The month label arrives as "October 2026"
 * and is resolved to the "Oct2026" card Booking actually renders — nothing about
 * the current month is hard-coded.
 */
export class DatePicker extends BasePage {
  public constructor(page: Page) {
    super(page);
  }

  public async openCalendar(): Promise<void> {
    // The first click can be swallowed while the destination autocomplete is still
    // collapsing, so retry the trigger until the panel actually renders.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.click(DateLocators.calendarTrigger, 'Open calendar');
      if (
        await this.waitForVisible(DateLocators.tabs, 5_000).then(
          () => true,
          () => false,
        )
      ) {
        return;
      }
      logger.warn(`Calendar did not open (attempt ${attempt}/3) — retrying`);
    }
    await this.waitForVisible(DateLocators.tabs, 10_000);
  }

  public async isPanelOpen(): Promise<boolean> {
    return this.rawPage
      .locator(DateLocators.tabs)
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Collapsed trigger text — default ("…Check-in date — Check-out date") or the chosen range. */
  public async containerText(): Promise<string> {
    return ((await this.rawPage.locator(DateLocators.calendarTrigger).first().textContent()) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Full flexible-month flow exactly as the Task specifies. */
  public async selectFlexibleMonth(monthLabel: string): Promise<void> {
    await this.openCalendar();
    await this.click(DateLocators.flexibleTab, "Open 'I'm flexible'");
    // "A month" is the literal option label Booking renders for this choice.
    await this.click(DateLocators.flexibleLength('A month'), "Select 'A month'");
    await this.click(DateLocators.monthCard(monthLabel), `Select month ${monthLabel}`);
    await this.click(DateLocators.selectDatesButton, 'Confirm Select dates');
    await this.waitForHidden(DateLocators.tabs, 10_000).catch(() => undefined);
    logger.success(`Dates ✔ ${monthLabel}`);
  }
}
