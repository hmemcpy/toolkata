import { Effect } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import type {
  RateLimitMetrics,
  SandboxMetrics,
  SystemMetrics,
} from "../services/metrics.js"
import { MetricsError } from "../services/metrics.js"
import type { MetricsServiceShape } from "../services/metrics.js"

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
    readonly cpuCount: number
  }
  readonly memory: {
    readonly used: number
    readonly total: number
    readonly percent: number
    readonly free: number
  }
  readonly disk: {
    readonly used: number
    readonly total: number
    readonly percent: number
    readonly free: number
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
  readonly totalClients: number
  readonly activeClients: number
  readonly violations: number
  readonly topClients: readonly {
    readonly clientId: string
    readonly sessionCount: number
    readonly commandCount: number
    readonly activeSessions: number
  }[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// Sanitized error messages for admin responses
const ADMIN_ERROR_MESSAGES = {
  CommandFailed: "Failed to execute system command",
  DockerUnavailable: "Docker service unavailable",
  DataUnavailable: "Metrics data unavailable",
} as const

/**
 * Convert MetricsError to HTTP response
 */
const metricsErrorToResponse = (error: unknown): { statusCode: number; body: ErrorResponse } => {
  if (error instanceof MetricsError) {
    const statusCode =
      error.cause === "DockerUnavailable" ? 503 : error.cause === "DataUnavailable" ? 503 : 500
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
      message: ADMIN_ERROR_MESSAGES.CommandFailed,
    },
  }
}

/**
 * Convert SystemMetrics to response format
 */
const systemMetricsToResponse = (metrics: SystemMetrics): SystemMetricsResponse => ({
  timestamp: metrics.timestamp,
  cpu: {
    percent: metrics.cpu.percent,
    loadAvg: metrics.cpu.loadAvg,
    cpuCount: metrics.cpu.cpuCount,
  },
  memory: {
    used: metrics.memory.used,
    total: metrics.memory.total,
    percent: metrics.memory.percent,
    free: metrics.memory.free,
  },
  disk: {
    used: metrics.disk.used,
    total: metrics.disk.total,
    percent: metrics.disk.percent,
    free: metrics.disk.free,
  },
  network: {
    rxBytes: metrics.network.rxBytes,
    txBytes: metrics.network.txBytes,
  },
})

/**
 * Convert SandboxMetrics to response format
 */
const sandboxMetricsToResponse = (metrics: SandboxMetrics): SandboxMetricsResponse => ({
  timestamp: metrics.timestamp,
  totalSessions: metrics.totalSessions,
  runningSessions: metrics.runningSessions,
  containers: metrics.containers,
  errors: metrics.errors,
})

/**
 * Convert RateLimitMetrics to response format
 */
const rateLimitMetricsToResponse = (metrics: RateLimitMetrics): RateLimitMetricsResponse => ({
  timestamp: metrics.timestamp,
  totalClients: metrics.totalClients,
  activeClients: metrics.activeClients,
  violations: metrics.violations,
  topClients: metrics.topClients,
})

/**
 * Create admin metrics routes with MetricsService
 */
export const createAdminMetricsRoutes = (metricsService: MetricsServiceShape) => {
  const app = new Hono<{ Bindings: Env }>()

  // Valid status codes for admin responses
  type AdminStatusCode = 200 | 500 | 503

  // GET /admin/metrics/system - System metrics
  app.get("/system", async (c) => {
    try {
      const metrics = await Effect.runPromise(metricsService.getSystemMetrics)
      return c.json<SystemMetricsResponse>(systemMetricsToResponse(metrics), 200)
    } catch (error) {
      const { statusCode, body } = metricsErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as AdminStatusCode)
    }
  })

  // GET /admin/metrics/sandbox - Sandbox metrics
  app.get("/sandbox", async (c) => {
    try {
      const metrics = await Effect.runPromise(metricsService.getSandboxMetrics)
      return c.json<SandboxMetricsResponse>(sandboxMetricsToResponse(metrics), 200)
    } catch (error) {
      const { statusCode, body } = metricsErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as AdminStatusCode)
    }
  })

  // GET /admin/metrics/rate-limits - Rate limit metrics
  app.get("/rate-limits", async (c) => {
    try {
      const metrics = await Effect.runPromise(metricsService.getRateLimitMetrics)
      return c.json<RateLimitMetricsResponse>(rateLimitMetricsToResponse(metrics), 200)
    } catch (error) {
      const { statusCode, body } = metricsErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as AdminStatusCode)
    }
  })

  return app
}
