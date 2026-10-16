# Smoke Test Suite

Critical paths only — must stay green. Run: `npm run test:smoke` then `npm run test:api`.

## TC-SMOKE-001 — Homepage loads with search widget

1. `homePage.open()` → `https://www.booking.com/`, dismiss popup, accept cookies.
2. Assert destination input, Search button, currency picker visible.
3. Pass: all three widgets visible within 15s.

## TC-SMOKE-002 — Task 1 happy path → 3rd hotel (file: `tests/ui/smoke.spec.ts`)

1. Data: `BookingTemplates.taskHappyPath()` → TRY / London / 8 adults / pets / hotel #3 / current month.
2. `selectCurrency('TRY')` → picker shows TRY.
3. `fillDestination('London')` → suggestions appear → click index 0.
4. `selectFlexibleDatesCurrentMonth(<current>)` → I'm flexible → A month → month card → Select dates.
5. `setAdults(8)` → stepper loop; `setTravellingWithPets(true)`.
6. `submitSearch()` → URL contains `searchresults`.
7. `resultsPage.waitForResults()` → ≥3 cards; `openHotelByIndex(3)` → hotel page URL matches `/booking.com\/hotel\//`.
8. Pass: hotel page opens (new tab or same tab); popup never blocks.

## API smoke (part of `tests/api/products.spec.ts`)

- TC-API-001: `GET productsList` → ≥1 Polo product, names logged.
- TC-API-002: `POST searchProduct {tshirt}` → ≥1 Tshirts product.
