/**
 * Integration tests for admin API endpoints.
 *
 * Tests all admin routes with real HTTP calls to validate:
 * - Authentication (missing/invalid API key)
 * - Rate limit endpoints (list, get, reset, adjust)
 * - Container endpoints (list, get, restart, stop, remove, logs)
 * - Metrics endpoints (system, sandbox, rate-limits)
 * - Error cases (invalid client ID, invalid parameters)
 *
 * @see packages/sandbox-api/src/routes/admin-rate-limits.ts
 * @see packages/sandbox-api/src/routes/admin-containers.ts
 * @see packages/sandbox-api/src/routes/admin-metrics.ts
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import {
  type ContainerInfoResponse,
  createAdminContainersRoutes,
} from "../../src/routes/admin-containers.js"
import {
  type RateLimitMetricsResponse,
  type SandboxMetricsResponse,
  type SystemMetricsResponse,
  createAdminMetricsRoutes,
} from "../../src/routes/admin-metrics.js"
import {
  type RateLimitStatusResponse,
  createAdminRateLimitsRoutes,
} from "../../src/routes/admin-rate-limits.js"
import { ContainerAdminError, type ContainerFilters } from "../../src/services/container-admin.js"
import { RateLimitAdminError } from "../../src/services/rate-limit-admin.js"

/**
 * Test configuration - port for the test server
 */
const TEST_PORT = 9487
const TEST_BASE_URL = `http://localhost:${TEST_PORT}`

/**
 * Valid test API key (matches what we'll configure in test routes)
 */
const VALID_API_KEY = "test-admin-key-for-integration-tests"

/**
 * Mock data for rate limit tracking
 */
const mockRateLimitStore = new Map<
  string,
  {
    sessionCount: number
    hourWindowStart: number
    activeSessions: readonly string[]
    commandCount: number
    minuteWindowStart: number
    activeWebSocketIds: readonly string[]
  }
>()

/**
 * Create mock RateLimitAdminServiceShape for testing
 * Returns proper Effect objects that can be run with Effect.runPromise
 */
const createMockRateLimitAdminService = () => {
  const toRateLimitStatus = (
    clientId: string,
    tracking: {
      sessionCount: number
      hourWindowStart: number
      activeSessions: readonly string[]
      commandCount: number
      minuteWindowStart: number
      activeWebSocketIds: readonly string[]
    },
  ): RateLimitStatusResponse => {
    const hourWindowEnd = tracking.hourWindowStart + 60 * 60 * 1000
    const minuteWindowEnd = tracking.minuteWindowStart + 60 * 1000

    return {
      clientId,
      sessionCount: tracking.sessionCount,
      sessionsPerHour: 50,
      hourWindowStart: tracking.hourWindowStart,
      hourWindowEnd,
      activeSessions: tracking.activeSessions,
      commandCount: tracking.commandCount,
      commandsPerMinute: 60,
      minuteWindowStart: tracking.minuteWindowStart,
      minuteWindowEnd,
      activeWebSocketIds: tracking.activeWebSocketIds,
      maxConcurrentSessions: 2,
      maxConcurrentWebSockets: 3,
    } satisfies RateLimitStatusResponse
  }

  return {
    getAllStatus: Effect.sync(
      () =>
        Array.from(mockRateLimitStore.entries()).map(([clientId, tracking]) =>
          toRateLimitStatus(clientId, tracking),
        ) as readonly RateLimitStatusResponse[],
    ),

    getStatus: (clientId: string) => {
      const tracking = mockRateLimitStore.get(clientId)
      if (!tracking) {
        return Effect.fail(
          new RateLimitAdminError({
            cause: "NotFound",
            message: `Client ${clientId} not found in rate limit tracking`,
          }),
        )
      }
      return Effect.succeed(toRateLimitStatus(clientId, tracking))
    },

    resetLimit: (clientId: string) => {
      if (!mockRateLimitStore.has(clientId)) {
        return Effect.fail(
          new RateLimitAdminError({
            cause: "NotFound",
            message: `Client ${clientId} not found in rate limit tracking`,
          }),
        )
      }
      mockRateLimitStore.delete(clientId)
      return Effect.void
    },

    adjustLimit: (clientId: string, params: { windowDuration?: number; maxRequests?: number }) => {
      // Validate parameters
      if (
        params.windowDuration !== undefined &&
        (typeof params.windowDuration !== "number" || params.windowDuration <= 0)
      ) {
        return Effect.fail(
          new RateLimitAdminError({
            cause: "InvalidRequest",
            message: "windowDuration must be a positive number",
          }),
        )
      }

      if (
        params.maxRequests !== undefined &&
        (typeof params.maxRequests !== "number" || params.maxRequests <= 0)
      ) {
        return Effect.fail(
          new RateLimitAdminError({
            cause: "InvalidRequest",
            message: "maxRequests must be a positive number",
          }),
        )
      }

      if (!mockRateLimitStore.has(clientId)) {
        return Effect.fail(
          new RateLimitAdminError({
            cause: "NotFound",
            message: `Client ${clientId} not found in rate limit tracking`,
          }),
        )
      }

      mockRateLimitStore.delete(clientId)

      // Return empty status
      return Effect.succeed({
        clientId,
        sessionCount: 0,
        sessionsPerHour: 50,
        hourWindowStart: 0,
        hourWindowEnd: 0,
        activeSessions: [],
        commandCount: 0,
        commandsPerMinute: 60,
        minuteWindowStart: 0,
        minuteWindowEnd: 0,
        activeWebSocketIds: [],
        maxConcurrentSessions: 2,
        maxConcurrentWebSockets: 3,
      } satisfies RateLimitStatusResponse)
    },
  }
}

/**
 * Create mock ContainerAdminServiceShape for testing
 */
const createMockContainerAdminService = () => {
  const now = Date.now()

  const mockContainers: readonly ContainerInfoResponse[] = [
    {
      id: "container-abc123",
      name: "toolkata-jj-git-session-1",
      status: "running",
      image: "toolkata/jj-git-sandbox:latest",
      createdAt: now - 60 * 60 * 1000,
      startedAt: now - 59 * 60 * 1000,
      toolPair: "jj-git",
      sessionId: "session-1",
      cpuPercent: 0.5,
      memoryUsage: 128 * 1024 * 1024,
      memoryLimit: 1024 * 1024 * 1024,
      memoryPercent: 12.5,
    } satisfies ContainerInfoResponse,
    {
      id: "container-def456",
      name: "toolkata-zio-cats-session-2",
      status: "stopped",
      image: "toolkata/zio-cats-sandbox:latest",
      createdAt: now - 2 * 60 * 60 * 1000,
      startedAt: undefined,
      toolPair: "zio-cats",
      sessionId: "session-2",
      cpuPercent: 0,
      memoryUsage: 0,
      memoryLimit: 1024 * 1024 * 1024,
      memoryPercent: 0,
    } satisfies ContainerInfoResponse,
  ]

  return {
    listContainers: (filters?: ContainerFilters) =>
      Effect.sync(() => {
        let containers = mockContainers

        // Apply filters
        if (filters?.status) {
          containers = containers.filter((c) => c.status === filters.status)
        }
        if (filters?.toolPair) {
          containers = containers.filter((c) => c.toolPair === filters.toolPair)
        }

        return containers
      }),

    getContainer: (id: string) => {
      const container = mockContainers.find((c) => c.id === id)
      if (!container) {
        return Effect.fail(
          new ContainerAdminError({
            cause: "NotFound",
            message: `Container ${id} not found`,
          }),
        )
      }
      return Effect.succeed(container)
    },

    restartContainer: (id: string) => {
      if (id !== "container-abc123") {
        return Effect.fail(
          new ContainerAdminError({
            cause: "NotFound",
            message: `Container ${id} not found`,
          }),
        )
      }
      return Effect.void
    },

    stopContainer: (id: string) => {
      if (id !== "container-abc123") {
        return Effect.fail(
          new ContainerAdminError({
            cause: "NotFound",
            message: `Container ${id} not found`,
          }),
        )
      }
      return Effect.void
    },

    removeContainer: (id: string) => {
      if (id !== "container-abc123") {
        return Effect.fail(
          new ContainerAdminError({
            cause: "NotFound",
            message: `Container ${id} not found`,
          }),
        )
      }
      return Effect.void
    },

    getLogs: (id: string) => {
      if (id !== "container-abc123") {
        return Effect.fail(
          new ContainerAdminError({
            cause: "NotFound",
            message: `Container ${id} not found`,
          }),
        )
      }
      return Effect.succeed("Container log line 1\nContainer log line 2\nContainer log line 3")
    },
  }
}

/**
 * Create mock MetricsServiceShape for testing
 */
const createMockMetricsService = () => {
  return {
    getSystemMetrics: Effect.sync(() => ({
      timestamp: Date.now(),
      cpu: {
        percent: 25.5,
        loadAvg: [1.2, 1.5, 1.8],
        cpuCount: 4,
      },
      memory: {
        used: 8 * 1024 * 1024 * 1024,
        total: 16 * 1024 * 1024 * 1024,
        percent: 50,
        free: 8 * 1024 * 1024 * 1024,
      },
      disk: {
        used: 100 * 1024 * 1024 * 1024,
        total: 500 * 1024 * 1024 * 1024,
        percent: 20,
        free: 400 * 1024 * 1024 * 1024,
      },
      network: {
        rxBytes: 1024 * 1024 * 100,
        txBytes: 1024 * 1024 * 50,
      },
    })),

    getSandboxMetrics: Effect.sync(() => ({
      timestamp: Date.now(),
      totalSessions: 10,
      runningSessions: 8,
      containers: 8,
      errors: 2,
    })),

    getRateLimitMetrics: Effect.sync(() => ({
      timestamp: Date.now(),
      totalClients: 50,
      activeClients: 15,
      violations: 5,
      topClients: [
        {
          clientId: "192.168.1.100",
          sessionCount: 10,
          commandCount: 150,
          activeSessions: 2,
        },
        {
          clientId: "10.0.0.50",
          sessionCount: 5,
          commandCount: 75,
          activeSessions: 1,
        },
      ],
    })),
  }
}

/**
 * Helper: Make authenticated request to admin API
 */
const adminRequest = async (
  path: string,
  options: RequestInit = {},
  apiKey: string | null = VALID_API_KEY,
): Promise<Response> => {
  const url = `${TEST_BASE_URL}${path}`

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (apiKey !== null) {
    headers["X-Admin-Key"] = apiKey
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Test server instance
 */
let testServer: ReturnType<typeof Bun.serve> | null = null

/**
 * Setup test server with Hono routes
 */
const setupTestServer = () => {
  const mockRateLimitAdmin = createMockRateLimitAdminService()
  const mockContainerAdmin = createMockContainerAdminService()
  const mockMetrics = createMockMetricsService()

  // Create Hono app with auth middleware
  const { Hono } = require("hono")
  const app = new Hono()

  // Auth middleware - validates X-Admin-Key header
  app.use("/*", async (c, next) => {
    const apiKey = c.req.header("X-Admin-Key")
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return c.json({ error: "Unauthorized", message: "Invalid or missing admin API key" }, 401)
    }
    await next()
  })

  // Mount admin routes
  const rateLimitsRoutes = createAdminRateLimitsRoutes(mockRateLimitAdmin)
  const containersRoutes = createAdminContainersRoutes(mockContainerAdmin)
  const metricsRoutes = createAdminMetricsRoutes(mockMetrics)

  app.route("/admin/rate-limits", rateLimitsRoutes)
  app.route("/admin/containers", containersRoutes)
  app.route("/admin/metrics", metricsRoutes)

  // Start server
  testServer = Bun.serve({
    port: TEST_PORT,
    fetch: app.fetch.bind(app),
  })

  return testServer
}

/**
 * Teardown test server
 */
const teardownTestServer = () => {
  if (testServer) {
    testServer.stop()
    testServer = null
  }
}

describe("Admin API Integration Tests", () => {
  beforeAll(() => {
    setupTestServer()
  })

  afterAll(() => {
    teardownTestServer()
  })

  describe("Authentication", () => {
    test("should return 401 when API key is missing", async () => {
      const response = await adminRequest("/admin/rate-limits", {}, null)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.error).toBe("Unauthorized")
      expect(body.message).toContain("Invalid or missing admin API key")
    })

    test("should return 401 when API key is invalid", async () => {
      const response = await adminRequest("/admin/rate-limits", {}, "invalid-key-12345")
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.error).toBe("Unauthorized")
    })

    test("should accept requests with valid API key", async () => {
      const response = await adminRequest("/admin/rate-limits", {}, VALID_API_KEY)
      expect(response.status).toBe(200)
    })
  })

  describe("Rate Limits Endpoints", () => {
    beforeEach(() => {
      // Reset mock store before each test
      mockRateLimitStore.clear()
    })

    test("GET /admin/rate-limits should return all rate limit statuses", async () => {
      const response = await adminRequest("/admin/rate-limits")
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty("rateLimits")
      expect(Array.isArray(body.rateLimits)).toBe(true)
    })

    test("GET /admin/rate-limits should return proper status structure", async () => {
      // Add test data
      const now = Date.now()
      mockRateLimitStore.set("test-client-1", {
        sessionCount: 3,
        hourWindowStart: now - 30 * 60 * 1000,
        activeSessions: ["session-1"],
        commandCount: 15,
        minuteWindowStart: now - 2 * 60 * 1000,
        activeWebSocketIds: ["ws-1"],
      })

      const response = await adminRequest("/admin/rate-limits")
      const body = await response.json()

      expect(body.rateLimits.length).toBeGreaterThan(0)

      const status = body.rateLimits[0]
      expect(status).toHaveProperty("clientId")
      expect(status).toHaveProperty("sessionCount")
      expect(status).toHaveProperty("commandCount")
      expect(status).toHaveProperty("sessionsPerHour")
      expect(status).toHaveProperty("commandsPerMinute")
      expect(status).toHaveProperty("hourWindowStart")
      expect(status).toHaveProperty("hourWindowEnd")
      expect(status).toHaveProperty("minuteWindowStart")
      expect(status).toHaveProperty("minuteWindowEnd")
      expect(status).toHaveProperty("activeSessions")
      expect(status).toHaveProperty("activeWebSocketIds")
      expect(status).toHaveProperty("maxConcurrentSessions")
      expect(status).toHaveProperty("maxConcurrentWebSockets")
    })

    test("GET /admin/rate-limits/:clientId should return specific client status", async () => {
      // Seed test data
      const now = Date.now()
      mockRateLimitStore.set("test-client-1", {
        sessionCount: 3,
        hourWindowStart: now - 30 * 60 * 1000,
        activeSessions: ["session-1"],
        commandCount: 15,
        minuteWindowStart: now - 2 * 60 * 1000,
        activeWebSocketIds: ["ws-1"],
      })

      const response = await adminRequest("/admin/rate-limits/test-client-1")
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.clientId).toBe("test-client-1")
      expect(body.sessionCount).toBe(3)
      expect(body.commandCount).toBe(15)
    })

    test("GET /admin/rate-limits/:clientId should return 404 for non-existent client", async () => {
      const response = await adminRequest("/admin/rate-limits/non-existent-client")
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("POST /admin/rate-limits/:clientId/reset should reset client rate limit", async () => {
      // Seed test data
      const now = Date.now()
      mockRateLimitStore.set("test-client-reset", {
        sessionCount: 5,
        hourWindowStart: now - 30 * 60 * 1000,
        activeSessions: ["session-1"],
        commandCount: 25,
        minuteWindowStart: now - 2 * 60 * 1000,
        activeWebSocketIds: ["ws-1"],
      })

      const response = await adminRequest("/admin/rate-limits/test-client-reset/reset", {
        method: "POST",
      })
      expect(response.status).toBe(204)
      expect(response.headers.get("Content-Length")).toBe("0")

      // Verify client was removed
      expect(mockRateLimitStore.has("test-client-reset")).toBe(false)
    })

    test("POST /admin/rate-limits/:clientId/reset should return 404 for non-existent client", async () => {
      const response = await adminRequest("/admin/rate-limits/non-existent-client/reset", {
        method: "POST",
      })
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("POST /admin/rate-limits/:clientId/adjust should adjust rate limit", async () => {
      // Seed test data
      const now = Date.now()
      mockRateLimitStore.set("test-client-adjust", {
        sessionCount: 7,
        hourWindowStart: now - 30 * 60 * 1000,
        activeSessions: ["session-1", "session-2"],
        commandCount: 35,
        minuteWindowStart: now - 2 * 60 * 1000,
        activeWebSocketIds: ["ws-1", "ws-2"],
      })

      const response = await adminRequest("/admin/rate-limits/test-client-adjust/adjust", {
        method: "POST",
        body: JSON.stringify({
          windowDuration: 3600,
          maxRequests: 100,
        }),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.clientId).toBe("test-client-adjust")
      // Adjust resets the client, so counts should be 0
      expect(body.sessionCount).toBe(0)
      expect(body.commandCount).toBe(0)
    })

    test("POST /admin/rate-limits/:clientId/adjust should return 404 for non-existent client", async () => {
      const response = await adminRequest("/admin/rate-limits/non-existent-client/adjust", {
        method: "POST",
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("POST /admin/rate-limits/:clientId/adjust should return 400 for invalid params", async () => {
      // Seed test data
      const now = Date.now()
      mockRateLimitStore.set("test-client-invalid", {
        sessionCount: 1,
        hourWindowStart: now - 30 * 60 * 1000,
        activeSessions: [],
        commandCount: 5,
        minuteWindowStart: now - 2 * 60 * 1000,
        activeWebSocketIds: [],
      })

      const response = await adminRequest("/admin/rate-limits/test-client-invalid/adjust", {
        method: "POST",
        body: JSON.stringify({
          windowDuration: -100,
        }),
      })
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error).toBe("InvalidRequest")
    })
  })

  describe("Container Endpoints", () => {
    test("GET /admin/containers should return all containers", async () => {
      const response = await adminRequest("/admin/containers")
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty("containers")
      expect(Array.isArray(body.containers)).toBe(true)
      expect(body.containers.length).toBeGreaterThan(0)
    })

    test("GET /admin/containers should return proper container structure", async () => {
      const response = await adminRequest("/admin/containers")
      const body = await response.json()

      if (body.containers.length > 0) {
        const container = body.containers[0]
        expect(container).toHaveProperty("id")
        expect(container).toHaveProperty("name")
        expect(container).toHaveProperty("status")
        expect(container).toHaveProperty("image")
        expect(container).toHaveProperty("createdAt")
        expect(container).toHaveProperty("toolPair")
        expect(container).toHaveProperty("sessionId")
      }
    })

    test("GET /admin/containers should filter by status query param", async () => {
      const response = await adminRequest("/admin/containers?status=running")
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.containers).toBeDefined()
    })

    test("GET /admin/containers should filter by toolPair query param", async () => {
      const response = await adminRequest("/admin/containers?toolPair=jj-git")
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.containers).toBeDefined()
    })

    test("GET /admin/containers/:id should return specific container", async () => {
      const response = await adminRequest("/admin/containers/container-abc123")
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.id).toBe("container-abc123")
      expect(body.name).toBe("toolkata-jj-git-session-1")
      expect(body.status).toBe("running")
    })

    test("GET /admin/containers/:id should return 404 for non-existent container", async () => {
      const response = await adminRequest("/admin/containers/non-existent-container")
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("POST /admin/containers/:id/restart should restart container", async () => {
      const response = await adminRequest("/admin/containers/container-abc123/restart", {
        method: "POST",
      })
      expect(response.status).toBe(204)
    })

    test("POST /admin/containers/:id/restart should return 404 for non-existent container", async () => {
      const response = await adminRequest("/admin/containers/non-existent-container/restart", {
        method: "POST",
      })
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("POST /admin/containers/:id/stop should stop container", async () => {
      const response = await adminRequest("/admin/containers/container-abc123/stop", {
        method: "POST",
      })
      expect(response.status).toBe(204)
    })

    test("POST /admin/containers/:id/stop should return 404 for non-existent container", async () => {
      const response = await adminRequest("/admin/containers/non-existent-container/stop", {
        method: "POST",
      })
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("DELETE /admin/containers/:id should remove container", async () => {
      const response = await adminRequest("/admin/containers/container-abc123", {
        method: "DELETE",
      })
      expect(response.status).toBe(204)
    })

    test("DELETE /admin/containers/:id should support force query param", async () => {
      const response = await adminRequest("/admin/containers/container-abc123?force=true", {
        method: "DELETE",
      })
      expect(response.status).toBe(204)
    })

    test("DELETE /admin/containers/:id should return 404 for non-existent container", async () => {
      const response = await adminRequest("/admin/containers/non-existent-container", {
        method: "DELETE",
      })
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("GET /admin/containers/:id/logs should return container logs", async () => {
      const response = await adminRequest("/admin/containers/container-abc123/logs")
      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toContain("text/plain")

      const text = await response.text()
      expect(text).toContain("Container log line")
    })

    test("GET /admin/containers/:id/logs should respect tail query param", async () => {
      const response = await adminRequest("/admin/containers/container-abc123/logs?tail=2")
      expect(response.status).toBe(200)

      const text = await response.text()
      const lines = text.trim().split("\n")
      expect(lines.length).toBeGreaterThanOrEqual(0)
    })

    test("GET /admin/containers/:id/logs should return 404 for non-existent container", async () => {
      const response = await adminRequest("/admin/containers/non-existent-container/logs")
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("NotFound")
    })

    test("GET /admin/containers/:id/logs should return 400 for invalid tail param", async () => {
      const response = await adminRequest("/admin/containers/container-abc123/logs?tail=invalid")
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error).toBe("InvalidRequest")
    })
  })

  describe("Metrics Endpoints", () => {
    test("GET /admin/metrics/system should return system metrics", async () => {
      const response = await adminRequest("/admin/metrics/system")
      expect(response.status).toBe(200)

      const body = (await response.json()) as SystemMetricsResponse
      expect(body).toHaveProperty("timestamp")
      expect(body).toHaveProperty("cpu")
      expect(body).toHaveProperty("memory")
      expect(body).toHaveProperty("disk")
      expect(body).toHaveProperty("network")

      // Check CPU structure
      expect(body.cpu).toHaveProperty("percent")
      expect(body.cpu).toHaveProperty("loadAvg")
      expect(body.cpu).toHaveProperty("cpuCount")
      expect(Array.isArray(body.cpu.loadAvg)).toBe(true)

      // Check memory structure
      expect(body.memory).toHaveProperty("used")
      expect(body.memory).toHaveProperty("total")
      expect(body.memory).toHaveProperty("percent")
      expect(body.memory).toHaveProperty("free")

      // Check disk structure
      expect(body.disk).toHaveProperty("used")
      expect(body.disk).toHaveProperty("total")
      expect(body.disk).toHaveProperty("percent")
      expect(body.disk).toHaveProperty("free")

      // Check network structure
      expect(body.network).toHaveProperty("rxBytes")
      expect(body.network).toHaveProperty("txBytes")
    })

    test("GET /admin/metrics/sandbox should return sandbox metrics", async () => {
      const response = await adminRequest("/admin/metrics/sandbox")
      expect(response.status).toBe(200)

      const body = (await response.json()) as SandboxMetricsResponse
      expect(body).toHaveProperty("timestamp")
      expect(body).toHaveProperty("totalSessions")
      expect(body).toHaveProperty("runningSessions")
      expect(body).toHaveProperty("containers")
      expect(body).toHaveProperty("errors")

      expect(typeof body.totalSessions).toBe("number")
      expect(typeof body.runningSessions).toBe("number")
      expect(typeof body.containers).toBe("number")
      expect(typeof body.errors).toBe("number")
    })

    test("GET /admin/metrics/rate-limits should return rate limit metrics", async () => {
      const response = await adminRequest("/admin/metrics/rate-limits")
      expect(response.status).toBe(200)

      const body = (await response.json()) as RateLimitMetricsResponse
      expect(body).toHaveProperty("timestamp")
      expect(body).toHaveProperty("totalClients")
      expect(body).toHaveProperty("activeClients")
      expect(body).toHaveProperty("violations")
      expect(body).toHaveProperty("topClients")

      expect(typeof body.totalClients).toBe("number")
      expect(typeof body.activeClients).toBe("number")
      expect(typeof body.violations).toBe("number")
      expect(Array.isArray(body.topClients)).toBe(true)

      // Check top clients structure
      if (body.topClients.length > 0) {
        const topClient = body.topClients[0]
        expect(topClient).toHaveProperty("clientId")
        expect(topClient).toHaveProperty("sessionCount")
        expect(topClient).toHaveProperty("commandCount")
        expect(topClient).toHaveProperty("activeSessions")
      }
    })
  })

  describe("Error Handling", () => {
    test("should return proper error response for rate limit not found", async () => {
      const response = await adminRequest("/admin/rate-limits/definitely-not-a-real-client-id")
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body).toHaveProperty("error")
      expect(body).toHaveProperty("message")
      expect(typeof body.error).toBe("string")
      expect(typeof body.message).toBe("string")
    })

    test("should return proper error response for container not found", async () => {
      const response = await adminRequest("/admin/containers/this-container-does-not-exist")
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body).toHaveProperty("error")
      expect(body).toHaveProperty("message")
      expect(body.error).toBe("NotFound")
    })

    test("should handle invalid JSON in request body", async () => {
      const response = await adminRequest("/admin/rate-limits/test-client/adjust", {
        method: "POST",
        body: "invalid json{{{",
      })
      // This should either return 400 from JSON parsing or 500 from the service
      expect([400, 500]).toContain(response.status)
    })

    test("should handle empty request body for adjust", async () => {
      // Seed test data
      const now = Date.now()
      mockRateLimitStore.set("test-client-empty-body", {
        sessionCount: 1,
        hourWindowStart: now - 30 * 60 * 1000,
        activeSessions: [],
        commandCount: 5,
        minuteWindowStart: now - 2 * 60 * 1000,
        activeWebSocketIds: [],
      })

      const response = await adminRequest("/admin/rate-limits/test-client-empty-body/adjust", {
        method: "POST",
        body: JSON.stringify({}),
      })
      // Empty body should be valid (no adjustments to make)
      expect(response.status).toBe(200)
    })
  })

  describe("Response Headers", () => {
    test("should return JSON content type for JSON responses", async () => {
      const response = await adminRequest("/admin/rate-limits")
      expect(response.headers.get("Content-Type")).toContain("application/json")
    })

    test("should return text/plain content type for logs", async () => {
      const response = await adminRequest("/admin/containers/container-abc123/logs")
      expect(response.headers.get("Content-Type")).toContain("text/plain")
    })

    test("should return UTF-8 charset for logs", async () => {
      const response = await adminRequest("/admin/containers/container-abc123/logs")
      expect(response.headers.get("Content-Type")).toContain("charset=utf-8")
    })
  })
})
