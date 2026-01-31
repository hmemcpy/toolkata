import { Effect } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import type {
  ContainerAdminServiceShape,
  ContainerFilters,
  ContainerInfo,
} from "../services/container-admin.js"
import { ContainerAdminError } from "../services/container-admin.js"

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
 */

// Response types for admin container API
export interface ContainerInfoResponse {
  readonly id: string
  readonly name: string
  readonly status: "running" | "stopped" | "exited" | "dead" | "paused" | "restarting" | "created"
  readonly image: string
  readonly createdAt: number
  readonly startedAt: number | undefined
  readonly toolPair: string | undefined
  readonly sessionId: string | undefined
  readonly cpuPercent: number | undefined
  readonly memoryUsage: number | undefined
  readonly memoryLimit: number | undefined
  readonly memoryPercent: number | undefined
}

export interface ContainersResponse {
  readonly containers: readonly ContainerInfoResponse[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// Sanitized error messages for admin responses
const ADMIN_ERROR_MESSAGES = {
  NotFound: "Container not found",
  OperationFailed: "Container operation failed",
  InvalidRequest: "Invalid request parameters",
  DockerUnavailable: "Docker daemon unavailable",
} as const

// Helper: Convert ContainerAdminError to HTTP response
const adminErrorToResponse = (error: unknown): { statusCode: number; body: ErrorResponse } => {
  // Handle Effect FiberFailure - the error thrown by Effect.runPromise
  // Check by error name first
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as any).name === "(FiberFailure) Error"
  ) {
    try {
      const json = JSON.stringify(error)
      const parsed = JSON.parse(json)
      if (parsed._id === "FiberFailure" && parsed.cause?.failure) {
        const failure = parsed.cause.failure as { cause: string; message: string; _tag?: string }
        // Check if this is a ContainerAdminError by _tag
        if (
          failure._tag === "ContainerAdminError" ||
          ("cause" in failure && "message" in failure)
        ) {
          const statusCode =
            failure.cause === "NotFound"
              ? 404
              : failure.cause === "InvalidRequest"
                ? 400
                : failure.cause === "OperationFailed"
                  ? 409
                  : 500
          return {
            statusCode,
            body: {
              error: failure.cause,
              message: ADMIN_ERROR_MESSAGES[failure.cause as keyof typeof ADMIN_ERROR_MESSAGES],
            },
          }
        }
      }
    } catch {
      // If parsing fails, fall through to default error
    }
  }

  // Direct instanceof check for non-FiberFailure errors
  if (error instanceof ContainerAdminError) {
    const statusCode =
      error.cause === "NotFound"
        ? 404
        : error.cause === "InvalidRequest"
          ? 400
          : error.cause === "OperationFailed"
            ? 409
            : 500
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
      error: "DockerUnavailable",
      message: ADMIN_ERROR_MESSAGES.DockerUnavailable,
    },
  }
}

// Helper: Convert ContainerInfo to response format
const toResponse = (info: ContainerInfo): ContainerInfoResponse => ({
  id: info.id,
  name: info.name,
  status: info.status,
  image: info.image,
  createdAt: info.createdAt,
  startedAt: info.startedAt,
  toolPair: info.toolPair,
  sessionId: info.sessionId,
  cpuPercent: info.cpuPercent,
  memoryUsage: info.memoryUsage,
  memoryLimit: info.memoryLimit,
  memoryPercent: info.memoryPercent,
})

// Create admin containers routes with ContainerAdminService dependency
export const createAdminContainersRoutes = (containerAdminService: ContainerAdminServiceShape) => {
  const app = new Hono<{ Bindings: Env }>()

  // GET /admin/containers - List all containers with filters
  app.get("/", async (c) => {
    try {
      // Parse query params for filters
      const queryParams = c.req.query()

      // Build filters object using conditional spreading (for exactOptionalPropertyTypes)
      const filters: ContainerFilters = Object.freeze(
        Object.assign(
          {},
          queryParams["status"] !== undefined
            ? { status: queryParams["status"] as ContainerInfo["status"] }
            : null,
          queryParams["toolPair"] !== undefined ? { toolPair: queryParams["toolPair"] } : null,
          queryParams["olderThan"] !== undefined
            ? { olderThan: Number.parseInt(queryParams["olderThan"], 10) }
            : null,
        ),
      )

      const containers = await Effect.runPromise(containerAdminService.listContainers(filters))

      return c.json<ContainersResponse>(
        {
          containers: containers.map(toResponse),
        },
        200,
      )
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 409 | 500)
    }
  })

  // GET /admin/containers/:id - Get detailed container info
  app.get("/:id", async (c) => {
    try {
      const containerId = c.req.param("id")
      if (!containerId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      const container = await Effect.runPromise(containerAdminService.getContainer(containerId))

      return c.json<ContainerInfoResponse>(toResponse(container), 200)
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 409 | 500)
    }
  })

  // POST /admin/containers/:id/restart - Restart a container
  app.post("/:id/restart", async (c) => {
    try {
      const containerId = c.req.param("id")
      if (!containerId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      await Effect.runPromise(containerAdminService.restartContainer(containerId))

      return new Response(null, { status: 204 })
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 409 | 500)
    }
  })

  // POST /admin/containers/:id/stop - Stop a container
  app.post("/:id/stop", async (c) => {
    try {
      const containerId = c.req.param("id")
      if (!containerId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      await Effect.runPromise(containerAdminService.stopContainer(containerId))

      return new Response(null, { status: 204 })
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 409 | 500)
    }
  })

  // DELETE /admin/containers/:id - Remove a container
  app.delete("/:id", async (c) => {
    try {
      const containerId = c.req.param("id")
      if (!containerId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      // Parse force query param
      const queryParams = c.req.query()
      const force = queryParams["force"] === "true"

      await Effect.runPromise(containerAdminService.removeContainer(containerId, force))

      return new Response(null, { status: 204 })
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 409 | 500)
    }
  })

  // GET /admin/containers/:id/logs - Get container logs
  app.get("/:id/logs", async (c) => {
    try {
      const containerId = c.req.param("id")
      if (!containerId) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: ADMIN_ERROR_MESSAGES.InvalidRequest,
          },
          400,
        )
      }

      // Parse tail query param (default 100 lines)
      const queryParams = c.req.query()
      const tailParam = queryParams["tail"]
      const tail = tailParam !== undefined ? Number.parseInt(tailParam, 10) : 100

      if (Number.isNaN(tail) || tail < 0) {
        return c.json<ErrorResponse>(
          {
            error: "InvalidRequest",
            message: "tail must be a positive number",
          },
          400,
        )
      }

      const logs = await Effect.runPromise(containerAdminService.getLogs(containerId, tail))

      // Return logs as plain text
      return c.text(logs, 200, {
        "Content-Type": "text/plain; charset=utf-8",
      })
    } catch (error) {
      const { statusCode, body } = adminErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as 200 | 400 | 404 | 409 | 500)
    }
  })

  return app
}
