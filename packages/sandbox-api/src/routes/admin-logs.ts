import { Effect } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import { LOG_LEVELS, LogsError, type LogEntry, type LogsServiceShape } from "../services/logs.js"

/**
 * Admin routes for log viewing and streaming
 *
 * These routes are protected by Caddy reverse proxy with:
 * - IP allowlist (Vercel egress IPs)
 * - X-Admin-Key header validation
 *
 * Routes:
 * - GET /admin/logs - List logs with filtering (level, search, limit, offset)
 * - GET /admin/logs/stream - SSE endpoint for real-time tail
 * - GET /admin/logs/download - Download logs as file
 * - GET /admin/logs/files - List available log files
 */

// Response types
export interface LogsListResponse {
  readonly entries: readonly LogEntry[]
  readonly total: number
  readonly hasMore: boolean
}

export interface LogFilesResponse {
  readonly files: readonly string[]
}

export interface ErrorResponse {
  readonly error: string
  readonly message: string
}

// Sanitized error messages
const ADMIN_ERROR_MESSAGES = {
  ReadFailed: "Failed to read log files",
  ParseFailed: "Failed to parse log data",
  NotFound: "Log file not found",
} as const

/**
 * Convert LogsError to HTTP response
 */
const logsErrorToResponse = (error: unknown): { statusCode: number; body: ErrorResponse } => {
  if (error instanceof LogsError) {
    const statusCode = error.cause === "NotFound" ? 404 : 500
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
      message: "An unexpected error occurred",
    },
  }
}

/**
 * Create admin logs routes with LogsService
 */
export const createAdminLogsRoutes = (logsService: LogsServiceShape) => {
  const app = new Hono<{ Bindings: Env }>()

  type AdminStatusCode = 200 | 404 | 500

  // GET /admin/logs - List logs with filtering
  app.get("/", async (c) => {
    try {
      const levelParam = c.req.query("level")
      const searchParam = c.req.query("search")
      const limitParam = c.req.query("limit")
      const offsetParam = c.req.query("offset")
      const startTimeParam = c.req.query("startTime")
      const endTimeParam = c.req.query("endTime")

      // Build query object conditionally (exactOptionalPropertyTypes requires this)
      const query: import("../services/logs.js").LogQuery = {
        limit: limitParam ? Number(limitParam) : 100,
        offset: offsetParam ? Number(offsetParam) : 0,
        ...(levelParam ? { level: Number(levelParam) } : {}),
        ...(searchParam ? { search: searchParam } : {}),
        ...(startTimeParam ? { startTime: Number(startTimeParam) } : {}),
        ...(endTimeParam ? { endTime: Number(endTimeParam) } : {}),
      }

      const result = await Effect.runPromise(logsService.getLogs(query))
      return c.json<LogsListResponse>(result, 200)
    } catch (error) {
      const { statusCode, body } = logsErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as AdminStatusCode)
    }
  })

  // GET /admin/logs/files - List available log files
  app.get("/files", async (c) => {
    try {
      const files = await Effect.runPromise(logsService.getLogFiles)
      return c.json<LogFilesResponse>({ files }, 200)
    } catch (error) {
      const { statusCode, body } = logsErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as AdminStatusCode)
    }
  })

  // GET /admin/logs/download - Download logs as file
  app.get("/download", async (c) => {
    try {
      const filename = c.req.query("file")
      const content = await Effect.runPromise(logsService.downloadLogs(filename))

      const downloadFilename = filename ?? `logs-${Date.now()}.json`

      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        },
      })
    } catch (error) {
      const { statusCode, body } = logsErrorToResponse(error)
      return c.json<ErrorResponse>(body, statusCode as AdminStatusCode)
    }
  })

  // GET /admin/logs/stream - SSE endpoint for real-time log streaming
  app.get("/stream", async (c) => {
    const levelParam = c.req.query("level")
    const minLevel = levelParam ? Number(levelParam) : LOG_LEVELS.info

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        // Helper to send SSE message
        const sendEvent = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        // Send recent logs first (last 100 entries)
        const recent = logsService.getRecentLogs(100)
        for (const entry of recent) {
          if (entry.level >= minLevel) {
            sendEvent(JSON.stringify(entry))
          }
        }

        // Subscribe to new logs
        const unsubscribe = logsService.subscribe((entry: LogEntry) => {
          if (entry.level >= minLevel) {
            try {
              sendEvent(JSON.stringify(entry))
            } catch {
              // Controller might be closed
            }
          }
        })

        // Send keepalive comments every 30 seconds
        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": keepalive\n\n"))
          } catch {
            // Controller might be closed
            clearInterval(keepaliveInterval)
          }
        }, 30000)

        // Handle client disconnect
        c.req.raw.signal.addEventListener("abort", () => {
          unsubscribe()
          clearInterval(keepaliveInterval)
          try {
            controller.close()
          } catch {
            // Already closed
          }
        })
      },
    })

    // Get origin from request for CORS
    const origin = c.req.header("origin") ?? ""

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        // Add CORS headers explicitly since raw Response bypasses middleware
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      },
    })
  })

  // GET /admin/logs/levels - Get available log levels
  app.get("/levels", (c) => {
    return c.json(LOG_LEVELS, 200)
  })

  return app
}
