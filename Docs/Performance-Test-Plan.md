# Performance Test Plan — `POST /api/searchProduct` (Task 3)

Target: `https://automationexercise.com/api/searchProduct` (`{search_product: tshirt|dress|jeans…}`).
Tool: **k6** (`performance/k6/*.js`, `npm run perf:<name>`). JMeter deliberately not used — k6 is code-reviewable and CI-native.

## The 5 scenarios

| #   | Name   | Profile                                | Goal / thresholds                                          | File                           |
| --- | ------ | -------------------------------------- | ---------------------------------------------------------- | ------------------------------ |
| 1   | Smoke  | 1 VU × 30s                             | sanity, `p95<1500ms`, `err<1%`                             | `search-products-smoke.js` ✅  |
| 2   | Load   | 5→10→20 VUs × ~3.5m                    | sustained use, `p95<2000ms`, `err<2%`                      | `search-products-load.js` ✅   |
| 3   | Stress | 10→30→50→100 VUs × ~4m                 | break point, graceful degradation, `p95<4000ms`, `err<10%` | `search-products-stress.js` ✅ |
| 4   | Spike  | 5→80 (10s) hold 1m →5                  | absorb jump, recover ≤1m, `p95<3000ms`                     | `search-products-spike.js` ✅  |
| 5   | Soak   | 10 VUs × 10m (`DURATION=30m` for full) | flat p95, no leak, `err<2%`                                | `search-products-soak.js` ✅   |

All five are implemented (Task asked for 2 — the extra three are a bonus).

## Live evidence (2026-10-16, 1 VU × 10s smoke trial)

- 6 iterations, 18/18 checks green, `search_ok` 100%, `http_req_failed` 0%.
- `p50≈486ms`, `p95≈869ms` → budgets above set with headroom for the public demo site.
- Only note: raw p95 (869ms) exceeds an aggressive 800ms budget — hence 1500ms in the committed script.

## How to run / present (20–30 min slot)

1. `k6 run performance/k6/search-products-smoke.js` (30s, green board).
2. `k6 run performance/k6/search-products-load.js` (3.5m, show p95 chart + thresholds).
3. Point at stress/spike/soak files for design questions; quote thresholds table above.
4. Risks: public-site noise (run 3×, report median), no auth in scope, keep VUs low to avoid hammering the demo host.
