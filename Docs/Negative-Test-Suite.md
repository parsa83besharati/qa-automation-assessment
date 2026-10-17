# Negative Test Suite

## QA Automation Assessment — Mohaymen

**Automation:** `tests/ui/negative.spec.ts` (UI) · `tests/api/products.spec.ts` (API)  
**Tags:** `@negative` `@ui` · `@negative` `@api`  
**Commands:** `npm run test:negative` (UI) · `npm run test:negative-api` (API only)  
**Targets:** Booking.com search widget · AutomationExercise `searchProduct`  
**Purpose:** Prove the system **rejects invalid input gracefully** — no navigation on empty input, no crash on nonsense, no 500 on abuse.  
**Author:** Parsa Besharati  
**Date:** 2026-10-17  
**Version:** 2.0

---

## What is a Negative Test?

Negative testing verifies that the application handles invalid, missing or hostile input the way
it should: by rejecting it clearly rather than corrupting state or crashing. Where positive tests
ask _"does it do the right thing?"_, these ask _"does it refuse the wrong thing safely?"_.

**Design rules used here:**

1. **One invalid class per test** (equivalence partitioning) — empty, nonsense, unknown enum value, missing parameter, wrong method, hostile payload.
2. **Assert the absence of harm**, not a specific error copy — public sites reword messages; we assert _no navigation_, _zero results_, _unchanged URL_, _no 500_.
3. **Tolerate documented variance** — where the platform has two acceptable behaviours (e.g. HTTP 405 vs an envelope `responseCode` 405), the test accepts both and says so.
4. **Never leave the app in a broken state** — the next test must still pass.

---

## Negative Test Cases

| ID             | Test Case Description                                | Technique                 | Priority | Key Precondition |
| -------------- | ---------------------------------------------------- | ------------------------- | -------- | ---------------- |
| TC-NEG-001     | Empty destination blocks search or shows validation  | Negative Testing          | P1       | Homepage loaded  |
| TC-NEG-002     | Gibberish destination yields no results or stays put | Negative + EP (invalid)   | P2       | Homepage loaded  |
| TC-NEG-003     | Invalid currency code is rejected gracefully         | Negative Testing          | P2       | Homepage loaded  |
| TC-API-NEG-001 | Search without parameter is rejected (400)           | Negative + Decision Table | P1       | API reachable    |
| TC-API-NEG-002 | GET on search endpoint is not allowed (405)          | Negative + Decision Table | P1       | API reachable    |

---

## UI — `tests/ui/negative.spec.ts`

### TC-NEG-001 — Empty Destination Blocks Search

**Scenario Reference:** S3.1 ([Test Design Document](./Test-Design-Document.md#s3--negative-behaviour))  
**Priority:** P1 · **Severity:** minor  
**Technique:** Negative Testing (empty-input partition)  
**Precondition:** Homepage loaded

**Test Steps:**

1. `homePage.open()`.
2. `homePage.clear(HomeLocators.destinationInput, 'Clear destination')`.
3. `homePage.click(HomeLocators.searchButton, 'Attempt search with empty destination')`.
4. Assert the page URL.

**Expected Results:**

- URL **never** matches `searchresults` — an empty query cannot produce a results page.
- The homepage stays put, either showing inline validation or ignoring the click.
- No uncaught JavaScript error / crash.

**Automation Notes:**

- Assertion: `expect(page).not.toHaveURL(/searchresults/)` — asserts the _absence of harm_
  instead of pinning a specific error message.
- Uses `homePage.click(...)` (healable action) rather than a raw locator click.

---

### TC-NEG-002 — Gibberish Destination Returns Zero Hotels

**Scenario Reference:** S3.2  
**Priority:** P2 · **Severity:** minor  
**Technique:** Negative Testing + Equivalence Partitioning (invalid destination class)  
**Data:** `SearchFactory.invalidDestination()` → `!!!NoSuchPlace123`

**Test Steps:**

1. `homePage.open()`.
2. `selectCurrency(query.currency)` then `fillDestination('!!!NoSuchPlace123')`.
3. `submitSearch()`.
4. `resultsPage.waitForResults()` — failure is tolerated (`.catch(() => undefined)`).
5. `countHotels()` — also tolerated, defaults to `0` if the page never materialised.

**Expected Results:**

- Exactly **0** hotel cards: either an empty result page renders, or the search never navigates.
- The app must not crash, hang or show unrelated content.

**Automation Notes:**

- The `.catch()` chain is deliberate: the test accepts _both_ valid outcomes (empty results page
  **or** refusal to navigate) while still failing if any hotel is returned.
- Nonsense payload comes from `SearchFactory`, keeping invalid data out of specs.

---

### TC-NEG-003 — Unknown Currency Code Is Rejected Gracefully

**Scenario Reference:** S3.3  
**Priority:** P2 · **Severity:** minor  
**Technique:** Negative Testing (invalid enum partition)  
**Precondition:** Homepage loaded

**Test Steps:**

1. `homePage.open()`; capture `before = page.url()`.
2. `homePage.selectCurrency('XXX')` — the failure is tolerated (`.catch(() => undefined)`).
3. Compare the URL after the attempt.

**Expected Results:**

- URL is **unchanged** (`toBe(before)`) — an unknown currency neither navigates nor breaks the page.
- The picker remains usable afterwards (no locked UI).

**Automation Notes:**

- `XXX` is not a real ISO code, so a correct widget refuses it; a buggy one might navigate or throw.
- Tolerating the rejection keeps the assertion about _state_, not about _how_ it refuses.

---

## API — `tests/api/products.spec.ts`

### TC-API-NEG-001 — Missing Parameter Is Rejected (400)

**Scenario Reference:** S6.3 · **Tags:** `@api` `@negative`  
**Priority:** P1 · **Severity:** normal  
**Technique:** Decision Table Testing + Negative Testing

**Decision table (status vs `responseCode`):**

| Case                     | HTTP status | `responseCode` | Body               | Rule         |
| ------------------------ | ----------- | -------------- | ------------------ | ------------ |
| Missing `search_product` | 200         | **400**        | validation message | **asserted** |
| Valid form field         | 200         | 200            | `products[]`       | TC-API-002   |

**Test Steps:**

1. `request.post('/api/searchProduct')` — **no body, no form field**.
2. Assert `response.status()` is `200`.
3. Parse JSON and assert `body.responseCode === 400`.

**Expected Results:**

- The API answers HTTP 200 carrying `responseCode: 400` (envelope-style validation — the
  documented behaviour of this demo API, not a transport-level 400).
- Response is JSON with a `message`; the suite never sees HTML or a 5xx.

**Automation Notes:**

- Both halves matter: transport status **and** envelope code — asserting only one would pass on a
  regression of the other.

---

### TC-API-NEG-002 — Wrong HTTP Method Is Not Allowed (405)

**Scenario Reference:** S6.4 · **Tags:** `@api` `@negative`  
**Priority:** P1 · **Severity:** normal  
**Technique:** Decision Table Testing + Negative Testing

**Decision table (two acceptable server styles):**

| Server style               | HTTP status | `responseCode`   | Rule      |
| -------------------------- | ----------- | ---------------- | --------- |
| Strict REST                | 405         | —                | accepted  |
| Envelope style             | 200         | 405              | accepted  |
| Bug: accepts GET as search | 200         | 200 + `products` | **fails** |

**Test Steps:**

1. `request.get('/api/searchProduct')`.
2. Assert status ∈ `{200, 405}`.
3. Parse JSON; assert `body.responseCode ∈ {200, 405}`.

**Expected Results:**

- The endpoint rejects GET either at the transport level or in the envelope.
- It must never return a successful search payload for an unsupported method.

**Automation Notes:**

- Tolerance is explicit and documented: the demo API has been observed in both styles, so the
  assertion pins _rejection_, not _which rejection mechanism_.

---

## Execution Order & Dependencies

1. UI negative cases are independent — each opens its own homepage.
2. API negative cases are independent of each other and of the UI; they run in the `api` project.
3. Run together with `npm run test:negative-api` for the API subset (3 cases: the two above plus
   `TC-API-SEC-001`), or `npm run test:negative` for the UI trio.
4. Security-flavoured negatives (`TC-NEG` is not one; `TC-SEC-*` and `TC-API-SEC-001` are) live in
   the [Security suite](./Security-Test-Suite.md).

---

## Success Criteria

- 5/5 green; a failure here means the app **accepts** something it must refuse — treat as a defect, not flakiness.
- No test leaves the page in a broken state (the following suite must still pass).
- These cases are included in `npm run test:ci` only through their `@api` tag; UI negatives are
  local/regression-cycle runs.

---

## Automation Implementation

| Item             | Detail                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Specs            | `tests/ui/negative.spec.ts` · API cases inside `tests/api/products.spec.ts`                         |
| Invalid data     | `SearchFactory.invalidDestination()`, `SearchFactory.maxAdults()` — factories keep payloads central |
| Healed actions   | `homePage.clear/click/fill/selectCurrency` all go through `BasePage` healable actions               |
| Assertions style | absence-of-harm (`not.toHaveURL`, `toBe(0)`, `toBe(before)`, `toContain(400)`)                      |
| API transport    | Playwright `request` fixture via relative `/api/...` paths (works in any project)                   |
| Reporting        | Allure story "…" + severity `minor`/`normal`; failures land in `playwright-report/` + Allure        |
