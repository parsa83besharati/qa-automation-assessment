/* eslint-disable */
// k6 Stress — AutomationExercise searchProduct (Task 3, scenario 3 of 5).
//
// Goal: find the break point by ramping past normal load up to 100 VUs.
// Success = graceful degradation (errors climb, but no socket hang-ups and
// recovery once load drops). Keep runs short on the public demo site.
//
// Run: k6 run performance/k6/search-products-stress.js
// Env: API_BASE_URL (default https://automationexercise.com)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE_URL || 'https://automationexercise.com';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<4000'],
    search_ok: ['rate>0.90'],
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
    'responseCode present': (r) => {
      try {
        return typeof r.json().responseCode === 'number';
      } catch {
        return false;
      }
    },
  });
  searchOk.add(ok);
  sleep(1);
}
