import { Context, Effect, Layer } from "effect"

/**
 * Audit Logging Service
 *
 * Provides structured logging for security-relevant events in the sandbox API.
 * All audit logs include timestamp, event type, and contextual metadata.
 *
 * Security Finding: V-019 (Low)
 */

// Audit event types - categorized for filtering and analysis
export const AuditEventType = {
  // Session lifecycle events
  SESSION_CREATED: "session.created",
  SESSION_DESTROYED: "session.destroyed",
  SESSION_EXPIRED: "session.expired",
  SESSION_LOOKUP: "session.lookup",

  // Authentication events
  AUTH_SUCCESS: "auth.success",
  AUTH_FAILURE: "auth.failure",
  AUTH_MISSING: "auth.missing",

  // Rate limiting events
  RATE_LIMIT_HIT: "rate_limit.hit",
  RATE_LIMIT_SESSION: "rate_limit.session",
  RATE_LIMIT_WEBSOCKET: "rate_limit.websocket",

  // WebSocket events
  WS_CONNECTED: "websocket.connected",
  WS_DISCONNECTED: "websocket.disconnected",
  WS_FAILED: "websocket.failed",

  // Input validation events
  INPUT_INVALID: "input.invalid",
  INPUT_SANITIZED: "input.sanitized",

  // Error events
  ERROR_CONTAINER: "error.container",
  ERROR_INTERNAL: "error.internal",
} as const

export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType]

// Common metadata fields
export interface AuditMetadata {
  readonly sessionId?: string
  readonly clientIp?: string
  readonly userAgent?: string
  readonly toolPair?: string
  readonly [key: string]: unknown
}

// Audit log entry structure
export interface AuditLogEntry {
  readonly timestamp: string
  readonly level: "info" | "warn" | "error"
  readonly eventType: AuditEventType
  readonly message: string
  readonly metadata: AuditMetadata
}

// Service interface
export interface AuditServiceShape {
  readonly log: (
    level: "info" | "warn" | "error",
    eventType: AuditEventType,
    message: string,
    metadata: AuditMetadata,
  ) => Effect.Effect<void>
  readonly logSessionCreated: (
    sessionId: string,
    toolPair: string,
    clientIp: string,
    expiresAt: Date,
  ) => Effect.Effect<void>
  readonly logSessionDestroyed: (
    sessionId: string,
    clientIp: string,
    reason?: "user_request" | "expired" | "error",
  ) => Effect.Effect<void>
  readonly logAuthFailure: (
    reason: string,
    clientIp: string,
    sessionId?: string,
  ) => Effect.Effect<void>
  readonly logRateLimitHit: (
    type: "session" | "websocket",
    clientIp: string,
    limit: number,
    window: string,
  ) => Effect.Effect<void>
  readonly logInputInvalid: (
    sessionId: string,
    clientIp: string,
    reason: string,
    input?: string,
  ) => Effect.Effect<void>
  readonly logError: (
    errorType: string,
    message: string,
    metadata: AuditMetadata,
  ) => Effect.Effect<void>
}

// Service tag
export class AuditService extends Context.Tag("AuditService")<
  AuditService,
  AuditServiceShape
>() {}

// Helper: Format metadata as JSON string for console output
const _formatMetadata = (metadata: AuditMetadata): string => {
  // Sanitize metadata for logging - remove any sensitive data
  const sanitized = { ...metadata }

  // Redact any fields that might contain sensitive data
  if (sanitized.input !== undefined) {
    // Truncate input to 100 chars
    sanitized.input = String(sanitized.input).slice(0, 100) + (String(sanitized.input).length > 100 ? "..." : "")
  }

  return JSON.stringify(sanitized)
}

// Helper: Write audit log to console (structured JSON format)
const writeLog = (entry: AuditLogEntry): void => {
  // Output structured JSON logs for easy parsing by log aggregators
  // Format: [AUDIT] level=INFO event=session.created message="..." metadata={...}
  const logLine = `[AUDIT] ${JSON.stringify({
    level: entry.level,
    event: entry.eventType,
    message: entry.message,
    ...entry.metadata,
    timestamp: entry.timestamp,
  })}`

  switch (entry.level) {
    case "error":
      console.error(logLine)
      break
    case "warn":
      console.warn(logLine)
      break
    default:
      console.log(logLine)
  }
}

// Service implementation
const make = Effect.gen(function* () {
  const log = (
    level: "info" | "warn" | "error",
    eventType: AuditEventType,
    message: string,
    metadata: AuditMetadata,
  ) =>
    Effect.sync(() => {
      const entry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        eventType,
        message,
        metadata,
      }
      writeLog(entry)
    })

  const logSessionCreated = (
    sessionId: string,
    toolPair: string,
    clientIp: string,
    expiresAt: Date,
  ) =>
    log(
      "info",
      AuditEventType.SESSION_CREATED,
      `Session created for tool pair: ${toolPair}`,
      {
        sessionId,
        toolPair,
        clientIp,
        expiresAt: expiresAt.toISOString(),
      },
    )

  const logSessionDestroyed = (
    sessionId: string,
    clientIp: string,
    reason: "user_request" | "expired" | "error" = "user_request",
  ) =>
    log(
      "info",
      AuditEventType.SESSION_DESTROYED,
      `Session destroyed (reason: ${reason})`,
      {
        sessionId,
        clientIp,
        reason,
      },
    )

  const logAuthFailure = (reason: string, clientIp: string, sessionId?: string) =>
    log(
      "warn",
      AuditEventType.AUTH_FAILURE,
      `Authentication failed: ${reason}`,
      {
        sessionId,
        clientIp,
        reason,
      },
    )

  const logRateLimitHit = (type: "session" | "websocket", clientIp: string, limit: number, window: string) =>
    log(
      "warn",
      type === "session" ? AuditEventType.RATE_LIMIT_SESSION : AuditEventType.RATE_LIMIT_WEBSOCKET,
      `Rate limit exceeded: ${type} limit (${limit}/${window})`,
      {
        clientIp,
        limit: String(limit),
        window,
      },
    )

  const logInputInvalid = (sessionId: string, clientIp: string, reason: string, input?: string) =>
    log(
      "warn",
      AuditEventType.INPUT_INVALID,
      `Invalid input rejected: ${reason}`,
      {
        sessionId,
        clientIp,
        reason,
        ...(input !== undefined ? { input } : {}),
      },
    )

  const logError = (errorType: string, message: string, metadata: AuditMetadata) =>
    log(
      "error",
      errorType === "container" ? AuditEventType.ERROR_CONTAINER : AuditEventType.ERROR_INTERNAL,
      message,
      metadata,
    )

  return { log, logSessionCreated, logSessionDestroyed, logAuthFailure, logRateLimitHit, logInputInvalid, logError }
})

// Live layer
export const AuditServiceLive = Layer.effect(AuditService, make)
