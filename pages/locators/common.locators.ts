/**
 * Shared / global locators (cookie banner, popups, sign-in overlays).
 * Every selector lives here — page objects never hard-code CSS.
 */
export const CommonLocators = {
  cookieAccept: '#onetrust-accept-btn-handler',
  cookieBanner: '#onetrust-banner-sdk',
  popupCloseIcon: '[data-testid="close-icon"]',
  dismissSignIn: 'button[aria-label="Dismiss sign-in info."]',
} as const;
