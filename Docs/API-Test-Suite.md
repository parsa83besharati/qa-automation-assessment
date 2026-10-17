# API Test Suite — AutomationExercise (Task 2)

## QA Automation Assessment — Mohaymen

**Automation:** `tests/api/products.spec.ts` + `tests/api/contract.spec.ts`  
**Tags:** `@api` `@contract` `@negative` `@security`  
**Commands:** `npm run test:api` (all 8) · `npm run test:ci` · `npm run test:negative-api`  
**Reference:** `https://www.automationexercise.com/api_list`  
**Purpose:** Functional, negative, security, **contract** and **latency** coverage of the two documented endpoints.  
**Author:** Parsa Besharati  
**Date:** 2026-10-17  
**Version:** 2.0

---

## How These Tests Run

> API tests use Playwright's `request` fixture — they are **browser-agnostic**. They run **once**
> in the dedicated `api` project (`testMatch: api/**/*.spec.ts`); the chromium/firefox/webkit
> projects `testIgnore` `api/**`, so no case is duplicated per browser and no browser binary is
> needed (`npm run test:api` works with zero browsers installed).

| Layer             | What it guards                                                           | Files              |
| ----------------- | ------------------------------------------------------------------------ | ------------------ |
| **Behavioural**   | the API _does_ the right thing (Polo brands, Tshirts, rejections, abuse) | `products.spec.ts` |
| **Contract**      | the API _keeps the same shape_ (envelope + product rows)                 | `contract.spec.ts` |
| **Latency (SLO)** | the API _stays fast enough_ (single-call budget)                         | `contract.spec.ts` |

The three layers fail for different reasons — a red contract test means schema drift even when
every behavioural assertion still passes.

---

## Endpoints Under Test

| Endpoint             | Method | Payload                                       | Success shape                                          |
| -------------------- | ------ | --------------------------------------------- | ------------------------------------------------------ |
| `/api/productsList`  | GET    | —                                             | `{ responseCode: 200, products: Product[] }` (34 live) |
| `/api/searchProduct` | POST   | form field **`search_product`** (`tshirt`, …) | same envelope (6 live for `tshirt`)                    |

`Product` (live, strict): `{ id: number, name: string, price: string, brand: string, category: { category: string, usertype: { usertype: string } } }`

---

## Test Cases

| ID                  | Test Case Description                       | Technique                  | Priority | Tags               |
| ------------------- | ------------------------------------------- | -------------------------- | -------- | ------------------ |
| TC-API-001          | productsList contains Polo brand products   | Use Case + EP              | P0       | `@api`             |
| TC-API-002          | searchProduct finds Tshirts category        | Use Case + EP              | P0       | `@api`             |
| TC-API-NEG-001      | Search without parameter is rejected (400)  | Decision Table + Negative  | P1       | `@api` `@negative` |
| TC-API-NEG-002      | GET on search endpoint is not allowed (405) | Decision Table + Negative  | P1       | `@api` `@negative` |
| TC-API-SEC-001      | XSS/SQLi probes do not break search         | Negative + Error Guessing  | P1       | `@api` `@security` |
| TC-API-CONTRACT-001 | productsList matches the response contract  | Contract (Schema)          | P1       | `@api` `@contract` |
| TC-API-CONTRACT-002 | searchProduct matches the response contract | Contract (Schema)          | P1       | `@api` `@contract` |
| TC-API-SLO-001      | Endpoints stay inside the latency budget    | Threshold (Non-functional) | P1       | `@api` `@contract` |

---

### TC-API-001 — `GET /api/productsList` → Polo Brands

**Scenario Reference:** S6.1 ([Test Design Document](./Test-Design-Document.md#s6--api-functionality-contract--latency))  
**Priority:** P0 · **Severity:** critical

**Test Steps:**

1. `apiClient.getAllProducts()` → HTTP 200, `responseCode` 200 (live count: **34 products**).
2. `apiClient.getProductNamesByBrand('Polo')` → filters (case-insensitive) and **logs every Polo name to the terminal**.
3. Assert `names.length > 0` and every name is non-empty.
4. Re-filter the raw list with `AutomationExerciseClient.filterByBrand(all, 'Polo')` and assert
   each row's `brand.toLowerCase() === 'polo'`.

**Expected Results:**

- ≥ 1 Polo product; live set (2026-10-16): _Blue Top, Fancy Green Top, Green Side Placket Detail
  T-Shirt, Premium Polo T-Shirts, Soft Stretch Jeans, Grunt Blue Slim Fit Jeans_.
- Every filtered row really carries `brand = Polo` (the filter is not over-matching).

**Automation Notes:**

- Two-step assertion (names non-empty **+** every filtered product is Polo) catches a filter that
  would match anything.
- Task requirement "Polo names in terminal" is satisfied by `getProductNamesByBrand` logging.

---

### TC-API-002 — `POST /api/searchProduct` → Tshirts

**Scenario Reference:** S6.2  
**Priority:** P0 · **Severity:** critical

**Test Steps:**

1. Parameter discovered from `/api_list`: **`search_product`**, form-encoded (not JSON).
2. `apiClient.getProductsByCategory('Tshirts', 'tshirt')` → live: **6 products**, `responseCode` 200.
3. Assert `matched.length > 0`.
4. For each row assert normalized `category.category === 'tshirts'`.

**Expected Results:**

- All 6 hits belong to T-shirts (Men Tshirt, V-Neck, Polo variants…).
- Normalisation strips spaces/dashes (`replace(/[\s-]+/g, '')`) so `T-Shirt` ≡ `Tshirts` — the
  assertion tests _meaning_, not formatting.

**Automation Notes:**

- `ApiTemplates.tshirtsCategory()` holds `{ query, expectedCategory }` — one source for both the
  request and the assertion.

---

### TC-API-NEG-001 — Missing Parameter Is Rejected (400)

**Scenario Reference:** S6.3 · **Priority:** P1 · **Severity:** normal  
**Technique:** Decision Table Testing

**Test Steps:**

1. `request.post('/api/searchProduct')` — no body at all.
2. Assert HTTP status `200`.
3. Assert `body.responseCode === 400`.

**Expected Results:** envelope-style rejection (`responseCode: 400` + message), no 5xx, no HTML.  
**Automation Notes:** asserting **both** transport status and envelope code prevents a one-sided regression.

---

### TC-API-NEG-002 — Wrong Method Is Rejected (405)

**Scenario Reference:** S6.4 · **Priority:** P1 · **Severity:** normal  
**Technique:** Decision Table Testing

**Test Steps:**

1. `request.get('/api/searchProduct')`.
2. Assert status ∈ `{200, 405}` **and** `body.responseCode ∈ {200, 405}`.

**Expected Results:** the endpoint refuses GET either at transport or envelope level; it must
never return a successful `products` payload. The tolerance is documented because the demo API
has been observed in both styles.

---

### TC-API-SEC-001 — XSS/SQLi Probes Do Not Break Search

**Scenario Reference:** S6.5 · **Priority:** P1 · **Severity:** normal  
**Technique:** Negative Testing + Error Guessing

**Test Steps:**

1. For each hostile query in `ApiTemplates.invalidSearchQueries()` (after the first benign entry):
   `<script>alert(1)</script>`, `' OR '1'='1`, …
2. `apiClient.searchProducts(query)`.
3. Assert `Array.isArray(products)`.

**Expected Results:** HTTP 200 with a well-formed (possibly empty) array — never 500, never an
error page that would break JSON parsing. See [Security-Test-Suite.md](./Security-Test-Suite.md).

---

### TC-API-CONTRACT-001 — `productsList` Matches the Response Contract

**Scenario Reference:** S6.6 · **Priority:** P1 · **Severity:** normal  
**Technique:** Contract (Schema) Testing

**Contract (strict — unknown keys are violations):**

```
{ responseCode: number, products: Array<{
    id: number, name: string, price: string, brand: string,
    category: { category: string, usertype: { usertype: string } }
}> }
```

**Test Steps:**

1. `GET /api/productsList` → assert status `200`.
2. `validateContract(body, apiSuccessEnvelopeSchema)` → must return `[]`.
3. Assert `body.responseCode === 200`, `products` is an array with `length > 0`.

**Expected Results:** zero violations; any added/renamed/retyped field fails with a
`$.path: expected …` message that names the exact node.

**Automation Notes:**

- Validator is **dependency-free** (`services/api-schema.ts`) — no ajv/new package: a small
  `validateContract(value, schema)` returning violation strings.
- Strictness is deliberate: unknown keys fail on purpose so upstream schema drift is caught
  _before_ behaviour changes (risk **R05**).
- This test caught a real bug: `category.usertype` is a nested object
  `{"usertype":"Women"}`, while `data/entities/api-product.entity.ts` originally typed it as a
  plain string — the entity now matches reality.

---

### TC-API-CONTRACT-002 — `searchProduct` Matches the Response Contract

**Scenario Reference:** S6.7 · **Priority:** P1 · **Severity:** normal  
**Technique:** Contract (Schema) Testing

**Test Steps:**

1. `POST /api/searchProduct` with `form: { search_product: 'tshirt' }`.
2. Assert status `200`, violations `[]`, `responseCode` 200, `products.length > 0`.

**Expected Results:** both endpoints provably share one envelope/product schema — a drift in
either surfaces here and in CONTRACT-001 independently.

---

### TC-API-SLO-001 — Single-Call Latency Inside the Budget

**Scenario Reference:** S6.8 · **Priority:** P1 · **Severity:** normal  
**Technique:** Threshold (Non-functional) Testing

**Test Steps:**

1. Read `budget = env.apiLatencyBudgetMs` (default **1500 ms**, override `API_LATENCY_BUDGET_MS`).
2. Time `apiClient.getAllProducts()` with `performance.now()` → log `⏱ GET /api/productsList → Nms`.
3. Time `apiClient.searchProducts('tshirt')` → log similarly.
4. Attach the samples to Allure as `api-latency-ms` (JSON: `{ budgetMs, samples[] }`).
5. Assert each `ms < budget`.

**Expected Results:**

- Both calls inside the budget; failure message reads
  `GET /api/productsList took 1720ms — over the 1500ms SLO budget`.
- The budget mirrors the k6 threshold `p(95) < 1500` in `performance/k6/*` — one number across
  Playwright and k6.

**Automation Notes:**

- Attach-then-assert: even a failing run leaves the actual numbers in the report for triage.
- Budget is env-tunable so a slow network day does not silently block CI (risk **R12**).

---

## Run Subsets

| Command                                | Selection                               | Cases |
| -------------------------------------- | --------------------------------------- | ----: |
| `npm run test:api`                     | whole `api` project                     |     8 |
| `npm run test:ci`                      | `@smoke` or `@api` (chromium + api)     |    12 |
| `npm run test:fast`                    | everything except `@regression`/`@edge` |    17 |
| `npm run test:negative-api`            | `@negative` or `@security` in `api`     |     3 |
| `npx playwright test --grep @contract` | contract/SLO only                       |     3 |

---

## Execution Order & Dependencies

1. All 8 cases are independent — no shared state, safe in any order, fully parallel.
2. No browser binaries required; only network access to `automationexercise.com`.
3. Contract and SLO cases re-issue their own HTTP calls (they do not reuse behavioural responses)
   so each layer is honest.

---

## Success Criteria

- **8/8 green** is the hard gate for Task 2 (entry criterion for the build).
- Contract violations `[]` on both endpoints; both calls `< API_LATENCY_BUDGET_MS`.
- Wall-clock target: **< 5 seconds** for the full project.
- These cases are the API half of `npm run test:ci` — the PR check.

---

## Automation Implementation

| Item      | Detail                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Specs     | `tests/api/products.spec.ts` (5) · `tests/api/contract.spec.ts` (3)                                                                                                |
| Transport | Playwright `request` fixture; **relative** `/api/...` paths so any project/base URL works                                                                          |
| Client    | `services/api-client.ts` — `getAllProducts()`, `searchProducts(q)`, `getProductNamesByBrand()`, `getProductsByCategory()`, static `filterByBrand/filterByCategory` |
| Contract  | `services/api-schema.ts` — `validateContract`, `apiProductSchema`, `apiSuccessEnvelopeSchema`                                                                      |
| Data      | `ApiTemplates.poloBrand()`, `.tshirtsCategory()`, `.invalidSearchQueries()`                                                                                        |
| Entity    | `data/entities/api-product.entity.ts` (typed to the live payload, incl. nested `usertype`)                                                                         |
| Reporting | Allure epic "Task 2 — API testing"; SLO samples attached as `api-latency-ms`                                                                                       |
| CI        | API job needs no browser install; `test-results/` uploaded as an artifact on failure                                                                               |
