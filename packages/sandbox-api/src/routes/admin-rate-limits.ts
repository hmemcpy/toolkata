import { Hono } from "hono"
import type { Env } from "hono"

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
  readonly hourWindowStart: number
  readonly activeSessions: readonly string[]
  readonly commandCount: number
  readonly minuteWindowStart: number
  readonly activeWebSocketIds: readonly string[]
}

export interface RateLimitsResponse {
  readonly rateLimits: readonly RateLimitStatusResponse[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// Create admin rate limits routes
// Note: This is a stub implementation for P0.1
// Full implementation will be in P0.3-P0.6 after RateLimitAdminService is created
export const createAdminRateLimitsRoutes = () => {
  const app = new Hono<{ Bindings: Env }>()

  // GET /admin/rate-limits - List all rate limit statuses
  app.get("/", async (c) => {
    // Stub implementation - returns empty list for now
    // Will be implemented in P0.3 with RateLimitAdminService
    return c.json<RateLimitsResponse>(
      {
        rateLimits: [],
      },
      200,
    )
  })

  // GET /admin/rate-limits/:clientId - Get specific client status
  app.get("/:clientId", async (c) => {
    // clientId extracted but not used yet in stub
    // Will be used in P0.4 with RateLimitAdminService
    void c.req.param("clientId")

    // Stub implementation - returns 501 for now
    // Will be implemented in P0.4 with RateLimitAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotFound",
        message: "Rate limit admin service not yet implemented",
      },
      501,
    )
  })

  // POST /admin/rate-limits/:clientId/reset - Reset rate limit for client
  app.post("/:clientId/reset", async (c) => {
    // Stub implementation - returns 501 for now
    // Will be implemented in P0.5 with RateLimitAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Rate limit admin service not yet implemented",
      },
      501,
    )
  })

  // POST /admin/rate-limits/:clientId/adjust - Adjust rate limit parameters
  app.post("/:clientId/adjust", async (c) => {
    // Stub implementation - returns 501 for now
    // Will be implemented in P0.6 with RateLimitAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Rate limit admin service not yet implemented",
      },
      501,
    )
  })

  return app
}
