# Comprehensive Test Checklist (master)

## UI — Booking.com

- [ ] TC-SMOKE-001 homepage + widget visible (`smoke.spec.ts`)
- [ ] TC-SMOKE-002 full Task flow → hotel #3 (`smoke.spec.ts`)
- [ ] TC-REG-001 currency TRY (`regression.spec.ts`)
- [ ] TC-REG-002 London suggestions (`regression.spec.ts`)
- [ ] TC-REG-003 flexible current month (`regression.spec.ts`)
- [ ] TC-REG-004 8 adults + pets (`regression.spec.ts`)
- [ ] TC-REG-005 results cards + availability (`regression.spec.ts`)
- [ ] TC-NEG-001 empty destination (`negative.spec.ts`)
- [ ] TC-NEG-002 gibberish destination (`negative.spec.ts`)
- [ ] TC-NEG-003 currency XXX (`negative.spec.ts`)
- [ ] TC-EDGE-001 max 30 adults (`edge.spec.ts`)
- [ ] TC-EDGE-002 hotel #2 (`edge.spec.ts`)
- [ ] TC-EDGE-003 popup resilience (`edge.spec.ts`)
- [ ] TC-EDGE-004 tablet (`edge.spec.ts`)
- [ ] TC-EDGE-005 mobile (`edge.spec.ts`)
- [ ] TC-SEC-001 HTTPS (`security.spec.ts`)
- [ ] TC-SEC-002 XSS (`security.spec.ts`)
- [ ] TC-SEC-003 SQLi (`security.spec.ts`)
- [ ] TC-SEC-004 cookie clear (`security.spec.ts`)

## API — AutomationExercise (`tests/api/`)

- [x] TC-API-001 productsList → Polo names (live pass)
- [x] TC-API-002 searchProduct → Tshirts (live pass)
- [x] TC-API-NEG-001 missing param → 400 (live pass)
- [x] TC-API-NEG-002 GET method → 405-documented (live pass)
- [x] TC-API-SEC-001 XSS/SQLi safe (live pass)
- [x] TC-API-CONTRACT-001 productsList shape/types (`contract.spec.ts`) — live pass
- [x] TC-API-CONTRACT-002 searchProduct shape/types (`contract.spec.ts`) — live pass
- [x] TC-API-SLO-001 latency within `API_LATENCY_BUDGET_MS` (`contract.spec.ts`) — live pass

## Perf — k6 (`performance/k6/`)

- [x] Smoke 1 VU (live trial 100% checks)
- [ ] Load 5→20 VUs
- [ ] Stress →100 VUs
- [ ] Spike 5→80
- [ ] Soak 10 VUs
