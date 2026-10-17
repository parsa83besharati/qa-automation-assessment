# Security Test Suite

## QA Automation Assessment — Mohaymen

**Automation:** `tests/ui/security.spec.ts` (UI) · `TC-API-SEC-001` in `tests/api/products.spec.ts`  
**Tags:** `@security` `@ui` · `@security` `@api`  
**Commands:** `npm run test:security` (UI) · `npm run test:negative-api` (API security case)  
**Targets:** Booking.com (transport, reflected input, session) · AutomationExercise `searchProduct` (abuse)  
**Purpose:** Baseline application-security guards — transport encryption, injected-payload inertness, session hygiene.  
**Author:** Parsa Besharati  
**Date:** 2026-10-17  
**Version:** 2.0

---

## What This Suite Covers (and Explicitly Does Not)

This is **not** a penetration test. It automates the security checks that can be asserted
black-box on a public site in seconds, and it stops there:

| Covered                                     | Not covered (out of scope)                         |
| ------------------------------------------- | -------------------------------------------------- |
| HTTPS enforcement                           | TLS cipher/protocol auditing                       |
| Reflected XSS inertness in the search input | Stored XSS, DOM clobbering                         |
| SQLi probe treated as plain text            | Blind/union-based SQLi exploitation                |
| Session cookie presence & clearability      | Session fixation / hijack, CSRF token analysis     |
| API stability under hostile queries         | Auth bypass, IDOR, rate limiting, header hardening |

Threat model for these tests: an anonymous visitor typing hostile input into public forms —
the realistic first-order risk for a search-driven site.

---

## Security Test Cases

| ID             | Test Case Description                        | Technique                  | Priority | Key Precondition |
| -------------- | -------------------------------------------- | -------------------------- | -------- | ---------------- |
| TC-SEC-001     | Site is served over HTTPS                    | Negative (transport)       | P0       | None             |
| TC-SEC-002     | XSS payload in destination does not execute  | Negative / Error Guessing  | P0       | Homepage loaded  |
| TC-SEC-003     | SQL-injection probe is treated as plain text | Negative / Error Guessing  | P0       | Homepage loaded  |
| TC-SEC-004     | Cookies exist and session can be cleared     | State Transition (session) | P1       | Homepage loaded  |
| TC-API-SEC-001 | XSS/SQLi probes do not break search          | Negative / Error Guessing  | P1       | API reachable    |

---

## UI — `tests/ui/security.spec.ts`

### TC-SEC-001 — Site Is Served over HTTPS

**Scenario Reference:** S5.1 ([Test Design Document](./Test-Design-Document.md#s5--security-guards))  
**Priority:** P0 · **Severity:** critical  
**Technique:** Negative Testing (transport)  
**Precondition:** None

**Test Steps:**

1. `homePage.open()`.
2. Assert the final URL scheme.

**Expected Results:**

- `page.url()` matches `/^https:\/\//` — no silent downgrade to plaintext.
- Redirect-to-HTTPS (if any) completes before the assertion (Playwright waits for the final URL).

**Automation Notes:**

- One-line assertion, but it is the cheapest possible tripwire for a misconfigured origin or a
  proxy stripping TLS.
- Config origin `BOOKING_BASE_URL` is itself `https://` — the test guards against the _site_
  redirecting elsewhere, not just our config.

---

### TC-SEC-002 — XSS Payload Does Not Execute

**Scenario Reference:** S5.2  
**Priority:** P0 · **Severity:** critical  
**Technique:** Negative Testing, Error Guessing  
**Payload:** `<script>alert("xss")</script>` (constant `XSS` in the spec)

**Test Steps:**

1. `homePage.open()`.
2. `homePage.fill(HomeLocators.destinationInput, XSS, 'Type XSS probe')`.
3. Read `body.innerHTML()`.
4. Assert the payload did **not** become executable markup.
5. Assert the destination input is still visible (page remains usable).

**Expected Results:**

- The probe round-trips as inert text — no injected `<script>` block in the DOM.
- No dialog is spawned (an `alert()` would stall the test and fail it).
- The input is still interactive: the page neither crashed nor navigated away.

**Automation Notes:**

- Assertion: `expect(bodyHtml).not.toContain('<script>alert("xss")</script><script>')` — targets
  the dangerous _doubled_ tag that appears when a payload is naively re-embedded.
- `homePage.fill` is a healable `BasePage` action, so a selector change does not weaken the test.

---

### TC-SEC-003 — SQLi Probe Stays Plain Text

**Scenario Reference:** S5.3  
**Priority:** P0 · **Severity:** critical  
**Technique:** Negative Testing, Error Guessing  
**Payload:** `' OR '1'='1` (constant `SQLI` in the spec)

**Test Steps:**

1. `homePage.open()`.
2. `homePage.fill(HomeLocators.destinationInput, SQLI, 'Type SQLi probe')`.
3. Assert the field's value is byte-identical to the probe.

**Expected Results:**

- `toHaveValue("' OR '1'='1")` — no transformation, no sanitisation artefacts, no error page.
- The apostrophes survive the round-trip as literal characters.

**Automation Notes:**

- Exact-value assertion (not `toContain`) so any server-side rewriting is caught immediately.
- Pair with `TC-API-SEC-001` for the same probe against the API layer.

---

### TC-SEC-004 — Cookies Exist and Session Can Be Cleared

**Scenario Reference:** S5.4  
**Priority:** P1 · **Severity:** normal  
**Technique:** State Transition Testing (session: anonymous → loaded → wiped)  
**Fixtures:** `homePage`, `clearSession`

**Test Steps:**

1. `homePage.open()`.
2. Read `context.cookies()` → assert length **> 0**.
3. `await clearSession()` → `context.clearCookies()`.
4. Read cookies again → assert length **0**.

**Expected Results:**

- Booking sets session cookies on first load (before > 0).
- After clearing, **zero** cookies remain (after = 0) — sessions are fully wipeable, which is
  also the isolation guarantee every other test relies on.

**Automation Notes:**

- Two-sided assertion: "cookies exist" and "cookies can be removed" — one without the other can
  pass vacuously (e.g. if the site set no cookies at all, the first assert catches it).
- `clearSession` is a fixture so any suite can reuse the same isolation primitive.

---

## API — `TC-API-SEC-001`

### TC-API-SEC-001 — XSS/SQLi Probes Do Not Break Search

**Scenario Reference:** S6.5 · **Tags:** `@api` `@security`  
**Priority:** P1 · **Severity:** normal  
**Technique:** Negative Testing, Error Guessing  
**Data:** `ApiTemplates.invalidSearchQueries()` (payloads after index 0: `<script>alert(1)</script>`, `' OR '1'='1`, …)

**Test Steps:**

1. Loop over the hostile queries from the template.
2. For each: `apiClient.searchProducts(query)`.
3. Assert `Array.isArray(products)`.

**Expected Results:**

- Every probe answers **HTTP 200 with a well-formed array** (usually empty) — never 5xx,
  never an HTML stack trace, never a malformed body that would throw during parsing.
- The endpoint stays _stable_ under abuse; it does not need to return results.

**Automation Notes:**

- The loop makes each payload an implicit sub-case; the first failing payload is named in the
  assertion message via the template query.
- This is the API-side twin of `TC-SEC-002/003` — together they cover UI + API input handling.

---

## Execution Order & Dependencies

1. The four UI cases are independent and share no state beyond the `DataRegistry` cleared in
   `test.afterEach`.
2. `TC-SEC-004` intentionally creates and destroys session state — safe in any order because each
   test opens its own context.
3. `TC-API-SEC-001` runs in the `api` project (no browser) and is selected by
   `npm run test:negative-api` (tag `@negative|@security`).
4. Payloads are constants in the spec (`XSS`, `SQLI`) and templates in
   `data/templates/api.templates.ts` — centralise any new payload there.

---

## Success Criteria

- 5/5 green. A failure here is a **security defect**, not flakiness — raise it before merging.
- No payload may cause a dialog, navigation, 5xx or unparseable response.
- Suite wall-clock: **< 10 seconds** (API case) + **< 30 seconds** (4 UI cases, one browser).

---

## Automation Implementation

| Item            | Detail                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| Spec            | `tests/ui/security.spec.ts` · API case inside `tests/api/products.spec.ts`                              |
| Payloads        | `XSS` / `SQLI` constants in the spec; `ApiTemplates.invalidSearchQueries()` for the API                 |
| Isolation       | `clearSession` fixture (`context.clearCookies()`), `dataRegistry.clear()` in `afterEach`                |
| Assertion style | absence-of-harm: `not.toContain`, `toHaveValue(exact)`, `toMatch(/^https:/)`, `toHaveLength(0)`         |
| Reporting       | Allure epic "Task 1", feature "Security suite" / "API security"; severity `critical` for HTTPS/XSS/SQLi |
| CI              | UI cases ride the cross-browser jobs; the API case is part of `test:ci` via `@api`                      |
