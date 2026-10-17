# Regression Test Suite

## QA Automation Assessment — Mohaymen

**Automation:** `tests/ui/regression.spec.ts` · **Tags:** `@regression` `@ui`  
**Command:** `npm run test:regression` (excluded from the fast loop by `npm run test:fast`)  
**Target:** Booking.com search widget (Task 1)  
**Purpose:** Deep, **one-requirement-per-case** coverage of the search building blocks so a failure names the broken control instead of "the flow failed".  
**Author:** Parsa Besharati  
**Date:** 2026-10-17  
**Version:** 2.0

---

## What is a Regression Suite?

A regression suite re-verifies previously working behaviour after every change. Where smoke asks
"does it work at all?", regression asks "does **everything** still work?". Design rules applied
here:

1. **One requirement per case** — currency, destination, calendar, occupancy and results are five
   separate tests, not one long script.
2. **Independent setup** — every test performs its own `homePage.open()`; no test depends on
   another's side effects.
3. **Stable assertions** — text/URL/visibility assertions on stable locators, never on prices,
   ratings or property names that drift.
4. **Shared data, no literals** — values come from `BookingTemplates` so a task change is a
   one-line edit.

The 5 cases below decompose `TC-SMOKE-002` into its building blocks (task traceability: each maps
to one sentence of Task 1).

---

## Regression Test Cases

| ID         | Test Case Description                        | Technique                | Priority | Key Precondition |
| ---------- | -------------------------------------------- | ------------------------ | -------- | ---------------- |
| TC-REG-001 | Currency can be switched to TRY              | Equivalence Partitioning | P1       | Homepage loaded  |
| TC-REG-002 | Destination London shows suggestions         | Equivalence Partitioning | P1       | Homepage loaded  |
| TC-REG-003 | Flexible current-month dates can be selected | State Transition         | P1       | Homepage loaded  |
| TC-REG-004 | Occupancy supports 8 adults plus pets        | Use Case + EP            | P1       | Homepage loaded  |
| TC-REG-005 | Results render hotel cards with availability | Use Case                 | P1       | Full search flow |

---

### TC-REG-001 — Currency Can Be Switched to TRY

**Scenario Reference:** S2.1 ([Test Design Document](./Test-Design-Document.md#s2--search-building-blocks-regression))  
**Priority:** P1 · **Severity:** normal  
**Technique:** Equivalence Partitioning (valid partition: `TRY`)  
**Precondition:** Homepage loaded

**Test Steps:**

1. `homePage.open()`.
2. `homePage.selectCurrency(query.currency)` with `TRY` from `BookingTemplates.taskHappyPath()`.
3. Assert the header currency button contains `TRY`.

**Expected Results:**

- The picker opens, `TRY` is selectable, and the header button text updates to `TRY`.
- Page does not navigate or reload (URL unchanged).

**Automation Notes:**

- Assertion: `expect(locator(HomeLocators.currencyButton).first()).toContainText('TRY')` —
  `toContainText` because the button may render "TRY - Turkish Lira" variants.
- The invalid partition (`XXX`) is covered by `TC-NEG-003`.

---

### TC-REG-002 — Destination "London" Shows Suggestions

**Scenario Reference:** S2.2  
**Priority:** P1 · **Severity:** normal  
**Technique:** Equivalence Partitioning (valid: real city; invalid → negative suite)  
**Precondition:** Homepage loaded

**Test Steps:**

1. `homePage.open()`.
2. `homePage.fillDestination('London')`.
3. Wait for the suggestion dropdown.

**Expected Results:**

- The suggestion list becomes visible (autocomplete responded).
- Typing alone must not navigate away from the homepage.
- The first option is clickable (the happy path clicks index 0).

**Automation Notes:**

- Assertion: `expect(locator(HomeLocators.suggestionList).first()).toBeVisible()`.
- Debounce is handled by Playwright's auto-waiting — no `waitForTimeout`.

---

### TC-REG-003 — Flexible Current-Month Dates Can Be Selected

**Scenario Reference:** S2.3  
**Priority:** P1 · **Severity:** normal  
**Technique:** State Transition Testing (calendar state chain)  
**Precondition:** `env.currentMonth.label` computed from the system clock

**Test Steps:**

1. `homePage.open()`.
2. `homePage.selectFlexibleDatesCurrentMonth(env.currentMonth.label)`:
   open calendar → **"I'm flexible"** → **"A month"** → current month card → **"Select dates"**.
3. Assert the occupancy trigger is visible.

**Expected Results:**

- Each state transition succeeds: _date mode → flexibility → granularity → month → applied_.
- Calendar closes after "Select dates"; the occupancy trigger appears, proving the date step
  completed and the flow can continue.

**Automation Notes:**

- The month label is **dynamic** (`config/env.ts`) — the test does not break when the calendar
  rolls over, which is why a hard-coded month string is forbidden.
- State chain failure surfaces at the exact step inside the Allure report.

---

### TC-REG-004 — Occupancy Supports 8 Adults Plus Pets

**Scenario Reference:** S2.4  
**Priority:** P1 · **Severity:** normal  
**Technique:** Use Case Testing + Equivalence Partitioning (task value 8 ∈ [1, 30])  
**Precondition:** Homepage loaded

**Test Steps:**

1. `homePage.open()`.
2. `homePage.setAdults(8)` — stepper loop increments to the target.
3. `homePage.setTravellingWithPets(true)`.
4. Assert the Search button is enabled.

**Expected Results:**

- Adult count reaches 8 (the stepper does not stop early or overshoot).
- The pets checkbox toggles ON.
- Search remains `enabled` — the widget never locks into an invalid state.

**Automation Notes:**

- Assertion: `expect(searchButton).toBeEnabled()` — the cheapest signal that the whole widget
  is still submittable.
- Boundary siblings: min/max tested by `TC-EDGE-001` (30) and the negative suite (empty input).

---

### TC-REG-005 — Results Render Hotel Cards with Availability

**Scenario Reference:** S2.5  
**Priority:** P1 · **Severity:** normal  
**Technique:** Use Case Testing  
**Precondition:** Full `searchFlow` completed (Task 1 query)

**Test Steps:**

1. `homePage.searchFlow(BookingTemplates.taskHappyPath())`.
2. `resultsPage.waitForResults()`.
3. `countHotels()` must be `> 0`.
4. Assert the first "See availability" button is visible.

**Expected Results:**

- At least one card renders; the first card exposes a visible availability CTA.
- No assertion on property names/prices (public demo data drifts — risk R07).

**Automation Notes:**

- `waitForResults()` is an explicit condition-based wait (never a fixed sleep) — risk R10.
- Assertion: `expect(count).toBeGreaterThan(0)` + `expect(seeAvailability.first()).toBeVisible()`.

---

## Execution Order & Dependencies

1. The five cases are **order-independent** — each opens the homepage itself.
2. `TC-REG-005` is the longest (full flow); run it last for a readable local loop.
3. UI cases repeat across chromium/firefox/webkit projects; API cases are unaffected
   (`api/**` is ignored by browser projects).

---

## Success Criteria

- 5/5 green on at least one browser before a UI change is merged; cross-browser green is the CI goal.
- Any failure must map back to exactly one Task 1 sentence (that mapping is the point of the split).
- Wall-clock target: **< 3 minutes** per browser project.

---

## Automation Implementation

| Item        | Detail                                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Spec        | `tests/ui/regression.spec.ts` (`test.describe` tagged `@regression`, `@ui`)                                                |
| Allure      | epic "Task 1 — Booking.com UI automation", feature "Regression suite", story + severity per case                           |
| Data        | `BookingTemplates.taskHappyPath()`; month from `env.currentMonth.label`                                                    |
| Locators    | `HomeLocators` (currency/destination/suggestions/calendar/occupancy/search) · `ResultsLocators` (cards, `seeAvailability`) |
| Isolation   | `test.afterEach` → `dataRegistry.clear()`; fresh context per test                                                          |
| Included in | `npm run test:regression`, full `npm test`; **excluded** by `npm run test:fast`                                            |
