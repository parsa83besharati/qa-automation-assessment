import { test, expect } from '../../fixtures/fixtures';
import { env } from '../../config/env';
import { ApiTemplates } from '../../data/templates/api.templates';
import { logger } from '../../utils/logger';
import { apiSuccessEnvelopeSchema, validateContract } from '../../services/api-schema';
import { allure } from 'allure-playwright';

// ---------------------------------------------------------------------------
// Task 2 — contract (schema) + latency (SLO) guards.
// These do not replace the business assertions in products.spec.ts; they fail
// when the API's *shape* or *speed* drifts, before any behaviour changes.
// ---------------------------------------------------------------------------

type Envelope = { responseCode?: number; products?: unknown[] };

test.describe('API contract & latency — AutomationExercise', { tag: ['@api', '@contract'] }, () => {
  test.beforeEach(async () => {
    await allure.epic('Task 2 — API testing');
    await allure.owner('QA Automation');
    await allure.tags('@api', '@contract');
  });

  test('TC-API-CONTRACT-001 — productsList matches the response contract', async ({ request }) => {
    await allure.feature('API contract');
    await allure.story('productsList envelope and product shape');
    await allure.severity('normal');
    await allure.description(
      'Asserts GET /api/productsList returns exactly { responseCode, products[] } and that every product is { id: number, name, price, brand, category: { usertype: { usertype }, category } }. Unknown keys fail on purpose so schema drift is caught immediately.',
    );

    const { status, body } = await test.step('GET /api/productsList', async () => {
      const response = await request.get('/api/productsList');
      return { status: response.status(), body: (await response.json()) as Envelope };
    });

    expect(status).toBe(200);

    const violations = validateContract(body, apiSuccessEnvelopeSchema);
    expect(violations, 'GET /api/productsList violated the response contract').toEqual([]);

    expect(body.responseCode).toBe(200);
    expect(Array.isArray(body.products)).toBe(true);
    expect((body.products as unknown[]).length).toBeGreaterThan(0);
  });

  test('TC-API-CONTRACT-002 — searchProduct matches the response contract', async ({ request }) => {
    await allure.feature('API contract');
    await allure.story('searchProduct envelope and product shape');
    await allure.severity('normal');
    await allure.description(
      'POSTs the documented form field search_product and validates the success payload against the same contract as productsList (envelope + product rows).',
    );

    const { query } = ApiTemplates.tshirtsCategory();

    const { status, body } = await test.step(`POST /api/searchProduct "${query}"`, async () => {
      const response = await request.post('/api/searchProduct', {
        form: { search_product: query },
      });
      return { status: response.status(), body: (await response.json()) as Envelope };
    });

    expect(status).toBe(200);

    const violations = validateContract(body, apiSuccessEnvelopeSchema);
    expect(violations, 'POST /api/searchProduct violated the response contract').toEqual([]);

    expect(body.responseCode).toBe(200);
    expect((body.products as unknown[]).length).toBeGreaterThan(0);
  });

  test(
    'TC-API-CONTRACT-NEG-001 — Malformed search payload fails as an envelope, not a crash',
    { tag: ['@negative'] },
    async ({ request }) => {
      await allure.feature('API contract negative');
      await allure.story('Garbage body never leaks a stack trace');
      await allure.severity('normal');
      await allure.description(
        'POSTs a JSON body (wrong content type for a form endpoint) to /api/searchProduct and asserts the answer is still JSON with a numeric responseCode — never HTML, a stack trace, or a 5xx.',
      );

      const response = await request.post('/api/searchProduct', {
        data: { search_product: { nested: '💥' } },
      });
      expect(response.status(), 'Server must not 5xx on malformed input').toBeLessThan(500);

      const text = await response.text();
      expect(text, 'Response must not be an HTML error page').not.toMatch(
        /stack trace|exception in|<html/i,
      );

      let parsed: Envelope | null = null;
      try {
        parsed = JSON.parse(text) as Envelope;
      } catch {
        parsed = null;
      }
      expect(parsed, `Response must be JSON, got: ${text.slice(0, 60)}`).not.toBeNull();
      expect(typeof (parsed as Envelope).responseCode).toBe('number');
    },
  );

  test('TC-API-SLO-001 — endpoints stay inside the latency budget', async ({
    apiClient,
  }, testInfo) => {
    const budget = env.apiLatencyBudgetMs;
    const { query } = ApiTemplates.tshirtsCategory();

    await allure.feature('API performance');
    await allure.story('Single-call latency stays under the k6-aligned budget');
    await allure.severity('normal');
    await allure.description(
      `Times one GET /api/productsList and one POST /api/searchProduct call and asserts both finish within ${budget}ms — the Playwright counterpart of the k6 threshold p(95)<1500. Override with API_LATENCY_BUDGET_MS.`,
    );

    const timed = async (label: string, call: () => Promise<unknown>) => {
      const started = performance.now();
      await call();
      const ms = Math.round(performance.now() - started);
      logger.info(`⏱ ${label} → ${ms}ms (budget ${budget}ms)`);
      return { label, ms };
    };

    const samples = [
      await test.step('Time GET /api/productsList', () =>
        timed('GET /api/productsList', () => apiClient.getAllProducts())),
      await test.step('Time POST /api/searchProduct', () =>
        timed('POST /api/searchProduct', () => apiClient.searchProducts(query))),
    ];

    await testInfo.attach('api-latency-ms', {
      body: JSON.stringify({ budgetMs: budget, samples }, null, 2),
      contentType: 'application/json',
    });

    for (const sample of samples) {
      expect(
        sample.ms,
        `${sample.label} took ${sample.ms}ms — over the ${budget}ms SLO budget`,
      ).toBeLessThan(budget);
    }
  });
});
