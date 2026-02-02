/**
 * Log levels with their numeric values (Pino format).
 */
export const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const

export type LogLevelName = keyof typeof LOG_LEVELS

/**
 * Single log entry from the sandbox API.
 */
export interface LogEntry {
  readonly level: number
  readonly levelName: LogLevelName
  readonly time: number
  readonly seq: number // Sequence number for reliable ordering
  readonly msg: string
  readonly service?: string
  readonly [key: string]: unknown
}

/**
 * Response from GET /admin/logs.
 */
export interface LogsResponse {
  readonly entries: readonly LogEntry[]
  readonly total: number
  readonly hasMore: boolean
}

/**
 * Response from GET /admin/logs/files.
 */
export interface LogFilesResponse {
  readonly files: readonly string[]
}

/**
 * Level display configuration.
 */
export const LEVEL_CONFIG: Record<LogLevelName, { label: string; color: string }> = {
  trace: { label: "TRACE", color: "text-[#6b7280]" },
  debug: { label: "DEBUG", color: "text-[#9ca3af]" },
  info: { label: "INFO", color: "text-[#22c55e]" },
  warn: { label: "WARN", color: "text-[#eab308]" },
  error: { label: "ERROR", color: "text-[#ef4444]" },
  fatal: { label: "FATAL", color: "text-[#dc2626] font-bold" },
}
