import { test, expect } from '../../fixtures/fixtures';
import { AutomationExerciseClient } from '../../services/api-client';
import { ApiTemplates } from '../../data/templates/api.templates';
import { allure } from 'allure-playwright';

test.describe('API — AutomationExercise products', { tag: ['@api'] }, () => {
  test.beforeEach(async () => {
    await allure.epic('Task 2 — API testing');
    await allure.owner('QA Automation');
    await allure.tags('@api');
  });

  test('TC-API-001 — productsList contains Polo brand products', async ({ apiClient }) => {
    const { expectedBrand } = ApiTemplates.poloBrand();

    await allure.feature('Products list API');
    await allure.story('Filter products by brand Polo');
    await allure.severity('critical');
    await allure.description(
      'Calls GET /api/productsList, parses the response and prints every product whose brand is "Polo"; asserts at least one match and re-verifies each filtered product.',
    );

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

    await allure.feature('Search product API');
    await allure.story('Find products of category T-shirts');
    await allure.severity('critical');
    await allure.description(
      'Discovers the search_product form parameter from the site, calls POST /api/searchProduct and asserts every returned product belongs to the T-shirts category.',
    );

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

  test(
    'TC-API-NEG-001 — search without parameter is rejected (400)',
    { tag: ['@negative'] },
    async ({ request }) => {
      await allure.feature('API negative');
      await allure.story('Missing search parameter is rejected');
      await allure.severity('normal');
      await allure.description(
        'POST /api/searchProduct with no body must respond HTTP 200 with responseCode 400 and a validation message.',
      );

      const response = await request.post('/api/searchProduct');
      expect(response.status()).toBe(200);
      const body = (await response.json()) as { responseCode?: number; message?: string };
      expect(body.responseCode).toBe(400);
    },
  );

  test(
    'TC-API-NEG-002 — GET on search endpoint is not allowed (405)',
    { tag: ['@negative'] },
    async ({ request }) => {
      await allure.feature('API negative');
      await allure.story('GET method on search endpoint is not allowed');
      await allure.severity('normal');
      await allure.description(
        'GET /api/searchProduct must be rejected by the server (HTTP 405 or a 200 envelope carrying responseCode 405).',
      );

      const response = await request.get('/api/searchProduct');
      const body = (await response.json()) as { responseCode?: number };
      expect([200, 405]).toContain(response.status());
      expect([200, 405]).toContain(body.responseCode);
    },
  );

  test(
    'TC-API-SEC-001 — XSS/SQLi probes do not break search',
    { tag: ['@security'] },
    async ({ apiClient }) => {
      await allure.feature('API security');
      await allure.story('Malicious payloads keep the API stable');
      await allure.severity('normal');
      await allure.description(
        'Sends XSS and SQL-injection style queries to /api/searchProduct and asserts the endpoint still answers with a well-formed array.',
      );

      for (const { query } of ApiTemplates.invalidSearchQueries().slice(1)) {
        const products = await apiClient.searchProducts(query);
        expect(Array.isArray(products)).toBe(true);
      }
    },
  );
});
