import type { APIRequestContext } from '@playwright/test';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NavigationLogger } from '../utils/navigation-logger';
import type {
  ApiProduct,
  ProductsListResponse,
  SearchProductResponse,
} from '../data/entities/api-product.entity';

// ---------------------------------------------------------------------------
// AutomationExercise API client (OOP: encapsulation + pure filter helpers).
// Docs: https://www.automationexercise.com/api_list
// ---------------------------------------------------------------------------

export class AutomationExerciseClient {
  private readonly request: APIRequestContext;
  private readonly baseUrl: string;

  public constructor(request: APIRequestContext, baseUrl: string = env.apiBaseUrl) {
    this.request = request;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /** Task 2 / Stage 1 — GET /api/productsList, log Polo names to terminal. */
  public async getAllProducts(): Promise<ApiProduct[]> {
    const url = `${this.baseUrl}/api/productsList`;
    NavigationLogger.api('GET', url);
    const response = await this.request.get(url);
    NavigationLogger.api('GET', url, response.status());
    if (!response.ok()) {
      throw new Error(`productsList failed with HTTP ${response.status()}`);
    }
    const body = (await response.json()) as ProductsListResponse;
    logger.info(
      `📦 productsList → ${body.products?.length ?? 0} products (code ${body.responseCode})`,
    );
    return body.products ?? [];
  }

  /** Task 2 / Stage 2 — POST /api/searchProduct { search_product: query }. */
  public async searchProducts(query: string): Promise<ApiProduct[]> {
    const url = `${this.baseUrl}/api/searchProduct`;
    NavigationLogger.api('POST', url);
    const response = await this.request.post(url, { form: { search_product: query } });
    NavigationLogger.api('POST', url, response.status());
    if (!response.ok()) {
      throw new Error(`searchProduct failed with HTTP ${response.status()}`);
    }
    const body = (await response.json()) as SearchProductResponse;
    const products = body.products ?? [];
    logger.info(
      `🔎 searchProduct("${query}") → ${products.length} products (code ${body.responseCode})`,
    );
    return products;
  }

  /** Convenience: names of every product whose brand matches (Task stage 1). */
  public async getProductNamesByBrand(brand: string): Promise<string[]> {
    const products = await this.getAllProducts();
    const names = AutomationExerciseClient.filterByBrand(products, brand).map((p) => p.name);
    for (const name of names) {
      logger.info(`🏷️ brand=${brand} → ${name}`);
    }
    // Task explicitly wants terminal output — logger console transport covers this.
    return names;
  }

  /** Convenience: full products whose category matches (Task stage 2). */
  public async getProductsByCategory(category: string, query: string): Promise<ApiProduct[]> {
    const products = await this.searchProducts(query);
    const matched = AutomationExerciseClient.filterByCategory(products, category);
    for (const product of matched) {
      logger.info(`👕 category=${category} → #${product.id} ${product.name} [${product.brand}]`);
    }
    return matched;
  }

  // ------------------------- pure helpers (testable, no I/O) -------------------------

  public static filterByBrand(products: ApiProduct[], brand: string): ApiProduct[] {
    const want = brand.trim().toLowerCase();
    return products.filter((p) => (p.brand ?? '').trim().toLowerCase() === want);
  }

  public static filterByCategory(products: ApiProduct[], category: string): ApiProduct[] {
    const want = category
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '');
    return products.filter(
      (p) =>
        (p.category?.category ?? '')
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '') === want,
    );
  }

  public static names(products: ApiProduct[]): string[] {
    return products.map((p) => p.name);
  }
}
