# Negative Test Suite

## UI (`tests/ui/negative.spec.ts`, run `npm run test:negative`)

| ID                                       | Steps                                                                     | Pass                              |
| ---------------------------------------- | ------------------------------------------------------------------------- | --------------------------------- |
| TC-NEG-001 empty destination             | open → clear destination → Search                                         | URL never reaches `searchresults` |
| TC-NEG-002 gibberish `!!!NoSuchPlace123` | selectCurrency → fillDestination → submit → wait (tolerated fail) → count | count is 0                        |
| TC-NEG-003 currency `XXX`                | open → selectCurrency('XXX') catching failure                             | URL unchanged (graceful reject)   |

## API (in `tests/api/products.spec.ts`)

| ID                           | Steps                                  | Pass                                                     |
| ---------------------------- | -------------------------------------- | -------------------------------------------------------- |
| TC-API-NEG-001 missing param | `POST /api/searchProduct` with no body | HTTP 200 + `responseCode` 400                            |
| TC-API-NEG-002 wrong method  | `GET /api/searchProduct`               | status/responseCode in {200, 405} (documented, no crash) |
