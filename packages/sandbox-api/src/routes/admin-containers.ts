import { Hono } from "hono"
import type { Env } from "hono"

/**
 * Admin routes for container management
 *
 * These routes are protected by Caddy reverse proxy with:
 * - IP allowlist (Vercel egress IPs)
 * - X-Admin-Key header validation
 *
 * Routes:
 * - GET /admin/containers - List all containers with filters
 * - GET /admin/containers/:id - Get detailed container info
 * - POST /admin/containers/:id/restart - Restart a container
 * - POST /admin/containers/:id/stop - Stop a container
 * - DELETE /admin/containers/:id - Remove a container
 * - GET /admin/containers/:id/logs - Get container logs
 * - POST /admin/containers/:id/exec - Execute command in container
 */

// Response types for admin container API
export interface ContainerInfoResponse {
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

export interface ContainersResponse {
  readonly containers: readonly ContainerInfoResponse[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// Create admin containers routes
// Note: This is a stub implementation for P0.1
// Full implementation will be in P2.1-P2.7 after ContainerAdminService is created
export const createAdminContainersRoutes = () => {
  const app = new Hono<{ Bindings: Env }>()

  // GET /admin/containers - List all containers with filters
  app.get("/", async (c) => {
    // Query params: status, toolPair, olderThan
    // Stub implementation - returns empty list for now
    // Will be implemented in P2.2 with ContainerAdminService
    return c.json<ContainersResponse>(
      {
        containers: [],
      },
      200,
    )
  })

  // GET /admin/containers/:id - Get detailed container info
  app.get("/:id", async (c) => {
    // Stub implementation - returns 501 for now
    // Will be implemented in P2.3 with ContainerAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Container admin service not yet implemented",
      },
      501,
    )
  })

  // POST /admin/containers/:id/restart - Restart a container
  app.post("/:id/restart", async (c) => {
    // Stub implementation - returns 501 for now
    // Will be implemented in P2.4 with ContainerAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Container admin service not yet implemented",
      },
      501,
    )
  })

  // POST /admin/containers/:id/stop - Stop a container
  app.post("/:id/stop", async (c) => {
    // Stub implementation - returns 501 for now
    // Will be implemented in P2.5 with ContainerAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Container admin service not yet implemented",
      },
      501,
    )
  })

  // DELETE /admin/containers/:id - Remove a container
  app.delete("/:id", async (c) => {
    // Query param: force (boolean)
    // Stub implementation - returns 501 for now
    // Will be implemented in P2.6 with ContainerAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Container admin service not yet implemented",
      },
      501,
    )
  })

  // GET /admin/containers/:id/logs - Get container logs
  app.get("/:id/logs", async (c) => {
    // Query param: tail (number of lines)
    // Stub implementation - returns 501 for now
    // Will be implemented in P2.7 with ContainerAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Container admin service not yet implemented",
      },
      501,
    )
  })

  // POST /admin/containers/:id/exec - Execute command in container
  app.post("/:id/exec", async (c) => {
    // Stub implementation - returns 501 for now
    // Will be implemented later with ContainerAdminService
    return c.json<ErrorResponse>(
      {
        error: "NotImplemented",
        message: "Container admin service not yet implemented",
      },
      501,
    )
  })

  return app
}
