import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs"
import { join } from "node:path"
import { Context, Effect, Layer } from "effect"
import pino from "pino"
import type { Logger } from "pino"
import { LoggingConfig, type LogLevel } from "../config/logging.js"

/**
 * Logging Service
 *
 * Provides structured logging via Pino with rotating file support.
 * Intercepts console.* calls globally to route through Pino transparently.
 *
 * Features:
 * - Structured JSON logging for production
 * - Pretty-printed colored output for development
 * - Rotating file logs with configurable retention
 * - Global console interception (no code changes needed)
 * - Service name extraction from [ServiceName] prefixes
 */

// Service interface
export interface LoggingServiceShape {
  readonly logger: Logger
  readonly trace: (msg: string, obj?: object) => Effect.Effect<void>
  readonly debug: (msg: string, obj?: object) => Effect.Effect<void>
  readonly info: (msg: string, obj?: object) => Effect.Effect<void>
  readonly warn: (msg: string, obj?: object) => Effect.Effect<void>
  readonly error: (msg: string, obj?: object) => Effect.Effect<void>
  readonly fatal: (msg: string, obj?: object) => Effect.Effect<void>
  readonly child: (bindings: object) => Logger
  readonly cleanupOldLogs: Effect.Effect<number>
}

// Service tag
export class LoggingService extends Context.Tag("LoggingService")<
  LoggingService,
  LoggingServiceShape
>() {}

// Parse [ServiceName] prefix from log message
// Returns { service, message } where service is extracted or undefined
const parseServicePrefix = (msg: string): { service?: string; message: string } => {
  const match = /^\[([^\]]+)\]\s*(.*)$/.exec(msg)
  if (match && match[1] && match[2] !== undefined) {
    return { service: match[1], message: match[2] }
  }
  return { message: msg }
}

// Store original console methods for restoration and fallback
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
  trace: console.trace.bind(console),
}

// Create Pino logger with appropriate transports
const createLogger = (): Logger => {
  const { level, enableFileLogging, logDir, logFile, prettyPrint } = LoggingConfig

  // Build transports array
  const targets: pino.TransportTargetOptions[] = []

  // Console transport
  if (prettyPrint) {
    targets.push({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.L",
        ignore: "pid,hostname",
      },
      level,
    })
  } else {
    targets.push({
      target: "pino/file",
      options: { destination: 1 }, // stdout
      level,
    })
  }

  // File transport (rotating)
  if (enableFileLogging) {
    // Ensure log directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    targets.push({
      target: "pino-roll",
      options: {
        file: join(logDir, logFile),
        frequency: LoggingConfig.rotationFrequency,
        limit: { count: LoggingConfig.retentionDays },
        mkdir: true,
      },
      level,
    })
  }

  // Create logger with transports
  const transport = pino.transport({
    targets,
  })

  return pino(
    {
      level,
      base: {
        pid: process.pid,
      },
    },
    transport,
  )
}

// Intercept console methods to route through Pino
const interceptConsole = (logger: Logger): void => {
  // Map console methods to pino levels
  const methodMap: Array<{
    method: "log" | "info" | "warn" | "error" | "debug" | "trace"
    level: LogLevel
  }> = [
    { method: "log", level: "info" },
    { method: "info", level: "info" },
    { method: "warn", level: "warn" },
    { method: "error", level: "error" },
    { method: "debug", level: "debug" },
    { method: "trace", level: "trace" },
  ]

  for (const { method, level } of methodMap) {
    console[method] = (...args: unknown[]) => {
      // Handle different argument patterns
      if (args.length === 0) return

      const firstArg = args[0]

      // Handle string messages (most common case)
      if (typeof firstArg === "string") {
        const { service, message } = parseServicePrefix(firstArg)
        const restArgs = args.slice(1)

        // Build context object
        let context: object = {}
        if (service) {
          context = { ...context, service }
        }

        // If there are additional arguments, include them
        if (restArgs.length > 0) {
          // If single object argument, merge it
          if (restArgs.length === 1 && typeof restArgs[0] === "object" && restArgs[0] !== null) {
            context = { ...context, ...(restArgs[0] as object) }
          } else {
            // Otherwise store as args array
            context = { ...context, args: restArgs }
          }
        }

        if (Object.keys(context).length > 0) {
          logger[level](context, message)
        } else {
          logger[level](message)
        }
        return
      }

      // Handle object first argument (Pino-style)
      if (typeof firstArg === "object" && firstArg !== null) {
        const message = args.length > 1 && typeof args[1] === "string" ? args[1] : undefined
        if (message) {
          logger[level](firstArg, message)
        } else {
          logger[level](firstArg)
        }
        return
      }

      // Fallback: stringify all args
      logger[level](args.map((a) => String(a)).join(" "))
    }
  }
}

// Clean up old log files beyond retention period
// pino-roll creates files with numeric suffixes (e.g., sandbox-api.1, sandbox-api.2)
const cleanupOldLogs = (logDir: string, retentionDays: number): number => {
  if (!existsSync(logDir)) {
    return 0
  }

  const now = Date.now()
  const maxAge = retentionDays * 24 * 60 * 60 * 1000
  let cleaned = 0

  // Match log files: either .log extension or numeric suffix from pino-roll
  const isLogFile = (filename: string): boolean => {
    return filename.endsWith(".log") || /\.\d+$/.test(filename)
  }

  try {
    const files = readdirSync(logDir)
    for (const file of files) {
      if (!isLogFile(file)) continue

      const filePath = join(logDir, file)
      try {
        const stats = statSync(filePath)
        const age = now - stats.mtime.getTime()

        if (age > maxAge) {
          rmSync(filePath)
          cleaned++
        }
      } catch {
        // Ignore individual file errors
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return cleaned
}

// Service implementation
const make = Effect.gen(function* () {
  const logger = createLogger()

  // Intercept console at startup
  interceptConsole(logger)

  // Log startup
  logger.info(
    {
      level: LoggingConfig.level,
      fileLogging: LoggingConfig.enableFileLogging,
      logDir: LoggingConfig.enableFileLogging ? LoggingConfig.logDir : undefined,
      prettyPrint: LoggingConfig.prettyPrint,
    },
    "Logging service initialized",
  )

  // Effect wrappers for typed logging
  const trace = (msg: string, obj?: object) =>
    Effect.sync(() => {
      if (obj) {
        logger.trace(obj, msg)
      } else {
        logger.trace(msg)
      }
    })

  const debug = (msg: string, obj?: object) =>
    Effect.sync(() => {
      if (obj) {
        logger.debug(obj, msg)
      } else {
        logger.debug(msg)
      }
    })

  const info = (msg: string, obj?: object) =>
    Effect.sync(() => {
      if (obj) {
        logger.info(obj, msg)
      } else {
        logger.info(msg)
      }
    })

  const warn = (msg: string, obj?: object) =>
    Effect.sync(() => {
      if (obj) {
        logger.warn(obj, msg)
      } else {
        logger.warn(msg)
      }
    })

  const error = (msg: string, obj?: object) =>
    Effect.sync(() => {
      if (obj) {
        logger.error(obj, msg)
      } else {
        logger.error(msg)
      }
    })

  const fatal = (msg: string, obj?: object) =>
    Effect.sync(() => {
      if (obj) {
        logger.fatal(obj, msg)
      } else {
        logger.fatal(msg)
      }
    })

  const child = (bindings: object) => logger.child(bindings)

  const cleanupOldLogsEffect = Effect.sync(() =>
    cleanupOldLogs(LoggingConfig.logDir, LoggingConfig.retentionDays),
  )

  return {
    logger,
    trace,
    debug,
    info,
    warn,
    error,
    fatal,
    child,
    cleanupOldLogs: cleanupOldLogsEffect,
  }
})

// Live layer
export const LoggingServiceLive = Layer.effect(LoggingService, make)

// Export for restoration in tests
export const restoreConsole = (): void => {
  console.log = originalConsole.log
  console.info = originalConsole.info
  console.warn = originalConsole.warn
  console.error = originalConsole.error
  console.debug = originalConsole.debug
  console.trace = originalConsole.trace
}
