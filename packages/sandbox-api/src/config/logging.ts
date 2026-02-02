/**
 * Logging configuration module
 *
 * Centralized configuration for Pino-based logging with rotating file support.
 * Environment variables control runtime behavior for different deployment scenarios.
 */

/**
 * Parse file size string (e.g., "50MB", "1GB") to bytes
 */
const parseFileSize = (size: string): number => {
  const match = /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i.exec(size.trim())
  if (!match) {
    console.warn(`[logging] Invalid file size format: ${size}, defaulting to 50MB`)
    return 50 * 1024 * 1024
  }

  const value = Number.parseFloat(match[1] ?? "50")
  const unit = (match[2] ?? "MB").toUpperCase()

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }

  return Math.floor(value * (multipliers[unit] ?? 1024 * 1024))
}

/**
 * Logging configuration
 *
 * @remarks
 * - `level`: Log level (trace, debug, info, warn, error, fatal)
 *   - Defaults to "info"
 *   - Set via `LOG_LEVEL` env var
 * - `enableFileLogging`: Whether to write logs to rotating files
 *   - Defaults to `false` in development, `true` in production
 *   - Set via `LOG_TO_FILE` env var
 * - `logDir`: Directory for log files
 *   - Defaults to "./logs"
 *   - Set via `LOG_DIR` env var
 * - `logFile`: Log filename pattern (supports date tokens)
 *   - Defaults to "sandbox-api.%Y-%m-%d.log"
 *   - Set via `LOG_FILE` env var
 * - `rotationFrequency`: How often to rotate logs
 *   - Defaults to "daily"
 *   - Set via `LOG_ROTATION_FREQUENCY` env var ("daily" | "hourly")
 * - `maxFileSize`: Maximum log file size before rotation
 *   - Defaults to "50MB"
 *   - Set via `LOG_MAX_SIZE` env var
 * - `retentionDays`: Days to keep old log files
 *   - Defaults to 30
 *   - Set via `LOG_RETENTION_DAYS` env var
 * - `prettyPrint`: Whether to use pretty-printed output
 *   - Defaults to `true` in development, `false` in production
 *
 * @example
 * ```bash
 * # Development (default)
 * LOG_LEVEL=debug
 *
 * # Production with file logging
 * LOG_LEVEL=info
 * LOG_TO_FILE=true
 * LOG_DIR=/var/log/sandbox-api
 * LOG_RETENTION_DAYS=90
 *
 * # Verbose debug logging
 * LOG_LEVEL=trace
 * LOG_TO_FILE=true
 * ```
 */
export const LoggingConfig = {
  /**
   * Log level
   * @default "info"
   */
  level: (process.env["LOG_LEVEL"] ?? "info") as
    | "trace"
    | "debug"
    | "info"
    | "warn"
    | "error"
    | "fatal",

  /**
   * Enable file logging
   * @default false in development, true in production
   */
  enableFileLogging:
    process.env["LOG_TO_FILE"] === "true" || process.env["NODE_ENV"] === "production",

  /**
   * Log directory
   * @default "./logs"
   */
  logDir: (process.env["LOG_DIR"] ?? "./logs") as string,

  /**
   * Log filename base (pino-roll adds numeric suffix)
   * @default "sandbox-api"
   */
  logFile: (process.env["LOG_FILE"] ?? "sandbox-api") as string,

  /**
   * Rotation frequency
   * @default "daily"
   */
  rotationFrequency: (process.env["LOG_ROTATION_FREQUENCY"] ?? "daily") as "daily" | "hourly",

  /**
   * Maximum file size (as string, e.g., "50MB")
   * @default "50MB"
   */
  maxFileSizeStr: (process.env["LOG_MAX_SIZE"] ?? "50MB") as string,

  /**
   * Maximum file size in bytes (parsed from maxFileSizeStr)
   */
  get maxFileSize(): number {
    return parseFileSize(this.maxFileSizeStr)
  },

  /**
   * Days to retain old log files
   * @default 30
   */
  retentionDays: Number.parseInt(process.env["LOG_RETENTION_DAYS"] ?? "30", 10),

  /**
   * Pretty print logs (human-readable format)
   * @default true in development, false in production
   */
  prettyPrint: process.env["NODE_ENV"] !== "production",
} as const

export type LogLevel = (typeof LoggingConfig)["level"]
