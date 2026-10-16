import { logger } from './logger';

function stringifyError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

/**
 * Navigation-specific logger (composition over inheritance).
 * Keeps URL transitions visually distinct from action logs.
 */
export class NavigationLogger {
  public static to(target: string, base: string): void {
    logger.info(`🌐 Navigate → ${target} (BASE=${base})`);
  }

  public static landed(url: string): void {
    logger.success(`🌐 Landed → ${url}`);
  }

  public static failed(target: string, err: unknown): void {
    logger.error(`🌐 Navigation failed → ${target}: ${stringifyError(err)}`);
  }

  public static api(method: string, url: string, status?: number): void {
    const suffix = status === undefined ? '' : ` [${status}]`;
    logger.info(`🔌 API ${method.toUpperCase()} ${url}${suffix}`);
  }
}

// Functional wrappers (same style as the reference repo).
export function logNavigation(message: string): void {
  logger.info(`🌐 ${message}`);
}

export function logNavigationError(message: string, err: unknown): void {
  logger.error(`🌐 ${message}`, err);
}
