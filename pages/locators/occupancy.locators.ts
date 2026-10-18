/**
 * Occupancy panel locators (verified live 2026-10-18).
 *
 * Booking now drives counts with range sliders (adults: min 1 / max 30); the
 * former +/- buttons are aria-hidden decorations, so steppers target the
 * sliders directly. The pets checkbox is a real input (name="pets").
 */
export const OccupancyLocators = {
  trigger: '[data-testid="occupancy-config"]',
  popup: '[data-testid="occupancy-popup"]',
  adultsSlider: 'input#group_adults',
  petsCheckbox: 'input[name="pets"]',
  doneButton: '[data-testid="occupancy-popup"] button:has-text("Done")',
} as const;
