# API Test Suite — AutomationExercise (Task 2)

Reference: `https://www.automationexercise.com/api_list`. Run: `npm run test:api`.

## Stage 1 — TC-API-001 `GET /api/productsList` → Polo brands

1. `apiClient.getAllProducts()` → HTTP 200, `responseCode` 200, 34 products (live count).
2. `filterByBrand(products, 'Polo')` (case-insensitive) → names logged to terminal:
   Blue Top, Fancy Green Top, Green Side Placket Detail T-Shirt, Premium Polo T-Shirts, Soft Stretch Jeans, Grunt Blue Slim Fit Jeans.
3. Assert ≥1 Polo and every filtered row has `brand === 'Polo'`.
4. Live result: **pass** (verified 2026-10-16).

## Stage 2 — TC-API-002 `POST /api/searchProduct` → Tshirts

1. Form field discovered from api_list: **`search_product`** (form-encoded, not JSON).
2. `apiClient.searchProducts('tshirt')` → 6 products, `responseCode` 200.
3. `filterByCategory(products, 'Tshirts')` (whitespace/dash-insensitive) → all 6 match (Men Tshirt, V-Neck, Polo variants…).
4. Assert ≥1 match, normalized category equals `tshirts`.
5. Live result: **pass**.

## Negatives / security

- Missing param → 400 (`TC-API-NEG-001`); wrong method GET → 405-documented (`TC-API-NEG-002`); XSS/SQLi → safe empty arrays (`TC-API-SEC-001`).
