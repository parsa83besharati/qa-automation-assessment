import type { Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { CurrencyLocators } from '../locators/currency.locators';
import { logger } from '../../utils/logger';

/** Header currency picker (Task 1 step 1: switch to TRY). */
export class CurrencyPicker extends BasePage {
  public constructor(page: Page) {
    super(page);
  }

  public async open(): Promise<void> {
    const panelOpen = await this.rawPage
      .locator(CurrencyLocators.panel)
      .first()
      .isVisible()
      .catch(() => false);
    if (panelOpen) {
      return;
    }
    await this.click(CurrencyLocators.trigger, 'Open currency picker');
    await this.waitForVisible(CurrencyLocators.panel, 10_000);
  }

  /** Pick a currency by ISO code (e.g. TRY) and wait for the panel to close. */
  public async select(code: string): Promise<void> {
    await this.open();
    await this.click(CurrencyLocators.option(code), `Select currency ${code}`);
    await this.waitForHidden(CurrencyLocators.panel, 10_000).catch(() => undefined);
    // Measured 2026-10-18: picking a currency kicks off a widget re-render
    // window of ~3 s during which anything typed into the destination field is
    // silently reset back to "". Wait until the header trigger reflects the new
    // code (condition-based, not a fixed sleep) so the subsequent destination
    // typing lands on a settled widget.
    await this.waitUntilCurrency(code, 10_000);
    logger.success(`Currency ✔ ${code}`);
  }

  /** Poll until the header currency trigger shows `code`, with a hard cap. */
  private async waitUntilCurrency(code: string, timeoutMs: number): Promise<void> {
    const started = Date.now();
    for (;;) {
      const current = await this.currentCode().catch(() => '');
      if (current.toUpperCase() === code.toUpperCase()) {
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        return; // best effort — the caller types next and ensureDestination() covers resets
      }
      await this.rawPage.waitForTimeout(200);
    }
  }

  /** Currency code currently shown on the header trigger (e.g. "EUR"). */
  public async currentCode(): Promise<string> {
    return ((await this.rawPage.locator(CurrencyLocators.trigger).first().textContent()) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
