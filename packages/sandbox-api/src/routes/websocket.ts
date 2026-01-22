import { Data, Effect } from "effect"
import { WebSocketServer } from "ws"
import type { Server as HttpServer } from "node:http"
import { SessionService } from "../services/session.js"
import { WebSocketService, WebSocketError, parseMessage } from "../services/websocket.js"

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
  return match ? match[1] : null
}

// Create a WebSocket server attached to an HTTP server
export const createWebSocketServer = (httpServer: HttpServer) => {
  const wss = new WebSocketServer({ noServer: true })

  // Handle WebSocket upgrade requests
  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url ?? "", `http://${request.headers.host}`)

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

      // Run the connection handler within Effect context
      const program = Effect.gen(function* () {
        const sessionService = yield* SessionService
        const webSocketService = yield* WebSocketService

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

        // Store connection for cleanup
        const closeEffect = Effect.gen(function* () {
          yield* webSocketService.close(connection)
          yield* sessionService.updateActivity(sessionId)
        })

        connections.set(sessionId, {
          sessionId,
          socket: ws,
          closeEffect,
        })

        console.log(`[WebSocket] Connected for session: ${sessionId}`)

        // Set up message handler from client
        ws.on("message", async (data: Buffer) => {
          const messageProgram = Effect.gen(function* () {
            const wsSvc = yield* WebSocketService
            const sessSvc = yield* SessionService

            // Update activity on each message
            yield* sessSvc.updateActivity(sessionId)

            // Parse the message
            const message = parseMessage(data)

            if (message.type === "input") {
              // Write input to container
              yield* wsSvc.writeInput(connection, Buffer.from(message.data, "utf-8"))
            } else if (message.type === "resize") {
              // Resize terminal
              yield* wsSvc.resize(connection, message.rows, message.cols)
            }
          })

          // Run the message handler (log errors, don't crash)
          const result = await Effect.runPromise(Effect.either(messageProgram))
          if (result._tag === "Left") {
            console.error("[WebSocket] Error handling message:", result.left.message)
            if (result.left instanceof WsRouteError || result.left instanceof WebSocketError) {
              ws.close(1011, result.left.message)
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
