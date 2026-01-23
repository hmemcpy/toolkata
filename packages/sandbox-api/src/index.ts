import {
  type IncomingMessage,
  type Server as NodeHttpServer,
  type ServerResponse,
  createServer as createHttpServer,
} from "node:http"
import { Context, Data, Effect, Layer } from "effect"
import { Hono } from "hono"
import type { Env } from "hono"
import { cors } from "hono/cors"
import { createSessionRoutes } from "./routes/sessions.js"
import { closeAllConnections, createWebSocketServer } from "./routes/websocket.js"
import { ContainerServiceLive, DockerClientLive, checkGvisorAvailable } from "./services/container.js"
import {
  RateLimitService,
  RateLimitServiceLive,
  type RateLimitServiceShape,
} from "./services/rate-limit.js"
import { SessionService, SessionServiceLive, type SessionServiceShape } from "./services/session.js"
import { WebSocketService, WebSocketServiceLive } from "./services/websocket.js"
import { SandboxConfig } from "./config.js"

// Module-level reference to SessionService for health checks
// This is set when the server starts and allows the health endpoint to access session stats
let sessionServiceForHealth: SessionServiceShape | null = null

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

// gVisor health status
export interface GvisorHealthStatus {
  readonly requested: boolean
  readonly available: boolean
  readonly runtime?: string
}

// Health check response type
export interface HealthResponse {
  readonly status: "ok"
  readonly timestamp: string
  readonly uptime: number
  readonly containers: number
  readonly gvisor: GvisorHealthStatus
}

// Create Hono app with CORS and health check
const createApp = (
  config: ServerConfig,
  sessionService: SessionServiceShape,
  rateLimitService: RateLimitServiceShape,
) => {
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

  // Health check endpoint with session stats and gVisor status
  app.get("/health", (c) => {
    let containers = 0

    // Get session stats if session service is available
    if (sessionServiceForHealth !== null) {
      const statsResult = Effect.runSync(Effect.either(sessionServiceForHealth.getStats))
      if (statsResult._tag === "Right") {
        const stats = statsResult.right
        containers = stats.total
      }
    }

    // Check gVisor availability
    const gvisorRequested = SandboxConfig.useGvisor
    const gvisorAvailable = Effect.runSync(
      checkGvisorAvailable.pipe(Effect.catchAll(() => Effect.succeed(false))),
    )

    return c.json<HealthResponse>({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      containers,
      gvisor: {
        requested: gvisorRequested,
        available: gvisorAvailable,
        runtime: gvisorRequested ? SandboxConfig.gvisorRuntime : undefined,
      },
    })
  })

  // Mount session routes
  app.route("/", createSessionRoutes(sessionService, rateLimitService))

  return app
}

// Service implementation
const make = Effect.gen(function* () {
  const config = yield* ServerConfig
  const sessionService = yield* SessionService
  const rateLimitService = yield* RateLimitService
  const webSocketService = yield* WebSocketService

  let httpServer: NodeHttpServer | null = null
  const app = createApp(config, sessionService, rateLimitService)

  const start = Effect.sync(() => {
    // Store session service reference for health checks
    sessionServiceForHealth = sessionService

    // Create Node.js HTTP server for WebSocket upgrade support
    httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`)
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") {
          headers.set(key, value)
        } else if (Array.isArray(value)) {
          for (const v of value) {
            headers.append(key, v)
          }
        }
      }

      const requestInit: RequestInit = {
        method: req.method ?? "GET",
        headers,
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        const body = req as unknown as RequestInit["body"]
        if (body !== undefined) {
          requestInit.body = body
        }
      }

      const request = new Request(url.toString(), requestInit)

      const response = await app.fetch(request, {})
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
      if (response.body) {
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(Buffer.from(value))
        }
        res.end()
      } else {
        res.end()
      }
    })

    // Attach WebSocket server to HTTP server with services for connection handling
    createWebSocketServer(httpServer, sessionService, webSocketService)

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
// Simple approach: Layer.mergeAll automatically resolves dependencies
export const ServerLayer = Layer.mergeAll(
  DockerClientLive,
  RateLimitServiceLive,
  ContainerServiceLive,
  SessionServiceLive,
  WebSocketServiceLive,
)

// Default config from environment
const defaultConfig = Effect.sync(() => {
  const port = Number(process.env["PORT"] ?? "3001")
  const host = process.env["HOST"] ?? "0.0.0.0"
  const frontendOrigin = process.env["FRONTEND_ORIGIN"] ?? "http://localhost:3000"

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
  // Build the complete application layer with proper dependency resolution
  // Base layers (no dependencies)
  const baseLayer = Layer.mergeAll(ServerConfigLive, DockerClientLive, RateLimitServiceLive)

  // Container service depends on DockerClient
  const containerLayer = ContainerServiceLive.pipe(Layer.provide(DockerClientLive))

  // Session service depends on ContainerService
  const sessionLayer = SessionServiceLive.pipe(Layer.provide(containerLayer))

  // WebSocket service depends on ContainerService and DockerClient
  const wsLayer = WebSocketServiceLive.pipe(
    Layer.provide(Layer.merge(containerLayer, DockerClientLive)),
  )

  // HTTP server depends on ServerConfig, SessionService, RateLimitService, WebSocketService
  const httpLayer = HttpServerLive.pipe(
    Layer.provide(Layer.mergeAll(ServerConfigLive, sessionLayer, RateLimitServiceLive, wsLayer)),
  )

  // Merge all layers for the final app
  const appLayer = Layer.mergeAll(baseLayer, containerLayer, sessionLayer, wsLayer, httpLayer)

  const program = mainProgram.pipe(
    Effect.provide(appLayer),
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
    const statsResult = Effect.runSync(Effect.either(sessionServiceForHealth.getStats))
    if (statsResult._tag === "Right") {
      containers = statsResult.right.total
    }
  }

  // Check gVisor availability
  const gvisorRequested = SandboxConfig.useGvisor
  const gvisorAvailable = Effect.runSync(
    checkGvisorAvailable.pipe(Effect.catchAll(() => Effect.succeed(false))),
  )

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    containers,
    gvisor: {
      requested: gvisorRequested,
      available: gvisorAvailable,
      runtime: gvisorRequested ? SandboxConfig.gvisorRuntime : undefined,
    },
  }
}
