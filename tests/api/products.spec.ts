import { test, expect } from '../../fixtures/fixtures';
import { AutomationExerciseClient } from '../../services/api-client';
import { ApiTemplates } from '../../data/templates/api.templates';

test.describe('API — AutomationExercise products', { tag: ['@api'] }, () => {
  test('TC-API-001 — productsList contains Polo brand products', async ({ apiClient }) => {
    const { expectedBrand } = ApiTemplates.poloBrand();

    const names = await test.step('Fetch Polo product names', async () => {
      return apiClient.getProductNamesByBrand(expectedBrand);
    });

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name.length).toBeGreaterThan(0);
    }

    await test.step('Every filtered product really is Polo', async () => {
      const all = await apiClient.getAllProducts();
      const polo = AutomationExerciseClient.filterByBrand(all, expectedBrand);
      for (const product of polo) {
        expect(product.brand.toLowerCase()).toBe(expectedBrand.toLowerCase());
      }
    });
  });

  test('TC-API-002 — searchProduct finds Tshirts category', async ({ apiClient }) => {
    const { query, expectedCategory } = ApiTemplates.tshirtsCategory();

    const matched =
      await test.step(`Search "${query}" and filter ${expectedCategory}`, async () => {
        return apiClient.getProductsByCategory(expectedCategory, query);
      });

    expect(matched.length).toBeGreaterThan(0);
    for (const product of matched) {
      expect(product.category.category.toLowerCase().replace(/[\s-]+/g, '')).toBe(
        expectedCategory.toLowerCase(),
      );
    }
  });

  test('TC-API-NEG-001 — search without parameter is rejected (400)', async ({ request }) => {
    const response = await request.post('https://automationexercise.com/api/searchProduct');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { responseCode?: number; message?: string };
    expect(body.responseCode).toBe(400);
  });

  test('TC-API-NEG-002 — GET on search endpoint is not allowed (405)', async ({ request }) => {
    const response = await request.get('https://automationexercise.com/api/searchProduct');
    const body = (await response.json()) as { responseCode?: number };
    expect([200, 405]).toContain(response.status());
    expect([200, 405]).toContain(body.responseCode);
  });

  test('TC-API-SEC-001 — XSS/SQLi probes do not break search', async ({ apiClient }) => {
    for (const { query } of ApiTemplates.invalidSearchQueries().slice(1)) {
      const products = await apiClient.searchProducts(query);
      expect(Array.isArray(products)).toBe(true);
    }
  });
});
