/**
 * Header currency-picker locators (verified live 2026-10-18).
 * Options render as <button data-testid="selection-item">; the ISO code lives
 * in a nested <span> (e.g. "EUR", "TRY").
 */
export const CurrencyLocators = {
  trigger: '[data-testid="header-currency-picker-trigger"]',
  panel: '[data-testid="selection-item"]',
  option: (code: string): string =>
    `[data-testid="selection-item"] span:has-text("${code.toUpperCase()}")`,
} as const;
