// ---------------------------------------------------------------------------
// API contract (schema) validation — Task 2 hardening.
//
// Dependency-free shape checker: asserts the exact JSON contract of the
// AutomationExercise responses (required fields + their types + NO unexpected
// keys) so upstream drift breaks a test instead of silently changing behaviour.
//
// Shapes captured from the live API:
//   GET  /api/productsList  -> { responseCode, products: [ ... ] }
//   POST /api/searchProduct -> { responseCode, products: [ ... ] }
//   product                 -> { id: number, name, price, brand, category }
//   category                -> { usertype: { usertype: string }, category: string }
//
// NOTE `category.usertype` is a *nested object* (`{"usertype":"Women"}`), not a
// plain string — that is what the live endpoint returns.
// ---------------------------------------------------------------------------

/** Recursive subset of JSON Schema — only what this API needs. */
export type ApiSchema =
  | { readonly type: 'string' }
  | { readonly type: 'number' }
  | { readonly type: 'boolean' }
  | { readonly type: 'array'; readonly items: ApiSchema }
  | { readonly type: 'object'; readonly fields: Readonly<Record<string, ApiSchema>> };

/** Human-readable runtime type used in violation messages. */
function describeType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'number' && Number.isNaN(value)) {
    return 'number (NaN)';
  }
  return typeof value;
}

function walk(value: unknown, schema: ApiSchema, path: string, violations: string[]): void {
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        violations.push(`${path}: expected string, received ${describeType(value)}`);
      }
      return;

    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        violations.push(`${path}: expected number, received ${describeType(value)}`);
      }
      return;

    case 'boolean':
      if (typeof value !== 'boolean') {
        violations.push(`${path}: expected boolean, received ${describeType(value)}`);
      }
      return;

    case 'array':
      if (!Array.isArray(value)) {
        violations.push(`${path}: expected array, received ${describeType(value)}`);
        return;
      }
      value.forEach((item, index) => walk(item, schema.items, `${path}[${index}]`, violations));
      return;

    case 'object': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        violations.push(`${path}: expected object, received ${describeType(value)}`);
        return;
      }
      const record = value as Record<string, unknown>;
      for (const [key, childSchema] of Object.entries(schema.fields)) {
        walk(record[key], childSchema, `${path}.${key}`, violations);
      }
      for (const key of Object.keys(record)) {
        if (!(key in schema.fields)) {
          violations.push(`${path}.${key}: unexpected key — not part of the contract`);
        }
      }
      return;
    }
  }
}

/**
 * Validate `value` against `schema`.
 *
 * @returns every violation as a `$.a.b[0].c: expected …, received …` message.
 *          An empty array means the payload honours the contract.
 */
export function validateContract(value: unknown, schema: ApiSchema, path = '$'): string[] {
  const violations: string[] = [];
  walk(value, schema, path, violations);
  return violations;
}

// ------------------------- published contract -------------------------

const stringSchema: ApiSchema = { type: 'string' };
const numberSchema: ApiSchema = { type: 'number' };

/** A single product row — identical for both endpoints. */
export const apiProductSchema: ApiSchema = {
  type: 'object',
  fields: {
    id: numberSchema,
    name: stringSchema,
    price: stringSchema,
    brand: stringSchema,
    category: {
      type: 'object',
      fields: {
        usertype: { type: 'object', fields: { usertype: stringSchema } },
        category: stringSchema,
      },
    },
  },
};

/** Success envelope `{ responseCode, products }` shared by both endpoints. */
export const apiSuccessEnvelopeSchema: ApiSchema = {
  type: 'object',
  fields: {
    responseCode: numberSchema,
    products: { type: 'array', items: apiProductSchema },
  },
};

export const productsListResponseSchema: ApiSchema = apiSuccessEnvelopeSchema;
export const searchProductResponseSchema: ApiSchema = apiSuccessEnvelopeSchema;
