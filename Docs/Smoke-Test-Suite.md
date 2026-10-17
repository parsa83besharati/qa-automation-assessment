# Smoke Test Suite

## QA Automation Assessment — Mohaymen

**Automation:** `tests/ui/smoke.spec.ts` · **Tags:** `@smoke` `@ui`  
**Command:** `npm run test:smoke` (also inside `npm run test:ci`)  
**Targets:** Booking.com (Task 1) + AutomationExercise API (Task 2)  
**Purpose:** Prove the critical path is alive — shallow but broad, a rapid go/no-go before deeper testing.  
**Author:** Parsa Besharati  
**Date:** 2026-10-17  
**Version:** 2.0

---

## What is a Smoke Test?

Smoke tests are the smallest subset of tests that verifies the application is fundamentally
functional after a change. If any smoke test fails, the build is rejected immediately and deeper
testing is halted until the issue is fixed.

**Selection criteria used here:**

1. **Core user journey** — the exact Task 1 flow the assessor will run.
2. **High business impact** — the search funnel is the product's front door.
3. **Frequently used functionality** — homepage, search widget, results list.
4. **No complex setup** — anonymous session, no accounts, no seeded data.
5. **Fast feedback** — the suite completes in well under a minute per browser.

The 2 UI smoke cases are deliberately few: `TC-SMOKE-002` is the end-to-end proof, everything
else is split into the regression suite so a red run points at one widget.

---

## Smoke Test Cases

| ID           | Test Case Description                        | Technique             | Priority | Key Precondition              |
| ------------ | -------------------------------------------- | --------------------- | -------- | ----------------------------- |
| TC-SMOKE-001 | Homepage loads with search widget            | Use Case              | P0       | None                          |
| TC-SMOKE-002 | Task happy path opens 3rd hotel availability | Use Case (happy path) | P0       | None                          |
| TC-API-001   | `productsList` contains Polo brand products  | Use Case + EP         | P0       | Network to AutomationExercise |
| TC-API-002   | `searchProduct` finds Tshirts category       | Use Case + EP         | P0       | Network to AutomationExercise |

_(The API cases live in `tests/api/products.spec.ts` and run in the `api` project; they are
listed here because they are part of the go/no-go gate — see [API-Test-Suite.md](./API-Test-Suite.md)
for their full design.)_

---

### TC-SMOKE-001 — Homepage Loads with Search Widget

**Scenario Reference:** S1.1 ([Test Design Document](./Test-Design-Document.md#s1--critical-path-smoke))  
**Priority:** P0 · **Severity (Allure):** critical  
**Technique:** Use Case Testing  
**Precondition:** None — fresh browser context

**Test Steps:**

1. `homePage.open()` navigates to `https://www.booking.com/`.
2. The helper dismisses the cookie banner and any transient sign-in/promo overlay.
3. Assert the destination input is visible.
4. Assert the Search button is visible.
5. Assert the currency picker button is visible.

**Expected Results:**

- URL is `https://www.booking.com/` (HTTPS — reinforced by `TC-SEC-001`).
- All three widgets resolve **visible** within Playwright's actionability timeout (15s);
  no overlay intercepts them.
- No unhandled dialog interrupts the run.

**Automation Notes:**

- Selectors come from `pages/locators/home.locators.ts` (`destinationInput`, `searchButton`,
  `currencyButton`) — `.first()` tolerates duplicated responsive markup.
- `homePage.open()` owns cookie/popup dismissal so no spec repeats that logic.

---

### TC-SMOKE-002 — Task 1 Happy Path Opens the 3rd Hotel

**Scenario Reference:** S1.2  
**Priority:** P0 · **Severity (Allure):** critical  
**Technique:** Use Case Testing (Happy Path)  
**Precondition:** None — data from `BookingTemplates.taskHappyPath()`

**Test Steps:**

1. Load `BookingTemplates.taskHappyPath()` → TRY / London / 8 adults / pets ON / hotel index 3 / current month.
2. `homePage.searchFlow(query)` executes, in order:
   1. `selectCurrency('TRY')`
   2. `fillDestination('London')` → click the **first** suggestion
   3. `selectFlexibleDatesCurrentMonth(currentMonth)` → "I'm flexible" → "A month" → month card → "Select dates"
   4. `setAdults(8)` (stepper loop) and `setTravellingWithPets(true)`
   5. `submitSearch()` → URL contains `searchresults`
3. `resultsPage.waitForResults()` waits for the list, then `countHotels()` must be ≥ 3.
4. `resultsPage.openHotelByIndex(3)` → returned page URL matches `/booking\.com\/hotel\//`.

**Expected Results:**

- Every widget step completes without a timeout; the results page renders **≥ 3** hotel cards.
- The 3rd card's "See availability" opens a Booking hotel page (same tab or new tab — the helper
  resolves whichever page carries the navigation).
- Any popup appearing mid-flow is dismissed and never blocks the click.

**Automation Notes:**

- One requirement → one `test.step`, so Allure shows exactly which widget broke.
- The hotel index is a **parameter** (`TARGET_HOTEL_INDEX`), not a hard-coded selector —
  `TC-EDGE-002` proves index 2 works with the same code.
- Assertions use URL patterns (`/booking\.com\/hotel\//`), never property names or prices.

---

## Execution Order & Dependencies

1. `TC-SMOKE-001` first — it proves the site is reachable before the long flow runs.
2. `TC-SMOKE-002` is self-contained (fresh context per test) — safe to run in parallel with 001
   across browser projects.
3. API smoke cases (`TC-API-001/002`) are independent of the UI and of each other; they run once
   in the `api` project.
4. Tests are isolated: `test.afterEach` clears the `DataRegistry`, and each test opens its own
   page — no shared state, no ordering requirement beyond readability.

---

## Success Criteria

- All 4 smoke cases pass → build proceeds to regression/API/performance.
- Any failure → build rejected; triage from the Allure/HTML report before anything deeper runs.
- Target wall-clock: **< 1 minute** for the 2 UI cases per browser, **< 5 s** for the API pair.
- These are the cases selected by `npm run test:ci` (tag `@smoke` or `@api`) — the PR gate.

---

## Automation Implementation

| Item           | Detail                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Framework      | Playwright + TypeScript, Page Object Model over `pages/BasePage.ts`                                     |
| Spec           | `tests/ui/smoke.spec.ts` (UI) · `tests/api/products.spec.ts` (API smoke)                                |
| Fixtures       | `homePage`, `resultsPage`, `apiClient`, `setViewport`, `clearSession` (`fixtures/fixtures.ts`)          |
| Data           | `BookingTemplates.taskHappyPath()`, `ApiTemplates.poloBrand()/tshirtsCategory()` — no literals in specs |
| Locators       | `pages/locators/home.locators.ts`, `pages/locators/results.locators.ts`                                 |
| Healing        | Optional `SELF_HEALING_ENABLED` selector recovery in `BasePage` actions                                 |
| Reporting      | Allure epic/feature/story/severity per test; per-test winston logs in `logs/`                           |
| Browser matrix | chromium / firefox / webkit (UI only — `api/**` is ignored by browser projects)                         |
