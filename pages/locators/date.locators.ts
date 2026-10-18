/**
 * Search-widget datepicker locators (verified live 2026-10-18).
 *
 * The clickable calendar trigger is the whole `searchbox-dates-container`
 * button — `date-display-field-start` is only the inner "Check-in date" <span>,
 * so selectors must not prefix it with `button`.
 * Flexible month cards render abbreviated without a space ("Oct2026").
 */
export const DateLocators = {
  calendarTrigger: 'button[data-testid="searchbox-dates-container"]',
  panel: '[data-testid="searchbox-datepicker"]',
  /**
   * The panel wrapper is `display: contents` (0×0 rect, never "visible"), so
   * waits must target the tabs child — it is the element that actually renders.
   */
  tabs: '[data-testid="datepicker-tabs"]',
  flexibleTab: 'button:has-text("I\'m flexible")',
  /** "How long do you want to stay?" options: A weekend / A week / A month / Other. */
  flexibleLength: (label: string): string =>
    `[data-testid="flexible-dates-day"]:has-text("${label}") label`,
  /** Month cards under "When do you want to go?" — text like "Oct2026". */
  monthCard: (monthLabel: string): string => {
    const [month, year] = monthLabel.trim().split(/\s+/);
    const key = year ? `${month.slice(0, 3)}${year}` : month.slice(0, 3);
    return `label[data-testid="flexible-dates-month"]:has-text("${key}")`;
  },
  /**
   * Confirm button. Its raw textContent carries hidden suffix spans (only the
   * accessible name is exactly "Select dates" — verified in the a11y snapshot,
   * where the collapsed trigger reads "Select dates A month in Oct (28 nights)"),
   * so a bare `text-is` never matches. Scope `has-text` inside the panel/footer
   * to exclude the trigger, which lives outside both containers.
   */
  selectDatesButton:
    '[data-testid="searchbox-datepicker"] button:has-text("Select dates"), [data-testid="datepicker-footer"] button:has-text("Select dates")',
} as const;
