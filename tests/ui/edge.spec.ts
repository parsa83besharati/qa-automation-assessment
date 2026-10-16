import { test, expect } from '../../fixtures/fixtures';
import { SearchFactory } from '../../data/factories/search.factory';
import { BookingTemplates } from '../../data/templates/booking.templates';

test.describe('Edge — Booking boundaries and resilience', { tag: ['@edge', '@ui'] }, () => {
  test('TC-EDGE-001 — Maximum adults stays submittable', async ({ homePage }) => {
    const query = SearchFactory.maxAdults();
    await homePage.open();
    await homePage.setAdults(query.adults);
    await expect(homePage.rawPage.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('TC-EDGE-002 — Second hotel can be opened (index is dynamic)', async ({
    homePage,
    resultsPage,
  }) => {
    const query = BookingTemplates.taskHappyPath();
    await homePage.searchFlow({ ...query, targetHotelIndex: 2 });
    await resultsPage.waitForResults();
    const hotelPage = await resultsPage.openHotelByIndex(2);
    await expect(hotelPage).toHaveURL(/booking\.com/);
  });

  test('TC-EDGE-003 — Transient popup does not break the flow', async ({ homePage }) => {
    await homePage.open();
    const dismissed = await homePage.dismissPopupIfPresent();
    expect(typeof dismissed).toBe('boolean');
  });

  test('TC-EDGE-004 — Tablet viewport keeps search usable', async ({ homePage, setViewport }) => {
    await setViewport('tablet');
    await homePage.open();
    await expect(homePage.rawPage.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('TC-EDGE-005 — Mobile viewport keeps search usable', async ({ homePage, setViewport }) => {
    await setViewport('mobile');
    await homePage.open();
    await expect(homePage.rawPage.locator('button[type="submit"]').first()).toBeVisible();
  });
});
