/* eslint-disable */
// k6 Soak — AutomationExercise searchProduct (Task 3, scenario 5 of 5).
//
// Goal: 10 VUs sustained to catch leaks / slow degradation over time.
// Default 10 minutes here so CI stays practical; extend to 30m+ for a real
// soak by setting DURATION (e.g. DURATION=30m k6 run .../search-products-soak.js).
// Success = flat p95 trend and zero growth in failures across the window.
//
// Run: k6 run performance/k6/search-products-soak.js
//      DURATION=30m k6 run performance/k6/search-products-soak.js
// Env: API_BASE_URL (default https://automationexercise.com)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE_URL || 'https://automationexercise.com';
const DURATION = __ENV.DURATION || '10m';

export const options = {
  vus: 10,
  duration: DURATION,
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
    search_ok: ['rate>0.98'],
  },
};

const searchDuration = new Trend('search_duration');
const searchOk = new Rate('search_ok');

const QUERIES = ['tshirt', 'dress', 'jeans'];

export default function () {
  const q = QUERIES[__ITER % QUERIES.length];

  const res = http.post(
    `${BASE}/api/searchProduct`,
    { search_product: q },
    { tags: { endpoint: 'searchProduct' } },
  );
  searchDuration.add(res.timings.duration);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'responseCode is 200': (r) => {
      try {
        return r.json().responseCode === 200;
      } catch {
        return false;
      }
    },
  });
  searchOk.add(ok);
  sleep(2);
}
