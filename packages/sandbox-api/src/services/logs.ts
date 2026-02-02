import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { Context, Data, Effect, Layer } from "effect"
import { LoggingConfig } from "../config/logging.js"

/**
 * Logs Service
 *
 * Provides access to application logs with:
 * - Circular buffer for recent logs (max 1000 entries)
 * - Callback system for SSE subscribers
 * - File-based log reading for historical data
 * - Level filtering support
 */

// Pino log levels (numeric values)
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
 * Single log entry (input, before seq is assigned)
 */
export interface LogEntryInput {
  readonly level: number // Pino: 10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal
  readonly levelName: LogLevelName
  readonly time: number // Unix timestamp in ms
  readonly msg: string
  readonly service?: string
  readonly [key: string]: unknown // Additional fields from structured logging
}

/**
 * Single log entry (with sequence number)
 */
export interface LogEntry extends LogEntryInput {
  readonly seq: number // Sequence number for ordering entries with identical timestamps
}

/**
 * Query parameters for fetching logs
 */
export interface LogQuery {
  readonly level?: number // Minimum level to include
  readonly search?: string // Text search in message
  readonly limit?: number // Max entries to return (default 100)
  readonly offset?: number // Pagination offset
  readonly startTime?: number // Filter by time range (ms timestamp)
  readonly endTime?: number // Filter by time range (ms timestamp)
}

/**
 * Response for log queries
 */
export interface LogsResponse {
  readonly entries: readonly LogEntry[]
  readonly total: number
  readonly hasMore: boolean
}

/**
 * Logs service errors
 */
export class LogsError extends Data.TaggedClass("LogsError")<{
  readonly cause: "ReadFailed" | "ParseFailed" | "NotFound"
  readonly message: string
}> {}

/**
 * Subscriber callback type
 */
export type LogSubscriber = (entry: LogEntry) => void

/**
 * Service interface
 */
export interface LogsServiceShape {
  readonly getLogs: (query: LogQuery) => Effect.Effect<LogsResponse, LogsError>
  readonly subscribe: (callback: LogSubscriber) => () => void // Returns unsubscribe function
  readonly getRecentLogs: (count: number) => readonly LogEntry[]
  readonly addEntry: (entry: LogEntryInput) => void
  readonly getLogFiles: Effect.Effect<readonly string[], LogsError>
  readonly downloadLogs: (filename?: string) => Effect.Effect<string, LogsError>
}

// Service tag
export class LogsService extends Context.Tag("LogsService")<LogsService, LogsServiceShape>() {}

/**
 * Convert Pino numeric level to level name
 */
export const levelToName = (level: number): LogLevelName => {
  if (level <= 10) return "trace"
  if (level <= 20) return "debug"
  if (level <= 30) return "info"
  if (level <= 40) return "warn"
  if (level <= 50) return "error"
  return "fatal"
}

/**
 * Parse a single line of Pino JSON log
 * @param line - The log line to parse
 * @param seq - Sequence number to assign
 */
const parseLogLine = (line: string, seq: number): LogEntry | null => {
  if (!line.trim()) return null

  try {
    const parsed = JSON.parse(line) as Record<string, unknown>
    const level = typeof parsed["level"] === "number" ? parsed["level"] : 30
    const time = typeof parsed["time"] === "number" ? parsed["time"] : Date.now()
    const msg = typeof parsed["msg"] === "string" ? parsed["msg"] : ""
    const service = typeof parsed["service"] === "string" ? parsed["service"] : undefined

    const entry: LogEntry = {
      ...parsed,
      level,
      levelName: levelToName(level),
      time,
      seq,
      msg,
    }
    if (service) {
      return { ...entry, service }
    }
    return entry
  } catch {
    // If not valid JSON, create a simple entry
    return {
      level: 30,
      levelName: "info",
      time: Date.now(),
      seq,
      msg: line,
    }
  }
}

/**
 * Circular buffer implementation for recent logs
 */
class CircularBuffer<T> {
  private readonly buffer: T[]
  private readonly maxSize: number
  private head = 0
  private count = 0

  constructor(maxSize: number) {
    this.maxSize = maxSize
    this.buffer = new Array(maxSize)
  }

  push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.maxSize
    if (this.count < this.maxSize) {
      this.count++
    }
  }

  getAll(): readonly T[] {
    const result: T[] = []
    // Start from oldest and go to newest
    const start = this.count < this.maxSize ? 0 : this.head
    for (let i = 0; i < this.count; i++) {
      const index = (start + i) % this.maxSize
      const item = this.buffer[index]
      if (item !== undefined) {
        result.push(item)
      }
    }
    return result
  }

  getRecent(count: number): readonly T[] {
    const all = this.getAll()
    return all.slice(-count)
  }

  size(): number {
    return this.count
  }
}

// Service implementation
const make = Effect.gen(function* () {
  // Circular buffer for recent logs (max 1000 entries)
  const recentLogs = new CircularBuffer<LogEntry>(1000)

  // Subscribers for SSE streaming
  const subscribers = new Set<LogSubscriber>()

  // Sequence counter for ordering entries with identical timestamps
  let sequenceCounter = 0

  /**
   * Add a log entry to the buffer and notify subscribers
   */
  const addEntry = (entry: LogEntryInput): void => {
    // Assign sequence number for ordering
    const entryWithSeq: LogEntry = { ...entry, seq: sequenceCounter++ }
    recentLogs.push(entryWithSeq)

    // Notify all subscribers
    for (const subscriber of subscribers) {
      try {
        subscriber(entryWithSeq)
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  /**
   * Subscribe to new log entries
   * Returns unsubscribe function
   */
  const subscribe = (callback: LogSubscriber): (() => void) => {
    subscribers.add(callback)
    return () => {
      subscribers.delete(callback)
    }
  }

  /**
   * Get recent logs from the buffer
   */
  const getRecentLogs = (count: number): readonly LogEntry[] => {
    return recentLogs.getRecent(count)
  }

  /**
   * List available log files
   */
  const getLogFiles = Effect.gen(function* () {
    const logDir = LoggingConfig.logDir

    if (!existsSync(logDir)) {
      return []
    }

    try {
      const files = readdirSync(logDir)
      // Filter to log files and sort by modification time (newest first)
      const logFiles = files
        .filter((f) => f.endsWith(".log") || /\.\d+$/.test(f))
        .map((f) => ({
          name: f,
          mtime: statSync(join(logDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime)
        .map((f) => f.name)

      return logFiles
    } catch (error) {
      return yield* Effect.fail(
        new LogsError({
          cause: "ReadFailed",
          message: `Failed to list log files: ${error instanceof Error ? error.message : "Unknown error"}`,
        }),
      )
    }
  })

  /**
   * Read and parse log entries from files
   */
  const readLogEntries = (
    files: readonly string[],
    query: LogQuery,
  ): Effect.Effect<LogEntry[], LogsError> =>
    Effect.gen(function* () {
      const logDir = LoggingConfig.logDir
      const entries: LogEntry[] = []
      // Use negative sequence numbers for file entries (older than in-memory)
      let fileSeq = -1000000

      for (const file of files) {
        const filePath = join(logDir, file)
        try {
          const content = readFileSync(filePath, "utf-8")
          const lines = content.split("\n")

          for (const line of lines) {
            const entry = parseLogLine(line, fileSeq++)
            if (entry) {
              entries.push(entry)
            }
          }
        } catch (error) {
          // Log warning but continue with other files
          console.warn(`Failed to read log file ${file}:`, error)
        }
      }

      // Sort by seq (preserves order within same timestamp)
      entries.sort((a, b) => b.seq - a.seq)

      // Apply filters
      let filtered = entries

      // Level filter
      const minLevel = query.level
      if (minLevel !== undefined) {
        filtered = filtered.filter((e) => e.level >= minLevel)
      }

      // Time range filter
      const startTime = query.startTime
      const endTime = query.endTime
      if (startTime !== undefined) {
        filtered = filtered.filter((e) => e.time >= startTime)
      }
      if (endTime !== undefined) {
        filtered = filtered.filter((e) => e.time <= endTime)
      }

      // Search filter (case-insensitive)
      if (query.search) {
        const searchLower = query.search.toLowerCase()
        filtered = filtered.filter(
          (e) =>
            e.msg.toLowerCase().includes(searchLower) ||
            e.service?.toLowerCase().includes(searchLower),
        )
      }

      return filtered
    })

  /**
   * Get logs with filtering
   */
  const getLogs = (query: LogQuery): Effect.Effect<LogsResponse, LogsError> =>
    Effect.gen(function* () {
      const limit = query.limit ?? 100
      const offset = query.offset ?? 0

      // First, get from recent buffer
      const bufferLogs = recentLogs.getAll()
      let entries = [...bufferLogs]

      // If we need more, read from files
      if (entries.length < limit + offset && LoggingConfig.enableFileLogging) {
        const files = yield* getLogFiles
        if (files.length > 0) {
          const fileEntries = yield* readLogEntries(files, query)
          // Merge and deduplicate by time + msg
          const seen = new Set(entries.map((e) => `${e.time}-${e.msg}`))
          for (const entry of fileEntries) {
            const key = `${entry.time}-${entry.msg}`
            if (!seen.has(key)) {
              entries.push(entry)
              seen.add(key)
            }
          }
        }
      }

      // Apply filters to buffer logs too
      const minLevel = query.level
      const startTime = query.startTime
      const endTime = query.endTime
      if (minLevel !== undefined) {
        entries = entries.filter((e) => e.level >= minLevel)
      }
      if (startTime !== undefined) {
        entries = entries.filter((e) => e.time >= startTime)
      }
      if (endTime !== undefined) {
        entries = entries.filter((e) => e.time <= endTime)
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase()
        entries = entries.filter(
          (e) =>
            e.msg.toLowerCase().includes(searchLower) ||
            e.service?.toLowerCase().includes(searchLower),
        )
      }

      // Sort by time (newest first)
      entries.sort((a, b) => b.time - a.time)

      const total = entries.length
      const paged = entries.slice(offset, offset + limit)
      const hasMore = offset + limit < total

      return {
        entries: paged,
        total,
        hasMore,
      }
    })

  /**
   * Download logs as text file content
   */
  const downloadLogs = (filename?: string): Effect.Effect<string, LogsError> =>
    Effect.gen(function* () {
      const logDir = LoggingConfig.logDir

      // If specific file requested
      if (filename) {
        const filePath = join(logDir, filename)
        if (!existsSync(filePath)) {
          return yield* Effect.fail(
            new LogsError({
              cause: "NotFound",
              message: `Log file not found: ${filename}`,
            }),
          )
        }
        try {
          return readFileSync(filePath, "utf-8")
        } catch (error) {
          return yield* Effect.fail(
            new LogsError({
              cause: "ReadFailed",
              message: `Failed to read log file: ${error instanceof Error ? error.message : "Unknown error"}`,
            }),
          )
        }
      }

      // Otherwise, get all logs from buffer
      const entries = recentLogs.getAll()
      return entries.map((e) => JSON.stringify(e)).join("\n")
    })

  return {
    getLogs,
    subscribe,
    getRecentLogs,
    addEntry,
    getLogFiles,
    downloadLogs,
  }
})

// Live layer
export const LogsServiceLive = Layer.effect(LogsService, make)

/**
 * Module-level reference for global log integration
 * Used to push logs from the logging service to the logs service
 */
let globalLogsService: LogsServiceShape | null = null

/**
 * Set the global logs service reference
 * Called during server startup to enable log capture
 */
export const setGlobalLogsService = (service: LogsServiceShape | null): void => {
  globalLogsService = service
}

/**
 * Get the global logs service reference
 * Returns null if not yet initialized
 */
export const getGlobalLogsService = (): LogsServiceShape | null => {
  return globalLogsService
}
