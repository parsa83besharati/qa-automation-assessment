/**
 * Search-results page locators (Task 1: click "See availability" on the Nth hotel).
 */
export const ResultsLocators = {
  resultsList: '[data-testid="property-card"], div[data-testid*="property-card"]',
  hotelTitle: '[data-testid="title"]',
  seeAvailability: 'a:has-text("See availability"), button:has-text("See availability")',
} as const;

/** Nth hotel card (0-based for Playwright, Task uses 1-based "3rd hotel"). */
export const hotelCardByIndex = (oneBasedIndex: number): string =>
  `${ResultsLocators.resultsList} >> nth=${oneBasedIndex - 1}`;

/** "See availability" button inside the Nth hotel card. */
export const seeAvailabilityByIndex = (oneBasedIndex: number): string =>
  `${hotelCardByIndex(oneBasedIndex)} >> ${ResultsLocators.seeAvailability}`;
