/* eslint-disable */
// k6 Load — AutomationExercise searchProduct (Task 3, scenario 2 of 5).
//
// Ramp 5 → 20 VUs over ~3 minutes, then hold. Asserts p95 latency and
// error budget while measuring sustained throughput. Gentle on the public
// demo site: max 20 VUs + 1s think time between iterations.
//
// Run: k6 run performance/k6/search-products-load.js
// Env: API_BASE_URL (default https://automationexercise.com)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE_URL || 'https://automationexercise.com';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    search_ok: ['rate>0.98'],
  },
};

const searchDuration = new Trend('search_duration');
const searchOk = new Rate('search_ok');

const QUERIES = ['tshirt', 'dress', 'jeans', 'top', 'saree'];

export default function () {
  const q = QUERIES[(__VU + __ITER) % QUERIES.length];

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
  sleep(1);
}
