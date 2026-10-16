import type { Locator, Page, Response } from '@playwright/test';
import { env } from '../config/env';
import { aiHealer } from '../services/ai-healer';
import { logger } from '../utils/logger';
import { NavigationLogger } from '../utils/navigation-logger';

// ---------------------------------------------------------------------------
// BasePage — single entry point for every UI interaction (Template Method +
// Strategy via healable wrapper). All page objects inherit from here.
// ---------------------------------------------------------------------------

export abstract class BasePage {
  protected readonly page: Page;

  protected constructor(page: Page) {
    this.page = page;
  }

  /** Expose the raw Playwright page for assertions and advanced flows. */
  public get rawPage(): Page {
    return this.page;
  }

  // ------------------------- healing core -------------------------

  private async performHealableAction(
    action: string,
    selector: string,
    description: string | undefined,
    actionFn: (loc: Locator) => Promise<void>,
    verify?: () => Promise<void>,
  ): Promise<void> {
    const desc = description ?? selector;
    logger.step(`${action} → "${desc}"`);

    try {
      await actionFn(this.page.locator(selector));
      if (verify) {
        await verify();
      }
      logger.success(`${action} ✔ "${desc}"`);
      return;
    } catch (originalError) {
      if (!aiHealer.isEnabled()) {
        logger.error(`${action} ✘ "${desc}" [${selector}]`, originalError);
        throw originalError;
      }
      logger.warn(`Healing ${action}: "${desc}" [${selector}]`);
      const result = await aiHealer.healSelector(this.page, selector, desc);
      if (result.healedSelector) {
        logger.info(`✨ Healed → ${result.healedSelector} (via ${result.provider ?? 'unknown'})`);
        await actionFn(this.page.locator(result.healedSelector));
        if (verify) {
          await verify();
        }
        logger.success(`${action} ✔ "${desc}" (healed)`);
        return;
      }
      logger.error(`${action} ✘ "${desc}" [${selector}]`, originalError);
      throw originalError;
    }
  }

  // ------------------------- navigation -------------------------

  public async navigate(pathOrUrl: string): Promise<Response | null> {
    const target = env.resolveBookingUrl(pathOrUrl);
    NavigationLogger.to(target, env.bookingBaseUrl);
    try {
      const response = await this.page.goto(target, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      NavigationLogger.landed(this.page.url());
      return response;
    } catch (err) {
      NavigationLogger.failed(target, err);
      throw err;
    }
  }

  public async gotoHome(): Promise<void> {
    await this.navigate('/');
  }

  public async reload(): Promise<void> {
    logger.step('Reload page');
    await this.page.reload();
  }

  public async goBack(): Promise<void> {
    logger.step('Go back');
    await this.page.goBack();
  }

  public async currentUrl(): Promise<string> {
    return this.page.url();
  }

  public async title(): Promise<string> {
    return this.page.title();
  }

  // ------------------------- clicks -------------------------

  public async click(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('click', selector, description, (loc) => loc.click());
  }

  public async forceClick(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('click', selector, description, (loc) =>
      loc.click({ force: true }),
    );
  }

  public async dblClick(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('double-click', selector, description, (loc) =>
      loc.dblclick(),
    );
  }

  public async hover(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('hover', selector, description, (loc) => loc.hover());
  }

  public async scrollIntoView(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('scroll-to', selector, description, (loc) =>
      loc.scrollIntoViewIfNeeded(),
    );
  }

  // ------------------------- inputs -------------------------

  public async fill(selector: string, text: string, description?: string): Promise<void> {
    await this.performHealableAction('fill', selector, description, (loc) => loc.fill(text));
  }

  public async type(selector: string, text: string, description?: string): Promise<void> {
    await this.performHealableAction('type', selector, description, (loc) =>
      loc.pressSequentially(text, { delay: 50 }),
    );
  }

  public async clear(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('clear', selector, description, (loc) => loc.fill(''));
  }

  public async press(selector: string, key: string, description?: string): Promise<void> {
    await this.performHealableAction(`press(${key})`, selector, description, (loc) =>
      loc.press(key),
    );
  }

  public async check(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('check', selector, description, (loc) => loc.check());
  }

  public async uncheck(selector: string, description?: string): Promise<void> {
    await this.performHealableAction('uncheck', selector, description, (loc) => loc.uncheck());
  }

  public async selectByLabel(selector: string, label: string, description?: string): Promise<void> {
    await this.performHealableAction('select', selector, description, async (loc) => {
      await loc.selectOption({ label });
    });
  }

  // ------------------------- reads -------------------------

  public async getText(selector: string): Promise<string> {
    const text = (await this.page.textContent(selector)) ?? '';
    logger.info(`📝 text [${selector}]: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`);
    return text;
  }

  public async getCount(selector: string): Promise<number> {
    const count = await this.page.locator(selector).count();
    logger.info(`📝 count [${selector}]: ${count}`);
    return count;
  }

  public async getAttribute(selector: string, name: string): Promise<string | null> {
    return this.page.getAttribute(selector, name);
  }

  public async isVisible(selector: string): Promise<boolean> {
    return this.page.isVisible(selector);
  }

  public async isEnabled(selector: string): Promise<boolean> {
    return this.page.isEnabled(selector);
  }

  public async exists(selector: string): Promise<boolean> {
    return ((await this.page.locator(selector).count()) ?? 0) > 0;
  }

  // ------------------------- waits -------------------------

  public async waitForVisible(selector: string, timeout = 15_000): Promise<void> {
    logger.step(`Wait visible: ${selector}`);
    await this.page.locator(selector).first().waitFor({ state: 'visible', timeout });
  }

  public async waitForHidden(selector: string, timeout = 15_000): Promise<void> {
    await this.page.locator(selector).first().waitFor({ state: 'hidden', timeout });
  }

  public async waitForUrl(part: string, timeout = 30_000): Promise<void> {
    logger.step(`Wait URL contains: ${part}`);
    await this.page.waitForURL(`**/*${part}*`, { timeout });
  }

  public async waitForNetworkIdle(timeout = 10_000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {
      logger.warn('Network never fully idled — continuing');
    });
  }

  // ------------------------- popups / misc -------------------------

  /** Close Booking's occasional promo/popup overlay if it appears (Task note). */
  public async dismissPopupIfPresent(): Promise<boolean> {
    const candidates = [
      'button[aria-label="Dismiss sign-in info."]',
      'button[aria-label*="Dismiss"]',
      'button:has-text("No thanks")',
      '[data-testid="close-icon"]',
    ];
    for (const selector of candidates) {
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        await this.page
          .locator(selector)
          .first()
          .click({ timeout: 5_000 })
          .catch(() => undefined);
        logger.info(`🪟 Popup dismissed via ${selector}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Fallback locator: prefer data-testid, fall back to a CSS selector.
   * Keeps tests resilient when devs rename classes.
   */
  protected locate(testId: string, fallback: string, description?: string): Locator {
    const chain = this.page.getByTestId(testId).or(this.page.locator(fallback));
    return description ? chain.describe(description) : chain;
  }
}
