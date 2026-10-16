# Regression Test Suite (`tests/ui/regression.spec.ts`)

One requirement per case so failures pinpoint the widget. Run: `npm run test:regression`.

| ID                            | Steps                                             | Pass                                         |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------- |
| TC-REG-001 currency TRY       | open → selectCurrency(TRY)                        | picker button contains TRY                   |
| TC-REG-002 London suggestions | open → fillDestination(London)                    | suggestion list visible                      |
| TC-REG-003 flexible month     | open → selectFlexibleDatesCurrentMonth(current)   | occupancy trigger visible after Select dates |
| TC-REG-004 8 adults + pets    | open → setAdults(8) → setTravellingWithPets(true) | Search enabled                               |
| TC-REG-005 results cards      | full `searchFlow` → waitForResults                | >0 cards, first See availability visible     |
