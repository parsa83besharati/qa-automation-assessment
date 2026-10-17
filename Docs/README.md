# QA Automation Assessment — Test Documentation

Design and execution documents for the **Mohaymen QA Automation Assessment** framework
(`qa-automation-assessment`): Booking.com UI (Task 1) · AutomationExercise API (Task 2) ·
k6 performance (Task 3).

| Document                                                             | Purpose                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Test-Design-Document.md](./Test-Design-Document.md)                 | Scope, risk register, design techniques, scenarios S1–S7, traceability matrix |
| [Comprehensive-Test-Checklist.md](./Comprehensive-Test-Checklist.md) | Master checklist — 27 Playwright cases + 5 k6 scenarios                       |
| [Smoke-Test-Suite.md](./Smoke-Test-Suite.md)                         | Smoke design, test steps, expected results, automation notes                  |
| [Regression-Test-Suite.md](./Regression-Test-Suite.md)               | Regression design & step-by-step instructions                                 |
| [Negative-Test-Suite.md](./Negative-Test-Suite.md)                   | Negative design & steps (UI + API)                                            |
| [Edge-Cases-Test-Suite.md](./Edge-Cases-Test-Suite.md)               | Boundary value & resilience design & steps                                    |
| [Security-Test-Suite.md](./Security-Test-Suite.md)                   | XSS / SQLi / HTTPS / session-cookie guards                                    |
| [API-Test-Suite.md](./API-Test-Suite.md)                             | API behaviour, response contract, latency SLO                                 |
| [Performance-Test-Plan.md](./Performance-Test-Plan.md)               | k6 scenario design, thresholds, Grafana observability                         |

---

## Automation mapping

| Suite                  | Spec file                     |       Cases | Tags                           | Command                   |
| ---------------------- | ----------------------------- | ----------: | ------------------------------ | ------------------------- |
| Smoke                  | `tests/ui/smoke.spec.ts`      |           2 | `@smoke` `@ui`                 | `npm run test:smoke`      |
| Regression             | `tests/ui/regression.spec.ts` |           5 | `@regression` `@ui`            | `npm run test:regression` |
| Negative (UI)          | `tests/ui/negative.spec.ts`   |           3 | `@negative` `@ui`              | `npm run test:negative`   |
| Edge                   | `tests/ui/edge.spec.ts`       |           5 | `@edge` `@ui`                  | `npm run test:edge`       |
| Security (UI)          | `tests/ui/security.spec.ts`   |           4 | `@security` `@ui`              | `npm run test:security`   |
| API                    | `tests/api/products.spec.ts`  |           5 | `@api` `@negative` `@security` | `npm run test:api`        |
| API contract & SLO     | `tests/api/contract.spec.ts`  |           3 | `@api` `@contract`             | `npm run test:api`        |
| **Total (Playwright)** |                               |      **27** |                                |                           |
| Performance            | `performance/k6/*.js`         | 5 scenarios | —                              | `npm run perf:<name>`     |

**Playwright projects:** `chromium` / `firefox` / `webkit` execute `tests/ui/**` only — the
browser projects `testIgnore` `api/**`. API cases run **once** in the dedicated `api` project
(`testMatch: api/**/*.spec.ts`), because they use Playwright's `request` fixture and are
browser-agnostic. See [README](../README.md#projects--browser-matrix).

**Tag-filtered subsets**

| Command                     | Selection                                             |
| --------------------------- | ----------------------------------------------------- |
| `npm run test:ci`           | `@smoke` or `@api`, chromium + api projects (PR gate) |
| `npm run test:fast`         | everything except `@regression`/`@edge` (local loop)  |
| `npm run test:negative-api` | `@negative` or `@security` in the API project only    |

---

## Conventions

- **IDs:** `TC-{SUITE}-{###}` (e.g. `TC-SMOKE-001`, `TC-API-CONTRACT-002`)
- **Titles:** `TC-{ID} — {Description}`
- **Test data:** never inline literals — `BookingTemplates`, `ApiTemplates`, `SearchFactory`
  (`data/`), so one fixture change updates every suite
- **Allure:** every test sets epic / feature / story / severity / description + tags in
  `beforeEach` or the test body
- **Locator strategy:** all selectors live in `pages/locators/*.locators.ts`; specs never
  contain raw CSS/XPath beyond one-off probes
- **Fixture injection:** specs receive `homePage`, `resultsPage`, `apiClient`, `setViewport`,
  `clearSession` — no `page.goto` in tests

---

## Version

| Field            | Value                               |
| ---------------- | ----------------------------------- |
| Project          | QA Automation Assessment — Mohaymen |
| Document version | 2.0                                 |
| Last updated     | 2026-10-17                          |
| Author           | Parsa Besharati                     |
