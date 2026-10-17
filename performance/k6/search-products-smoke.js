/* eslint-disable */
// k6 Smoke — AutomationExercise searchProduct (Task 3, scenario 1 of 5).
//
// Five designed scenarios (full detail in Docs/Performance-Test-Plan.md):
//   1. SMOKE   (this file) — 1 VU, ~30s, functional sanity under minimal load.
//   2. LOAD    (search-products-load.js) — ramp 5→20 VUs, sustained throughput.
//   3. STRESS  (search-products-stress.js) — ramp 10→100 VUs to find the break point.
//   4. SPIKE   (search-products-spike.js) — 5→80 VUs jump, recovery check.
//   5. SOAK    (search-products-soak.js) — 10 VUs for DURATION (10m/30m), leak watch.
//
// Run: k6 run performance/k6/search-products-smoke.js
// Env: API_BASE_URL (default https://automationexercise.com)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE_URL || 'https://automationexercise.com';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    search_ok: ['rate>0.99'],
  },
};

const searchDuration = new Trend('search_duration');
const searchOk = new Rate('search_ok');

export default function () {
  const queries = ['tshirt', 'dress', 'jeans'];
  const q = queries[Math.floor(Math.random() * queries.length)];

  const res = http.post(
    `${BASE}/api/searchProduct`,
    { search_product: q },
    { tags: { endpoint: 'searchProduct' } },
  );
  searchDuration.add(res.timings.duration);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'has responseCode 200': (r) => {
      try {
        return r.json().responseCode === 200;
      } catch {
        return false;
      }
    },
    'products array present': (r) => {
      try {
        return Array.isArray(r.json().products);
      } catch {
        return false;
      }
    },
  });
  searchOk.add(ok);
  sleep(1);
}
