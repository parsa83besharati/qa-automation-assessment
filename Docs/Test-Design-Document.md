# Test Design Document — Mohaymen QA Assessment

> Playwright + TypeScript POM framework covering Task.pdf: Booking.com UI (Task 1),
> AutomationExercise API (Task 2), k6 performance (Task 3).

## 1. Scope

| Task     | Target                                        | In scope                                                                                                                                         |
| -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — UI   | `https://www.booking.com/`                    | Currency TRY → London + 1st suggestion → flexible A-month current month → 8 adults + pets → search → 3rd hotel See availability, popup dismissal |
| 2 — API  | `https://www.automationexercise.com/api_list` | `GET /api/productsList` → Polo brand names in terminal; `POST /api/searchProduct` (`search_product` form field) → Tshirts category               |
| 3 — Perf | `POST /api/searchProduct`                     | 5 scenarios designed, all 5 implemented in k6 (smoke, load, stress, spike, soak)                                                                 |

Out of scope: Booking payment flow, account creation, JMeter (k6 chosen — code-based, CI-friendly).

## 2. Risks

| Risk                                   | Impact               | Mitigation                                                                                                           |
| -------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Booking bot protection / A/B layouts   | UI flakiness         | Healable BasePage + heuristic+LLM self-healing flag, `dismissPopupIfPresent`, generous timeouts, headed mode locally |
| Public demo API latency variance       | Perf threshold noise | Lenient thresholds from live trial (smoke p95≈869ms → budget 1500ms), retries only in CI                             |
| Currency/date widgets differ by locale | Selector drift       | Separate `*.locators.ts`, `locate(testId, fallback)`, cached healing                                                 |

## 3. Traceability (Task requirement → test ID)

| Task.pdf requirement                                            | Test ID(s)                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| Click currency → select TRY                                     | TC-REG-001                                                 |
| Destination London → 1st suggestion                             | TC-REG-002, TC-SMOKE-002                                   |
| Calendar: I'm flexible → A month → current month → Select dates | TC-REG-003, TC-SMOKE-002                                   |
| Adults → 8, pets travelling ON                                  | TC-REG-004, TC-SMOKE-002                                   |
| Search → 3rd hotel See availability, close popup                | TC-SMOKE-002, TC-REG-005, TC-EDGE-002/003                  |
| API productsList → Polo names in terminal                       | TC-API-001                                                 |
| API searchProduct → Tshirts in response                         | TC-API-002                                                 |
| API negatives (missing param, wrong method, XSS/SQLi)           | TC-API-NEG-001/002, TC-API-SEC-001                         |
| Perf 5 scenarios / 2+ implemented                               | k6 smoke/load/stress/spike/soak + Performance-Test-Plan.md |

## 4. Boundaries

- Adults: 1 (min) → 8 (task) → 30 (max edge); 0 rejected by widget.
- Hotel index: 1-based; task uses 3; edge covers 2.
- API: empty query → 400; GET on search → 405; XSS/SQLi → 200 with empty list (no crash).
- Perf: 1 VU (smoke) → 20 (load) → 100 (stress) → 80 spike → 10 VU soak.

## 5. Environments

| Var                    | Default                          | Notes                       |
| ---------------------- | -------------------------------- | --------------------------- |
| `BOOKING_BASE_URL`     | `https://www.booking.com`        | UI origin                   |
| `API_BASE_URL`         | `https://automationexercise.com` | API origin                  |
| `HEADLESS`             | `true`                           | `false` locally vs bot wall |
| `SELF_HEALING_ENABLED` | `false`                          | `true` to heal              |
| `HEALING_MODE`         | `runtime`                        | or `post-mortem` (log only) |

## 6. Entry / exit criteria

- Entry: `npm ci && npx playwright install`, `.env` from `.env.example`.
- Exit: `tsc` + `eslint --max-warnings 0` + `prettier --check` clean; API suite green; UI smoke triaged (bot wall documented on failure).
