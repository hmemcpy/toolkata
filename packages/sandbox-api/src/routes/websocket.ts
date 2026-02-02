import type { Server as HttpServer } from "node:http"
import { Data, Effect } from "effect"
import { WebSocketServer } from "ws"
import {
  extractJwtTokenFromUpgrade,
  validateApiKey,
  validateMessageSize,
  validateOrigin,
  validateTerminalInput,
} from "../config.js"
import { getBanner } from "../config/banners.js"
import type { TierName } from "../config/tiers.js"
import type { AuditServiceShape } from "../services/audit.js"
import type { JwtAuthServiceShape, JwtVerifyResult } from "../services/jwt-auth.js"
import type { RateLimitServiceShape } from "../services/rate-limit.js"
import type { SessionServiceShape } from "../services/session.js"
import { type WebSocketServiceShape, parseMessage } from "../services/websocket.js"

// Error types for WebSocket route
export class WsRouteError extends Data.TaggedClass("WsRouteError")<{
  readonly cause: "InvalidSessionId" | "UpgradeFailed" | "ConnectionFailed"
  readonly message: string
  readonly originalError?: unknown
}> {}

// Active connections map (for cleanup and management)
interface ActiveConnection {
  readonly sessionId: string
  readonly socket: import("ws").WebSocket
  readonly closeEffect: Effect.Effect<void, never>
}

const connections = new Map<string, ActiveConnection>()

/**
 * Get tracking key and tier from JWT auth result or IP address.
 */
const getTrackingInfo = (
  authResult: JwtVerifyResult,
  clientIp: string,
): { trackingKey: string; tier: TierName } => {
  if (authResult.tier !== "anonymous") {
    return { trackingKey: authResult.userId, tier: authResult.tier }
  }
  return { trackingKey: clientIp, tier: "anonymous" }
}

// Helper: Get client IP from request headers (trust proxy only when local)
const getClientIp = (request: import("http").IncomingMessage): string => {
  const remoteAddress = request.socket.remoteAddress ?? "unknown"
  const normalizedRemote = remoteAddress.replace(/^::ffff:/, "")
  const isLocalProxy =
    normalizedRemote === "127.0.0.1" || normalizedRemote === "::1" || normalizedRemote === "unknown"

  const forwardedFor = request.headers["x-forwarded-for"]
  const realIp = request.headers["x-real-ip"]
  const cfConnectingIp = request.headers["cf-connecting-ip"]

  const parseForwarded = (value: string | string[] | undefined): string | null => {
    if (!value) return null
    const raw = Array.isArray(value) ? value.join(",") : value
    const first = raw.split(",")[0]?.trim()
    return first && first.length > 0 ? first : null
  }

  if (isLocalProxy) {
    const forwarded = parseForwarded(forwardedFor)
    if (forwarded) return forwarded
    if (typeof realIp === "string" && realIp.length > 0) return realIp
    if (typeof cfConnectingIp === "string" && cfConnectingIp.length > 0) return cfConnectingIp
  }

  return normalizedRemote
}

// Helper: Extract session ID from WebSocket path
const getSessionId = (url: string): string | null => {
  // Path format: /api/v1/sessions/:sessionId/ws
  const match = url.match(/^\/api\/v1\/sessions\/([^/]+)\/ws$/)
  return match?.[1] ?? null
}

// Create a WebSocket server attached to an HTTP server
export const createWebSocketServer = (
  httpServer: HttpServer,
  sessionService: SessionServiceShape,
  webSocketService: WebSocketServiceShape,
  rateLimitService: RateLimitServiceShape, // V-007: Add rate limit service
  auditService: AuditServiceShape, // V-019: Add audit service
  jwtAuthService: JwtAuthServiceShape, // JWT auth for tiered rate limits
) => {
  const wss = new WebSocketServer({ noServer: true })

  // Handle WebSocket upgrade requests
  httpServer.on("upgrade", async (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url ?? "", `http://${request.headers.host}`)

    // Only handle /api/v1/sessions/:id/ws paths
    if (!pathname?.startsWith("/api/v1/sessions/")) {
      return
    }

    const sessionId = getSessionId(pathname ?? "")
    if (!sessionId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\nInvalid session path\r\n")
      socket.destroy()
      return
    }

    // Extract client IP early for logging
    const clientIp = getClientIp(request)

    // Validate Origin header to prevent CSRF attacks
    const originHeader = request.headers["origin"] as string | null
    const originResult = await Effect.runPromise(Effect.either(validateOrigin(originHeader)))
    if (originResult._tag === "Left") {
      const originError = originResult.left
      const statusCode = originError.cause === "OriginRequired" ? 403 : 403
      socket.write(`HTTP/1.1 ${statusCode} Forbidden\r\n\r\n${originError.message}\r\n`)
      socket.destroy()
      return
    }

    // Step 1: Try JWT authentication first
    // For WebSockets, browsers can't set custom headers, so token comes via query param
    const jwtToken = extractJwtTokenFromUpgrade(request, searchParams)
    const jwtAuthResult = await Effect.runPromise(jwtAuthService.getTierFromToken(jwtToken))

    // Step 2: If no valid JWT, fall back to API key validation for anonymous access
    if (jwtAuthResult.tier === "anonymous") {
      let apiKey = request.headers["x-api-key"] as string | null
      if (!apiKey || apiKey === "") {
        apiKey = searchParams.get("api_key")
      }
      const apiKeyResult = await Effect.runPromise(Effect.either(validateApiKey(apiKey)))
      if (apiKeyResult._tag === "Left") {
        const authError = apiKeyResult.left
        // Log auth failure
        await Effect.runPromise(auditService.logAuthFailure(authError.cause, clientIp, sessionId))
        const statusCode = authError.cause === "MissingApiKey" ? 401 : 401
        socket.write(`HTTP/1.1 ${statusCode} Unauthorized\r\n\r\n${authError.message}\r\n`)
        socket.destroy()
        return
      }
    }

    // Get tracking info based on auth result
    const { trackingKey, tier } = getTrackingInfo(jwtAuthResult, clientIp)

    // Check WebSocket connection limit per user/IP with tier
    const wsLimitResult = await Effect.runPromise(
      Effect.either(rateLimitService.checkWebSocketLimit(trackingKey, tier)),
    )
    if (wsLimitResult._tag === "Left") {
      const wsLimitError = wsLimitResult.left
      // Log rate limit hit
      await Effect.runPromise(
        auditService.logRateLimitHit("websocket", trackingKey, 3, "concurrent"),
      )
      console.error(
        `[WebSocket] Connection limit exceeded for ${trackingKey} (tier: ${tier}): ${wsLimitError.message}`,
      )
      socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\nToo many concurrent connections\r\n")
      socket.destroy()
      return
    }
    if (!wsLimitResult.right.allowed) {
      // Log rate limit hit
      await Effect.runPromise(
        auditService.logRateLimitHit("websocket", trackingKey, 3, "concurrent"),
      )
      console.error(`[WebSocket] Connection limit exceeded for ${trackingKey} (tier: ${tier})`)
      socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\nToo many concurrent connections\r\n")
      socket.destroy()
      return
    }

    // Extract initial terminal size from query parameters with limits to prevent abuse
    const MIN_COLS = 20
    const MAX_COLS = 500
    const MIN_ROWS = 5
    const MAX_ROWS = 200
    const rawCols = Number.parseInt(searchParams.get("cols") ?? "80", 10) || 80
    const rawRows = Number.parseInt(searchParams.get("rows") ?? "24", 10) || 24
    const initialCols = Math.max(MIN_COLS, Math.min(MAX_COLS, rawCols))
    const initialRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, rawRows))

    // Upgrade the connection to WebSocket
    wss.handleUpgrade(request, socket, head, (ws) => {
      // V-007: Generate unique connection ID for tracking
      const connectionId = `${trackingKey}-${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

      // Register WebSocket connection with tier
      Effect.runPromise(
        rateLimitService.registerWebSocket(trackingKey, connectionId, tier).pipe(
          Effect.catchAll((error) => {
            console.error("[WebSocket] Failed to register connection:", error)
            return Effect.void
          }),
        ),
      )

      // Store connection ID and tracking info on the WebSocket for cleanup
      ;(ws as unknown as Record<string, unknown>)["__connectionId"] = connectionId
      ;(ws as unknown as Record<string, unknown>)["__trackingKey"] = trackingKey
      ;(ws as unknown as Record<string, unknown>)["__tier"] = tier

      wss.emit(
        "connection",
        ws,
        request,
        sessionId,
        connectionId,
        trackingKey,
        tier,
        initialCols,
        initialRows,
        rateLimitService,
        auditService,
      )
    })
  })

  // Handle new WebSocket connections
  wss.on(
    "connection",
    async (
      ws: import("ws").WebSocket,
      _request: import("http").IncomingMessage,
      sessionId: string,
      connectionId: string, // V-007: Connection ID for rate limit tracking
      trackingKey: string, // User ID or IP for rate limit tracking
      tier: TierName, // User tier for rate limits
      initialCols: number, // Initial terminal columns from client
      initialRows: number, // Initial terminal rows from client
      rateLimitService: RateLimitServiceShape, // V-007: Rate limit service for cleanup
      auditService: AuditServiceShape, // V-019: Audit service for logging
    ) => {
      console.log(
        `[WebSocket] Connection attempt for session: ${sessionId} (${initialCols}x${initialRows}, tier: ${tier})`,
      )

      // Run the connection handler using passed-in services
      const program = Effect.gen(function* () {
        // Verify session exists and is running
        const session = yield* sessionService.get(sessionId)

        if (session.state !== "RUNNING") {
          return yield* Effect.fail(
            new WsRouteError({
              cause: "InvalidSessionId",
              message: `Session ${sessionId} is not in RUNNING state`,
            }),
          )
        }

        // Handle the WebSocket connection with initial terminal size
        const connection = yield* webSocketService.handleConnection(
          sessionId,
          session.containerId,
          ws,
          initialCols,
          initialRows,
        )

        // Store connection for cleanup - use captured service values
        const closeEffect = Effect.all([
          webSocketService.close(connection),
          sessionService.updateActivity(sessionId),
          rateLimitService.unregisterWebSocket(trackingKey, connectionId), // V-007: Cleanup rate limit tracking
        ]).pipe(
          Effect.asVoid,
          Effect.catchAll(() => Effect.void),
        )

        connections.set(sessionId, {
          sessionId,
          socket: ws,
          closeEffect,
        })

        console.log(`[WebSocket] Connected for session: ${sessionId} (tier: ${tier})`)
        // Log WebSocket connection success (fire and forget - don't block connection setup)
        Effect.runPromise(
          auditService.log(
            "info",
            "websocket.connected",
            `WebSocket connected for session: ${sessionId}`,
            {
              sessionId,
              trackingKey,
              tier,
              connectionId,
            },
          ),
        )

        // Set up message handler from client - use captured service values
        ws.on("message", async (data: Buffer) => {
          // Validate message size to prevent DoS
          const sizeResult = await Effect.runPromise(
            Effect.either(validateMessageSize(data.length)),
          )
          if (sizeResult._tag === "Left") {
            const sizeError = sizeResult.left
            console.error(
              `[WebSocket] Message too large for ${sessionId}: ${sizeError.size} bytes (max ${sizeError.maxSize})`,
            )
            if (ws.readyState === ws.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: `Message size ${sizeError.size} bytes exceeds maximum ${sizeError.maxSize} bytes`,
                }),
              )
              ws.close(1009, sizeError.message)
            }
            return
          }

          // Update activity on each message
          const updateResult = await Effect.runPromise(
            Effect.either(sessionService.updateActivity(sessionId)),
          )
          if (updateResult._tag === "Left") {
            console.error("[WebSocket] Failed to update activity:", updateResult.left.message)
          }

          // Parse the message
          const message = parseMessage(data)

          if (message.type === "input") {
            // Validate terminal input for security
            const sanitizeResult = await Effect.runPromise(
              Effect.either(validateTerminalInput(message.data)),
            )
            if (sanitizeResult._tag === "Left") {
              const sanitizeError = sanitizeResult.left
              // Log invalid input
              await Effect.runPromise(
                auditService.logInputInvalid(
                  sessionId,
                  trackingKey,
                  sanitizeError.cause,
                  message.data,
                ),
              )
              console.error(
                `[WebSocket] Input sanitization failed for ${sessionId}: ${sanitizeError.message} (input: ${JSON.stringify(sanitizeError.input)})`,
              )
              if (ws.readyState === ws.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: sanitizeError.message,
                  }),
                )
                // Close connection on malicious input
                ws.close(1008, sanitizeError.message)
              }
              return
            }

            // Write input to container
            const writeResult = await Effect.runPromise(
              Effect.either(
                webSocketService.writeInput(connection, Buffer.from(message.data, "utf-8")),
              ),
            )
            if (writeResult._tag === "Left") {
              console.error("[WebSocket] Write error:", writeResult.left.message)
              ws.close(1011, writeResult.left.message)
            }
          } else if (message.type === "resize") {
            // Resize terminal
            const resizeResult = await Effect.runPromise(
              Effect.either(webSocketService.resize(connection, message.rows, message.cols)),
            )
            if (resizeResult._tag === "Left") {
              console.error("[WebSocket] Resize error:", resizeResult.left.message)
            }
          } else if (message.type === "init") {
            // Execute init commands (with optional silent mode)
            console.log(
              `[WebSocket] Executing ${message.commands.length} init commands for ${sessionId} (silent: ${message.silent ?? false})`,
            )
            const initResult = await Effect.runPromise(
              Effect.either(
                webSocketService.executeInitCommands(
                  connection,
                  message.commands,
                  message.timeout,
                  message.silent,
                ),
              ),
            )
            if (initResult._tag === "Left") {
              console.error("[WebSocket] Init commands error:", initResult.left.message)
              // Don't close connection - initComplete failure message was already sent
            }
          }
        })

        // Handle connection close
        ws.on("close", async () => {
          console.log(`[WebSocket] Disconnected: ${sessionId}`)
          // Log WebSocket disconnection
          await Effect.runPromise(
            auditService.log(
              "info",
              "websocket.disconnected",
              `WebSocket disconnected for session: ${sessionId}`,
              {
                sessionId,
                trackingKey,
                tier,
              },
            ),
          )
          connections.delete(sessionId)

          // Run cleanup
          await Effect.runPromise(closeEffect)
        })

        // Handle connection errors
        ws.on("error", (error) => {
          console.error(`[WebSocket] Error for ${sessionId}:`, error)
          connections.delete(sessionId)
        })

        // Send initial connection success message
        ws.send(JSON.stringify({ type: "connected", sessionId }))

        // Send welcome banner if configured for this tool pair
        const banner = getBanner(session.toolPair)
        if (banner) {
          ws.send(JSON.stringify({ type: "output", data: banner }))
        }
      })

      // Run the connection handler
      const result = await Effect.runPromise(Effect.either(program))

      if (result._tag === "Left") {
        const error = result.left
        console.error(`[WebSocket] Connection failed for ${sessionId}:`, error.message)
        // Log WebSocket connection failure
        await Effect.runPromise(
          auditService.logError("websocket", `WebSocket connection failed: ${error.message}`, {
            sessionId,
            trackingKey,
            tier,
            error: error.cause,
          }),
        )

        // Send error message and close
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: error.message,
            }),
          )
          ws.close(1011, error.message)
        }
      }
    },
  )

  return wss
}

// Helper: Close all active connections (for shutdown)
export const closeAllConnections = Effect.sync(() => {
  for (const [sessionId, connection] of connections) {
    console.log(`[WebSocket] Closing connection for: ${sessionId}`)
    if (connection.socket.readyState === connection.socket.OPEN) {
      connection.socket.close(1000, "Server shutdown")
    }
  }
  connections.clear()
})
