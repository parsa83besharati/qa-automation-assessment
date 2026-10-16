/** Shared spec helpers — no page.goto here, only assertions building blocks. */
export const Tags = {
  smoke: '@smoke',
  regression: '@regression',
  negative: '@negative',
  edge: '@edge',
  security: '@security',
  api: '@api',
  ui: '@ui',
} as const;
