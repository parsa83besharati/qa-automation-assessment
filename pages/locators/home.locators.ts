/**
 * Booking.com homepage / search-widget locators (Task 1).
 * Dynamic helpers build selectors from runtime data (currency, index…).
 */
export const HomeLocators = {
  // Currency picker (top bar)
  currencyButton: 'button[data-testid="header-currency-picker-trigger"]',
  currencyOption: (code: string): string =>
    `[data-testid="selection-item"] span:has-text("${code.toUpperCase()}")`,

  // Destination
  destinationInput: 'input[name="ss"], input[placeholder*="Where are you going"]',
  suggestionList: 'ul[role="listbox"], div[data-testid="autocomplete-results"]',
  suggestionItem: '[role="option"], li[data-testid*="autocomplete"]',

  // Dates — flexible flow: "I'm flexible" → "A month" → current month → "Select dates"
  dateTrigger: 'button[data-testid="date-display-field-start"]',
  flexibleTab: 'button:has-text("I\'m flexible"), button:has-text("I’m flexible")',
  monthOption: 'button:has-text("A month"), label:has-text("A month")',
  monthCard: (monthLabel: string): string => `button:has-text("${monthLabel}")`,
  selectDatesButton: 'button:has-text("Select dates")',

  // Occupancy
  occupancyTrigger: 'button[data-testid="occupancy-config"]',
  adultsDecrease: 'button[aria-label*="Decrease number of Adults"]',
  adultsIncrease: 'button[aria-label*="Increase number of Adults"]',
  adultsCount: 'input#group_adults, [data-testid="occupancy-popup"] input',
  petsCheckbox: 'input[name="pets"], input[data-testid*="pet"]',
  occupancyDone: 'button:has-text("Done")',

  // Search
  searchButton: 'button[type="submit"]:has-text("Search")',
} as const;

export const suggestionByIndex = (index: number): string =>
  `${HomeLocators.suggestionItem} >> nth=${index}`;

export const currencyLabel = (code: string): string => code.toUpperCase();
