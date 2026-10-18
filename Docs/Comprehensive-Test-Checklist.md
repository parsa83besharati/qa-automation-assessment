# Comprehensive Test Checklist

**Application:** Booking.com (UI) · AutomationExercise (API) · `POST /api/searchProduct` (perf)  
**Automation:** Playwright + TypeScript (33 cases) · k6 (5 scenarios)  
**Author:** Parsa Besharati  
**Version:** 2.1  
**Date:** 2026-10-18

---

## Test suite summary

| Suite                  | Spec file                     |       Cases | Tags                                   | Status                                   |
| ---------------------- | ----------------------------- | ----------: | -------------------------------------- | ---------------------------------------- |
| Smoke                  | `tests/ui/smoke.spec.ts`      |           2 | `@smoke` `@ui`                         | **live pass** 2026-10-18                 |
| Regression             | `tests/ui/regression.spec.ts` |           5 | `@regression` `@ui`                    | **live pass** 2026-10-18                 |
| Negative (UI)          | `tests/ui/negative.spec.ts`   |           5 | `@negative` `@ui`                      | **live pass** 2026-10-18                 |
| Edge                   | `tests/ui/edge.spec.ts`       |           7 | `@edge` `@ui`                          | **live pass** 2026-10-18                 |
| Security (UI)          | `tests/ui/security.spec.ts`   |           4 | `@security` `@ui`                      | **live pass** 2026-10-18                 |
| API                    | `tests/api/products.spec.ts`  |           6 | `@api` `@negative` `@security` `@edge` | **live pass** 2026-10-18                 |
| API contract & SLO     | `tests/api/contract.spec.ts`  |           4 | `@api` `@contract` `@negative`         | **live pass** 2026-10-18                 |
| **Total (Playwright)** |                               |      **33** |                                        | **33/33 green**                          |
| Performance (k6)       | `performance/k6/*.js`         | 5 scenarios | —                                      | smoke/load/stress/spike/soak implemented |

_UI cases run serially (1 worker — one shared egress IP against a live site, see the comment in
`playwright.config.ts`) and through `PROXY_SERVER` when Booking geo-blocks the network (R13);
API cases run once in the `api` project (browser-agnostic). Verified run 2026-10-18:
**23/23 UI + 10/10 API green**, gates `tsc`/`eslint`/`prettier` all 0._

---

## Smoke (`tests/ui/smoke.spec.ts`) — `npm run test:smoke`

- [x] **TC-SMOKE-001** — Homepage loads with search widget _(live pass)_
- [x] **TC-SMOKE-002** — Task happy path opens 3rd hotel availability _(live pass)_

---

## Regression (`tests/ui/regression.spec.ts`) — `npm run test:regression`

- [x] **TC-REG-001** — Currency can be switched to TRY _(live pass)_
- [x] **TC-REG-002** — Destination London shows suggestions _(live pass)_
- [x] **TC-REG-003** — Flexible current-month dates can be selected _(live pass)_
- [x] **TC-REG-004** — Occupancy supports 8 adults plus pets _(live pass)_
- [x] **TC-REG-005** — Results render hotel cards with availability _(live pass)_

---

## Negative — UI (`tests/ui/negative.spec.ts`) — `npm run test:negative`

- [x] **TC-NEG-001** — Empty destination blocks search or shows validation _(live pass)_
- [x] **TC-NEG-002** — Gibberish destination yields no results or stays put _(live pass)_
- [x] **TC-NEG-003** — Invalid currency code is rejected gracefully _(live pass)_
- [x] **TC-NEG-004** — Adults can never drop below the minimum of 1 _(live pass)_
- [x] **TC-NEG-005** — Overlong + emoji destination does not break the app _(live pass)_

---

## Edge (`tests/ui/edge.spec.ts`) — `npm run test:edge`

- [x] **TC-EDGE-001** — Maximum adults stays submittable (30) _(live pass)_
- [x] **TC-EDGE-002** — Second hotel can be opened (index is dynamic) _(live pass)_
- [x] **TC-EDGE-003** — Transient popup does not break the flow _(live pass)_
- [x] **TC-EDGE-004** — Tablet viewport (1024×768) keeps search usable _(live pass)_
- [x] **TC-EDGE-005** — Mobile viewport (390×844) keeps search usable _(live pass)_
- [x] **TC-EDGE-006** — Single adult with pets off is a valid occupancy _(live pass)_
- [x] **TC-EDGE-007** — Browser back from results restores the widget _(live pass)_

---

## Security — UI (`tests/ui/security.spec.ts`) — `npm run test:security`

- [x] **TC-SEC-001** — Site is served over HTTPS _(live pass)_
- [x] **TC-SEC-002** — XSS payload in destination does not execute _(live pass)_
- [x] **TC-SEC-003** — SQL-injection probe is treated as plain text _(live pass)_
- [x] **TC-SEC-004** — Cookies exist and session can be cleared _(live pass)_

---

## API (`tests/api/products.spec.ts`) — `npm run test:api`

- [x] **TC-API-001** — productsList contains Polo brand products _(live pass)_
- [x] **TC-API-002** — searchProduct finds Tshirts category _(live pass)_
- [x] **TC-API-NEG-001** — search without parameter is rejected (400) _(live pass)_
- [x] **TC-API-NEG-002** — GET on search endpoint is not allowed (405) _(live pass)_
- [x] **TC-API-SEC-001** — XSS/SQLi probes do not break search _(live pass)_
- [x] **TC-API-EDGE-001** — exact product-name search returns only matches _(live pass)_

---

## API contract & latency (`tests/api/contract.spec.ts`) — `npm run test:api`

- [x] **TC-API-CONTRACT-001** — productsList matches the response contract _(live pass)_
- [x] **TC-API-CONTRACT-002** — searchProduct matches the response contract _(live pass)_
- [x] **TC-API-CONTRACT-NEG-001** — malformed payload fails as an envelope, not a crash _(live pass)_
- [x] **TC-API-SLO-001** — endpoints stay inside the latency budget (`API_LATENCY_BUDGET_MS`) _(live pass)_

---

## Performance (`performance/k6/*.js`)

- [x] Smoke — 1 VU × 30s, `p95 < 1500ms`, `err < 1%` _(live: 100% checks, p95 ≈ 869ms)_
- [ ] Load — 5→10→20 VUs × ~3.5m, `p95 < 2000ms`, `err < 2%`
- [ ] Stress — 10→30→50→100 VUs × ~4m, `p95 < 4000ms`, `err < 10%`
- [ ] Spike — 5→80→5 VUs, recovery after burst
- [ ] Soak — 10 VUs × 10m (30m full), flat p95, no leak

### Observability — Grafana (`performance/`)

- [x] `docker-compose.yml` + provisioned datasource/dashboard (no manual import) — live
- [x] `npm run perf:stack` up → Grafana `/api/health` ok, dashboard `k6-perf` loads (14 panels)
- [x] `npm run perf:smoke:grafana` end-to-end: k6 `--out influxdb=` → InfluxDB → Grafana proxy `http_reqs=23`

---

## How to use this checklist

1. Run automation: `npm run test:api` (API, live-green) or the UI suites via `npm run test:smoke`, etc.
2. Tag subsets: `npm run test:ci` (smoke+API), `npm run test:fast` (skip regression/edge),
   `npm run test:negative-api` (API negatives only).
3. Check cases off after a passing run; link failures to `playwright-report/`, Allure
   (`npm run allure:report`), and per-test logs in `logs/`.
4. Quality gate before a commit: `npm run typecheck && npm run lint:check && npm run format:check`.
5. Performance: `npm run perf:stack` → `npm run perf:smoke:grafana` → open
   `http://localhost:3000` (admin/admin) folder **k6**.
