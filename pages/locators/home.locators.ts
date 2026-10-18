/**
 * Homepage search-widget locators: destination + search button.
 * Widget-specific selectors live next to their components:
 * currency.locators.ts · date.locators.ts · occupancy.locators.ts
 */
export const HomeLocators = {
  // Destination
  destinationInput: 'input[name="ss"], input[placeholder*="Where are you going"]',
  suggestionList: 'ul[role="listbox"], div[data-testid="autocomplete-results"]',
  suggestionItem: '[role="option"], li[data-testid*="autocomplete"]',

  // Search
  searchButton: 'button[type="submit"]:has-text("Search")',
} as const;

export const suggestionByIndex = (index: number): string =>
  `${HomeLocators.suggestionItem} >> nth=${index}`;
