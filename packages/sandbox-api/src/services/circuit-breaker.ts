import { freemem, totalmem } from "node:os"
import { Context, Effect } from "effect"
import type { SessionServiceShape } from "./session.js"

// Check if in development mode (skip memory check on macOS which reports low free memory)
const isDevMode = process.env["NODE_ENV"] === "development"

// Circuit breaker thresholds
const THRESHOLDS = {
  maxContainers: Number(process.env["CIRCUIT_MAX_CONTAINERS"]) || 15,
  maxMemoryPercent: Number(process.env["CIRCUIT_MAX_MEMORY_PERCENT"]) || 85,
  maxCpuPercent: Number(process.env["CIRCUIT_MAX_CPU_PERCENT"]) || 85,
} as const

// Circuit breaker status
export interface CircuitStatus {
  readonly isOpen: boolean // true = rejecting requests
  readonly reason: string | null
  readonly metrics: {
    readonly containers: number
    readonly maxContainers: number
    readonly memoryPercent: number
    readonly maxMemoryPercent: number
  }
}

// Service interface
export interface CircuitBreakerServiceShape {
  readonly getStatus: Effect.Effect<CircuitStatus, never>
  readonly isOpen: Effect.Effect<boolean, never>
}

// Service tag
export class CircuitBreakerService extends Context.Tag("CircuitBreakerService")<
  CircuitBreakerService,
  CircuitBreakerServiceShape
>() {}

// Get system memory usage percentage
const getMemoryUsage = (): number => {
  const total = totalmem()
  const free = freemem()
  const used = total - free
  const percent = (used / total) * 100
  return Math.round(percent)
}

// Create the service (requires SessionService for container count)
export const makeCircuitBreakerService = (
  sessionService: SessionServiceShape,
): CircuitBreakerServiceShape => {
  const getStatus = Effect.gen(function* () {
    // Get active container count
    const stats = yield* sessionService.getStats
    const containers = stats.total

    // Get memory usage
    const memoryPercent = getMemoryUsage()

    // Check thresholds
    let isOpen = false
    let reason: string | null = null

    if (containers >= THRESHOLDS.maxContainers) {
      isOpen = true
      reason = `Too many active containers (${containers}/${THRESHOLDS.maxContainers})`
    } else if (!isDevMode && memoryPercent >= THRESHOLDS.maxMemoryPercent) {
      // Skip memory check in dev mode (macOS reports low free memory due to aggressive caching)
      isOpen = true
      reason = `Memory usage too high (${memoryPercent}%/${THRESHOLDS.maxMemoryPercent}%)`
    }

    return {
      isOpen,
      reason,
      metrics: {
        containers,
        maxContainers: THRESHOLDS.maxContainers,
        memoryPercent,
        maxMemoryPercent: THRESHOLDS.maxMemoryPercent,
      },
    } satisfies CircuitStatus
  })

  const isOpen = getStatus.pipe(Effect.map((status) => status.isOpen))

  return { getStatus, isOpen }
}

// Log thresholds on startup
export const logCircuitBreakerConfig = () => {
  console.log("Circuit breaker thresholds:")
  console.log(`  Max containers:    ${THRESHOLDS.maxContainers}`)
  console.log(`  Max memory:        ${THRESHOLDS.maxMemoryPercent}%`)
  console.log(`  Max CPU:           ${THRESHOLDS.maxCpuPercent}%`)
}
