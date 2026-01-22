import { Data, Effect, Layer } from "effect"
import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "hono"
import { sessionRoutes } from "./routes/sessions.js"
import { ContainerService, DockerClientLive } from "./services/container.js"
import { SessionService, SessionServiceLive } from "./services/session.js"
import { RateLimitServiceLive } from "./services/rate-limit.js"

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
}

// Create Hono app with CORS and health check
const createApp = (config: ServerConfig) => {
  const app = new Hono<{ Bindings: Env }>()

  // CORS configuration
  app.use("/*", cors({
    origin: config.frontendOrigin,
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }))

  // Health check endpoint
  app.get("/health", (c) => {
    return c.json<HealthResponse>({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  })

  // Mount session routes
  app.route("/", sessionRoutes)

  return app
}

// Service implementation
const make = Effect.gen(function* () {
  const config = yield* ServerConfig

  let server: ReturnType<typeof Bun.serve> | null = null
  const app = createApp(config)

  const start = Effect.sync(() => {
    server = Bun.serve({
      port: config.port,
      fetch: app.fetch,
    })

    console.log(`Sandbox API listening on http://localhost:${config.port}`)
    console.log(`Health check: http://localhost:${config.port}/health`)
    console.log(`CORS origin: ${config.frontendOrigin}`)
  })

  const stop = Effect.sync(() => {
    if (server) {
      server.stop()
      server = null
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
  RateLimitServiceLive,
)

// Default config from environment
const defaultConfig = Effect.sync(() => {
  const port = Number(process.env.PORT ?? "3001")
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"

  return {
    port,
    frontendOrigin,
  } as ServerConfig
})

// Default layer
export const ServerConfigLive = Layer.effect(
  ServerConfig,
  defaultConfig,
)

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
      HttpServerLive.pipe(
        Layer.provide(ServerConfigLive),
        Layer.provide(ServerLayer),
      ),
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
export const healthCheck = (): HealthResponse => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
})
