import { Data, Effect } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import { AuthError, validateApiKey } from "../config.js"
import { AuditEventType, type AuditServiceShape } from "../services/audit.js"
import type { CircuitBreakerServiceShape, CircuitStatus } from "../services/circuit-breaker.js"
import type { RateLimitServiceShape } from "../services/rate-limit.js"
import { RateLimitError } from "../services/rate-limit.js"
import type { SessionServiceShape } from "../services/session.js"
import { SessionError } from "../services/session.js"
import type { EnvironmentInfo } from "../environments/types.js"
import { EnvironmentService } from "../environments/index.js"

// Helper: Cast statusCode to the literal type Hono expects
const toStatusCode = (code: number): 200 | 201 | 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503 => {
  if ([200, 201, 400, 401, 403, 404, 409, 429, 500, 503].includes(code)) {
    return code as 200 | 201 | 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503
  }
  return 500
}

// Error types for HTTP responses
export class HttpRouteError extends Data.TaggedClass("HttpRouteError")<{
  readonly cause: "BadRequest" | "Unauthorized" | "NotFound" | "RateLimited" | "InternalError"
  readonly message: string
  readonly statusCode: number
  readonly originalError?: unknown
}> {}

// Helper: Get API key from request headers
const getApiKey = (request: Request): string | null => {
  return request.headers.get("x-api-key")
}

// Request body types
export interface CreateSessionRequest {
  readonly toolPair: string
  readonly environment?: string
  readonly init?: readonly string[]
  readonly timeout?: number
}

// Response types
export interface CreateSessionResponse {
  readonly sessionId: string
  readonly wsUrl: string
  readonly status: "IDLE" | "STARTING" | "RUNNING" | "DESTROYING"
  readonly createdAt: string
  readonly expiresAt: string
}

export interface SessionStatusResponse {
  readonly sessionId: string
  readonly status: "IDLE" | "STARTING" | "RUNNING" | "DESTROYING"
  readonly createdAt: string
  readonly expiresAt: string
  readonly toolPair: string
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
  readonly retryAfter?: number
}

// Response type for environments list
export interface EnvironmentsResponse {
  readonly environments: readonly EnvironmentInfo[]
}

// Helper: Get client IP from request headers
const getClientIp = (request: Request): string => {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const parts = forwardedFor.split(",")
    return parts[0]?.trim() ?? "unknown"
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to remote address (not available in standard Request API)
  return "unknown"
}

// Sanitized error messages for external responses
// Use generic messages to avoid leaking internal implementation details
const SANITIZED_MESSAGES = {
  NotFound: "Session not found",
  Expired: "Session has expired",
  InvalidState: "Session is in an invalid state",
  InternalError: "An internal error occurred",
  BadRequest: "Invalid request",
  Unauthorized: "Unauthorized",
  RateLimited: "Rate limit exceeded",
} as const

// Helper: Convert errors to HTTP responses
const errorToResponse = (error: unknown): { statusCode: number; body: ErrorResponse } => {
  if (error instanceof AuthError) {
    return {
      statusCode: 401,
      body: { error: error.cause, message: SANITIZED_MESSAGES.Unauthorized },
    }
  }

  if (error instanceof RateLimitError) {
    const bodyObj: {
      error: string
      message: string
      retryAfter?: number
    } = {
      error: error.cause,
      message: SANITIZED_MESSAGES.RateLimited,
    }
    // Only include retryAfter if it's defined (for exactOptionalPropertyTypes)
    if (error.retryAfter !== undefined) {
      bodyObj.retryAfter = error.retryAfter
    }
    return {
      statusCode: 429,
      body: bodyObj as ErrorResponse,
    }
  }

  if (error instanceof SessionError) {
    switch (error.cause) {
      case "NotFound":
        return {
          statusCode: 404,
          body: { error: "NotFound", message: SANITIZED_MESSAGES.NotFound },
        }
      case "Expired":
        return {
          statusCode: 404,
          body: { error: "Expired", message: SANITIZED_MESSAGES.Expired },
        }
      case "InvalidState":
        return {
          statusCode: 409,
          body: { error: "Conflict", message: SANITIZED_MESSAGES.InvalidState },
        }
      default:
        return {
          statusCode: 500,
          body: { error: "InternalError", message: SANITIZED_MESSAGES.InternalError },
        }
    }
  }

  if (error instanceof HttpRouteError) {
    // HttpRouteError messages are already controlled by us (not from external sources)
    return {
      statusCode: error.statusCode,
      body: { error: error.cause, message: error.message },
    }
  }

  return {
    statusCode: 500,
    body: { error: "InternalError", message: SANITIZED_MESSAGES.InternalError },
  }
}

// Helper: Create URL from request for WebSocket
const getWsUrl = (request: Request, sessionId: string): string => {
  const protocol = request.headers.get("x-forwarded-proto") ?? "ws"
  const host = request.headers.get("host") ?? "localhost:3001"
  return `${protocol === "https" ? "wss" : "ws"}://${host}/api/v1/sessions/${sessionId}/ws`
}

// Create session routes with service instances
const createSessionRoutes = (
  sessionService: SessionServiceShape,
  rateLimitService: RateLimitServiceShape,
  auditService: AuditServiceShape,
  circuitBreakerService: CircuitBreakerServiceShape,
) => {
  const app = new Hono<{ Bindings: Env }>()

  // GET /environments - List available environments (no auth required)
  app.get("/environments", async (c) => {
    const environments = await Effect.runPromise(EnvironmentService.list)
    return c.json<EnvironmentsResponse>({ environments }, 200)
  })

  // GET /status - Get sandbox availability status (no auth required)
  app.get("/status", async (c) => {
    const status = await Effect.runPromise(circuitBreakerService.getStatus)
    return c.json<CircuitStatus>(status, 200)
  })

  // POST /sessions - Create a new session
  app.post("/sessions", async (c) => {
    try {
      // Validate API key first
      const apiKey = getApiKey(c.req.raw)
      const authResult = await Effect.runPromise(Effect.either(validateApiKey(apiKey)))
      if (authResult._tag === "Left") {
        // Log auth failure
        const clientIp = getClientIp(c.req.raw)
        await Effect.runPromise(auditService.logAuthFailure(authResult.left.cause, clientIp))
        const { statusCode, body } = errorToResponse(authResult.left)
        return c.json<ErrorResponse>(body, toStatusCode(statusCode))
      }

      // Parse request body
      const body = (await c.req.json()) as CreateSessionRequest
      const toolPair = body?.toolPair

      if (!toolPair || typeof toolPair !== "string") {
        const error = new HttpRouteError({
          cause: "BadRequest",
          message: "Missing or invalid toolPair in request body",
          statusCode: 400,
        })
        const { statusCode, body: errorBody } = errorToResponse(error)
        return c.json<ErrorResponse>(errorBody, toStatusCode(statusCode))
      }

      // Extract optional parameters
      const environment = body?.environment
      const initCommands = body?.init
      const timeout = body?.timeout

      // Validate environment if provided
      if (environment !== undefined && typeof environment !== "string") {
        const error = new HttpRouteError({
          cause: "BadRequest",
          message: "Invalid environment: must be a string",
          statusCode: 400,
        })
        const { statusCode, body: errorBody } = errorToResponse(error)
        return c.json<ErrorResponse>(errorBody, toStatusCode(statusCode))
      }

      // Validate init commands if provided
      if (initCommands !== undefined && !Array.isArray(initCommands)) {
        const error = new HttpRouteError({
          cause: "BadRequest",
          message: "Invalid init: must be an array of strings",
          statusCode: 400,
        })
        const { statusCode, body: errorBody } = errorToResponse(error)
        return c.json<ErrorResponse>(errorBody, toStatusCode(statusCode))
      }

      // Validate timeout if provided
      if (timeout !== undefined && (typeof timeout !== "number" || timeout <= 0 || timeout > 30 * 60 * 1000)) {
        const error = new HttpRouteError({
          cause: "BadRequest",
          message: "Invalid timeout: must be a number between 1 and 1800000 (30 minutes)",
          statusCode: 400,
        })
        const { statusCode, body: errorBody } = errorToResponse(error)
        return c.json<ErrorResponse>(errorBody, toStatusCode(statusCode))
      }

      // Get client IP for rate limiting
      const clientIp = getClientIp(c.req.raw)

      // Check circuit breaker first
      const circuitStatus = await Effect.runPromise(circuitBreakerService.getStatus)
      if (circuitStatus.isOpen) {
        // Log circuit breaker trigger
        await Effect.runPromise(
          auditService.log("warn", AuditEventType.CIRCUIT_BREAKER_OPEN, circuitStatus.reason ?? "Circuit open", {
            clientIp,
            ...circuitStatus.metrics,
          }),
        )
        return c.json<ErrorResponse>(
          {
            error: "ServiceUnavailable",
            message: "Sandbox temporarily unavailable due to high load. Please try again later.",
          },
          503,
        )
      }

      // Check rate limits
      const limitResult = await Effect.runPromise(rateLimitService.checkSessionLimit(clientIp))
      if (!limitResult.allowed) {
        // Log rate limit hit
        await Effect.runPromise(auditService.logRateLimitHit("session", clientIp, 10, "hour"))
        const errorData = {
          cause: "TooManySessions" as const,
          message: "Rate limit exceeded. Please try again later.",
        }
        // Only add retryAfter if it's defined
        if (limitResult.retryAfter !== undefined) {
          const error = new RateLimitError({
            ...errorData,
            retryAfter: limitResult.retryAfter,
          })
          const { statusCode, body: errorBody } = errorToResponse(error)
          return c.json<ErrorResponse>(errorBody, toStatusCode(statusCode))
        }
        const error = new RateLimitError(errorData)
        const { statusCode, body: errorBody } = errorToResponse(error)
        return c.json<ErrorResponse>(errorBody, toStatusCode(statusCode))
      }

      // Create the session
      const session = await Effect.runPromise(
        sessionService.create({
          toolPair,
          environment,
          initCommands,
          timeout,
        }),
      )

      // Log session creation
      await Effect.runPromise(
        auditService.logSessionCreated(session.id, toolPair, clientIp, session.expiresAt),
      )

      // Record the session for rate limiting
      await Effect.runPromise(rateLimitService.recordSession(clientIp, session.id))

      // Build response
      const wsUrl = getWsUrl(c.req.raw, session.id)

      return c.json<CreateSessionResponse>(
        {
          sessionId: session.id,
          wsUrl,
          status: session.state,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
        },
        201,
      )
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // GET /sessions/:id - Get session status
  app.get("/sessions/:id", async (c) => {
    try {
      // Validate API key first
      const apiKey = getApiKey(c.req.raw)
      const authResult = await Effect.runPromise(Effect.either(validateApiKey(apiKey)))
      if (authResult._tag === "Left") {
        // Log auth failure
        const clientIp = getClientIp(c.req.raw)
        await Effect.runPromise(auditService.logAuthFailure(authResult.left.cause, clientIp))
        const { statusCode, body } = errorToResponse(authResult.left)
        return c.json<ErrorResponse>(body, toStatusCode(statusCode))
      }

      const sessionId = c.req.param("id")
      if (!sessionId) {
        const error = new HttpRouteError({
          cause: "BadRequest",
          message: "Missing session ID",
          statusCode: 400,
        })
        const { statusCode, body } = errorToResponse(error)
        return c.json<ErrorResponse>(body, toStatusCode(statusCode))
      }

      const session = await Effect.runPromise(sessionService.get(sessionId))

      return c.json<SessionStatusResponse>({
        sessionId: session.id,
        status: session.state,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        toolPair: session.toolPair,
      })
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  // DELETE /sessions/:id - Destroy a session
  app.delete("/sessions/:id", async (c) => {
    try {
      // Validate API key first
      const apiKey = getApiKey(c.req.raw)
      const authResult = await Effect.runPromise(Effect.either(validateApiKey(apiKey)))
      if (authResult._tag === "Left") {
        // Log auth failure
        const clientIp = getClientIp(c.req.raw)
        await Effect.runPromise(auditService.logAuthFailure(authResult.left.cause, clientIp))
        const { statusCode, body } = errorToResponse(authResult.left)
        return c.json<ErrorResponse>(body, toStatusCode(statusCode))
      }

      const sessionId = c.req.param("id")
      if (!sessionId) {
        const error = new HttpRouteError({
          cause: "BadRequest",
          message: "Missing session ID",
          statusCode: 400,
        })
        const { statusCode, body } = errorToResponse(error)
        return c.json<ErrorResponse>(body, toStatusCode(statusCode))
      }

      // Get client IP to remove from rate limit tracking
      const clientIp = getClientIp(c.req.raw)

      // Destroy the session (ignore errors if already destroyed)
      const destroyResult = await Effect.runPromise(
        Effect.either(sessionService.destroy(sessionId)),
      )

      // Log session destruction
      if (destroyResult._tag === "Right") {
        await Effect.runPromise(
          auditService.logSessionDestroyed(sessionId, clientIp, "user_request"),
        )
      } else if (destroyResult.left.cause !== "NotFound") {
        // Log error if destruction failed (but not NotFound - that's normal)
        await Effect.runPromise(
          auditService.logError(
            "container",
            `Session destroy failed: ${destroyResult.left.message}`,
            {
              sessionId,
              clientIp,
            },
          ),
        )
      }

      // Remove from rate limit tracking regardless of destroy result
      await Effect.runPromise(rateLimitService.removeSession(clientIp, sessionId))

      // Handle destroy errors
      if (destroyResult._tag === "Left") {
        const error = destroyResult.left
        if (error.cause === "NotFound") {
          // Session already destroyed, that's okay
          return c.json<{ success: true }>({ success: true })
        }
        const { statusCode, body } = errorToResponse(error)
        return c.json<ErrorResponse>(body, toStatusCode(statusCode))
      }

      return c.json<{ success: true }>({ success: true })
    } catch (error) {
      const { statusCode, body } = errorToResponse(error)
      return c.json<ErrorResponse>(body, toStatusCode(statusCode))
    }
  })

  return app
}

// Export the factory function
export { createSessionRoutes }
