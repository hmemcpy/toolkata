/**
 * ContainerAdminService - Admin operations for container management.
 *
 * Provides read/write access to Docker containers for monitoring and management.
 * Uses Dockerode via the existing DockerClient dependency.
 *
 * @example
 * ```ts
 * import { ContainerAdminService } from "./services/container-admin"
 *
 * const program = Effect.gen(function* () {
 *   const admin = yield* ContainerAdminService
 *   const containers = yield* admin.listContainers({ status: "running" })
 *   return containers
 * })
 * ```
 */

import { Context, Data, Effect, Layer } from "effect"
import Docker from "dockerode"
import { DockerClient } from "./container.js"

// Docker container stats type (from dockerode)
interface ContainerStats {
  readonly cpu_stats: {
    readonly cpu_usage: {
      readonly total_usage: number
      readonly usage_in_usermode: number
      readonly usage_in_kernelmode: number
    }
    readonly system_cpu_usage: number
    readonly online_cpus: number
    readonly throttling_data: {
      readonly periods: number
      readonly throttled_periods: number
      readonly throttled_time: number
    }
  }
  readonly precpu_stats: {
    readonly cpu_usage: {
      readonly total_usage: number
      readonly usage_in_usermode: number
      readonly usage_in_kernelmode: number
    }
    readonly system_cpu_usage: number
    readonly online_cpus: number
    readonly throttling_data: {
      readonly periods: number
      readonly throttled_periods: number
      readonly throttled_time: number
    }
  }
  readonly memory_stats: {
    readonly usage?: number
    readonly max_usage?: number
    readonly limit: number
    readonly stats?: Record<string, number>
  }
}

/**
 * Detailed container information for admin API.
 */
export interface ContainerInfo {
  readonly id: string
  readonly name: string
  readonly status: "running" | "stopped" | "exited" | "dead" | "paused" | "restarting" | "created"
  readonly image: string
  readonly createdAt: number
  readonly startedAt: number | undefined
  readonly toolPair: string | undefined
  readonly sessionId: string | undefined
  readonly cpuPercent: number | undefined
  readonly memoryUsage: number | undefined
  readonly memoryLimit: number | undefined
  readonly memoryPercent: number | undefined
}

/**
 * Filters for listing containers.
 */
export interface ContainerFilters {
  readonly status?: "running" | "stopped" | "exited" | "dead" | "paused" | "restarting" | "created"
  readonly toolPair?: string
  readonly olderThan?: number // Unix timestamp - only return containers created before this time
}

/**
 * Request body for restart/stop/remove operations.
 */
export interface ContainerActionRequest {
  readonly force?: boolean
}

/**
 * Error types for container admin operations.
 */
export class ContainerAdminError extends Data.TaggedClass("ContainerAdminError")<{
  readonly cause: "NotFound" | "OperationFailed" | "InvalidRequest" | "DockerUnavailable"
  readonly message: string
  readonly originalError?: unknown
}> {}

/**
 * Service interface for container admin operations.
 */
export interface ContainerAdminServiceShape {
  /**
   * List all sandbox containers with optional filters.
   *
   * @param filters - Optional filters for status, toolPair, olderThan
   * @returns Array of container information.
   */
  readonly listContainers: (
    filters?: ContainerFilters,
  ) => Effect.Effect<readonly ContainerInfo[], ContainerAdminError>

  /**
   * Get detailed information for a specific container.
   *
   * @param containerId - The container ID or name.
   * @returns Detailed container information.
   * @throws ContainerAdminError with cause "NotFound" if container not found.
   */
  readonly getContainer: (
    containerId: string,
  ) => Effect.Effect<ContainerInfo, ContainerAdminError>

  /**
   * Restart a container.
   *
   * @param containerId - The container ID or name.
   * @returns void
   * @throws ContainerAdminError with cause "NotFound" if container not found.
   * @throws ContainerAdminError with cause "OperationFailed" if restart fails.
   */
  readonly restartContainer: (
    containerId: string,
  ) => Effect.Effect<void, ContainerAdminError>

  /**
   * Stop a container.
   *
   * @param containerId - The container ID or name.
   * @returns void
   * @throws ContainerAdminError with cause "NotFound" if container not found.
   * @throws ContainerAdminError with cause "OperationFailed" if stop fails.
   */
  readonly stopContainer: (containerId: string) => Effect.Effect<void, ContainerAdminError>

  /**
   * Remove a container.
   *
   * @param containerId - The container ID or name.
   * @param force - Whether to force remove (kill if running).
   * @returns void
   * @throws ContainerAdminError with cause "NotFound" if container not found.
   * @throws ContainerAdminError with cause "OperationFailed" if remove fails.
   */
  readonly removeContainer: (
    containerId: string,
    force?: boolean,
  ) => Effect.Effect<void, ContainerAdminError>

  /**
   * Get container logs.
   *
   * @param containerId - The container ID or name.
   * @param tail - Number of lines to retrieve from the end of logs.
   * @returns Log output as string.
   * @throws ContainerAdminError with cause "NotFound" if container not found.
   */
  readonly getLogs: (
    containerId: string,
    tail?: number,
  ) => Effect.Effect<string, ContainerAdminError>
}

/**
 * Service tag for dependency injection.
 */
export class ContainerAdminService extends Context.Tag("ContainerAdminService")<
  ContainerAdminService,
  ContainerAdminServiceShape
>() {}

/**
 * Normalize Docker container status to our status type.
 */
function normalizeContainerStatus(
  running: boolean,
  paused: boolean,
  restarting: boolean,
  dead: boolean,
  startedAt: string,
  status: string,
): ContainerInfo["status"] {
  if (running) return "running"
  if (paused) return "paused"
  if (restarting) return "restarting"
  if (dead) return "dead"
  if (startedAt && status !== "created") return "exited"
  return "stopped"
}

/**
 * Convert Docker container info to ContainerInfo.
 */
function toContainerInfo(info: Docker.ContainerInfo): ContainerInfo {
  // Cast State to proper type since dockerode's types are loose
  const state = info.State as unknown as {
    Running?: boolean
    Paused?: boolean
    Restarting?: boolean
    Dead?: boolean
    StartedAt?: string
    Status?: string
  }

  const status = normalizeContainerStatus(
    state.Running ?? false,
    state.Paused ?? false,
    state.Restarting ?? false,
    state.Dead ?? false,
    state.StartedAt ?? "",
    state.Status ?? "",
  )

  return {
    id: info.Id,
    name: info.Names?.[0]?.replace(/^\//, "") ?? info.Id.substring(0, 12),
    status,
    image: info.Image,
    createdAt: new Date(info.Created).getTime(),
    startedAt: state.StartedAt ? new Date(state.StartedAt).getTime() : undefined,
    toolPair: info.Labels?.["toolkata.tool-pair"] ?? undefined,
    sessionId: info.Labels?.["toolkata.session-id"] ?? undefined,
    cpuPercent: undefined,
    memoryUsage: undefined,
    memoryLimit: undefined,
    memoryPercent: undefined,
  }
}

/**
 * Create the ContainerAdminService implementation.
 */
const make = Effect.gen(function* () {
  const dockerClient = yield* DockerClient
  const docker = dockerClient.docker

  // List all containers with optional filters
  const listContainers = (filters?: ContainerFilters) =>
    Effect.tryPromise({
      try: async () => {
        // Build Docker filters
        const labelFilters: string[] = ["toolkata.tool-pair"]
        const statusFilters: string[] = []

        // Filter by status
        if (filters?.status) {
          statusFilters.push(filters.status)
        }

        // Filter by tool-pair label
        if (filters?.toolPair) {
          labelFilters.push(`toolkata.tool-pair=${filters.toolPair}`)
        }

        // Build filters object
        const dockerFilters: Record<string, string[]> = {
          label: labelFilters,
        }
        if (statusFilters.length > 0) {
          dockerFilters["status"] = statusFilters
        }

        // List all containers (including stopped ones)
        const containers = await docker.listContainers({ all: true, filters: dockerFilters })

        // Convert to ContainerInfo and apply additional filters
        let result = containers.map(toContainerInfo)

        // Filter by olderThan if specified
        if (filters?.olderThan !== undefined) {
          result = result.filter((c) => c.createdAt < filters.olderThan!)
        }

        return result as readonly ContainerInfo[]
      },
      catch: (error) => {
        return new ContainerAdminError({
          cause: "DockerUnavailable",
          message: error instanceof Error ? error.message : "Unknown error listing containers",
          originalError: error,
        })
      },
    })

  // Get specific container details with stats
  const getContainer = (containerId: string) =>
    Effect.gen(function* () {
      const container = docker.getContainer(containerId)

      // Get container inspect data
      const inspect = yield* Effect.tryPromise({
        try: async () => await container.inspect(),
        catch: (error) => {
          if (error instanceof Error && "statusCode" in error && error.statusCode === 404) {
            return new ContainerAdminError({
              cause: "NotFound",
              message: `Container ${containerId} not found`,
              originalError: error,
            })
          }
          return new ContainerAdminError({
            cause: "DockerUnavailable",
            message: error instanceof Error ? error.message : "Unknown error getting container",
            originalError: error,
          })
        },
      })

      // Get stats for CPU/memory (optional, may fail if container is stopped)
      const statsResult = yield* Effect.tryPromise({
        try: async () => await container.stats({ stream: false }),
        catch: () => null, // Stats may fail for stopped containers, that's okay
      }).pipe(
        Effect.catchAll(() => Effect.succeed(null)),
      )

      // Build ContainerInfo with stats
      const state = inspect.State as unknown as {
        Running?: boolean
        Paused?: boolean
        Restarting?: boolean
        Dead?: boolean
        StartedAt?: string
        Status?: string
      }
      const status = normalizeContainerStatus(
        state.Running ?? false,
        state.Paused ?? false,
        state.Restarting ?? false,
        state.Dead ?? false,
        state.StartedAt ?? "",
        state.Status ?? "",
      )
      let cpuPercent: number | undefined
      let memoryUsage: number | undefined
      let memoryLimit: number | undefined
      let memoryPercent: number | undefined

      if (statsResult !== null) {
        const stats = statsResult as unknown as ContainerStats

        // Calculate CPU percentage
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
        if (systemDelta > 0) {
          cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100
        }

        // Calculate memory usage
        memoryUsage = stats.memory_stats.usage ?? stats.memory_stats.max_usage
        memoryLimit = stats.memory_stats.limit
        if (memoryUsage !== undefined && memoryLimit !== undefined && memoryLimit > 0) {
          memoryPercent = (memoryUsage / memoryLimit) * 100
        }
      }

      return {
        id: inspect.Id,
        name: inspect.Name?.replace(/^\//, "") ?? containerId,
        status,
        image: inspect.Config?.Image ?? "",
        createdAt: new Date(inspect.Created).getTime(),
        startedAt: state.StartedAt ? new Date(state.StartedAt).getTime() : undefined,
        toolPair: inspect.Config?.Labels?.["toolkata.tool-pair"] ?? undefined,
        sessionId: inspect.Config?.Labels?.["toolkata.session-id"] ?? undefined,
        cpuPercent,
        memoryUsage,
        memoryLimit,
        memoryPercent,
      } satisfies ContainerInfo
    })

  // Restart a container
  const restartContainer = (containerId: string) =>
    Effect.tryPromise({
      try: async () => {
        const container = docker.getContainer(containerId)

        // Check if container exists first
        try {
          await container.inspect()
        } catch (error) {
          if (error instanceof Error && "statusCode" in error && error.statusCode === 404) {
            throw new ContainerAdminError({
              cause: "NotFound",
              message: `Container ${containerId} not found`,
              originalError: error,
            })
          }
          throw error
        }

        // Restart with timeout
        await Promise.race([
          container.restart({ t: 10 }), // 10 second timeout
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Container restart timed out after 10 seconds")),
              10000,
            ),
          ),
        ])
      },
      catch: (error) => {
        if (error instanceof ContainerAdminError) {
          return error
        }
        return new ContainerAdminError({
          cause: error instanceof Error && "statusCode" in error && error.statusCode === 404 ? "NotFound" : "OperationFailed",
          message: error instanceof Error ? error.message : "Unknown error restarting container",
          originalError: error,
        })
      },
    })

  // Stop a container
  const stopContainer = (containerId: string) =>
    Effect.tryPromise({
      try: async () => {
        const container = docker.getContainer(containerId)

        // Check if container exists first
        try {
          await container.inspect()
        } catch (error) {
          if (error instanceof Error && "statusCode" in error && error.statusCode === 404) {
            throw new ContainerAdminError({
              cause: "NotFound",
              message: `Container ${containerId} not found`,
              originalError: error,
            })
          }
          throw error
        }

        // Stop with timeout
        await Promise.race([
          container.stop({ t: 10 }), // 10 second timeout
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Container stop timed out after 10 seconds")),
              10000,
            ),
          ),
        ])
      },
      catch: (error) => {
        if (error instanceof ContainerAdminError) {
          return error
        }
        return new ContainerAdminError({
          cause: error instanceof Error && "statusCode" in error && error.statusCode === 404 ? "NotFound" : "OperationFailed",
          message: error instanceof Error ? error.message : "Unknown error stopping container",
          originalError: error,
        })
      },
    })

  // Remove a container
  const removeContainer = (containerId: string, force = false) =>
    Effect.tryPromise({
      try: async () => {
        const container = docker.getContainer(containerId)

        // Remove with timeout
        await Promise.race([
          container.remove({ force, v: true }), // v=true removes volumes
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Container remove timed out after 10 seconds")),
              10000,
            ),
          ),
        ])
      },
      catch: (error) => {
        return new ContainerAdminError({
          cause: error instanceof Error && "statusCode" in error && error.statusCode === 404 ? "NotFound" : "OperationFailed",
          message: error instanceof Error ? error.message : "Unknown error removing container",
          originalError: error,
        })
      },
    })

  // Get container logs
  const getLogs = (containerId: string, tail = 100) =>
    Effect.tryPromise({
      try: async () => {
        const container = docker.getContainer(containerId)

        // Check if container exists first
        try {
          await container.inspect()
        } catch (error) {
          if (error instanceof Error && "statusCode" in error && error.statusCode === 404) {
            throw new ContainerAdminError({
              cause: "NotFound",
              message: `Container ${containerId} not found`,
              originalError: error,
            })
          }
          throw error
        }

        // Get logs as string
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail,
          timestamps: false,
        })

        // Buffer is returned, convert to string
        return logs.toString("utf-8")
      },
      catch: (error) => {
        if (error instanceof ContainerAdminError) {
          return error
        }
        return new ContainerAdminError({
          cause: error instanceof Error && "statusCode" in error && error.statusCode === 404 ? "NotFound" : "DockerUnavailable",
          message: error instanceof Error ? error.message : "Unknown error getting container logs",
          originalError: error,
        })
      },
    })

  return {
    listContainers,
    getContainer,
    restartContainer,
    stopContainer,
    removeContainer,
    getLogs,
  }
})

/**
 * Live layer for ContainerAdminService.
 */
export const ContainerAdminServiceLive = Layer.effect(ContainerAdminService, make)
