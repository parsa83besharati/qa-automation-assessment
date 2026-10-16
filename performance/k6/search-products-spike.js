/* eslint-disable */
// k6 Spike — AutomationExercise searchProduct (Task 3, scenario 4 of 5).
//
// Goal: sudden traffic jump 5 → 80 VUs, hold 1 minute, drop back to 5.
// Success = error spike stays bounded and p95 recovers within a minute
// after the spike ends (autoscale / queue drain behaviour).
//
// Run: k6 run performance/k6/search-products-spike.js
// Env: API_BASE_URL (default https://automationexercise.com)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE_URL || 'https://automationexercise.com';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '10s', target: 80 },
    { duration: '1m', target: 80 },
    { duration: '10s', target: 5 },
    { duration: '1m', target: 5 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    search_ok: ['rate>0.95'],
  },
};

const searchDuration = new Trend('search_duration');
const searchOk = new Rate('search_ok');

export default function () {
  const res = http.post(
    `${BASE}/api/searchProduct`,
    { search_product: 'tshirt' },
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
