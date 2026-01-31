import { Hono } from "hono"
import type { Env } from "hono"

/**
 * Admin routes for system and sandbox metrics
 *
 * These routes are protected by Caddy reverse proxy with:
 * - IP allowlist (Vercel egress IPs)
 * - X-Admin-Key header validation
 *
 * Routes:
 * - GET /admin/metrics/system - System metrics (CPU, memory, disk, network)
 * - GET /admin/metrics/sandbox - Sandbox metrics (sessions, containers, errors)
 * - GET /admin/metrics/rate-limits - Rate limit metrics (violations, top clients)
 */

// Response types for admin metrics API
export interface SystemMetricsResponse {
  readonly timestamp: number
  readonly cpu: {
    readonly percent: number
    readonly loadAvg: readonly number[]
  }
  readonly memory: {
    readonly used: number
    readonly total: number
    readonly percent: number
  }
  readonly disk: {
    readonly used: number
    readonly total: number
    readonly percent: number
  }
  readonly network: {
    readonly rxBytes: number
    readonly txBytes: number
  }
}

export interface SandboxMetricsResponse {
  readonly timestamp: number
  readonly totalSessions: number
  readonly runningSessions: number
  readonly containers: number
  readonly errors: number
}

export interface RateLimitMetricsResponse {
  readonly timestamp: number
  readonly violations: number
  readonly blockedRequests: number
  readonly topClients: readonly {
    readonly clientId: string
    readonly violations: number
  }[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// Create admin metrics routes
// Note: This is a stub implementation for P0.1
// Full implementation will be in P4.1-P4.4 after MetricsService is created
export const createAdminMetricsRoutes = () => {
  const app = new Hono<{ Bindings: Env }>()

  // GET /admin/metrics/system - System metrics
  app.get("/system", async (c) => {
    // Stub implementation - returns basic system info for now
    // Will be implemented in P4.2 with MetricsService
    return c.json<SystemMetricsResponse>(
      {
        timestamp: Date.now(),
        cpu: {
          percent: 0,
          loadAvg: [0, 0, 0],
        },
        memory: {
          used: 0,
          total: 0,
          percent: 0,
        },
        disk: {
          used: 0,
          total: 0,
          percent: 0,
        },
        network: {
          rxBytes: 0,
          txBytes: 0,
        },
      },
      200,
    )
  })

  // GET /admin/metrics/sandbox - Sandbox metrics
  app.get("/sandbox", async (c) => {
    // Stub implementation - returns zeros for now
    // Will be implemented in P4.3 with MetricsService
    return c.json<SandboxMetricsResponse>(
      {
        timestamp: Date.now(),
        totalSessions: 0,
        runningSessions: 0,
        containers: 0,
        errors: 0,
      },
      200,
    )
  })

  // GET /admin/metrics/rate-limits - Rate limit metrics
  app.get("/rate-limits", async (c) => {
    // Stub implementation - returns zeros for now
    // Will be implemented in P4.4 with MetricsService
    return c.json<RateLimitMetricsResponse>(
      {
        timestamp: Date.now(),
        violations: 0,
        blockedRequests: 0,
        topClients: [],
      },
      200,
    )
  })

  return app
}
