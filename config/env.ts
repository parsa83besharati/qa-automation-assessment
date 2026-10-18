import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function loadEnvFile(): void {
  const candidates = [path.resolve(process.cwd(), '.env'), path.resolve(__dirname, '..', '.env')];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (envPath) {
    dotenv.config({ path: envPath, override: false });
  } else {
    dotenv.config();
  }
}

loadEnvFile();

// ---------------------------------------------------------------------------
// Dynamic defaults — everything the Task needs lives here (committed to git).
// Secrets / keys stay in process.env (.env, never committed).
// ---------------------------------------------------------------------------

export const DEFAULT_BOOKING_BASE_URL = 'https://www.booking.com';
export const DEFAULT_API_BASE_URL = 'https://automationexercise.com';

export type HealingMode = 'runtime' | 'post-mortem';

export interface SearchDefaults {
  currency: string;
  destination: string;
  adults: number;
  travellingWithPets: boolean;
  targetHotelIndex: number;
}

/**
 * Central environment configuration (Singleton).
 *
 * OOP showcase:
 * - Single source of truth for every dynamic value in the framework.
 * - Lazy-normalised getters (URL cleanup, int parsing, boolean parsing).
 * - Pure helpers for dates / URLs so tests stay deterministic yet dynamic.
 */
export class EnvConfig {
  private static instance: EnvConfig | null = null;

  /** Enforce singleton — use {@link EnvConfig.getInstance} or the `env` export. */
  private constructor() {
    // no-op: all state is read lazily from process.env
  }

  public static getInstance(): EnvConfig {
    if (EnvConfig.instance === null) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }

  // ------------------------- URLs -------------------------

  public get bookingBaseUrl(): string {
    return EnvConfig.normaliseUrl(
      process.env.BOOKING_BASE_URL ?? process.env.BASE_URL ?? DEFAULT_BOOKING_BASE_URL,
    );
  }

  public get apiBaseUrl(): string {
    return EnvConfig.normaliseUrl(process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL);
  }

  /** Legacy alias — reference repo used BASE_URL for the shop origin. */
  public get baseUrl(): string {
    return this.bookingBaseUrl;
  }

  // ------------------------- Browser / runner -------------------------

  public get headless(): boolean {
    return (process.env.HEADLESS ?? 'true').toLowerCase() !== 'false';
  }

  public get isCI(): boolean {
    return (process.env.CI ?? '').toLowerCase() === 'true';
  }

  // ------------------------- Proxy (geo-blocked egress) -------------------------

  /**
   * Optional egress proxy for the **UI browser** projects.
   *
   * Booking.com geo-restricts many networks and answers with
   * *"We are sorry to inform you that, at this moment, access from your
   * location is not possible."* — the whole search widget is missing, so every
   * Task 1 case fails at step one. Set {@link PROXY_SERVER} to route the
   * browsers through an allowed region and the identical suite passes.
   *
   * The `api` project deliberately stays direct: AutomationExercise is not
   * geo-blocked, and proxying it would only add latency to the SLO assertions.
   *
   * @returns Playwright-compatible proxy settings, or `undefined` when unset.
   */
  public get proxy(): { server: string; username?: string; password?: string } | undefined {
    const server = (process.env.PROXY_SERVER ?? '').trim();
    if (!server) {
      return undefined;
    }
    const username = (process.env.PROXY_USERNAME ?? '').trim();
    const password = (process.env.PROXY_PASSWORD ?? '').trim();
    return {
      server: EnvConfig.normaliseProxyUrl(server),
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
    };
  }

  /** True when UI traffic will be routed through {@link proxy}. */
  public get isProxied(): boolean {
    return this.proxy !== undefined;
  }

  // ------------------------- Task 1 search defaults -------------------------

  public get searchDefaults(): SearchDefaults {
    return {
      currency: (process.env.DEFAULT_CURRENCY ?? 'TRY').trim().toUpperCase(),
      destination: (process.env.DEFAULT_DESTINATION ?? 'London').trim(),
      adults: EnvConfig.parseInt(process.env.DEFAULT_ADULTS, 8),
      travellingWithPets: EnvConfig.parseBool(process.env.TRAVELLING_WITH_PETS, true),
      targetHotelIndex: EnvConfig.parseInt(process.env.TARGET_HOTEL_INDEX, 3),
    };
  }

  // ------------------------- Task 2 API SLO -------------------------

  /** Latency budget for a single API call (ms) — mirrors k6 `p(95)<1500`. */
  public get apiLatencyBudgetMs(): number {
    return EnvConfig.parseInt(process.env.API_LATENCY_BUDGET_MS, 1500);
  }

  // ------------------------- Self-healing -------------------------

  public get selfHealingEnabled(): boolean {
    return (process.env.SELF_HEALING_ENABLED ?? 'false').toLowerCase() === 'true';
  }

  public get healingMode(): HealingMode {
    return process.env.HEALING_MODE === 'post-mortem' ? 'post-mortem' : 'runtime';
  }

  // ------------------------- Logging -------------------------

  public get logLevel(): string {
    return (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  }

  public get logPretty(): boolean {
    return (process.env.LOG_PRETTY ?? 'true').toLowerCase() !== 'false';
  }

  // ------------------------- Dynamic date helpers -------------------------

  /** Current Gregorian month (1-12) — Task says "select the current month". */
  public get currentMonth(): { year: number; month: number; label: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return { year, month, label };
  }

  // ------------------------- URL resolvers -------------------------

  public resolveBookingUrl(pathOrUrl: string): string {
    return EnvConfig.joinUrl(this.bookingBaseUrl, pathOrUrl);
  }

  public resolveApiUrl(pathOrUrl: string): string {
    return EnvConfig.joinUrl(this.apiBaseUrl, pathOrUrl);
  }

  // ------------------------- Static pure helpers -------------------------

  public static normaliseUrl(raw: string): string {
    let url = raw.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url;
  }

  /**
   * Accept `host:port`, `http://host:port` or `socks5://host:port`.
   * Playwright requires a scheme, so `http://` is assumed when omitted.
   */
  public static normaliseProxyUrl(raw: string): string {
    const trimmed = raw.trim().replace(/\/+$/, '');
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  }

  public static joinUrl(base: string, pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }
    const suffix = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${base.replace(/\/+$/, '')}${suffix}`;
  }

  public static parseInt(raw: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(raw ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  public static parseBool(raw: string | undefined, fallback: boolean): boolean {
    if (raw === undefined || raw === '') {
      return fallback;
    }
    return raw.toLowerCase() === 'true';
  }
}

/** Shared singleton — import this everywhere instead of `process.env` directly. */
export const env = EnvConfig.getInstance();

// ---------------------------------------------------------------------------
// Functional wrappers (kept for ergonomics / reference-repo familiarity)
// ---------------------------------------------------------------------------

export function getBaseUrl(): string {
  return env.bookingBaseUrl;
}

export function getBookingBaseUrl(): string {
  return env.bookingBaseUrl;
}

export function getApiBaseUrl(): string {
  return env.apiBaseUrl;
}

export function resolveUrl(pathOrUrl: string): string {
  return env.resolveBookingUrl(pathOrUrl);
}

export function resolveApiUrl(pathOrUrl: string): string {
  return env.resolveApiUrl(pathOrUrl);
}

let loggedOnce = false;

/** Log resolved config once per process so reports show what ran where. */
export function logEnvOnce(label = 'env'): void {
  if (loggedOnce) {
    return;
  }
  loggedOnce = true;
  const search = env.searchDefaults;
  console.info(
    `[${label}] BOOKING=${env.bookingBaseUrl} API=${env.apiBaseUrl} ` +
      `HEADLESS=${env.headless} HEALING=${env.selfHealingEnabled ? 'ON' : 'OFF'}(${env.healingMode}) ` +
      `SEARCH={currency:${search.currency} destination:${search.destination} adults:${search.adults} pets:${search.travellingWithPets} hotelIndex:${search.targetHotelIndex}} ` +
      `API_SLO=${env.apiLatencyBudgetMs}ms ` +
      `PROXY=${env.proxy ? env.proxy.server : 'direct (UI)'}`,
  );
}
