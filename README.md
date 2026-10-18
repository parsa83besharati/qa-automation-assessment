# QA Automation Assessment — Playwright TS (POM + Self-Healing) + k6

Booking.com UI (Task 1) · AutomationExercise API (Task 2) · k6 perf (Task 3).
Page-object model with per-widget locator files, structured logging, and an offline-first self-healing layer.

## Quick start

```bash
npm install
npx playwright install --with-deps
cp .env.example .env        # set SELF_HEALING_ENABLED=true + LLM keys to enable AI healing
npm run test:api            # Task 2 — live green (Polo + Tshirts)
npm run test:smoke          # Task 1 happy path (Booking geo-blocks you? set PROXY_SERVER in .env — see Config)
npm run perf:smoke          # Task 3 — k6 smoke (live trial: 100% checks, p95≈869ms)
npm run perf:stack          # observability: InfluxDB + Grafana on localhost:3000 (admin/admin)
npm run perf:smoke:grafana  # same k6 smoke with --out influxdb= → live Grafana dashboard
npm run allure:report       # Allure 2 report from last run (history chain + 50-report cap)
npm run allure:open         # serve the newest report locally
npx playwright show-report
```

## Scripts

| Command                                              | What                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `test:smoke/regression/negative/edge/security/api`   | suites                                                                               |
| `test:ci` / `test:fast` / `test:negative-api`        | tag-filtered subsets (smoke+api / fast local loop / API negatives)                   |
| `test:chromium/firefox/webkit`, `test:headed`        | browsers                                                                             |
| `typecheck`, `lint:check`, `format:check`            | quality gates                                                                        |
| `perf:smoke/load/stress/spike/soak`                  | k6 scenarios                                                                         |
| `perf:stack` / `perf:stack:down` / `perf:stack:logs` | k6 → InfluxDB → Grafana stack (`localhost:3000`, admin/admin, provisioned dashboard) |
| `perf:smoke:grafana`, `perf:load:grafana`            | k6 scenario + `--out influxdb=` so metrics land in Grafana                           |
| `allure:report`, `allure:open`                       | Allure 2 (annotations, history trend, screenshot/video on fail, newest-50 rotation)  |

### Projects & browser matrix

API tests are pure HTTP (`request` fixture) and therefore **browser-agnostic** — they run once in the dedicated `api` project instead of being duplicated by every browser. The browser projects (`chromium`/`firefox`/`webkit`) ignore `api/**` and only execute the UI suite, so `npm run test:api` needs no browser binaries.

## Architecture

```
config/env.ts            Singleton EnvConfig — TRY/London/8/pets/hotel#3, current month, URLs
pages/BasePage.ts        Abstract healable actions (all clicks/fills heal) + timed overlay clearing
pages/components/        DatePicker · CurrencyPicker · OccupancyPanel (search-widget parts)
pages/*.ts               HomePage (Task 1 orchestrator), SearchResultsPage (Nth hotel)
pages/locators/*.ts      SEPARATE locator files — home / results / currency / date / occupancy / common
fixtures/                fixtures.ts (page-object + apiClient injection), viewport.ts
services/ai-healer.ts    OFF by default; heuristic → DeepSeek>OpenAI>Anthropic>local + cache
services/api-client.ts   AutomationExercise (productsList / searchProduct + Polo/Tshirts filters)
data/                    entities / builders / factories / registry(singleton) / templates / scenarios
tests/ui|api/            23 UI + 10 API cases with tags @smoke @regression @negative @edge @security @api
performance/k6/          5 k6 scripts (smoke/load/stress/spike/soak)
utils/                   pretty winston+chalk logger, per-test files, NavigationLogger
Docs/                    design doc + per-suite steps + API/perf plans + master checklist
pipelines/ + .github/    Azure, GitLab, GitHub Actions CI
```

## Config

| Var                                                                           | Default                              | Notes                                                                                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BOOKING_BASE_URL` / `API_BASE_URL`                                           | booking.com / automationexercise.com | origins                                                                                                                                           |
| `DEFAULT_CURRENCY/DESTINATION/ADULTS/TRAVELLING_WITH_PETS/TARGET_HOTEL_INDEX` | TRY/London/8/true/3                  | Task 1 data (dynamic!)                                                                                                                            |
| `SELF_HEALING_ENABLED` / `HEALING_MODE`                                       | false / runtime                      | healing flag                                                                                                                                      |
| `PROXY_SERVER` / `PROXY_USERNAME` / `PROXY_PASSWORD`                          | (unset = direct)                     | egress proxy for the UI browsers — Booking.com geo-blocks many networks ("access from your location is not possible"); `api` project stays direct |
| `LOG_LEVEL` / `LOG_PRETTY`                                                    | info / true                          | pretty colors                                                                                                                                     |

## Logs & reports

- Terminal: color `INFO/WARN/ERROR + ➤/✅/❌` steps; files: `logs/framework.log`, `logs/error.log`, `logs/<test>-<ts>.log` attached to the HTML report.
- Reports: `playwright-report/` + `enhanced-report/` + `test-results/` (video/trace on fail).

## Documentation

Full test design lives in [`Docs/`](./Docs/README.md) — scope, risk register, design techniques,
per-case steps/expected results and a traceability matrix.

| Document                                                          | Description                                                                             |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Docs/README.md](./Docs/README.md)                                | Documentation index, automation mapping, conventions                                    |
| [Test Design Document](./Docs/Test-Design-Document.md)            | Scope, 13-risk register, 9 design techniques, scenarios S1–S7, traceability, entry/exit |
| [Comprehensive Checklist](./Docs/Comprehensive-Test-Checklist.md) | Master checklist — 33 Playwright cases + 5 k6 scenarios                                 |
| [Smoke Suite](./Docs/Smoke-Test-Suite.md)                         | Critical path design, steps, expected results, automation notes                         |
| [Regression Suite](./Docs/Regression-Test-Suite.md)               | One-requirement-per-case widget coverage                                                |
| [Negative Suite](./Docs/Negative-Test-Suite.md)                   | Invalid-input design (UI + API), decision tables                                        |
| [Edge Cases Suite](./Docs/Edge-Cases-Test-Suite.md)               | Boundary value analysis & resilience                                                    |
| [Security Suite](./Docs/Security-Test-Suite.md)                   | HTTPS / XSS / SQLi / session guards + scope limits                                      |
| [API Suite](./Docs/API-Test-Suite.md)                             | Behaviour, response contract, latency SLO                                               |
| [Performance Plan](./Docs/Performance-Test-Plan.md)               | 5 k6 scenarios, threshold derivation, Grafana stack                                     |

## Task mapping

Task 1 → `pages/HomePage.searchFlow` + `TC-SMOKE-002`; Task 2 → `TC-API-001/002` (live pass); Task 3 → `performance/k6/*` + `Docs/Performance-Test-Plan.md`.
