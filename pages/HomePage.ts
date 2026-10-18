import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { CurrencyPicker } from './components/CurrencyPicker';
import { DatePicker } from './components/DatePicker';
import { OccupancyPanel } from './components/OccupancyPanel';
import { HomeLocators, suggestionByIndex } from './locators/home.locators';
import type { SearchQuery } from '../data/entities/search-query.entity';

/**
 * Booking.com homepage + search widget (Task 1).
 *
 * Each widget is its own component — {@link CurrencyPicker}, {@link DatePicker},
 * {@link OccupancyPanel} — exposed as readonly fields so specs can assert on
 * widget state directly. This class orchestrates them; all values flow in via
 * {@link SearchQuery}, nothing Task-specific is hard-coded.
 */
export class HomePage extends BasePage {
  public readonly currency: CurrencyPicker;
  public readonly dates: DatePicker;
  public readonly occupancy: OccupancyPanel;

  public constructor(page: Page) {
    super(page);
    this.currency = new CurrencyPicker(page);
    this.dates = new DatePicker(page);
    this.occupancy = new OccupancyPanel(page);
  }

  public async open(): Promise<void> {
    await this.gotoHome();
    // Booking serves an AWS WAF challenge first, then renders the cookie banner
    // and the Genius sign-in modal a few seconds later. Wait for the settled
    // search widget, then clear every overlay before any interaction (risk R06).
    await this.waitForVisible(HomeLocators.destinationInput, 30_000).catch(() => undefined);
    await this.dismissOverlays();
  }

  public async selectCurrency(code: string): Promise<void> {
    logger.step(`Currency → ${code}`);
    // Late-arriving overlay insurance: a modal that renders after open() would
    // sit on top of the dropdown and swallow the TRY option (risk R06).
    await this.clearOverlaysIfPresent();
    await this.currency.select(code);
  }

  /** Type a destination without requiring any suggestion to appear. */
  public async typeDestination(destination: string): Promise<void> {
    logger.step(`Destination → ${destination}`);
    await this.click(HomeLocators.destinationInput, 'Focus destination field');
    await this.clear(HomeLocators.destinationInput, 'Clear destination');
    await this.fill(HomeLocators.destinationInput, destination, 'Type destination');
  }

  /** Happy path: type the destination and commit the first autocomplete pick. */
  public async fillDestination(destination: string): Promise<void> {
    await this.typeDestination(destination);
    await this.waitForVisible(HomeLocators.suggestionList, 10_000).catch(() => undefined);
    if (!(await this.isVisible(HomeLocators.suggestionList))) {
      // Cold sessions occasionally fail to open the autocomplete on the first
      // fill (slow suggestion XHR) — retype to retrigger it before giving up.
      logger.info('Autocomplete did not open — retyping to retrigger');
      await this.typeDestination(destination);
      await this.waitForVisible(HomeLocators.suggestionList, 15_000);
    }
    await this.pickFirstSuggestion();
  }

  /** Commit the first autocomplete suggestion — call while the list is open. */
  public async pickFirstSuggestion(): Promise<void> {
    await this.click(suggestionByIndex(0), 'Pick first suggestion');
    // Booking closes the list asynchronously; the next widget click (the
    // calendar trigger) is swallowed while it is still open. Wait for the
    // close, then log the resolved value — a field still empty here means the
    // pick landed before the suggestion payload was ready.
    await this.waitForHidden(HomeLocators.suggestionList, 5_000).catch(() => undefined);
    const committed = await this.rawPage
      .locator(HomeLocators.destinationInput)
      .first()
      .inputValue()
      .catch(() => '?');
    logger.success(`Destination ✔ first suggestion committed → "${committed}"`);
  }

  public async selectFlexibleDatesCurrentMonth(monthLabel?: string): Promise<void> {
    const label = monthLabel ?? env.currentMonth.label;
    logger.step(`Flexible dates → A month → ${label}`);
    await this.clearOverlaysIfPresent();
    await this.dates.selectFlexibleMonth(label);
  }

  public async setAdults(target: number): Promise<void> {
    logger.step(`Adults → ${target}`);
    await this.clearOverlaysIfPresent();
    await this.occupancy.setAdults(target);
  }

  public async setTravellingWithPets(enabled: boolean): Promise<void> {
    await this.occupancy.setPets(enabled);
  }

  public async submitSearch(options: { expectNavigation?: boolean } = {}): Promise<void> {
    const { expectNavigation = true } = options;
    await this.clearOverlaysIfPresent();
    await this.click(HomeLocators.searchButton, 'Submit search');
    if (!expectNavigation) {
      // Negative flows: an invalid query may legitimately never navigate.
      logger.info('Search submitted — navigation not required');
      return;
    }
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
    await this.occupancy.done(); // close the panel before clicking Search
    await this.ensureDestination(query.destination);
    await this.submitSearch();
  }

  /**
   * Last-line defense for happy paths: Booking occasionally resets the
   * destination field (widget re-render / WAF churn) — an empty or uncommitted
   * field at submit time is answered with "Enter a destination to start
   * searching." and the whole flow dies late. Re-establish it right before
   * clicking Search. Negative tests call `submitSearch()` directly on purpose,
   * so their invalid states are never touched by this.
   */
  private async ensureDestination(destination: string): Promise<void> {
    const value = await this.rawPage
      .locator(HomeLocators.destinationInput)
      .first()
      .inputValue()
      .catch(() => '');
    // A committed pick reads "London, Greater London, United Kingdom" — anything
    // empty or equal to the raw query means the destination is not established.
    if (value && value !== destination) {
      return;
    }
    logger.warn('Destination field was reset — re-establishing before submit');
    await this.fillDestination(destination);
  }
}
