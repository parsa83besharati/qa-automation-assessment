# Security Test Suite

## UI (`tests/ui/security.spec.ts`, run `npm run test:security`)

| ID                                                            | Steps                                         | Pass                                                 |
| ------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| TC-SEC-001 HTTPS                                              | open                                          | URL matches `^https://`                              |
| TC-SEC-002 XSS `<script>alert("xss")</script>` in destination | fill probe                                    | no script executes, field stays usable               |
| TC-SEC-003 SQLi `' OR '1'='1` in destination                  | fill probe                                    | `toHaveValue` exact probe (plain text, no transform) |
| TC-SEC-004 cookies                                            | open → cookies > 0 → clearSession → cookies 0 | session fully clearable                              |

## API (`TC-API-SEC-001` in `tests/api/products.spec.ts`)

- `POST searchProduct` with `<script>alert(1)</script>` and `' OR '1'='1` → 200 with array (possibly empty), never 500, never crashes the suite.
