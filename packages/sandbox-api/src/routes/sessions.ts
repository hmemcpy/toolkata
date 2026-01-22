import { Data, Effect } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import { SessionService, SessionError } from "../services/session.js"
import { RateLimitService, RateLimitError } from "../services/rate-limit.js"

// Error types for HTTP responses
export class HttpRouteError extends Data.TaggedClass("HttpRouteError")<{
  readonly cause: "BadRequest" | "Unauthorized" | "NotFound" | "RateLimited" | "InternalError"
  readonly message: string
  readonly statusCode: number
  readonly originalError?: unknown
}> {}

// Request body types
export interface CreateSessionRequest {
  readonly toolPair: string
}

// Response types
export interface CreateSessionResponse {
  readonly sessionId: string
  readonly wsUrl: string
  readonly status: "RUNNING"
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

// Helper: Get client IP from request headers
const getClientIp = (request: Request): string => {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
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

// Helper: Convert errors to HTTP responses
const errorToResponse = (error: unknown): { statusCode: number; body: ErrorResponse } => {
  if (error instanceof RateLimitError) {
    return {
      statusCode: error.cause === "TooManySessions" ? 429 : 429,
      body: {
        error: error.cause,
        message: error.message,
        retryAfter: error.retryAfter,
      },
    }
  }

  if (error instanceof SessionError) {
    switch (error.cause) {
      case "NotFound":
        return {
          statusCode: 404,
          body: { error: "NotFound", message: error.message },
        }
      case "Expired":
        return {
          statusCode: 404,
          body: { error: "Expired", message: error.message },
        }
      case "InvalidState":
        return {
          statusCode: 409,
          body: { error: "Conflict", message: error.message },
        }
      default:
        return {
          statusCode: 500,
          body: { error: "InternalError", message: error.message },
        }
    }
  }

  if (error instanceof HttpRouteError) {
    return {
      statusCode: error.statusCode,
      body: { error: error.cause, message: error.message },
    }
  }

  return {
    statusCode: 500,
    body: { error: "InternalError", message: "An unexpected error occurred" },
  }
}

// Helper: Create URL from request for WebSocket
const getWsUrl = (request: Request, sessionId: string): string => {
  const protocol = request.headers.get("x-forwarded-proto") ?? "ws"
  const host = request.headers.get("host") ?? "localhost:3001"
  return `${protocol === "https" ? "wss" : "ws"}://${host}/sessions/${sessionId}/ws`
}

// Create session routes
export const createSessionRoutes = () => {
  const app = new Hono<{ Bindings: Env }>()

  // POST /sessions - Create a new session
  app.post("/sessions", async (c) => {
    const program = Effect.gen(function* () {
      const sessionService = yield* SessionService
      const rateLimitService = yield* RateLimitService

      // Parse request body using Effect
      const body = yield* Effect.tryPromise({
        try: () => c.req.json(),
        catch: () =>
          new HttpRouteError({
            cause: "BadRequest",
            message: "Invalid JSON in request body",
            statusCode: 400,
          }),
      })

      const toolPair = (body as CreateSessionRequest)?.toolPair

      if (!toolPair || typeof toolPair !== "string") {
        return yield* Effect.fail(
          new HttpRouteError({
            cause: "BadRequest",
            message: "Missing or invalid toolPair in request body",
            statusCode: 400,
          }),
        )
      }

      // Get client IP for rate limiting
      const clientIp = getClientIp(c.req.raw)

      // Check rate limits
      const limitResult = yield* rateLimitService.checkSessionLimit(clientIp)
      if (!limitResult.allowed) {
        return yield* Effect.fail(
          new RateLimitError({
            cause: "TooManySessions",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: limitResult.retryAfter,
          }),
        )
      }

      // Create the session
      const session = yield* sessionService.create(toolPair)

      // Record the session for rate limiting
      yield* rateLimitService.recordSession(clientIp, session.id)

      // Build response
      const wsUrl = getWsUrl(c.req.raw, session.id)

      return {
        sessionId: session.id,
        wsUrl,
        status: session.state,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      } satisfies CreateSessionResponse
    })

    // Run the Effect program
    const result = await Effect.runPromise(Effect.either(program))

    if (result._tag === "Left") {
      const { statusCode, body } = errorToResponse(result.left)
      return c.json<ErrorResponse>(body, statusCode)
    }

    return c.json<CreateSessionResponse>(result.right, 201)
  })

  // GET /sessions/:id - Get session status
  app.get("/sessions/:id", (c) => {
    const program = Effect.gen(function* () {
      const sessionService = yield* SessionService

      const sessionId = c.req.param("id")
      if (!sessionId) {
        return yield* Effect.fail(
          new HttpRouteError({
            cause: "BadRequest",
            message: "Missing session ID",
            statusCode: 400,
          }),
        )
      }

      const session = yield* sessionService.get(sessionId)

      return {
        sessionId: session.id,
        status: session.state,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        toolPair: session.toolPair,
      } satisfies SessionStatusResponse
    })

    return Effect.runPromise(
      Effect.either(program).pipe(
        Effect.mapBoth({
          onFailure: (error) => errorToResponse(error),
          onSuccess: (response) => ({ statusCode: 200, body: response }),
        }),
      ).then((either) => {
        if (either._tag === "Left") {
          return c.json<ErrorResponse>(either.left.body, either.left.statusCode)
        }
        return c.json<SessionStatusResponse>(either.right)
      }),
    )
  })

  // DELETE /sessions/:id - Destroy a session
  app.delete("/sessions/:id", (c) => {
    const program = Effect.gen(function* () {
      const sessionService = yield* SessionService
      const rateLimitService = yield* RateLimitService

      const sessionId = c.req.param("id")
      if (!sessionId) {
        return yield* Effect.fail(
          new HttpRouteError({
            cause: "BadRequest",
            message: "Missing session ID",
            statusCode: 400,
          }),
        )
      }

      // Get client IP to remove from rate limit tracking
      const clientIp = getClientIp(c.req.raw)

      // Destroy the session (ignore errors if already destroyed)
      const destroyResult = yield* Effect.either(sessionService.destroy(sessionId))

      // Remove from rate limit tracking regardless of destroy result
      yield* rateLimitService.removeSession(clientIp, sessionId)

      // Handle destroy errors
      if (destroyResult._tag === "Left") {
        const error = destroyResult.left
        if (error.cause === "NotFound") {
          // Session already destroyed, that's okay
          return { success: true }
        }
        return yield* Effect.fail(error)
      }

      return { success: true }
    })

    return Effect.runPromise(
      Effect.either(program).pipe(
        Effect.mapBoth({
          onFailure: (error) => errorToResponse(error),
          onSuccess: () => ({ statusCode: 200, body: { success: true } }),
        }),
      ).then((either) => {
        if (either._tag === "Left") {
          return c.json<ErrorResponse>(either.left.body, either.left.statusCode)
        }
        return c.json<{ success: true }>(either.right)
      }),
    )
  })

  return app
}

// Export the routes for use in main server
export const sessionRoutes = createSessionRoutes()
