import type { Server as HttpServer } from "node:http"
import { Data, Effect } from "effect"
import { WebSocketServer } from "ws"
import { validateApiKey, validateMessageSize, validateOrigin, validateTerminalInput } from "../config.js"
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

// Helper: Extract session ID from WebSocket path
const getSessionId = (url: string): string | null => {
  // Path format: /sessions/:sessionId/ws
  const match = url.match(/^\/sessions\/([^/]+)\/ws$/)
  return match?.[1] ?? null
}

// Create a WebSocket server attached to an HTTP server
export const createWebSocketServer = (
  httpServer: HttpServer,
  sessionService: SessionServiceShape,
  webSocketService: WebSocketServiceShape,
) => {
  const wss = new WebSocketServer({ noServer: true })

  // Handle WebSocket upgrade requests
  httpServer.on("upgrade", async (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url ?? "", `http://${request.headers.host}`)

    // Only handle /sessions/:id/ws paths
    if (!pathname?.startsWith("/sessions/")) {
      return
    }

    const sessionId = getSessionId(pathname ?? "")
    if (!sessionId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\nInvalid session path\r\n")
      socket.destroy()
      return
    }

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

    // Validate API key before upgrading
    // Check header first, then query parameter (for browser WebSocket fallback)
    let apiKey = request.headers["x-api-key"] as string | null
    if (!apiKey || apiKey === "") {
      apiKey = searchParams.get("api_key")
    }
    const authResult = await Effect.runPromise(Effect.either(validateApiKey(apiKey)))
    if (authResult._tag === "Left") {
      const authError = authResult.left
      const statusCode = authError.cause === "MissingApiKey" ? 401 : 401
      socket.write(`HTTP/1.1 ${statusCode} Unauthorized\r\n\r\n${authError.message}\r\n`)
      socket.destroy()
      return
    }

    // Upgrade the connection to WebSocket
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, sessionId)
    })
  })

  // Handle new WebSocket connections
  wss.on(
    "connection",
    async (
      ws: import("ws").WebSocket,
      _request: import("http").IncomingMessage,
      sessionId: string,
    ) => {
      console.log(`[WebSocket] Connection attempt for session: ${sessionId}`)

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

        // Handle the WebSocket connection
        const connection = yield* webSocketService.handleConnection(
          sessionId,
          session.containerId,
          ws,
        )

        // Store connection for cleanup - use captured service values
        const closeEffect = Effect.all([
          webSocketService.close(connection),
          sessionService.updateActivity(sessionId),
        ]).pipe(
          Effect.asVoid,
          Effect.catchAll(() => Effect.void),
        )

        connections.set(sessionId, {
          sessionId,
          socket: ws,
          closeEffect,
        })

        console.log(`[WebSocket] Connected for session: ${sessionId}`)

        // Set up message handler from client - use captured service values
        ws.on("message", async (data: Buffer) => {
          // Validate message size to prevent DoS
          const sizeResult = await Effect.runPromise(Effect.either(validateMessageSize(data.length)))
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
            const sanitizeResult = await Effect.runPromise(Effect.either(validateTerminalInput(message.data)))
            if (sanitizeResult._tag === "Left") {
              const sanitizeError = sanitizeResult.left
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
          }
        })

        // Handle connection close
        ws.on("close", async () => {
          console.log(`[WebSocket] Disconnected: ${sessionId}`)
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
      })

      // Run the connection handler
      const result = await Effect.runPromise(Effect.either(program))

      if (result._tag === "Left") {
        const error = result.left
        console.error(`[WebSocket] Connection failed for ${sessionId}:`, error.message)

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
