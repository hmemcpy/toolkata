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
import {
  SandboxConfig,
  getAllowedOrigins,
  validateGvisorConfig,
  validateSecurityConfig,
} from "./config.js"
import { isGitHubConfigured } from "./config/github.js"
import { EnvironmentService, EnvironmentServiceLive } from "./environments/index.js"
import type { EnvironmentServiceShape } from "./environments/index.js"
import { createAdminCMSRoutes } from "./routes/admin-cms.js"
import { createAdminContainersRoutes } from "./routes/admin-containers.js"
import { createAdminLogsRoutes } from "./routes/admin-logs.js"
import { createAdminMetricsRoutes } from "./routes/admin-metrics.js"
import { createAdminRateLimitsRoutes } from "./routes/admin-rate-limits.js"
import { createSessionRoutes } from "./routes/sessions.js"
import { closeAllConnections, createWebSocketServer } from "./routes/websocket.js"
import { AuditService, AuditServiceLive, type AuditServiceShape } from "./services/audit.js"
import {
  type CircuitBreakerServiceShape,
  logCircuitBreakerConfig,
  makeCircuitBreakerService,
} from "./services/circuit-breaker.js"
import { ContainerAdminService, ContainerAdminServiceLive } from "./services/container-admin.js"
import {
  ContainerService,
  ContainerServiceLive,
  DockerClientLive,
  checkGvisorAvailable,
} from "./services/container.js"
import {
  ContentValidationService,
  ContentValidationServiceLive,
  type ContentValidationServiceShape,
} from "./services/content-validation.js"
import { GitHubService, GitHubServiceLive, type GitHubServiceShape } from "./services/github.js"
import {
  JwtAuthService,
  JwtAuthServiceLive,
  type JwtAuthServiceShape,
} from "./services/jwt-auth.js"
import { MetricsService, MetricsServiceLive, type MetricsServiceShape } from "./services/metrics.js"
import { RateLimitAdminService, RateLimitAdminServiceLive } from "./services/rate-limit-admin.js"
import {
  RateLimitService,
  RateLimitServiceLive,
  type RateLimitServiceShape,
  logRateLimitConfig,
} from "./services/rate-limit.js"
import { SessionService, SessionServiceLive, type SessionServiceShape } from "./services/session.js"
import { WebSocketService, WebSocketServiceLive } from "./services/websocket.js"
import { LoggingService, LoggingServiceLive } from "./services/logging.js"
import {
  LogsService,
  LogsServiceLive,
  setGlobalLogsService,
  type LogsServiceShape,
} from "./services/logs.js"

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
  readonly runtime: string | undefined
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
  _config: ServerConfig,
  sessionService: SessionServiceShape,
  rateLimitService: RateLimitServiceShape,
  auditService: AuditServiceShape,
  circuitBreakerService: CircuitBreakerServiceShape,
  envService: EnvironmentServiceShape,
  jwtAuthService: JwtAuthServiceShape,
  rateLimitAdminService?: import("./services/rate-limit-admin.js").RateLimitAdminServiceShape,
  containerAdminService?: import("./services/container-admin.js").ContainerAdminServiceShape,
  metricsService?: MetricsServiceShape,
  githubService?: GitHubServiceShape,
  contentValidationService?: ContentValidationServiceShape,
  logsService?: LogsServiceShape,
) => {
  const app = new Hono<{ Bindings: Env }>()

  // Check if ADMIN_API_KEY is set (fail fast if not configured)
  const adminApiKey = SandboxConfig.adminApiKey
  if (!adminApiKey || adminApiKey.length === 0) {
    console.warn(
      "[WARNING] ADMIN_API_KEY not set - admin routes will be disabled. Set ADMIN_API_KEY environment variable to enable admin endpoints.",
    )
  }

  // Get allowed origins from environment configuration
  const allowedOrigins = getAllowedOrigins()

  // CORS configuration with origin whitelist validation
  // If no origins configured (empty list), allow any origin (development mode)
  // If origins configured, only allow those specific origins (production mode)
  app.use(
    "/*",
    cors({
      origin: (origin) => {
        // Empty whitelist means allow any origin (development)
        if (allowedOrigins.length === 0) {
          return origin ?? "*"
        }

        // Check if origin is in the whitelist
        // Return the origin if allowed, null otherwise (CORS spec)
        return allowedOrigins.includes(origin) ? origin : null
      },
      credentials: true,
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    }),
  )

  // Health check endpoint with session stats and gVisor status (no version prefix)
  app.get("/health", async (c) => {
    let containers = 0

    // Get session stats if session service is available
    if (sessionServiceForHealth !== null) {
      const statsResult = Effect.runSync(Effect.either(sessionServiceForHealth.getStats))
      if (statsResult._tag === "Right") {
        const stats = statsResult.right
        containers = stats.total
      }
    }

    // Check gVisor availability (async - uses Docker API)
    const gvisorRequested = SandboxConfig.useGvisor
    const gvisorAvailable = await Effect.runPromise(
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

  // Mount session routes under /api/v1
  app.route(
    "/api/v1",
    createSessionRoutes(
      sessionService,
      rateLimitService,
      auditService,
      circuitBreakerService,
      envService,
      jwtAuthService,
    ),
  )

  // Mount admin routes under /admin (only if ADMIN_API_KEY is configured)
  // These routes are protected by Caddy with IP allowlist + X-Admin-Key header
  if (adminApiKey && adminApiKey.length > 0) {
    const adminApp = new Hono<{ Bindings: Env }>()

    // Admin authentication middleware - validates X-Admin-Key header or query param
    // Query param fallback needed for SSE (EventSource can't send custom headers)
    // This is defense in depth - Caddy should also enforce IP allowlist
    adminApp.use("/*", async (c, next) => {
      const providedKey = c.req.header("X-Admin-Key") ?? c.req.query("key")
      if (providedKey !== adminApiKey) {
        return c.json({ error: "Forbidden", message: "Invalid or missing admin key" }, 403)
      }
      return next()
    })

    // Mount all admin route modules
    if (rateLimitAdminService) {
      adminApp.route("/rate-limits", createAdminRateLimitsRoutes(rateLimitAdminService))
    }
    if (containerAdminService) {
      adminApp.route("/containers", createAdminContainersRoutes(containerAdminService))
    }
    if (metricsService) {
      adminApp.route("/metrics", createAdminMetricsRoutes(metricsService))
    }
    if (logsService) {
      adminApp.route("/logs", createAdminLogsRoutes(logsService))
    }
    // Mount CMS routes (only if GitHub is configured)
    if (githubService && isGitHubConfigured()) {
      adminApp.route(
        "/cms",
        createAdminCMSRoutes(githubService, contentValidationService, auditService),
      )
      console.log("CMS routes enabled at /admin/cms/*")
    }

    // Mount admin routes under /admin prefix
    app.route("/admin", adminApp)

    console.log("Admin routes enabled at /admin/* (protected by Caddy IP allowlist + X-Admin-Key)")
  }

  return app
}

// Service implementation
const make = Effect.gen(function* () {
  const config = yield* ServerConfig
  const sessionService = yield* SessionService
  const rateLimitService = yield* RateLimitService
  const webSocketService = yield* WebSocketService
  const auditService = yield* AuditService
  const jwtAuthService = yield* JwtAuthService
  const rateLimitAdminService = yield* RateLimitAdminService
  const containerAdminService = yield* ContainerAdminService
  const metricsService = yield* MetricsService
  const githubService = yield* GitHubService
  const contentValidationService = yield* ContentValidationService
  const envService = yield* EnvironmentService
  const logsService = yield* LogsService

  // Create circuit breaker (depends on session service for container count)
  const circuitBreakerService = makeCircuitBreakerService(sessionService)

  let httpServer: NodeHttpServer | null = null
  const app = createApp(
    config,
    sessionService,
    rateLimitService,
    auditService,
    circuitBreakerService,
    envService,
    jwtAuthService,
    rateLimitAdminService,
    containerAdminService,
    metricsService,
    githubService,
    contentValidationService,
    logsService,
  )

  const start = Effect.sync(() => {
    // Store service references for health checks and log streaming
    sessionServiceForHealth = sessionService
    setGlobalLogsService(logsService)

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
    createWebSocketServer(
      httpServer,
      sessionService,
      webSocketService,
      rateLimitService,
      auditService,
      jwtAuthService,
    )

    // Start listening
    httpServer.listen(config.port, config.host, () => {
      console.log(`Sandbox API listening on http://${config.host}:${config.port}`)
      console.log(`Health check: http://${config.host}:${config.port}/health`)
      console.log(`API v1: http://${config.host}:${config.port}/api/v1`)
      console.log(`WebSocket: ws://${config.host}:${config.port}/api/v1/sessions/:id/ws`)
      const allowedOriginsForLog = getAllowedOrigins()
      if (allowedOriginsForLog.length === 0) {
        console.log("CORS: allowing any origin (dev mode)")
      } else {
        for (const origin of allowedOriginsForLog) {
          console.log(`CORS origin: ${origin}`)
        }
      }
      logRateLimitConfig()
      logCircuitBreakerConfig()
    })

    httpServer.on("error", (error) => {
      console.error("HTTP server error:", error)
    })
  })

  const stop = Effect.sync(() => {
    // Clear service references
    sessionServiceForHealth = null
    setGlobalLogsService(null)

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

// Build dependent layers with explicit dependencies
// Chain: DockerClient + EnvironmentService -> ContainerService -> SessionService

// ContainerService depends on BOTH DockerClient AND EnvironmentService
const ContainerServiceLiveWithDeps = ContainerServiceLive.pipe(
  Layer.provide(DockerClientLive),
  Layer.provide(EnvironmentServiceLive),
)

// SessionService depends on ContainerService
const SessionServiceLiveWithDeps = SessionServiceLive.pipe(
  Layer.provide(ContainerServiceLiveWithDeps),
)

// WebSocketService depends on ContainerService
const WebSocketServiceLiveWithDeps = WebSocketServiceLive.pipe(
  Layer.provide(ContainerServiceLiveWithDeps),
)

// ContainerAdminService depends on DockerClient
const ContainerAdminServiceLiveWithDeps = ContainerAdminServiceLive.pipe(
  Layer.provide(DockerClientLive),
)

// MetricsService depends on DockerClient, SessionService, RateLimitService
const MetricsServiceLiveWithDeps = MetricsServiceLive.pipe(
  Layer.provide(DockerClientLive),
  Layer.provide(SessionServiceLiveWithDeps),
  Layer.provide(RateLimitServiceLive),
)

// RateLimitAdminService depends on RateLimitService
const RateLimitAdminServiceLiveWithDeps = RateLimitAdminServiceLive.pipe(
  Layer.provide(RateLimitServiceLive),
)

// GitHubService has no dependencies (uses config directly)
// ContentValidationService has no dependencies (uses Docker directly)

// Main server layer composition - all services needed for the API
// Only include base layers that have NO unmet dependencies.
// ContainerServiceLiveWithDeps already includes DockerClientLive and EnvironmentServiceLive,
// but we include EnvironmentServiceLive here too since mainProgram uses it directly.
// LoggingServiceLive is listed first to intercept console calls early.
export const ServerLayer = Layer.mergeAll(
  LoggingServiceLive,
  LogsServiceLive,
  ServerConfigLive,
  AuditServiceLive,
  EnvironmentServiceLive,
  ContainerServiceLiveWithDeps,
  SessionServiceLiveWithDeps,
  WebSocketServiceLiveWithDeps,
  ContainerAdminServiceLiveWithDeps,
  RateLimitServiceLive,
  RateLimitAdminServiceLiveWithDeps,
  MetricsServiceLiveWithDeps,
  GitHubServiceLive,
  ContentValidationServiceLive,
  JwtAuthServiceLive,
)

// Main function for Bun runtime
const mainProgram = Effect.gen(function* () {
  // Initialize logging service first (intercepts console calls)
  const loggingService = yield* LoggingService

  // Validate gVisor configuration before starting server
  const gvisorValidation = validateGvisorConfig()
  if (!gvisorValidation.valid) {
    return yield* Effect.fail(
      new ConfigError({
        cause: "InvalidValue",
        message: gvisorValidation.message ?? "Invalid gVisor configuration",
      }),
    )
  }

  const securityValidation = validateSecurityConfig()
  if (!securityValidation.valid) {
    return yield* Effect.fail(
      new ConfigError({
        cause: "InvalidValue",
        message: securityValidation.message ?? "Invalid security configuration",
      }),
    )
  }

  // Get environment service and validate all images exist
  const environmentService = yield* EnvironmentService
  yield* environmentService.validateAllImages.pipe(
    Effect.catchTag("MissingImagesError", (error) =>
      Effect.fail(
        new ConfigError({
          cause: "InvalidValue",
          message: error.message,
        }),
      ),
    ),
  )

  const http = yield* HttpServer
  const sessionService = yield* SessionService
  const containerService = yield* ContainerService

  // Clean up any orphaned containers from previous runs
  const orphanedCount = yield* containerService.cleanupOrphaned
  if (orphanedCount > 0) {
    console.log(`[Startup] Cleaned up ${orphanedCount} orphaned container(s)`)
  }

  // Clean up old log files beyond retention period
  const cleanedLogs = yield* loggingService.cleanupOldLogs
  if (cleanedLogs > 0) {
    console.log(`[Startup] Cleaned up ${cleanedLogs} old log file(s)`)
  }

  // Start the session cleanup scheduler
  yield* sessionService.startCleanupScheduler

  // Start the HTTP server
  yield* http.start
})

// Run main when file is executed directly
if (import.meta.main) {
  // Build the complete layer:
  // 1. HttpServerLive needs ServerLayer for its dependencies
  // 2. mainProgram needs HttpServer (from HttpServerLive) AND services from ServerLayer
  // So we build HttpServerLive with deps, then merge it with ServerLayer
  const HttpServerLiveWithDeps = HttpServerLive.pipe(Layer.provide(ServerLayer))
  const CompleteLayer = Layer.mergeAll(HttpServerLiveWithDeps, ServerLayer)

  const program = mainProgram.pipe(
    Effect.provide(CompleteLayer),
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
export const healthCheck = async (): Promise<HealthResponse> => {
  let containers = 0

  // Get session stats if session service is available
  if (sessionServiceForHealth !== null) {
    const statsResult = Effect.runSync(Effect.either(sessionServiceForHealth.getStats))
    if (statsResult._tag === "Right") {
      containers = statsResult.right.total
    }
  }

  // Check gVisor availability (async - uses Docker API)
  const gvisorRequested = SandboxConfig.useGvisor
  const gvisorAvailable = await Effect.runPromise(
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
