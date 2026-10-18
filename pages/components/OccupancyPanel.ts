import type { Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { OccupancyLocators } from '../locators/occupancy.locators';
import { logger } from '../../utils/logger';

const ADULTS_MAX = 30; // Booking's slider upper bound (input#group_adults max)

/** Occupancy popup: adults range slider, "Traveling with pets" checkbox, Done. */
export class OccupancyPanel extends BasePage {
  public constructor(page: Page) {
    super(page);
  }

  public async open(): Promise<void> {
    const popup = this.rawPage.locator(OccupancyLocators.popup).first();
    if (await popup.isVisible().catch(() => false)) {
      return; // already open — the trigger toggles it shut
    }
    await this.click(OccupancyLocators.trigger, 'Open occupancy');
    await popup.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Set the adult count on the range slider and verify it actually took. */
  public async setAdults(target: number): Promise<void> {
    await this.open();
    const slider = this.rawPage.locator(OccupancyLocators.adultsSlider);
    await slider.waitFor({ state: 'visible', timeout: 10_000 });
    await slider.fill(String(target)).catch(() => undefined);
    if ((await this.adultsValue()) !== target) {
      // Deterministic fallback: keyboard stepping from the minimum.
      await slider.press('Home');
      for (let i = 1; i < target && i < ADULTS_MAX; i += 1) {
        await slider.press('ArrowRight');
      }
    }
    const actual = await this.adultsValue();
    if (actual !== target) {
      throw new Error(`Adults could not be set: wanted ${target}, slider reports ${actual}`);
    }
    logger.success(`Adults ✔ ${target}`);
  }

  /** Adults currently selected — slider value when open, else the trigger summary. */
  public async adultsValue(): Promise<number> {
    const slider = this.rawPage.locator(OccupancyLocators.adultsSlider).first();
    if (await slider.isVisible().catch(() => false)) {
      const now = await slider.getAttribute('aria-valuenow');
      const parsed = Number.parseInt(now ?? '', 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    const summary = await this.summaryText();
    return Number.parseInt(summary.match(/(\d+)\s+adults?/)?.[1] ?? '', 10);
  }

  /** Trigger summary, e.g. "8 adults · 0 children · 1 room". */
  public async summaryText(): Promise<string> {
    return ((await this.rawPage.locator(OccupancyLocators.trigger).first().textContent()) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Toggle "Traveling with pets" — fails loudly when required but absent. */
  public async setPets(enabled: boolean): Promise<void> {
    await this.open();
    const box = this.rawPage.locator(OccupancyLocators.petsCheckbox).first();
    if ((await box.count()) === 0) {
      if (enabled) {
        throw new Error(
          'Task requires "Traveling with pets", but no pets checkbox exists on this layout',
        );
      }
      return;
    }
    if (enabled) {
      // The styled label sits over the input, so a strict check() can time out
      // on hit-testing; force the state change, fall back to the visible label.
      await box
        .check({ force: true })
        .catch(() => this.click('label:has-text("Traveling with pets?")', 'Toggle pets'));
    } else {
      await box.uncheck({ force: true }).catch(() => undefined);
    }
    logger.success(`Pets ✔ ${enabled ? 'on' : 'off'}`);
  }

  public async petsEnabled(): Promise<boolean> {
    return this.rawPage
      .locator(OccupancyLocators.petsCheckbox)
      .first()
      .isChecked()
      .catch(() => false);
  }

  /** Confirm the panel with "Done" so later clicks are not intercepted. */
  public async done(): Promise<void> {
    await this.click(OccupancyLocators.doneButton, 'Confirm occupancy');
    await this.rawPage
      .locator(OccupancyLocators.popup)
      .first()
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => undefined);
  }
}
