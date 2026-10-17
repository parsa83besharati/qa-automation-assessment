# API Test Suite — AutomationExercise (Task 2)

Reference: `https://www.automationexercise.com/api_list`. Run: `npm run test:api`.

> Runs once in the dedicated `api` Playwright project (browser-agnostic `request` fixture) — the chromium/firefox/webkit projects ignore `tests/api/**`, so these cases are not duplicated per browser.

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

## Contract & latency — `tests/api/contract.spec.ts`

- `TC-API-CONTRACT-001` — `GET /api/productsList` must be exactly `{ responseCode, products[] }`, and each product exactly `{ id: number, name, price, brand, category: { usertype: { usertype }, category } }`. Unknown keys fail on purpose so schema drift is caught.
- `TC-API-CONTRACT-002` — the same contract for `POST /api/searchProduct` (`search_product` form field).
- `TC-API-SLO-001` — one call per endpoint must finish within `API_LATENCY_BUDGET_MS` (default **1500 ms**, mirroring the k6 threshold `p(95)<1500`); durations are attached to the report as `api-latency-ms`.
- Validator: `services/api-schema.ts` → `validateContract(value, schema)` (dependency-free, returns `$.path: expected …` violations).
- Live payload note: `category.usertype` is a **nested object** `{"usertype":"Women"}` — the entity (`data/entities/api-product.entity.ts`) matches reality, not a plain string.

Run subsets: `npm run test:api` (all 8), `npm run test:ci` (smoke+API), `npm run test:negative-api` (negatives/security only).
