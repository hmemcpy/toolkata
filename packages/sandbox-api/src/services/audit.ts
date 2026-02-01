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

  // Circuit breaker events
  CIRCUIT_BREAKER_OPEN: "circuit_breaker.open",

  // CMS events
  CMS_FILE_READ: "cms.file.read",
  CMS_FILE_CREATED: "cms.file.created",
  CMS_FILE_UPDATED: "cms.file.updated",
  CMS_FILE_DELETED: "cms.file.deleted",
  CMS_FILE_RENAMED: "cms.file.renamed",
  CMS_BRANCH_CREATED: "cms.branch.created",
  CMS_BRANCH_DELETED: "cms.branch.deleted",
  CMS_COMMIT_CREATED: "cms.commit.created",
  CMS_PR_CREATED: "cms.pr.created",
  CMS_VALIDATION_RUN: "cms.validation.run",
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
  // CMS operations
  readonly logCMSFileRead: (
    path: string,
    branch: string,
    clientIp: string,
  ) => Effect.Effect<void>
  readonly logCMSFileCreated: (
    path: string,
    branch: string,
    clientIp: string,
    commitSha: string,
  ) => Effect.Effect<void>
  readonly logCMSFileUpdated: (
    path: string,
    branch: string,
    clientIp: string,
    commitSha: string,
  ) => Effect.Effect<void>
  readonly logCMSFileDeleted: (
    path: string,
    branch: string,
    clientIp: string,
    commitSha: string,
  ) => Effect.Effect<void>
  readonly logCMSFileRenamed: (
    oldPath: string,
    newPath: string,
    branch: string,
    clientIp: string,
    commitSha: string,
  ) => Effect.Effect<void>
  readonly logCMSBranchCreated: (
    branchName: string,
    fromRef: string,
    clientIp: string,
  ) => Effect.Effect<void>
  readonly logCMSBranchDeleted: (
    branchName: string,
    clientIp: string,
  ) => Effect.Effect<void>
  readonly logCMSCommitCreated: (
    branch: string,
    filesCount: number,
    clientIp: string,
    commitSha: string,
  ) => Effect.Effect<void>
  readonly logCMSPRCreated: (
    prNumber: number,
    head: string,
    base: string,
    clientIp: string,
  ) => Effect.Effect<void>
  readonly logCMSValidationRun: (
    filesCount: number,
    clientIp: string,
    hasErrors: boolean,
    duration: number,
  ) => Effect.Effect<void>
}

// Service tag
export class AuditService extends Context.Tag("AuditService")<AuditService, AuditServiceShape>() {}

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
    log("info", AuditEventType.SESSION_CREATED, `Session created for tool pair: ${toolPair}`, {
      sessionId,
      toolPair,
      clientIp,
      expiresAt: expiresAt.toISOString(),
    })

  const logSessionDestroyed = (
    sessionId: string,
    clientIp: string,
    reason: "user_request" | "expired" | "error" = "user_request",
  ) =>
    log("info", AuditEventType.SESSION_DESTROYED, `Session destroyed (reason: ${reason})`, {
      sessionId,
      clientIp,
      reason,
    })

  const logAuthFailure = (reason: string, clientIp: string, sessionId?: string) =>
    log("warn", AuditEventType.AUTH_FAILURE, `Authentication failed: ${reason}`, {
      ...(sessionId !== undefined ? { sessionId } : {}),
      clientIp,
      reason,
    })

  const logRateLimitHit = (
    type: "session" | "websocket",
    clientIp: string,
    limit: number,
    window: string,
  ) =>
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
    log("warn", AuditEventType.INPUT_INVALID, `Invalid input rejected: ${reason}`, {
      sessionId,
      clientIp,
      reason,
      ...(input !== undefined ? { input } : {}),
    })

  const logError = (errorType: string, message: string, metadata: AuditMetadata) =>
    log(
      "error",
      errorType === "container" ? AuditEventType.ERROR_CONTAINER : AuditEventType.ERROR_INTERNAL,
      message,
      metadata,
    )

  // CMS audit logging methods
  const logCMSFileRead = (path: string, branch: string, clientIp: string) =>
    log("info", AuditEventType.CMS_FILE_READ, `CMS file read: ${path}`, {
      path,
      branch,
      clientIp,
    })

  const logCMSFileCreated = (path: string, branch: string, clientIp: string, commitSha: string) =>
    log("info", AuditEventType.CMS_FILE_CREATED, `CMS file created: ${path}`, {
      path,
      branch,
      clientIp,
      commitSha,
    })

  const logCMSFileUpdated = (path: string, branch: string, clientIp: string, commitSha: string) =>
    log("info", AuditEventType.CMS_FILE_UPDATED, `CMS file updated: ${path}`, {
      path,
      branch,
      clientIp,
      commitSha,
    })

  const logCMSFileDeleted = (path: string, branch: string, clientIp: string, commitSha: string) =>
    log("info", AuditEventType.CMS_FILE_DELETED, `CMS file deleted: ${path}`, {
      path,
      branch,
      clientIp,
      commitSha,
    })

  const logCMSFileRenamed = (
    oldPath: string,
    newPath: string,
    branch: string,
    clientIp: string,
    commitSha: string,
  ) =>
    log("info", AuditEventType.CMS_FILE_RENAMED, `CMS file renamed: ${oldPath} -> ${newPath}`, {
      oldPath,
      newPath,
      branch,
      clientIp,
      commitSha,
    })

  const logCMSBranchCreated = (branchName: string, fromRef: string, clientIp: string) =>
    log("info", AuditEventType.CMS_BRANCH_CREATED, `CMS branch created: ${branchName}`, {
      branchName,
      fromRef,
      clientIp,
    })

  const logCMSBranchDeleted = (branchName: string, clientIp: string) =>
    log("info", AuditEventType.CMS_BRANCH_DELETED, `CMS branch deleted: ${branchName}`, {
      branchName,
      clientIp,
    })

  const logCMSCommitCreated = (
    branch: string,
    filesCount: number,
    clientIp: string,
    commitSha: string,
  ) =>
    log("info", AuditEventType.CMS_COMMIT_CREATED, `CMS commit created on ${branch}`, {
      branch,
      filesCount: String(filesCount),
      clientIp,
      commitSha,
    })

  const logCMSPRCreated = (prNumber: number, head: string, base: string, clientIp: string) =>
    log("info", AuditEventType.CMS_PR_CREATED, `CMS PR #${prNumber} created: ${head} -> ${base}`, {
      prNumber: String(prNumber),
      head,
      base,
      clientIp,
    })

  const logCMSValidationRun = (
    filesCount: number,
    clientIp: string,
    hasErrors: boolean,
    duration: number,
  ) =>
    log(
      hasErrors ? "warn" : "info",
      AuditEventType.CMS_VALIDATION_RUN,
      `CMS validation run: ${filesCount} file(s), ${hasErrors ? "errors found" : "passed"}`,
      {
        filesCount: String(filesCount),
        clientIp,
        hasErrors: String(hasErrors),
        durationMs: String(duration),
      },
    )

  return {
    log,
    logSessionCreated,
    logSessionDestroyed,
    logAuthFailure,
    logRateLimitHit,
    logInputInvalid,
    logError,
    logCMSFileRead,
    logCMSFileCreated,
    logCMSFileUpdated,
    logCMSFileDeleted,
    logCMSFileRenamed,
    logCMSBranchCreated,
    logCMSBranchDeleted,
    logCMSCommitCreated,
    logCMSPRCreated,
    logCMSValidationRun,
  }
})

// Live layer
export const AuditServiceLive = Layer.effect(AuditService, make)
