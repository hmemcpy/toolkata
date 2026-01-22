import { Data, Effect, Layer } from "effect"
import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "hono"
import { createServer as createHttpServer, type Server as NodeHttpServer } from "node:http"
import { sessionRoutes } from "./routes/sessions.js"
import { createWebSocketServer, closeAllConnections } from "./routes/websocket.js"
import { ContainerService, DockerClientLive } from "./services/container.js"
import { SessionService, SessionServiceLive } from "./services/session.js"
import { RateLimitServiceLive } from "./services/rate-limit.js"
import { WebSocketServiceLive } from "./services/websocket.js"

// Module-level reference to SessionService for health checks
// This is set when the server starts and allows the health endpoint to access session stats
let sessionServiceForHealth: SessionService | null = null

// Error types with Data.TaggedClass
export class ServerError extends Data.TaggedClass("ServerError")<{
  readonly cause: "StartupFailed" | "PortInUse" | "InvalidConfig"
  readonly message: string
}> {}

export class ConfigError extends Data.TaggedClass("ConfigError")<{
  readonly cause: "MissingEnv" | "InvalidValue"
  readonly message: string
}> {}

// Configuration schema
export interface ServerConfig {
  readonly port: number
  readonly host: string
  readonly frontendOrigin: string
}

export const ServerConfig = Context.GenericTag<ServerConfig>("ServerConfig")

// Service interface
export interface HttpServerShape {
  readonly start: Effect.Effect<void, ServerError>
  readonly stop: Effect.Effect<void, never>
}

export const HttpServer = Context.GenericTag<HttpServerShape>("HttpServer")

// Health check response type
export interface HealthResponse {
  readonly status: "ok"
  readonly timestamp: string
  readonly uptime: number
  readonly containers: number
}

// Create Hono app with CORS and health check
const createApp = (config: ServerConfig) => {
  const app = new Hono<{ Bindings: Env }>()

  // CORS configuration
  app.use(
    "/*",
    cors({
      origin: config.frontendOrigin,
      credentials: true,
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  )

  // Health check endpoint with session stats
  app.get("/health", (c) => {
    let containers = 0

    // Get session stats if session service is available
    if (sessionServiceForHealth !== null) {
      const statsResult = Effect.runSync(
        Effect.either(sessionServiceForHealth.getStats),
      )
      if (statsResult._tag === "Right") {
        containers = statsResult.right.total
      }
    }

    return c.json<HealthResponse>({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      containers,
    })
  })

  // Mount session routes
  app.route("/", sessionRoutes)

  return app
}

// Service implementation
const make = Effect.gen(function* () {
  const config = yield* ServerConfig
  const sessionService = yield* SessionService

  let httpServer: NodeHttpServer | null = null
  const app = createApp(config)

  const start = Effect.sync(() => {
    // Store session service reference for health checks
    sessionServiceForHealth = sessionService

    // Create Node.js HTTP server for WebSocket upgrade support
    httpServer = createHttpServer({
      // Use Hono's fetch handler as the request handler
      // @ts-expect-error - Node's request type is compatible enough
      async listener(req, res) {
        const url = new URL(req.url ?? "", `http://${req.headers.host}`)
        const request = new Request(url.toString(), {
          method: req.method,
          headers: req.headers as HeadersInit,
          body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
        })

        const response = await app.fetch(request, {})
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        if (response.body) {
          // @ts-expect-error - ReadableStream is compatible
          response.body.pipeTo(
            // @ts-expect-error - WritableStream is compatible
            new WritableStream({
              write(chunk) {
                res.write(Buffer.from(chunk))
              },
              close() {
                res.end()
              },
            }),
          )
        } else {
          res.end()
        }
      },
    })

    // Attach WebSocket server to HTTP server
    createWebSocketServer(httpServer)

    // Start listening
    httpServer.listen(config.port, config.host, () => {
      console.log(`Sandbox API listening on http://${config.host}:${config.port}`)
      console.log(`Health check: http://${config.host}:${config.port}/health`)
      console.log(`WebSocket: ws://${config.host}:${config.port}/sessions/:id/ws`)
      console.log(`CORS origin: ${config.frontendOrigin}`)
    })

    httpServer.on("error", (error) => {
      console.error("HTTP server error:", error)
    })
  })

  const stop = Effect.sync(() => {
    // Clear session service reference
    sessionServiceForHealth = null

    // Close all WebSocket connections first
    Effect.runSync(closeAllConnections)

    if (httpServer) {
      httpServer.closeAllConnections()
      httpServer.close()
      httpServer = null
      console.log("Sandbox API stopped")
    }
  })

  return { start, stop }
})

// Live layer
export const HttpServerLive = Layer.effect(HttpServer, make)

// Main server layer composition - all services needed for the API
export const ServerLayer = Layer.mergeAll(
  DockerClientLive,
  Layer.provide(ContainerService.ContainerServiceLive, DockerClientLive),
  Layer.provide(SessionServiceLive, ContainerService.ContainerServiceLive),
  Layer.provide(WebSocketServiceLive, ContainerService.ContainerServiceLive),
  RateLimitServiceLive,
)

// Default config from environment
const defaultConfig = Effect.sync(() => {
  const port = Number(process.env.PORT ?? "3001")
  const host = process.env.HOST ?? "0.0.0.0"
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"

  return {
    port,
    host,
    frontendOrigin,
  } as ServerConfig
})

// Default layer
export const ServerConfigLive = Layer.effect(ServerConfig, defaultConfig)

// Main function for Bun runtime
const mainProgram = Effect.gen(function* () {
  const http = yield* HttpServer
  const sessionService = yield* SessionService

  // Start the session cleanup scheduler
  yield* sessionService.startCleanupScheduler

  // Start the HTTP server
  yield* http.start
})

// Run main when file is executed directly
if (import.meta.main) {
  const program = mainProgram.pipe(
    Effect.provide(
      HttpServerLive.pipe(Layer.provide(ServerConfigLive), Layer.provide(ServerLayer)),
    ),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error("Server failed to start:", error)
        process.exit(1)
      }),
    ),
  )

  Effect.runPromise(program)
}

// Export health check for testing (legacy)
export const healthCheck = (): HealthResponse => {
  let containers = 0

  // Get session stats if session service is available
  if (sessionServiceForHealth !== null) {
    const statsResult = Effect.runSync(
      Effect.either(sessionServiceForHealth.getStats),
    )
    if (statsResult._tag === "Right") {
      containers = statsResult.right.total
    }
  }

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    containers,
  }
}
