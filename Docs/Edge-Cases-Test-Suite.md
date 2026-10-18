# Edge Cases Test Suite

## QA Automation Assessment — Mohaymen

**Automation:** `tests/ui/edge.spec.ts` · **Tags:** `@edge` `@ui`  
**Command:** `npm run test:edge` (excluded from `npm run test:fast`)  
**Target:** Booking.com search widget and results (Task 1)  
**Purpose:** Exercise **boundaries and resilience** — the values and conditions at the edges of allowed input where defects cluster.  
**Author:** Parsa Besharati  
**Date:** 2026-10-18  
**Version:** 2.0

---

## What is an Edge Case Suite?

Boundary and edge testing targets the limits of the input domain and the environmental extremes
around a feature. Defect statistics consistently show errors at boundaries (0, max, first, last)
rather than in the middle of a range, so this suite concentrates there.

**Design rules used here:**

1. **Boundaries first** — 1 → 8 (task) → **30 (max tested)** adults; hotel index 1-based (**2 and 3 tested**).
2. **Parameterised, not duplicated** — the same helpers run with different boundary data.
3. **Resilience over perfection** — transient popups and responsive re-layout must not _break_
   the flow; the assertion is "still usable / still returns", not "pixel-identical".
4. **Never destructive** — boundaries are pushed only as far as the widget allows (no forced DOM
   mutation), so the suite stays legitimate black-box testing.

---

## Edge Case Test Cases

| ID          | Test Case Description                           | Technique                     | Priority | Key Precondition |
| ----------- | ----------------------------------------------- | ----------------------------- | -------- | ---------------- |
| TC-EDGE-001 | Maximum adults (30) stays submittable           | Boundary Value Analysis       | P2       | Homepage loaded  |
| TC-EDGE-002 | Second hotel can be opened (index is dynamic)   | Boundary Value Analysis       | P2       | Full search flow |
| TC-EDGE-003 | Transient popup does not break the flow         | Error Guessing / Resilience   | P3       | Homepage loaded  |
| TC-EDGE-004 | Tablet viewport (1024×768) keeps search usable  | State Transition (viewport)   | P3       | Viewport fixture |
| TC-EDGE-005 | Mobile viewport (390×844) keeps search usable   | State Transition (viewport)   | P3       | Viewport fixture |
| TC-EDGE-006 | Single adult with pets off is a valid occupancy | Boundary Value Analysis       | P3       | Homepage loaded  |
| TC-EDGE-007 | Browser back from results restores the widget   | State Transition (navigation) | P3       | Full search flow |

---

### TC-EDGE-001 — Maximum Adults Stays Submittable

**Scenario Reference:** S4.1 ([Test Design Document](./Test-Design-Document.md#s4--boundary-values--resilience-edge))  
**Priority:** P2 · **Severity:** minor  
**Technique:** Boundary Value Analysis  
**Data:** `SearchFactory.maxAdults()` → **30** (widget upper bound)

**Boundary map:**

| Value  | Class                        | Covered by                          |
| ------ | ---------------------------- | ----------------------------------- |
| 0      | invalid (rejected by widget) | negative design                     |
| 1      | minimum valid                | —                                   |
| 8      | task value                   | TC-REG-004                          |
| **30** | **maximum valid**            | **TC-EDGE-001**                     |
| 31+    | must clamp, not crash        | behaviour of the stepper under test |

**Test Steps:**

1. `homePage.open()`.
2. `homePage.setAdults(30)` — stepper increments to the upper bound.
3. Assert `button[type="submit"]` is visible.

**Expected Results:**

- The stepper reaches 30 and stops (it neither climbs past the cap nor throws).
- The Search/submit control remains visible — the form is still submittable at the boundary.
- No layout collapse from the two-digit value.

**Automation Notes:**

- Assertion uses a structural selector (`button[type="submit"]`) rather than a class, so a
  reskin does not break it.
- If Booking ever raises the cap, the test still passes (it asserts _submittable at the value the
  factory produced_, not a magic number).

---

### TC-EDGE-002 — Second Hotel Can Be Opened (Index Is Dynamic)

**Scenario Reference:** S4.2  
**Priority:** P2 · **Severity:** minor  
**Technique:** Boundary Value Analysis (first/last/any index) + Use Case Testing  
**Precondition:** Full search flow with `targetHotelIndex: 2`

**Test Steps:**

1. `homePage.searchFlow({ ...BookingTemplates.taskHappyPath(), targetHotelIndex: 2 })`.
2. `resultsPage.waitForResults()`.
3. `const hotelPage = await resultsPage.openHotelByIndex(2)`.
4. Assert the URL matches `/booking\.com/`.

**Expected Results:**

- The **2nd** result card's "See availability" opens a hotel page.
- Proves the index is a parameter (Task 1 requires the 3rd; nothing is hard-coded to it).

**Automation Notes:**

- Same helper as `TC-SMOKE-002` with different data — a genuine boundary check, not a duplicate test.
- Looser URL pattern than the smoke test (`/booking\.com/`) because this proves _navigation_, not
  _hotel detail routing_.

---

### TC-EDGE-003 — Transient Popup Does Not Break the Flow

**Scenario Reference:** S4.3  
**Priority:** P3 · **Severity:** minor  
**Technique:** Error Guessing, Resilience Testing  
**Precondition:** Homepage loaded

**Test Steps:**

1. `homePage.open()`.
2. `const dismissed = await homePage.dismissPopupIfPresent()`.
3. Assert `typeof dismissed === 'boolean'`.

**Expected Results:**

- The helper resolves (`true` = overlay dismissed, `false` = nothing present).
- It never throws and never leaves navigation half-finished — this is the regression guard for
  risk **R06** (overlays intercepting clicks).

**Automation Notes:**

- The weak-looking `typeof` assertion is intentional: the contract of the helper is "always
  resolve with a boolean", and any throw fails the test.
- Popups are time-dependent, so asserting a specific overlay would be flaky; asserting the
  helper's contract is stable.

---

### TC-EDGE-004 — Tablet Viewport (1024×768) Keeps Search Usable

**Scenario Reference:** S4.4  
**Priority:** P3 · **Severity:** minor  
**Technique:** State Transition Testing (desktop → tablet)  
**Precondition:** Viewport fixture

**Test Steps:**

1. `await setViewport('tablet')` → 1024×768 (`fixtures/viewport.ts`).
2. `homePage.open()`.
3. Assert `button[type="submit"]` visible.

**Expected Results:**

- Responsive re-layout keeps the search submit control visible and reachable.
- No horizontal collapse hides the widget; the page is usable at tablet width.

**Automation Notes:**

- `setViewport` is a fixture — specs never touch `page.setViewportSize` directly.
- Runs within the browser projects; mobile behaviour is `TC-EDGE-005`.

---

### TC-EDGE-005 — Mobile Viewport (390×844) Keeps Search Usable

**Scenario Reference:** S4.5  
**Priority:** P3 · **Severity:** minor  
**Technique:** State Transition Testing (desktop → mobile) · Exploratory  
**Precondition:** Viewport fixture

**Test Steps:**

1. `await setViewport('mobile')` → 390×844.
2. `homePage.open()`.
3. Assert the search submit button (`HomeLocators.searchButton`) is visible.

**Expected Results:**

- The mobile layout renders a usable search control (no overlay/hamburger swallowing it).
- Same assertion as tablet → the two tests differ only in the environment, keeping failures
  attributable to the breakpoint.

**Automation Notes:**

- 390×844 (iPhone-class) and 1024×768 (tablet-class) are the two presets in `fixtures/viewport.ts`.

---

### TC-EDGE-006 — Single Adult With Pets Off Is a Valid Occupancy

**Scenario Reference:** S4.6  
**Priority:** P3 · **Severity:** minor  
**Technique:** Boundary Value Analysis (lower bound)  
**Precondition:** Homepage loaded

**Test Steps:**

1. Take `BookingTemplates.smoke()` (1 adult, no pets).
2. `homePage.open()` → `setAdults(1)`.
3. Assert `occupancy.adultsValue()` reports 1.
4. `setTravellingWithPets(false)` → assert the pets checkbox is **off**.
5. Assert Search stays enabled; close the panel with `occupancy.done()`.

**Expected Results:**

- The lower occupancy boundary behaves exactly like the upper one (TC-EDGE-001) — the panel
  accepts it, reports it back, and never blocks submission.

**Automation Notes:**

- The opposite boundary of TC-EDGE-001 — together they pin both ends of Booking's 1–30 range.

---

### TC-EDGE-007 — Browser Back From Results Restores the Search Widget

**Scenario Reference:** S4.7  
**Priority:** P3 · **Severity:** minor  
**Technique:** State Transition Testing (navigation)  
**Precondition:** Homepage loaded

**Test Steps:**

1. Run the full `searchFlow(BookingTemplates.taskHappyPath())`.
2. `resultsPage.waitForResults()`.
3. `page.goBack()`.
4. Assert the destination input is visible again.

**Expected Results:**

- Back-navigation returns to a usable homepage (bfcache or re-render) — the flow is
  recoverable and the widget is not stuck in a post-results state.

**Automation Notes:**

- Guards against results-page state leaking into the homepage via the back-forward cache.

---

## Execution Order & Dependencies

1. All seven cases are independent (fresh context, own `open()`).
2. `TC-EDGE-002` is the only one performing a full search flow — run it last locally.
3. Excluded from `npm run test:fast` by tag (`--grep-invert "@regression|@edge"`); included in the
   full `npm test` and the cross-browser CI runs.

---

## Success Criteria

- 5/5 green across browsers before a UI change merges.
- A failure here usually means a **boundary bug** (clamped value, index assumption) or a
  **resilience bug** (popup/viewport regression) — both are release blockers for Task 1 delivery.
- Wall-clock target: **< 3 minutes** per browser project.

---

## Automation Implementation

| Item          | Detail                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Spec          | `tests/ui/edge.spec.ts` (`test.describe` tagged `@edge`, `@ui`)                                    |
| Boundary data | `SearchFactory.maxAdults()`, `BookingTemplates.taskHappyPath()` with overridden `targetHotelIndex` |
| Viewports     | `fixtures/viewport.ts` presets `desktop` / `tablet` / `mobile` exposed via `setViewport` fixture   |
| Resilience    | `BasePage.dismissPopupIfPresent()` — boolean contract guarded by TC-EDGE-003                       |
| Allure        | feature "Edge cases suite", story + severity `minor` per case                                      |
| Reporting     | included in Allure history trend; failures keep screenshot/video in `test-results/`                |
