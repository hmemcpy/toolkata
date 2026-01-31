/**
 * MetricsService - System and sandbox metrics collection.
 *
 * Provides metrics for:
 * - System resources (CPU, memory, disk, network)
 * - Sandbox statistics (sessions, containers, errors)
 * - Rate limit statistics (violations, top clients)
 *
 * @example
 * ```ts
 * import { MetricsService } from "./services/metrics"
 *
 * const program = Effect.gen(function* () {
 *   const metrics = yield* MetricsService
 *   const system = yield* metrics.getSystemMetrics()
 *   const sandbox = yield* metrics.getSandboxMetrics()
 *   const rateLimits = yield* metrics.getRateLimitMetrics()
 *   return { system, sandbox, rateLimits }
 * })
 * ```
 */

import { Context, Data, Effect, Layer } from "effect"
import { cpus, freemem, loadavg, totalmem } from "node:os"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { DockerClient } from "./container.js"
import { RateLimitService } from "./rate-limit.js"
import { SessionService } from "./session.js"

const execAsync = promisify(exec)

/**
 * System metrics including CPU, memory, disk, and network.
 */
export interface SystemMetrics {
  readonly timestamp: number
  readonly cpu: {
    readonly percent: number
    readonly loadAvg: readonly number[]
    readonly cpuCount: number
  }
  readonly memory: {
    readonly used: number
    readonly total: number
    readonly percent: number
    readonly free: number
  }
  readonly disk: {
    readonly used: number
    readonly total: number
    readonly percent: number
    readonly free: number
  }
  readonly network: {
    readonly rxBytes: number
    readonly txBytes: number
  }
}

/**
 * Sandbox metrics including sessions and containers.
 */
export interface SandboxMetrics {
  readonly timestamp: number
  readonly totalSessions: number
  readonly runningSessions: number
  readonly containers: number
  readonly errors: number
}

/**
 * Rate limit metrics including violations and top clients.
 */
export interface RateLimitMetrics {
  readonly timestamp: number
  readonly totalClients: number
  readonly activeClients: number
  readonly violations: number
  readonly topClients: readonly {
    readonly clientId: string
    readonly sessionCount: number
    readonly commandCount: number
    readonly activeSessions: number
  }[]
}

/**
 * Error types for metrics operations.
 */
export class MetricsError extends Data.TaggedClass("MetricsError")<{
  readonly cause: "CommandFailed" | "DockerUnavailable" | "DataUnavailable"
  readonly message: string
  readonly originalError?: unknown
}> {}

/**
 * Service interface for metrics collection.
 */
export interface MetricsServiceShape {
  readonly getSystemMetrics: Effect.Effect<SystemMetrics, MetricsError>
  readonly getSandboxMetrics: Effect.Effect<SandboxMetrics, never>
  readonly getRateLimitMetrics: Effect.Effect<RateLimitMetrics, never>
}

/**
 * Service tag for MetricsService.
 */
export class MetricsService extends Context.Tag("MetricsService")<
  MetricsService,
  MetricsServiceShape
>() {}

/**
 * Helper: Execute shell command and get stdout.
 */
const execCommand = (command: string): Effect.Effect<string, MetricsError> =>
  Effect.tryPromise({
    try: () => execAsync(command),
    catch: (error) =>
      new MetricsError({
        cause: "CommandFailed",
        message: `Command failed: ${command}`,
        originalError: error,
      }),
  }).pipe(Effect.map((result) => result.stdout.trim()))

/**
 * Helper: Parse df output to get disk metrics.
 * Expected output format: "used total percent"
 */
const parseDfOutput = (output: string): { used: number; total: number; percent: number; free: number } => {
  const parts = output.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length < 3) {
    return { used: 0, total: 0, percent: 0, free: 0 }
  }
  const used = Number.parseInt(parts[0] ?? "0", 10) || 0
  const total = Number.parseInt(parts[1] ?? "0", 10) || 0
  const percent = Number.parseInt(parts[2] ?? "0", 10) || 0
  const free = total - used
  return { used, total, percent, free }
}

/**
 * Helper: Get CPU usage percentage.
 * Uses a simple calculation based on load average vs CPU count.
 */
const getCpuPercent = (): number => {
  const cpuCount = cpus().length
  const loadAvgValues = loadavg()
  const oneMinLoad = loadAvgValues[0] ?? 0
  // CPU percent = (load average / CPU count) * 100
  return Math.min(100, Math.round((oneMinLoad / cpuCount) * 100))
}

/**
 * Helper: Get network stats from /proc/net/dev.
 * Returns total rx and tx bytes across all interfaces.
 */
const getNetworkStats = Effect.tryPromise({
  try: async () => {
    try {
      const fs = await import("node:fs/promises")
      const content = await fs.readFile("/proc/net/dev", "utf-8")
      const lines = content.split("\n")

      let totalRx = 0
      let totalTx = 0

      for (const line of lines) {
        // Skip header lines
        if (!line.includes(":")) continue

        const parts = line.trim().split(/\s+/)
        // Format: interface rx_bytes rx_packets ... tx_bytes tx_packets
        const colonIndex = parts.findIndex((part) => part.includes(":"))
        if (colonIndex === -1) continue

        // After the interface:name, rx_bytes is at index colonIndex + 1
        // tx_bytes is after 7 more fields (rx_bytes, rx_packets, rx_errs, rx_drop, rx_fifo, rx_frame, rx_compressed, rx_multicast)
        const rxBytes = Number.parseInt(parts[colonIndex + 1] ?? "0", 10) || 0
        const txBytes = Number.parseInt(parts[colonIndex + 9] ?? "0", 10) || 0

        totalRx += rxBytes
        totalTx += txBytes
      }

      return { rxBytes: totalRx, txBytes: totalTx }
    } catch {
      // If /proc/net/dev is not available (non-Linux), return zeros
      return { rxBytes: 0, txBytes: 0 }
    }
  },
  catch: () =>
    new MetricsError({
      cause: "DataUnavailable",
      message: "Network stats not available",
    }),
})

/**
 * Service implementation.
 */
const make = Effect.gen(function* () {
  const docker = yield* DockerClient
  const sessionService = yield* SessionService
  const rateLimitService = yield* RateLimitService

  /**
   * Get system metrics (CPU, memory, disk, network).
   */
  const getSystemMetrics: Effect.Effect<SystemMetrics, MetricsError> = Effect.gen(function* () {
    const timestamp = Date.now()

    // CPU metrics
    const cpuCount = cpus().length
    const cpuPercent = getCpuPercent()
    const loadAvgValues = loadavg()

    // Memory metrics
    const memTotal = totalmem()
    const memFree = freemem()
    const memUsed = memTotal - memFree
    const memPercent = Math.round((memUsed / memTotal) * 100)

    // Disk metrics (using df command)
    // Get disk usage in bytes: used total percent
    const diskOutput = yield* execCommand("df -B1 / | tail -1 | awk '{print $3, $2, $5}'")
    const disk = parseDfOutput(diskOutput)

    // Network metrics
    const network = yield* getNetworkStats

    return {
      timestamp,
      cpu: {
        percent: cpuPercent,
        loadAvg: loadAvgValues,
        cpuCount,
      },
      memory: {
        used: memUsed,
        total: memTotal,
        percent: memPercent,
        free: memFree,
      },
      disk,
      network,
    } satisfies SystemMetrics
  })

  /**
   * Get sandbox metrics (sessions, containers, errors).
   */
  const getSandboxMetrics: Effect.Effect<SandboxMetrics, never> = Effect.gen(function* () {
    const timestamp = Date.now()

    // Get session stats from SessionService
    const sessionStats = yield* sessionService.getStats

    // Get container count from Docker
    let containerCount = 0
    const listResult = yield* Effect.either(
      Effect.tryPromise({
        try: async () => {
          const containers = await docker.docker.listContainers({ all: true })
          // Count only toolkata sandbox containers
          return containers.filter((c: { Names: string[] }) =>
            c.Names.some((n: string) => n.includes("sandbox_")),
          ).length
        },
        catch: () => 0,
      }),
    )
    if (listResult._tag === "Right") {
      containerCount = listResult.right
    }

    return {
      timestamp,
      totalSessions: sessionStats.total,
      runningSessions: sessionStats.running,
      containers: containerCount,
      errors: 0, // Could be tracked separately if needed
    } satisfies SandboxMetrics
  })

  /**
   * Get rate limit metrics (violations, top clients).
   */
  const getRateLimitMetrics: Effect.Effect<RateLimitMetrics, never> = Effect.gen(function* () {
    const timestamp = Date.now()

    // Get all tracking data from RateLimitService
    const allTrackingMap = yield* rateLimitService.admin.getAllTracking()
    const allTracking = Array.from(allTrackingMap.entries())

    // Calculate totals
    const totalClients = allTracking.length
    const activeClients = allTracking.filter(
      ([_, tracking]) => tracking.activeSessions.length > 0 || tracking.commandCount > 0,
    ).length

    // Sort by session count + command count for "top clients"
    const topClients = allTracking
      .map(([clientId, tracking]) => ({
        clientId,
        sessionCount: tracking.sessionCount,
        commandCount: tracking.commandCount,
        activeSessions: tracking.activeSessions.length,
      }))
      .sort((a, b) => b.sessionCount + b.commandCount - (a.sessionCount + a.commandCount))
      .slice(0, 10) // Top 10 clients

    // Sum violations (we can approximate this by session + command counts)
    const violations = allTracking.reduce((sum, [, tracking]) => sum + tracking.sessionCount, 0)

    return {
      timestamp,
      totalClients,
      activeClients,
      violations,
      topClients,
    } satisfies RateLimitMetrics
  })

  return {
    getSystemMetrics,
    getSandboxMetrics,
    getRateLimitMetrics,
  } satisfies MetricsServiceShape
})

/**
 * Live layer for MetricsService.
 */
export const MetricsServiceLive = Layer.effect(MetricsService, make)
