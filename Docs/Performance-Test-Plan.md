# Performance Test Plan — `POST /api/searchProduct` (Task 3)

## QA Automation Assessment — Mohaymen

**Tool:** **k6** (`performance/k6/*.js`) · **Target:** `https://automationexercise.com/api/searchProduct`  
**Commands:** `npm run perf:smoke|load|stress|spike|soak` · `npm run perf:smoke:grafana`  
**Observability:** k6 → InfluxDB → Grafana (`npm run perf:stack`)  
**Why k6 not JMeter:** code-based (reviewable, diffable, versionable), thresholds as code, first-class CI integration, JS reuse of the API payload knowledge from Task 2.  
**Author:** Parsa Besharati  
**Date:** 2026-10-17  
**Version:** 2.0

---

## Table of Contents

1. [Approach & Design Techniques](#1-approach--design-techniques)
2. [The 5 Scenarios](#2-the-5-scenarios)
3. [Scenario Detail](#3-scenario-detail)
4. [Threshold Derivation](#4-threshold-derivation)
5. [Metrics Dictionary](#5-metrics-dictionary)
6. [Live Evidence](#6-live-evidence)
7. [Grafana Observability Stack](#7-grafana-observability-stack)
8. [Risks & Limitations](#8-risks--limitations)
9. [How to Run / Present](#9-how-to-run--present)

---

## 1. Approach & Design Techniques

| Technique                              | Where it is applied                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Risk-based scenario selection**      | The 5 profiles answer 5 different questions (does it work / what is normal / where does it break / does it recover / does it leak) — not 5 variations of one load test.                             |
| **Boundary Value Analysis**            | VU ceilings chosen at boundaries of expectation: 1 (min), 20 (normal max), 80 (burst), 100 (design break point). Latency budgets sit at the boundary of "acceptable" (`p95 < 1500ms`).              |
| **Threshold (non-functional) testing** | Every run is pass/fail — thresholds live in `options.thresholds` so CI can gate, instead of a human eyeballing a graph.                                                                             |
| **Equivalence Partitioning**           | Query set `tshirt / dress / jeans / top / saree` covers distinct result-set sizes with one representative per class; queries rotate by `(__VU + __ITER)` so VUs do not hit an identical cache path. |
| **State Transition Testing**           | Spike (steady → burst → recovery) and soak (steady → long steady) model transitions, not just levels.                                                                                               |
| **Measurement hygiene**                | 1s think time between iterations (no self-DDoS), `endpoint` tag on every request for per-endpoint Grafana breakdown, custom `search_duration`/`search_ok` business metrics alongside k6 built-ins.  |

**Design constraints:** public demo target ⇒ keep VUs low (max 100, seconds-to-minutes), never
hammer it continuously, and derive thresholds from measured reality rather than aspirational numbers.

---

## 2. The 5 Scenarios

| #   | Name       | Profile                             | Question it answers              | Thresholds (as implemented)                           | File                           |
| --- | ---------- | ----------------------------------- | -------------------------------- | ----------------------------------------------------- | ------------------------------ |
| 1   | **Smoke**  | 1 VU × 30s                          | Does it answer correctly at all? | `p95<1500ms`, `err<1%`, `search_ok>99%`               | `search-products-smoke.js` ✅  |
| 2   | **Load**   | 5→10→20 VUs, 3m30s                  | What does _normal_ look like?    | `p95<2000ms`, `p99<4000ms`, `err<2%`, `search_ok>98%` | `search-products-load.js` ✅   |
| 3   | **Stress** | 10→30→50→100 VUs, 4m                | Where is the break point?        | `p95<4000ms`, `err<10%`, `search_ok>90%`              | `search-products-stress.js` ✅ |
| 4   | **Spike**  | 5→80→5 VUs, 3m30s                   | Does it recover after a burst?   | `p95<3000ms`, `err<5%`, `search_ok>95%`               | `search-products-spike.js` ✅  |
| 5   | **Soak**   | 10 VUs × `DURATION` (10m, 30m full) | Is there drift/leak over time?   | `p95<2000ms`, `err<2%`, `search_ok>98%`               | `search-products-soak.js` ✅   |

All five are implemented (Task asked for 2 — the other three are a bonus).

---

## 3. Scenario Detail

### S7.1 — Smoke (functional sanity under minimal load)

**Priority:** P0 · **VUs:** 1 · **Duration:** 30s · **Think time:** 1s

**Stage:** flat `vus: 1, duration: '30s'`.

**Per iteration:** random query from `tshirt|dress|jeans` → `POST /api/searchProduct`
(`{ search_product }`) → 3 checks: status 200 · `responseCode` 200 · `products` is an array →
`search_ok` rate + `search_duration` trend recorded.

**Pass criteria:** `http_req_duration p(95) < 1500ms`, `http_req_failed rate < 0.01`,
`search_ok rate > 0.99`. **Live result:** 100% checks, p95 ≈ 869ms (2026-10-16).

---

### S7.2 — Load (expected traffic shape)

**Priority:** P0 · **Stages:** 30s→5 · 1m→10 · 1m→20 · 30s→hold 20 · 30s→0 (3m30s total)

| Stage     | VUs      | Purpose                                          |
| --------- | -------- | ------------------------------------------------ |
| ramp      | 30s → 5  | warm-up, connection pooling                      |
| ramp      | 1m → 10  | typical daytime traffic                          |
| ramp      | 1m → 20  | busy period                                      |
| hold      | 30s @ 20 | sustained-load plateau (the number that matters) |
| ramp-down | 30s → 0  | clean exit                                       |

**Pass criteria:** `p95 < 2000ms`, `p99 < 4000ms`, `err < 2%`, `search_ok > 98%`.
Queries rotate across `tshirt|dress|jeans|top|saree`.

---

### S7.3 — Stress (find the breaking point)

**Priority:** P1 · **Stages:** 30s→10 · 1m→30 · 1m→50 · 1m→100 · 30s→0 (4m)

**Purpose:** push past expected load and observe **how** it degrades — latency creep first,
errors second, refusal last. A graceful curve is acceptable; a cliff (timeout/5xx avalanche) is not.

**Pass criteria at 100 VUs:** `p95 < 4000ms`, `err < 10%`, `search_ok > 90%`.
Report the VU level where p95 crosses 2000ms — that is the effective capacity for this target.

---

### S7.4 — Spike (burst + recovery)

**Priority:** P1 · **Stages:** 30s→5 · **10s→80** · 1m@80 · **10s→5** · 1m@5 (3m30s)

**Purpose:** model a flash-campaign burst (16× normal in 10 seconds) and prove the service
returns to baseline — recovery is the assertion, not the burst itself.

**Pass criteria:** `p95 < 3000ms`, `err < 5%`, `search_ok > 95%`, **plus** visual/API confirmation
that the final 1m@5 VUs matches the opening 1m baseline (no residual error growth).

---

### S7.5 — Soak (endurance / leak watch)

**Priority:** P2 · **VUs:** 10 flat · **Duration:** `DURATION` env (default 10m; `DURATION=30m` for the full run)

**Purpose:** hold steady long enough for resource leaks, connection exhaustion or latency creep to
appear. Pass is _flat_ p95 across the window, not just under the cap at the end.

**Pass criteria:** `p95 < 2000ms`, `err < 2%`, `search_ok > 98%`, and p95 at the end of the run
within noise of p95 at the start.

---

## 4. Threshold Derivation

Thresholds are **measured, then given headroom** — not invented:

| Metric                  | Live measurement (smoke, 2026-10-16/17)     | Committed budget         | Rationale                                                                     |
| ----------------------- | ------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `http_req_duration p95` | ≈ 869ms (raw p95), later runs 546–923ms max | **1500ms** (smoke)       | headroom for public-site variance; mirrors Playwright `API_LATENCY_BUDGET_MS` |
| `http_req_failed`       | 0%                                          | 1% / 2% / 10% by profile | smoke strict; stress deliberately tolerant (10%) to _observe_ breakage        |
| `search_ok` (business)  | 100%                                        | 99% / 98% / 90%          | tracks the 3-check contract (`status`, `responseCode`, `products`)            |
| `p99`                   | —                                           | 4000ms (load)            | tail latency guard — p95 alone hides outliers                                 |

The same 1500ms number appears in `tests/api/contract.spec.ts` (`TC-API-SLO-001`) — one budget,
two tools.

---

## 5. Metrics Dictionary

| Metric              | Type               | Meaning                                                      |
| ------------------- | ------------------ | ------------------------------------------------------------ |
| `http_req_duration` | trend (k6)         | total request duration; `p95`/`p99` are the SLO carriers     |
| `http_req_failed`   | rate (k6)          | non-2xx / failed transfers                                   |
| `http_reqs`         | counter (k6)       | throughput (requests)                                        |
| `iterations`        | counter (k6)       | completed virtual-user iterations                            |
| `vus` / `vus_max`   | gauge (k6)         | active / allocated virtual users                             |
| `http_req_waiting`  | trend (k6)         | time-to-first-byte (server think time)                       |
| `search_duration`   | **trend (custom)** | our own per-query latency, independent of k6 tagging         |
| `search_ok`         | **rate (custom)**  | business success = all 3 checks passed                       |
| `endpoint` tag      | tag                | `searchProduct` — drives the "p95 by endpoint" Grafana panel |
| `status` tag        | tag                | HTTP status — drives "requests by HTTP status"               |

---

## 6. Live Evidence

**2026-10-16 — smoke trial (1 VU × 10s):** 6 iterations, 18/18 checks green, `search_ok` 100%,
`http_req_failed` 0%, `p50 ≈ 486ms`, `p95 ≈ 869ms`.

**2026-10-17 — smoke + Grafana (1 VU × 30s, k6 v2.0.0):** 22–23 iterations, thresholds green
(`p95 < 1500`, `err < 1%`, `search_ok > 99%`), p95 observed 493–570ms, max single request ~923ms;
metrics streamed into InfluxDB and rendered by the provisioned Grafana dashboard (failure 0%,
checks 100%, 45 requests in the window).

**Note:** raw p95 occasionally exceeds an aggressive 800ms budget — hence **1500ms** in the
committed scripts.

---

## 7. Grafana Observability Stack

`performance/docker-compose.yml` brings up **InfluxDB 1.8 → Grafana 13**, fully provisioned —
no manual datasource or dashboard imports.

| Command                      | Effect                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run perf:stack`         | `docker compose up -d` → InfluxDB `:8086`, Grafana `:3000` |
| `npm run perf:smoke:grafana` | k6 smoke with `--out influxdb=http://127.0.0.1:8086/k6`    |
| `npm run perf:load:grafana`  | same for the load scenario (3.5m of live charts)           |
| `npm run perf:stack:logs`    | follow Grafana logs                                        |
| `npm run perf:stack:down`    | stop + remove containers (named volumes kept)              |

Any scenario streams metrics by appending `--out influxdb=http://127.0.0.1:8086/k6`.

- **Dashboard:** http://localhost:3000 → `admin`/`admin` → folder **k6** → _k6 Performance Tests_
  (`/d/k6-perf/k6-performance-tests`), 14 panels, auto-refresh.
- **Panels:** failure-rate / checks-pass / p95 / requests / iterations stat tiles with the
  **1500ms SLO and 1% failure threshold drawn as lines**, latency percentiles p50–p99, p95 per
  `endpoint` tag, stacked HTTP timing breakdown (TTFB/DNS/TLS/receiving), the `search_duration`
  business SLO, throughput, failure-rate-over-time, VUs and requests-by-status.
- **Provisioned assets:** datasource `InfluxDB-k6`
  (`performance/grafana/provisioning/datasources/influxdb.yml`) + dashboard JSON
  (`performance/grafana/dashboards/k6-perf.json`).
- **Safety:** both ports bind to `127.0.0.1` only and InfluxDB auth is off — a local test rig,
  never publish it beyond localhost.
- **Verified 2026-10-17:** k6 `--out influxdb=` wrote samples, Grafana's datasource proxy returned
  `http_reqs = 23`, dashboard loads via `/api/dashboards/uid/k6-perf`, legend interpolation fixed
  to InfluxQL `[[tag_endpoint]]`.

---

## 8. Risks & Limitations

| ID  | Risk                                                | Mitigation                                                                                                                   |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| R09 | Hammering the public demo host                      | VU ceilings (20 load / 80 spike / 100 stress for seconds-to-minutes), 1s think time, short scenarios, never a permanent loop |
| R04 | Latency variance on a public target                 | budgets from live trials with headroom; run 3× and quote the median                                                          |
| —   | Third-party network noise between runner and target | `http_req_waiting` (TTFB) panel separates server time from transit; interpret with the timing breakdown                      |
| —   | Single-region, single-runner result                 | this is **relative/regression** evidence, not a capacity plan for production                                                 |
| —   | No authenticated users in scope                     | anonymous search only — results do not generalise to logged-in/checkout load                                                 |

---

## 9. How to Run / Present (20–30 min slot)

1. `npm run perf:stack` — bring up Grafana, open `/d/k6-perf/k6-performance-tests`.
2. `npm run perf:smoke:grafana` (30s) — green board: 0% failures, 100% checks, p95 tile.
3. `npm run perf:load:grafana` (3.5m) — watch ramp stages, percentiles and the plateau.
4. Point at `stress`/`spike`/`soak` files for design questions; quote the scenario and threshold
   tables above.
5. Explain threshold derivation (§4): numbers are measured, then given headroom — one budget
   shared with `TC-API-SLO-001`.
6. Risks: public-site noise (run 3×, report median), no auth in scope, keep VUs low to avoid
   hammering the demo host.
