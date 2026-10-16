# Edge Cases Test Suite (`tests/ui/edge.spec.ts`, run `npm run test:edge`)

| ID                          | Steps                                     | Pass                                              |
| --------------------------- | ----------------------------------------- | ------------------------------------------------- |
| TC-EDGE-001 max adults (30) | open → setAdults(30)                      | submit button still visible (capped, not crashed) |
| TC-EDGE-002 hotel #2 opens  | searchFlow(index 2) → openHotelByIndex(2) | URL stays on booking.com                          |
| TC-EDGE-003 transient popup | open → dismissPopupIfPresent()            | returns boolean, flow continues                   |
| TC-EDGE-004 tablet 1024×768 | setViewport(tablet) → open                | submit visible                                    |
| TC-EDGE-005 mobile 390×844  | setViewport(mobile) → open                | submit visible                                    |
