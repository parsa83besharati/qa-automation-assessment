import { env, logEnvOnce } from './config/env';

export default async function globalSetup(): Promise<void> {
  logEnvOnce('global-setup');
  // Propagate resolved values to workers (dotenv is also loaded in config/env.ts).
  process.env.BOOKING_BASE_URL = env.bookingBaseUrl;
  process.env.API_BASE_URL = env.apiBaseUrl;
  process.env.BASE_URL = env.bookingBaseUrl;
}
