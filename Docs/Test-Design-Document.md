# Test Design Document

## QA Automation Assessment — Mohaymen

**Application:** Booking.com (UI) · AutomationExercise (API)  
**Bases:** `BOOKING_BASE_URL` / `API_BASE_URL` — resolved by `config/env.ts` from `.env`  
**Automation:** 27 Playwright cases in `tests/ui/**` + `tests/api/**`, 5 k6 scenarios in `performance/k6/**` — see [Docs/README.md](./README.md)  
**Task reference:** `Task.pdf` — Task 1 Booking.com search flow · Task 2 `productsList` + `searchProduct` API · Task 3 performance scenarios  
**Author:** Parsa Besharati  
**Date:** 2026-10-17  
**Version:** 2.0

---

## Table of Contents

1. [Scope & Objectives](#1-scope--objectives)
2. [Risk Assessment](#2-risk-assessment)
3. [Test Design Techniques](#3-test-design-techniques)
4. [Test Scenarios](#4-test-scenarios)
   - [S1 – Critical Path (Smoke)](#s1--critical-path-smoke)
   - [S2 – Search Building Blocks (Regression)](#s2--search-building-blocks-regression)
   - [S3 – Negative Behaviour](#s3--negative-behaviour)
   - [S4 – Boundary Values & Resilience (Edge)](#s4--boundary-values--resilience-edge)
   - [S5 – Security Guards](#s5--security-guards)
   - [S6 – API Functionality, Contract & Latency](#s6--api-functionality-contract--latency)
   - [S7 – Performance & Observability](#s7--performance--observability)
5. [Traceability Matrix](#5-traceability-matrix)
6. [Entry / Exit Criteria](#6-entry--exit-criteria)
7. [Environments & Configuration](#7-environments--configuration)
8. [Assumptions & Limitations](#8-assumptions--limitations)

---

## 1. Scope & Objectives

### In Scope

| Area                         | Task | Description                                                                                                                                                                                                      |
| ---------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Search flow**              | 1    | Currency TRY → destination "London" (first suggestion) → "I'm flexible" → "A month" → current month → "Select dates" → 8 adults → "Travelling with pets" → Search → 3rd hotel "See availability" → dismiss popup |
| **Widget building blocks**   | 1    | Each search widget exercised in isolation so a failure names the broken control                                                                                                                                  |
| **Invalid input handling**   | 1    | Empty / gibberish destination, unknown currency code                                                                                                                                                             |
| **Boundaries & resilience**  | 1    | 30-adults maximum, dynamic result index, transient overlays, tablet/mobile viewports                                                                                                                             |
| **Transport & input safety** | 1    | HTTPS enforcement, reflected XSS / SQLi inertness, session cookie lifecycle                                                                                                                                      |
| **Product APIs**             | 2    | `GET /api/productsList` (Polo brand filter) · `POST /api/searchProduct` (`search_product` form field, Tshirts)                                                                                                   |
| **API negatives & security** | 2    | Missing parameter → `responseCode` 400 · wrong HTTP method → 405 · XSS/SQLi probes stay well-formed                                                                                                              |
| **API contract & latency**   | 2    | Response envelope/product shape validated on every run; single-call latency ≤ `API_LATENCY_BUDGET_MS`                                                                                                            |
| **Performance**              | 3    | 5 k6 scenarios (smoke, load, stress, spike, soak) against `POST /api/searchProduct`                                                                                                                              |
| **Observability**            | 3    | k6 → InfluxDB → Grafana stack, provisioned dashboard, threshold lines                                                                                                                                            |
| **Reporting / CI**           | —    | Allure 2 report, HTML report, artifacts on CI failure, 3 pipelines (GitHub/Azure/GitLab)                                                                                                                         |

### Out of Scope

| Area                                               | Reason                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| **Booking payment / reservation completion**       | Not requested by Task 1; stops at "See availability"               |
| **Account creation & login**                       | Booking requires e-mail verification; not in the task              |
| **JMeter**                                         | k6 chosen — code-reviewable, versionable, CI-native                |
| **Full penetration testing**                       | Only baseline guards (XSS/SQLi/HTTPS/cookies) are automated        |
| **Mutation / visual regression testing**           | No approved baseline images in scope                               |
| **Published performance service-level agreements** | Public demo target — thresholds are observational, not contractual |

### Objectives

1. Prove the Task 1 happy path end-to-end with a **single** test (`TC-SMOKE-002`) and its
   building blocks isolated for fast root-cause (`TC-REG-001…005`).
2. Prove Task 2 functionality **and** keep it honest over time: behavioural assertions,
   response-contract validation and a latency budget.
3. Provide defensible non-functional evidence (5 k6 profiles + live Grafana dashboard).
4. Fail fast in CI on anything that regresses: lint, types, formatting, API suite, artifacts.

---

## 2. Risk Assessment

| Risk ID | Risk Description                                                             | Impact | Likelihood | Priority | Mitigation                                                                                                                                                     |
| ------- | ---------------------------------------------------------------------------- | ------ | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R01** | Booking bot protection / CAPTCHA blocks automated sessions                   | High   | Medium     | P0       | Healable `BasePage`, heuristic+LLM self-healing flag (`SELF_HEALING_ENABLED`), popup/cookie dismissal, generous timeouts, `HEADLESS=false` headed runs locally |
| **R02** | A/B layouts & locale variants change widget markup (currency/date/occupancy) | Medium | High       | P1       | Centralised `pages/locators/*.locators.ts`, `locate(testId, fallback)` chains, cached selector healing, one requirement per regression case                    |
| **R03** | Search results ordering is dynamic (the "3rd hotel" moves)                   | Medium | Medium     | P1       | Index-parameterised `openHotelByIndex(n)` (`TARGET_HOTEL_INDEX`), `TC-EDGE-002` proves index 2 works too, assertions use patterns not names                    |
| **R04** | Public AutomationExercise latency variance causes flaky perf assertions      | Medium | Medium     | P1       | Budgets derived from live trials (smoke p95≈869ms → 1500ms), k6 thresholds with headroom, retries only in CI                                                   |
| **R05** | API schema drifts silently (new/renamed fields, nested type change)          | Medium | Medium     | P1       | `TC-API-CONTRACT-001/002` strict validator — unknown keys fail (`services/api-schema.ts`), catches `category.usertype` nesting                                 |
| **R06** | Transient overlays (sign-in, promo, cookies) intercept clicks                | Medium | High       | P1       | `dismissPopupIfPresent()` before interactions, `TC-EDGE-003` regression-guards the helper, cookie acceptance in `open()`                                       |
| **R07** | Shared public demo data (products/price) changes between runs                | Low    | Medium     | P2       | Assertions on structure/counts (`>0`, brand/category membership) instead of hard-coded names where possible                                                    |
| **R08** | LLM keys unavailable → AI healing cannot run                                 | Low    | High       | P2       | Healing off by default; heuristic layer works keyless; tests must pass with `SELF_HEALING_ENABLED=false`                                                       |
| **R09** | Load tests hammer the public demo host                                       | High   | Low        | P1       | Low VU ceilings (max 100, brief), short scenarios, documented in the perf plan                                                                                 |
| **R10** | Network/timeouts make UI tests flaky                                         | Medium | Medium     | P1       | `waitForResults()` explicit waits, no fixed `sleep`, retries configured in `playwright.config.ts`, per-test logs                                               |
| **R11** | Browser binaries missing for firefox/webkit on a machine                     | Medium | Medium     | P1       | API project needs no browsers; UI jobs install browsers in CI; documented entry criteria                                                                       |
| **R12** | Latency SLO fails on a slow day and blocks the pipeline                      | Medium | Low        | P2       | Budget overridable via `API_LATENCY_BUDGET_MS`; result attached to Allure as `api-latency-ms` for triage                                                       |

---

## 3. Test Design Techniques

| Technique                              | Applied To (Scenario IDs)         | Justification                                                                                                                                                               |
| -------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Testing**                   | S1.1, S1.2, S2.1–S2.5, S6.1, S6.2 | Models the exact Task 1/2 requirements as user journeys; the happy path is what the assessor runs first.                                                                    |
| **State Transition Testing**           | S2.3, S4.3, S4.4, S4.5            | Calendar and occupancy move through explicit states (flexible → a month → month → select); viewports change the page state.                                                 |
| **Equivalence Partitioning**           | S2.1, S2.2, S3.2, S6.1, S6.2      | Inputs grouped into valid (`TRY`, `London`, `tshirt`) and invalid (`XXX`, `!!!NoSuchPlace123`, missing param) classes — one representative per class keeps the suite small. |
| **Boundary Value Analysis**            | S4.1, S4.2, S7.2–S7.5             | Adults 1 → 8 (task) → 30 (max); hotel index 1-based (2, 3); VU ceilings 1/20/100; latency budget edge (`<1500ms`). Defects cluster at limits.                               |
| **Decision Table Testing**             | S6.1–S6.5                         | API status vs `responseCode` combinations: 200/200 success, 200/400 missing param, {200,405}/{200,405} wrong method — each rule is one case.                                |
| **Negative Testing**                   | S3.1–S3.3, S6.3, S6.4             | Invalid/absent input must be rejected without navigation, crash or 500.                                                                                                     |
| **Error Guessing / Exploratory**       | S4.3, S5.1–S5.4, S7.1             | Popup interference, XSS/SQLi probes and viewport quirks are discovered-by-experience risks.                                                                                 |
| **Contract (Schema) Testing**          | S6.6, S6.7                        | Asserts response _shape_, not just behaviour — fails on drift before users notice.                                                                                          |
| **Non-functional / Threshold Testing** | S6.8, S7.1–S7.5                   | Latency budgets (`p95 < 1500ms`, `API_LATENCY_BUDGET_MS`) and error-rate thresholds turn "feels fast" into an assertion.                                                    |

---

## 4. Test Scenarios

### S1 – Critical Path (Smoke)

#### S1.1 – Homepage Renders the Search Widget

**Priority:** P0  
**Technique:** Use Case Testing  
**Actor:** Anonymous visitor  
**Precondition:** None (fresh context)  
**Automated by:** `TC-SMOKE-001` · `tests/ui/smoke.spec.ts`

**Flow:**

1. `homePage.open()` → `https://www.booking.com/`.
2. Dismiss cookie banner if present; dismiss any transient overlay.
3. Assert the destination input, the Search button and the currency picker are visible.

**Expected Results:**

- URL is `https://www.booking.com/` over HTTPS.
- Destination input, Search button and currency picker all visible within the 15s action timeout.
- No unhandled dialog/overlay blocks interaction.

**Risk Mapped:** R01, R06, R10

---

#### S1.2 – Full Task 1 Flow Opens the 3rd Hotel

**Priority:** P0  
**Technique:** Use Case Testing (Happy Path)  
**Actor:** Anonymous visitor  
**Precondition:** None; data from `BookingTemplates.taskHappyPath()` (TRY / London / 8 adults / pets / index 3 / current month)  
**Automated by:** `TC-SMOKE-002` · `tests/ui/smoke.spec.ts`

**Flow:**

1. `homePage.searchFlow(query)` runs the whole widget sequence in order:
   currency → destination + first suggestion → "I'm flexible" → "A month" → current month →
   "Select dates" → adults 8 → travelling with pets → Search.
2. URL now contains `searchresults`.
3. `resultsPage.waitForResults()`; `countHotels()` ≥ `targetHotelIndex` (3).
4. `resultsPage.openHotelByIndex(3)` → returned page URL matches `/booking\.com\/hotel\//`.

**Expected Results:**

- ≥ 3 hotel cards render; each exposes a "See availability" control.
- Opening card #3 lands on a Booking hotel page (same tab or new tab — helper handles both).
- Popup never blocks the click (dismissed on demand).

**Risk Mapped:** R01, R02, R03, R06

---

### S2 – Search Building Blocks (Regression)

Each case isolates **one** widget so a red test names the broken control without rerunning the flow.

#### S2.1 – Currency Switches to TRY

**Priority:** P1 · **Technique:** Equivalence Partitioning, Use Case Testing  
**Precondition:** Homepage loaded · **Automated by:** `TC-REG-001`

**Flow:** `open()` → `selectCurrency('TRY')` → assert header currency button text.  
**Expected:** Button contains `TRY` (valid partition of the currency list).  
**Risk Mapped:** R02

---

#### S2.2 – Destination "London" Offers Suggestions

**Priority:** P1 · **Technique:** Equivalence Partitioning  
**Precondition:** Homepage loaded · **Automated by:** `TC-REG-002`

**Flow:** `fillDestination('London')` → wait for the suggestion list → first option is clickable.  
**Expected:** `suggestionList` becomes visible; typing alone must not navigate.  
**Risk Mapped:** R02, R10

---

#### S2.3 – Flexible Current-Month Dates Are Selectable

**Priority:** P1 · **Technique:** State Transition Testing  
**Precondition:** `env.currentMonth.label` resolved from the system clock · **Automated by:** `TC-REG-003`

**Flow:** open calendar → "I'm flexible" → "A month" → current month card → "Select dates".  
**Expected:** Calendar closes; the occupancy trigger is visible (date step done, occupancy next).  
State chain: _calendar closed → flexible mode → granularity → month chosen → applied_.  
**Risk Mapped:** R02, R07

---

#### S2.4 – Occupancy Accepts 8 Adults + Pets

**Priority:** P1 · **Technique:** Equivalence Partitioning, Use Case Testing  
**Precondition:** Homepage loaded · **Automated by:** `TC-REG-004`

**Flow:** `setAdults(8)` (stepper loop) → `setTravellingWithPets(true)` → assert Search enabled.  
**Expected:** Adults = 8 (task value, inside 1–30 range); pets checkbox on; Search button `enabled`.  
**Risk Mapped:** R02

---

#### S2.5 – Results Render Cards with Availability

**Priority:** P1 · **Technique:** Use Case Testing  
**Precondition:** Full `searchFlow` completed · **Automated by:** `TC-REG-005`

**Flow:** `searchFlow` → `waitForResults()` → `countHotels()` → first "See availability" visible.  
**Expected:** count > 0; a visible availability button on the first card.  
**Risk Mapped:** R03, R07

---

### S3 – Negative Behaviour

#### S3.1 – Empty Destination Never Reaches Results

**Priority:** P1 · **Technique:** Negative Testing  
**Automated by:** `TC-NEG-001`

**Flow:** `open()` → clear destination → click Search → inspect URL.  
**Expected:** URL never matches `searchresults`; page stays on the homepage with validation or no-op.  
**Risk Mapped:** R10

---

#### S3.2 – Gibberish Destination Returns Zero Hotels

**Priority:** P2 · **Technique:** Negative Testing, Equivalence Partitioning (invalid class)  
**Data:** `SearchFactory.invalidDestination()` → `!!!NoSuchPlace123`  
**Automated by:** `TC-NEG-002`

**Flow:** currency → fill gibberish → `submitSearch()` → tolerate a failed navigation → count cards.  
**Expected:** `countHotels()` is **0** (either an empty result page or no navigation at all).  
**Risk Mapped:** R07

---

#### S3.3 – Unknown Currency Code Is Rejected Gracefully

**Priority:** P2 · **Technique:** Negative Testing  
**Automated by:** `TC-NEG-003`

**Flow:** capture URL → `selectCurrency('XXX')` (failure tolerated) → compare URL.  
**Expected:** URL unchanged; no crash, no navigation, widget still usable.  
**Risk Mapped:** R02

---

### S4 – Boundary Values & Resilience (Edge)

#### S4.1 – Maximum Adults (30) Stays Submittable

**Priority:** P2 · **Technique:** Boundary Value Analysis  
**Data:** `SearchFactory.maxAdults()` → 30 (widget upper bound)  
**Automated by:** `TC-EDGE-001`

**Flow:** `setAdults(30)` → assert `button[type=submit]` visible.  
**Expected:** Stepper caps at 30 (does not climb further or throw); submit control still visible.  
Boundaries: 1 (min) → 8 (task) → **30 (max, tested)**; 0 rejected by the widget.  
**Risk Mapped:** R02

---

#### S4.2 – Results Index Is Dynamic (2nd Hotel)

**Priority:** P2 · **Technique:** Boundary Value Analysis, Use Case Testing  
**Automated by:** `TC-EDGE-002`

**Flow:** `searchFlow({…, targetHotelIndex: 2})` → `openHotelByIndex(2)` → assert URL.  
**Expected:** Hotel page opens with a `booking.com` URL — the index is a parameter, not a hard-coded 3.  
**Risk Mapped:** R03

---

#### S4.3 – Transient Popup Dismissal Never Breaks Navigation

**Priority:** P3 · **Technique:** Error Guessing, Resilience  
**Automated by:** `TC-EDGE-003`

**Flow:** `open()` → `dismissPopupIfPresent()` → assert the return value type.  
**Expected:** returns a `boolean` (`true` dismissed / `false` nothing to dismiss), never throws.  
**Risk Mapped:** R06

---

#### S4.4 / S4.5 – Tablet (1024×768) & Mobile (390×844) Keep Search Usable

**Priority:** P3 · **Technique:** State Transition (viewport change), Exploratory  
**Automated by:** `TC-EDGE-004`, `TC-EDGE-005`

**Flow:** `setViewport(preset)` → `open()` → assert submit button visible.  
**Expected:** the search widget survives responsive re-layout; no horizontal collapse hiding Search.  
**Risk Mapped:** R02, R06

---

### S5 – Security Guards

#### S5.1 – HTTPS Is Enforced

**Priority:** P0 · **Technique:** Negative Testing (transport) · **Automated by:** `TC-SEC-001`  
**Flow:** `open()` → `expect(page.url()).toMatch(/^https:\/\//)`.  
**Expected:** homepage served over `https://` — no silent downgrade.  
**Risk Mapped:** R01

---

#### S5.2 – Reflected XSS Stays Inert

**Priority:** P0 · **Technique:** Negative Testing  
**Payload:** `<script>alert("xss")</script>` in the destination field  
**Automated by:** `TC-SEC-002`

**Flow:** fill payload → read `body.innerHTML()` → assert the payload did not become executable markup → destination field still visible.  
**Expected:** no injected `<script>` block executed in the DOM; input remains usable.  
**Risk Mapped:** R01, R02

---

#### S5.3 – SQLi Probe Is Treated as Plain Text

**Priority:** P0 · **Technique:** Negative Testing  
**Payload:** `' OR '1'='1`  
**Automated by:** `TC-SEC-003`

**Flow:** fill probe → `toHaveValue(SQLI)` exact match.  
**Expected:** value round-trips literally — no transformation, no error page.  
**Risk Mapped:** R01

---

#### S5.4 – Session Cookies Exist and Can Be Wiped

**Priority:** P1 · **Technique:** State Transition (session state)  
**Automated by:** `TC-SEC-004`

**Flow:** `open()` → count cookies (>0) → `clearSession()` → count again.  
**Expected:** before > 0, after = 0 — the session is fully clearable (isolation guarantee for other tests).  
**Risk Mapped:** R07, R10

---

### S6 – API Functionality, Contract & Latency

All API cases run in the dedicated `api` Playwright project (`request` fixture, no browser).

#### S6.1 – `GET /api/productsList` → Polo Brands

**Priority:** P0 · **Technique:** Use Case Testing, Equivalence Partitioning  
**Automated by:** `TC-API-001`

**Flow:**

1. `apiClient.getAllProducts()` → HTTP 200, `responseCode` 200, live count 34 products.
2. `filterByBrand(products, 'Polo')` (case-insensitive) → names logged to the terminal.
3. Assert ≥ 1 match and every filtered row has `brand === 'Polo'` (re-verified against the raw list).

**Expected:** 6 live Polo products (Blue Top, Fancy Green Top, Green Side Placket Detail T-Shirt,
Premium Polo T-Shirts, Soft Stretch Jeans, Grunt Blue Slim Fit Jeans); every name non-empty.  
**Risk Mapped:** R04, R05, R07

---

#### S6.2 – `POST /api/searchProduct` → Tshirts

**Priority:** P0 · **Technique:** Use Case Testing, Equivalence Partitioning  
**Automated by:** `TC-API-002`

**Flow:**

1. Parameter discovered from `/api_list`: **`search_product`**, form-encoded (not JSON).
2. `apiClient.searchProducts('tshirt')` → 6 products, `responseCode` 200.
3. `filterByCategory(products, 'Tshirts')` (whitespace/dash-insensitive) → all 6 match.
4. Assert ≥ 1 match and normalized `category.category === 'tshirts'`.

**Expected:** category normalization strips spaces/dashes so "T-Shirt"/"Tshirts" both pass.  
**Risk Mapped:** R04, R07

---

#### S6.3 – Missing Parameter Is Rejected (400)

**Priority:** P1 · **Technique:** Decision Table, Negative Testing · **Automated by:** `TC-API-NEG-001`

| HTTP status | `responseCode` | Meaning                         | Rule         |
| ----------- | -------------- | ------------------------------- | ------------ |
| 200         | 400            | envelope-style validation error | **asserted** |

**Flow:** `POST /api/searchProduct` with **no body** → assert status 200 and `responseCode` 400.  
**Risk Mapped:** R05

---

#### S6.4 – Wrong HTTP Method Is Rejected (405)

**Priority:** P1 · **Technique:** Decision Table, Negative Testing · **Automated by:** `TC-API-NEG-002`

| Transport  | Envelope           | Meaning               | Rule     |
| ---------- | ------------------ | --------------------- | -------- |
| status 405 | —                  | strict REST rejection | accepted |
| status 200 | `responseCode` 405 | envelope rejection    | accepted |

**Flow:** `GET /api/searchProduct` → status ∈ {200, 405} **and** `responseCode` ∈ {200, 405}.  
**Expected:** documented tolerance — the suite never 500s, and the response is never a success payload.  
**Risk Mapped:** R05

---

#### S6.5 – XSS/SQLi Probes Do Not Break Search

**Priority:** P1 · **Technique:** Negative Testing · **Automated by:** `TC-API-SEC-001`

**Flow:** for each malicious query in `ApiTemplates.invalidSearchQueries()` (`<script>alert(1)</script>`,
`' OR '1'='1`, …) → `searchProducts(query)` → `Array.isArray(products)`.  
**Expected:** HTTP 200 with a well-formed (possibly empty) array — never 500, never HTML error page.  
**Risk Mapped:** R05, R07

---

#### S6.6 – Response Contract (`productsList`)

**Priority:** P1 · **Technique:** Contract (Schema) Testing · **Automated by:** `TC-API-CONTRACT-001`

**Contract (strict — unknown keys fail):**

```
{ responseCode: number, products: Array<{
    id: number, name: string, price: string, brand: string,
    category: { category: string, usertype: { usertype: string } }
}> }
```

**Flow:** GET → `validateContract(body, apiSuccessEnvelopeSchema)` must return `[]` → `responseCode` 200 → `products.length > 0`.  
**Expected:** any added/renamed/retyped field fails with a `$.path: expected …` message.  
**Risk Mapped:** R05 (caught the real `category.usertype` nesting bug)

---

#### S6.7 – Response Contract (`searchProduct`)

**Priority:** P1 · **Technique:** Contract (Schema) Testing · **Automated by:** `TC-API-CONTRACT-002`

**Flow:** `POST` with `form: { search_product: 'tshirt' }` → same envelope/product contract as S6.6 → `products.length > 0`.  
**Expected:** both endpoints provably share one schema (`apiSuccessEnvelopeSchema`).  
**Risk Mapped:** R05

---

#### S6.8 – Single-Call Latency Inside the Budget

**Priority:** P1 · **Technique:** Threshold (Non-functional) Testing · **Automated by:** `TC-API-SLO-001`

**Flow:** time `getAllProducts()` and `searchProducts('tshirt')` with `performance.now()` → log each →
attach `api-latency-ms` JSON to the Allure report → assert `ms < API_LATENCY_BUDGET_MS` (default **1500 ms**).  
**Expected:** both calls under budget; the budget mirrors the k6 threshold `p(95) < 1500`.  
**Risk Mapped:** R04, R12

---

### S7 – Performance & Observability

Design detail lives in [Performance-Test-Plan.md](./Performance-Test-Plan.md); scenario-level view:

#### S7.1 – Smoke (baseline)

**Priority:** P0 · **Technique:** Threshold Testing · **Model:** 1 VU × 30s  
**Assertions:** `p95 < 1500ms`, `err < 1%`, `search_ok = 100%`. **Live:** 100% checks, p95 ≈ 869ms.

#### S7.2 – Load (expected usage)

**Priority:** P0 · **Technique:** Boundary Value Analysis (normal range) · **Model:** 5 → 10 → 20 VUs × ~3.5m  
**Assertions:** `p95 < 2000ms`, `err < 2%`.

#### S7.3 – Stress (breaking point)

**Priority:** P1 · **Technique:** Boundary Value Analysis (beyond capacity) · **Model:** 10 → 30 → 50 → 100 VUs × ~4m  
**Assertions:** `p95 < 4000ms`, `err < 10%`; observe graceful degradation, not collapse.

#### S7.4 – Spike (burst)

**Priority:** P1 · **Technique:** State Transition (steady → burst → recovery) · **Model:** 5 → 80 → 5 VUs  
**Assertions:** recovery to baseline after the burst; no residual error growth.

#### S7.5 – Soak (endurance)

**Priority:** P2 · **Technique:** Boundary Value Analysis (time) · **Model:** 10 VUs × 10m (30m full)  
**Assertions:** flat p95 across the window (no memory/latency creep), `err < 2%`.

**Observability:** `npm run perf:stack` starts InfluxDB + Grafana with a **provisioned** datasource
and a 14-panel dashboard (threshold lines at 1500 ms / 1%); `npm run perf:smoke:grafana` streams
k6 metrics with `--out influxdb=`.

**Risk Mapped:** R04, R09

---

## 5. Traceability Matrix

### 5.1 Requirement → Test IDs

| Task.pdf requirement                                            | Test ID(s)                                | Doc                                       |
| --------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Click currency → select TRY                                     | TC-REG-001                                | [Regression](./Regression-Test-Suite.md)  |
| Destination London → first suggestion                           | TC-REG-002, TC-SMOKE-002                  | [Regression](./Regression-Test-Suite.md)  |
| Calendar: I'm flexible → A month → current month → Select dates | TC-REG-003, TC-SMOKE-002                  | [Regression](./Regression-Test-Suite.md)  |
| Adults → 8, "Travelling with pets" ON                           | TC-REG-004, TC-SMOKE-002                  | [Regression](./Regression-Test-Suite.md)  |
| Search → 3rd hotel "See availability", close popup              | TC-SMOKE-002, TC-REG-005, TC-EDGE-002/003 | [Smoke](./Smoke-Test-Suite.md)            |
| Invalid/absent inputs handled                                   | TC-NEG-001/002/003                        | [Negative](./Negative-Test-Suite.md)      |
| Boundaries (30 adults, dynamic index, viewports)                | TC-EDGE-001…005                           | [Edge](./Edge-Cases-Test-Suite.md)        |
| Transport & input safety                                        | TC-SEC-001…004                            | [Security](./Security-Test-Suite.md)      |
| API `productsList` → Polo names in terminal                     | TC-API-001                                | [API](./API-Test-Suite.md)                |
| API `searchProduct` → Tshirts in response                       | TC-API-002                                | [API](./API-Test-Suite.md)                |
| API negatives (missing param, wrong method, XSS/SQLi)           | TC-API-NEG-001/002, TC-API-SEC-001        | [API](./API-Test-Suite.md)                |
| _(Engineering addition)_ response contract                      | TC-API-CONTRACT-001/002                   | [API](./API-Test-Suite.md)                |
| _(Engineering addition)_ latency SLO                            | TC-API-SLO-001                            | [API](./API-Test-Suite.md)                |
| Perf 5 scenarios (2+ required)                                  | k6 smoke/load/stress/spike/soak           | [Performance](./Performance-Test-Plan.md) |
| _(Engineering addition)_ live metrics                           | Grafana stack, 14-panel dashboard         | [Performance](./Performance-Test-Plan.md) |

### 5.2 Scenario → Risk

| Scenario   | Risk(s) Mapped     |
| ---------- | ------------------ |
| S1.1       | R01, R06, R10      |
| S1.2       | R01, R02, R03, R06 |
| S2.1–S2.5  | R02, R03, R07, R10 |
| S3.1–S3.3  | R02, R07, R10      |
| S4.1       | R02                |
| S4.2       | R03                |
| S4.3       | R06                |
| S4.4, S4.5 | R02, R06           |
| S5.1–S5.3  | R01, R02           |
| S5.4       | R07, R10           |
| S6.1, S6.2 | R04, R05, R07      |
| S6.3–S6.5  | R05, R07           |
| S6.6, S6.7 | R05                |
| S6.8       | R04, R12           |
| S7.1–S7.5  | R04, R09           |

---

## 6. Entry / Exit Criteria

**Entry**

1. `npm ci` (lockfile committed) and `npx playwright install chromium` for the UI suites.
2. `.env` created from `.env.example` — `BOOKING_BASE_URL`, `API_BASE_URL` at minimum.
3. Network reachability to `booking.com` and `automationexercise.com` (public targets).
4. Optional: LLM keys for AI healing (`SELF_HEALING_ENABLED=true`); heuristic healing is keyless.
5. Performance only: Docker Desktop running (`npm run perf:stack`).

**Exit**

1. `npm run typecheck`, `npm run lint:check`, `npm run format:check` all exit 0.
2. API suite green (`npm run test:api` → 8/8), contract violations `[]`, both endpoints inside the SLO.
3. UI suites executed and triaged — any Booking bot-wall block documented with evidence
   (Allure attachment + log) rather than silently retried.
4. k6 smoke green (`p95 < 1500ms`, `err < 1%`); load/stress/spike/soak recorded in the perf plan.
5. Allure report generated (`npm run allure:report`) with history trend; CI artifacts upload on failure.

---

## 7. Environments & Configuration

| Variable                   | Default                          | Purpose                                                  |
| -------------------------- | -------------------------------- | -------------------------------------------------------- |
| `BOOKING_BASE_URL`         | `https://www.booking.com`        | UI origin                                                |
| `API_BASE_URL`             | `https://automationexercise.com` | API origin                                               |
| `HEADLESS`                 | `true`                           | `false` for headed local runs vs the bot wall            |
| `DEFAULT_CURRENCY`         | `TRY`                            | Task 1 currency                                          |
| `DEFAULT_DESTINATION`      | `London`                         | Task 1 destination                                       |
| `DEFAULT_ADULTS`           | `8`                              | Task 1 occupancy                                         |
| `TRAVELLING_WITH_PETS`     | `true`                           | Task 1 pets flag                                         |
| `TARGET_HOTEL_INDEX`       | `3`                              | Which result card to open                                |
| `API_LATENCY_BUDGET_MS`    | `1500`                           | SLO for one API call (mirrors k6 `p95 < 1500`)           |
| `SELF_HEALING_ENABLED`     | `false`                          | Master switch for selector healing                       |
| `HEALING_MODE`             | `runtime`                        | `runtime` heals during the test, `post-mortem` only logs |
| `LOG_LEVEL` / `LOG_PRETTY` | `info` / `true`                  | winston console level / colors                           |

**Playwright projects:** `chromium`, `firefox`, `webkit` (UI only) + `api` (browser-agnostic).
Reporters: Allure + HTML + line; `test-results/` uploads as a CI artifact on failure.

---

## 8. Assumptions & Limitations

- Booking.com is a live production site: markup, A/B variants and bot protection change without
  notice; UI results are **evidence of behaviour on the run date**, not a vendor SLA.
- AutomationExercise is a public demo: product counts (34 / 6) and prices drift; assertions are
  deliberately structural (counts `> 0`, brand/category membership, contract shape).
- Only Chromium binaries are installed locally in this workspace — firefox/webkit UI runs happen
  in CI where browsers are installed by the pipeline.
- The "3rd hotel" is positional by design (Task requirement); dynamic ordering is mitigated by
  index-parameterised helpers, not by asserting a specific property name.
- AI self-healing is optional and off by default; the suite must stay green without LLM keys.
- Performance thresholds are **observational** budgets derived from live trials on a public host —
  they are not contractual service levels, and 3 repeats are recommended before quoting a median.
- Payment, login and account flows are out of scope by task definition.
- Documentation describes the framework as of 2026-10-17; re-verify live counts after any
  upstream change.
