/**
 * AdminClient - Effect-TS client service for admin API endpoints.
 *
 * Manages communication with the sandbox API's admin routes via the Vercel proxy:
 * - /api/admin/rate-limits - Rate limit management
 * - /api/admin/containers - Container administration
 * - /api/admin/metrics - System and sandbox metrics
 *
 * All requests go through the /api/admin/[...path] proxy which handles
 * auth (NextAuth session) and adds the admin API key server-side.
 *
 * @example
 * ```ts
 * import { AdminClient } from "./services/admin-client"
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* AdminClient
 *   const rateLimits = yield* client.getRateLimits()
 *   return rateLimits
 * })
 * ```
 */

import { Context, Data, Effect, Layer } from "effect"

/**
 * Error types for admin operations.
 */
export class AdminClientError extends Data.TaggedClass("AdminClientError")<{
  readonly cause:
    | "NetworkError"
    | "Unauthorized"
    | "NotFound"
    | "ServerError"
    | "InvalidResponse"
  readonly message: string
  readonly status?: number
  readonly originalError?: unknown
}> {}

/**
 * Rate limit status from the admin API.
 */
export interface RateLimitStatus {
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

/**
 * Request for adjusting rate limits.
 */
export interface AdjustRateLimitRequest {
  readonly windowDuration?: number
  readonly maxRequests?: number
}

/**
 * Container info from the admin API.
 */
export interface ContainerInfo {
  readonly id: string
  readonly name: string
  readonly status: "running" | "stopped" | "exited" | "dead"
  readonly image: string
  readonly createdAt: number
  readonly startedAt?: number
  readonly toolPair?: string
  readonly sessionId?: string
  readonly cpuPercent?: number
  readonly memoryUsage?: number
  readonly memoryLimit?: number
}

/**
 * System metrics from the admin API.
 */
export interface SystemMetrics {
  readonly timestamp: number
  readonly cpu: {
    readonly percent: number
    readonly loadAvg: readonly [number, number, number]
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

/**
 * Sandbox metrics from the admin API.
 */
export interface SandboxMetrics {
  readonly timestamp: number
  readonly totalSessions: number
  readonly activeSessions: number
  readonly runningContainers: number
  readonly errorRate: number
}

/**
 * Rate limit metrics from the admin API.
 */
export interface RateLimitMetrics {
  readonly timestamp: number
  readonly totalViolations: number
  readonly blockedRequests: number
  readonly topClients: readonly {
    readonly clientId: string
    readonly violationCount: number
  }[]
}

/**
 * AdminClient interface.
 *
 * Provides methods for all admin API operations.
 */
export interface AdminClientShape {
  /**
   * Get all rate limit statuses.
   */
  readonly getRateLimits: () => Effect.Effect<readonly RateLimitStatus[], AdminClientError>

  /**
   * Get rate limit status for a specific client.
   */
  readonly getRateLimit: (clientId: string) => Effect.Effect<RateLimitStatus, AdminClientError>

  /**
   * Reset rate limit for a specific client.
   */
  readonly resetRateLimit: (clientId: string) => Effect.Effect<void, AdminClientError>

  /**
   * Adjust rate limit parameters for a specific client.
   */
  readonly adjustRateLimit: (
    clientId: string,
    params: AdjustRateLimitRequest,
  ) => Effect.Effect<RateLimitStatus, AdminClientError>

  /**
   * List all containers.
   */
  readonly listContainers: () => Effect.Effect<readonly ContainerInfo[], AdminClientError>

  /**
   * Get specific container info.
   */
  readonly getContainer: (id: string) => Effect.Effect<ContainerInfo, AdminClientError>

  /**
   * Restart a container.
   */
  readonly restartContainer: (id: string) => Effect.Effect<void, AdminClientError>

  /**
   * Stop a container.
   */
  readonly stopContainer: (id: string) => Effect.Effect<void, AdminClientError>

  /**
   * Remove a container.
   */
  readonly removeContainer: (id: string) => Effect.Effect<void, AdminClientError>

  /**
   * Get container logs.
   */
  readonly getContainerLogs: (
    id: string,
    tail?: number,
  ) => Effect.Effect<string, AdminClientError>

  /**
   * Get system metrics.
   */
  readonly getSystemMetrics: () => Effect.Effect<SystemMetrics, AdminClientError>

  /**
   * Get sandbox metrics.
   */
  readonly getSandboxMetrics: () => Effect.Effect<SandboxMetrics, AdminClientError>

  /**
   * Get rate limit metrics.
   */
  readonly getRateLimitMetrics: () => Effect.Effect<RateLimitMetrics, AdminClientError>
}

/**
 * AdminClient tag for dependency injection.
 */
export class AdminClient extends Context.Tag("AdminClient")<
  AdminClient,
  AdminClientShape
>() {}

/**
 * Parse admin API error from response.
 */
function parseAdminError(status: number, body: unknown): AdminClientError {
  if (status === 401 || status === 403) {
    return new AdminClientError({
      cause: "Unauthorized",
      message: "Invalid or missing admin API key",
      status,
    })
  }

  if (status === 404) {
    return new AdminClientError({
      cause: "NotFound",
      message: "Resource not found",
      status,
    })
  }

  if (status >= 500) {
    return new AdminClientError({
      cause: "ServerError",
      message: "Internal server error",
      status,
    })
  }

  return new AdminClientError({
    cause: "InvalidResponse",
    message: `Unexpected response: ${status}`,
    status,
    originalError: body,
  })
}

/**
 * Admin API base URL.
 *
 * Uses the Vercel proxy at /api/admin/* which forwards to the sandbox API.
 * The proxy handles auth (NextAuth session check) and adds the admin API key.
 */
const ADMIN_API_BASE = "/api/admin"

/**
 * Create the AdminClient implementation.
 */
const make = Effect.succeed<AdminClientShape>({
  getRateLimits: () =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/rate-limits`)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        const data = (await response.json()) as { readonly rateLimits: readonly RateLimitStatus[] }
        return data.rateLimits
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to fetch rate limits",
              originalError: error,
            }),
    }),

  getRateLimit: (clientId: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/rate-limits/${encodeURIComponent(clientId)}`)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return (await response.json()) as RateLimitStatus
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to fetch rate limit",
              originalError: error,
            }),
    }),

  resetRateLimit: (clientId: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/rate-limits/${encodeURIComponent(clientId)}/reset`, {
          method: "POST",
        })

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        // 204 No Content on success
        return undefined
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to reset rate limit",
              originalError: error,
            }),
    }),

  adjustRateLimit: (clientId: string, params: AdjustRateLimitRequest) =>
    Effect.tryPromise({
      try: async () => {
        // Build request body without undefined values
        const body = Object.freeze(
          Object.keys(params).length > 0
            ? JSON.stringify(params)
            : JSON.stringify({}),
        )

        const response = await fetch(`${ADMIN_API_BASE}/rate-limits/${encodeURIComponent(clientId)}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return (await response.json()) as RateLimitStatus
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to adjust rate limit",
              originalError: error,
            }),
    }),

  listContainers: () =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/containers`)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return (await response.json()) as readonly ContainerInfo[]
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to list containers",
              originalError: error,
            }),
    }),

  getContainer: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/containers/${encodeURIComponent(id)}`)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return (await response.json()) as ContainerInfo
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to get container",
              originalError: error,
            }),
    }),

  restartContainer: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/containers/${encodeURIComponent(id)}/restart`, {
          method: "POST",
        })

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        // 204 No Content on success
        return undefined
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to restart container",
              originalError: error,
            }),
    }),

  stopContainer: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/containers/${encodeURIComponent(id)}/stop`, {
          method: "POST",
        })

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        // 204 No Content on success
        return undefined
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to stop container",
              originalError: error,
            }),
    }),

  removeContainer: (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/containers/${encodeURIComponent(id)}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        // 204 No Content on success
        return undefined
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to remove container",
              originalError: error,
            }),
    }),

  getContainerLogs: (id: string, tail?: number) =>
    Effect.tryPromise({
      try: async () => {
        const url = tail
          ? `${ADMIN_API_BASE}/containers/${encodeURIComponent(id)}/logs?tail=${tail}`
          : `${ADMIN_API_BASE}/containers/${encodeURIComponent(id)}/logs`

        const response = await fetch(url)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return await response.text()
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to get container logs",
              originalError: error,
            }),
    }),

  getSystemMetrics: () =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/metrics/system`)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return (await response.json()) as SystemMetrics
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to fetch system metrics",
              originalError: error,
            }),
    }),

  getSandboxMetrics: () =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/metrics/sandbox`)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return (await response.json()) as SandboxMetrics
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to fetch sandbox metrics",
              originalError: error,
            }),
    }),

  getRateLimitMetrics: () =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${ADMIN_API_BASE}/metrics/rate-limits`)

        if (!response.ok) {
          throw parseAdminError(response.status, await response.json().catch(() => undefined))
        }

        return (await response.json()) as RateLimitMetrics
      },
      catch: (error) =>
        error instanceof AdminClientError
          ? error
          : new AdminClientError({
              cause: "NetworkError",
              message: error instanceof Error ? error.message : "Failed to fetch rate limit metrics",
              originalError: error,
            }),
    }),
})

/**
 * Live layer for AdminClient.
 *
 * Provides the real implementation for browser use.
 */
export const AdminClientLive = Layer.effect(AdminClient, make)
