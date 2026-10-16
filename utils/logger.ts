import fs from 'fs';
import path from 'path';
import winston from 'winston';
import chalk from 'chalk';
import { env } from '../config/env';

// ---------------------------------------------------------------------------
// Logging contracts (OOP: interface + strategy + singleton)
// ---------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  success(message: string): void;
  step(message: string): void;
  warn(message: string): void;
  error(message: string, err?: unknown): void;
}

/** Strategy: how a log line is rendered. */
interface ILineFormatter {
  render(level: string, message: string, timestamp: string): string;
}

class PrettyLineFormatter implements ILineFormatter {
  public render(level: string, message: string, timestamp: string): string {
    const time = chalk.gray(timestamp);
    switch (level) {
      case 'error':
        return `${time} ${chalk.bgRed.white.bold(' ERROR ')} ${chalk.red(message)}`;
      case 'warn':
        return `${time} ${chalk.bgYellow.black.bold(' WARN  ')} ${chalk.yellow(message)}`;
      case 'debug':
        return `${time} ${chalk.bgGray.white.bold(' DEBUG ')} ${chalk.gray(message)}`;
      default:
        return `${time} ${chalk.bgGreen.black.bold(' INFO  ')} ${message}`;
    }
  }
}

class PlainLineFormatter implements ILineFormatter {
  public render(level: string, message: string, timestamp: string): string {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  }
}

function ensureLogsDir(): string {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? err.message;
  }
  return String(err);
}

/**
 * Central logger (Singleton).
 *
 * Why better than the reference repo:
 * - Pretty color console output (toggle with LOG_PRETTY) instead of silent file-only logs.
 * - Console + framework.log + error.log transports from the start.
 * - Per-test file transports that are attached/detached cleanly (no leak).
 * - `step` / `success` helpers so test output reads like a checklist.
 */
export class LoggerService implements ILogger {
  private static instance: LoggerService | null = null;

  private readonly winstonLogger: winston.Logger;
  private readonly formatter: ILineFormatter;
  private readonly testTransports = new Map<string, winston.transport>();

  private constructor() {
    const logsDir = ensureLogsDir();
    const pretty = env.logPretty;
    this.formatter = pretty ? new PrettyLineFormatter() : new PlainLineFormatter();

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return this.formatter.render(String(level), String(message), String(timestamp));
      }),
    );

    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${String(timestamp)} [${String(level).toUpperCase()}]: ${String(message)}`;
      }),
    );

    this.winstonLogger = winston.createLogger({
      level: env.logLevel,
      transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new winston.transports.File({
          filename: path.join(logsDir, 'framework.log'),
          format: fileFormat,
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'warn',
          format: fileFormat,
        }),
      ],
    });
  }

  public static getInstance(): LoggerService {
    if (LoggerService.instance === null) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  // ------------------------- ILogger -------------------------

  public debug(message: string): void {
    this.winstonLogger.debug(message);
  }

  public info(message: string): void {
    this.winstonLogger.info(message);
  }

  /** Success line (green check) — use for completed checkpoints. */
  public success(message: string): void {
    this.winstonLogger.info(`✅ ${message}`);
  }

  /** Step line (arrow) — use when starting a meaningful action. */
  public step(message: string): void {
    this.winstonLogger.info(`➤ ${message}`);
  }

  public warn(message: string): void {
    this.winstonLogger.warn(`⚠️ ${message}`);
  }

  public error(message: string, err?: unknown): void {
    if (err === undefined) {
      this.winstonLogger.error(`❌ ${message}`);
    } else {
      this.winstonLogger.error(`❌ ${message} — ${toMessage(err)}`);
    }
  }

  // ------------------------- Per-test files -------------------------

  /**
   * Attach a dedicated file transport for one test.
   * @returns absolute log file path (attach it to the Playwright report).
   */
  public attachTestFile(testTitle: string): string {
    const logsDir = ensureLogsDir();
    const safe = testTitle
      .replace(/[^a-z0-9]+/gi, '_')
      .toLowerCase()
      .slice(0, 80);
    const filePath = path.join(logsDir, `${safe}-${Date.now()}.log`);

    const transport = new winston.transports.File({ filename: filePath });
    this.testTransports.set(filePath, transport);
    this.winstonLogger.add(transport);
    return filePath;
  }

  public detachTestFile(filePath: string): void {
    const transport = this.testTransports.get(filePath);
    if (transport !== undefined) {
      this.winstonLogger.remove(transport);
      transport.close?.();
      this.testTransports.delete(filePath);
    }
  }

  /** Escape hatch for advanced Winston usage (e.g. custom child loggers). */
  public getWinston(): winston.Logger {
    return this.winstonLogger;
  }
}

/** Shared singleton — import this everywhere. */
export const logger: ILogger & Pick<LoggerService, 'attachTestFile' | 'detachTestFile'> =
  LoggerService.getInstance();
