/** AutomationExercise product shape (subset we assert on). */
export interface ApiCategory {
  /**
   * Nested object in the live payload: `{"usertype": {"usertype": "Women"}}`.
   * (The endpoint does NOT return a plain string here.)
   */
  usertype: { usertype: string };
  category: string;
}

export interface ApiProduct {
  id: number;
  name: string;
  price: string;
  brand: string;
  category: ApiCategory;
}

export interface ProductsListResponse {
  responseCode: number;
  products: ApiProduct[];
}

export interface SearchProductResponse {
  responseCode: number;
  products?: ApiProduct[];
  message?: string;
}
