import { Effect } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import type { RateLimitAdminServiceShape, AdjustRateLimitRequest } from "../services/rate-limit-admin.js"
import { RateLimitAdminError } from "../services/rate-limit-admin.js"

/**
 * Admin routes for rate limit management
 *
 * These routes are protected by Caddy reverse proxy with:
 * - IP allowlist (Vercel egress IPs)
 * - X-Admin-Key header validation
 *
 * Routes:
 * - GET /admin/rate-limits - List all rate limit statuses
 * - GET /admin/rate-limits/:clientId - Get specific client status
 * - POST /admin/rate-limits/:clientId/reset - Reset rate limit for client
 * - POST /admin/rate-limits/:clientId/adjust - Adjust rate limit parameters
 */

// Response types for admin rate limit API
export interface RateLimitStatusResponse {
  readonly clientId: string
  readonly sessionCount: number
  readonly sessionsPerHour: number
  readonly hourWindowStart: number
  readonly hourWindowEnd: number
  readonly activeSessions: readonly string[]
  readonly commandCount: number
  readonly commandsPerMinute: number
  readonly minuteWindowStart: number
  readonly minuteWindowEnd: number
  readonly activeWebSocketIds: readonly string[]
  readonly maxConcurrentSessions: number
  readonly maxConcurrentWebSockets: number
}

export interface RateLimitsResponse {
  readonly rateLimits: readonly RateLimitStatusResponse[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// Sanitized error messages for admin responses
const ADMIN_ERROR_MESSAGES = {
  NotFound: "Client not found in rate limit tracking",
  InvalidRequest: "Invalid request parameters",
  InternalError: "An internal error occurred",
} as const

// Helper: Convert RateLimitAdminError to HTTP response
const adminErrorToResponse = (error: unknown): { statusCode: number; body: ErrorResponse } => {
  if (error instanceof RateLimitAdminError) {
    const statusCode = error.cause === "NotFound" ? 404 : error.cause === "InvalidRequest" ? 400 : 500
    return {
      statusCode,
      body: {
        error: error.cause,
        message: ADMIN_ERROR_MESSAGES[error.cause],
      },
    }
  }

  return {
    statusCode: 500,
    body: {
      error: "InternalError",
      message: ADMIN_ERROR_MESSAGES.InternalError,
    },
  }
}

// Helper: Convert RateLimitStatus to response format
const toResponse = (status: import("../services/rate-limit-admin.js").RateLimitStatus): RateLimitStatusResponse => ({
  clientId: status.clientId,
  sessionCount: status.sessionCount,
  sessionsPerHour: status.sessionsPerHour,
  hourWindowStart: status.hourWindowStart,
  hourWindowEnd: status.hourWindowEnd,
  activeSessions: status.activeSessions,
  commandCount: status.commandCount,
  commandsPerMinute: status.commandsPerMinute,
  minuteWindowStart: status.minuteWindowStart,
  minuteWindowEnd: status.minuteWindowEnd,
  activeWebSocketIds: status.activeWebSocketIds,
  maxConcurrentSessions: status.maxConcurrentSessions,
  maxConcurrentWebSockets: status.maxConcurrentWebSockets,
})

// Create admin rate limits routes with RateLimitAdminService dependency
export const createAdminRateLimitsRoutes = (rateLimitAdminService: RateLimitAdminServiceShape) => {
  const app = new Hono<{ Bindings: Env }>()

  // GET /admin/rate-limits - List all rate limit statuses
  app.get("/", async (c) => {
    try {
      const allStatus = await Effect.runPromise(rateLimitAdminService.getAllStatus)

      return c.json<RateLimitsResponse>(
        {
          rateLimits: allStatus.map(toResponse),
        },
        200,
      )
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 500)
    }
  })

  // GET /admin/rate-limits/:clientId - Get specific client status
  app.get("/:clientId", async (c) => {
    try {
      const clientId = c.req.param("clientId")
      if (!clientId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      const status = await Effect.runPromise(rateLimitAdminService.getStatus(clientId))

      return c.json<RateLimitStatusResponse>(toResponse(status), 200)
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 500)
    }
  })

  // POST /admin/rate-limits/:clientId/reset - Reset rate limit for client
  app.post("/:clientId/reset", async (c) => {
    try {
      const clientId = c.req.param("clientId")
      if (!clientId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      await Effect.runPromise(rateLimitAdminService.resetLimit(clientId))

      return new Response(null, { status: 204 })
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 500)
    }
  })

  // POST /admin/rate-limits/:clientId/adjust - Adjust rate limit parameters
  app.post("/:clientId/adjust", async (c) => {
    try {
      const clientId = c.req.param("clientId")
      if (!clientId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      const body = (await c.req.json()) as {
        windowDuration?: number
        maxRequests?: number
      }

      // Build request object without undefined values (for exactOptionalPropertyTypes)
      const request = Object.freeze(
        body?.windowDuration !== undefined || body?.maxRequests !== undefined
          ? ({
              ...(body?.windowDuration !== undefined && { windowDuration: body.windowDuration }),
              ...(body?.maxRequests !== undefined && { maxRequests: body.maxRequests }),
            } as AdjustRateLimitRequest)
          : ({} as AdjustRateLimitRequest),
      )

      const status = await Effect.runPromise(rateLimitAdminService.adjustLimit(clientId, request))

      return c.json<RateLimitStatusResponse>(toResponse(status), 200)
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 500)
    }
  })

  return app
}
