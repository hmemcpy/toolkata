import Docker from "dockerode"
import { Context, Data, Effect, Layer, Console } from "effect"
import { SandboxConfig } from "../config.js"
import { EnvironmentService } from "../environments/index.js"

// Error types with Data.TaggedClass
export class ContainerError extends Data.TaggedClass("ContainerError")<{
  readonly cause: "CreateFailed" | "DestroyFailed" | "NotFoundError" | "DockerUnavailable"
  readonly message: string
  readonly originalError?: unknown
}> {}

// Container info type
export interface Container {
  readonly id: string
  readonly name: string
  readonly toolPair: string
  readonly createdAt: Date
}

// Service interface
export interface ContainerServiceShape {
  readonly create: (
    toolPair: string,
    environment?: string,
  ) => Effect.Effect<Container, ContainerError>
  readonly destroy: (containerId: string) => Effect.Effect<void, ContainerError>
  readonly get: (containerId: string) => Effect.Effect<Container, ContainerError>
  readonly cleanupOrphaned: Effect.Effect<number, never>
}

// Service tag
export class ContainerService extends Context.Tag("ContainerService")<
  ContainerService,
  ContainerServiceShape
>() {}

// Docker client tag
export interface DockerClientShape {
  readonly docker: Docker
}

// Use class-based tag for stable identity in Layer.mergeAll
export class DockerClient extends Context.Tag("DockerClient")<DockerClient, DockerClientShape>() {}

// Security configuration from PLAN.md
const CONTAINER_SECURITY = {
  // Network isolation - no network access
  network: "none",

  // Read-only root filesystem (tmpfs for writable areas)
  // uid=1000,gid=1000 corresponds to the sandbox user created in Dockerfile
  readonly: true,
  tmpfs: {
    "/home/toolkata": "size=50M,uid=1000,gid=1000",
    "/tmp": "size=10M",
  },

  // Resource limits
  memory: 128 * 1024 * 1024, // 128MB
  cpus: 0.5,
  pidsLimit: 50,

  // Security hardening
  capDrop: ["ALL"],
  securityOpt: ["no-new-privileges"],
  ulimit: {
    nofile: { soft: 64, hard: 64 },
  },

  // Auto-remove on exit
  autoRemove: false, // We'll handle cleanup explicitly
} as const

// Helper: Generate unique container name
const generateContainerName = (toolPair: string): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `sandbox-${toolPair}-${timestamp}-${random}`
}

/**
 * Check if gVisor runtime is available
 *
 * @returns Effect that resolves to true if gVisor is available, false otherwise
 */
export const checkGvisorAvailable = Effect.tryPromise({
  try: async () => {
    if (!SandboxConfig.useGvisor) {
      return false
    }

    // Try to get Docker info and check for gVisor runtime
    const docker = new Docker({
      socketPath: process.env["DOCKER_HOST"] ?? "/var/run/docker.sock",
    })

    const info = await docker.info()

    // Check if runsc is in the list of runtimes
    const runtimes = info.Runtimes ?? {}
    const runtimeName = SandboxConfig.gvisorRuntime

    if (runtimeName in runtimes) {
      Console.log(`gVisor runtime '${runtimeName}' is available`)
      return true
    }

    Console.warn(
      `gVisor runtime '${runtimeName}' requested but not found in Docker runtimes: ${Object.keys(runtimes).join(", ") || "none"}`,
    )
    return false
  },
  catch: (error) => {
    Console.error("Failed to check gVisor availability", error)
    return false
  },
})

// Service implementation
const make = Effect.gen(function* () {
  const dockerClient = yield* DockerClient
  const environmentService = yield* EnvironmentService

  const create = (toolPair: string, environmentParam?: string) =>
    Effect.gen(function* () {
      // Get environment configuration (defaults to "bash")
      const environment = environmentParam ?? "bash"
      const envConfig = yield* environmentService.get(environment)

      const docker = dockerClient.docker
      const imageName = envConfig.dockerImage

      // Check if image exists
      const imageExists = yield* Effect.tryPromise({
        try: async () => {
          try {
            await docker.getImage(imageName).inspect()
            return true
          } catch {
            return false
          }
        },
        catch: () => false,
      })

      if (!imageExists) {
        return yield* Effect.fail(
          new ContainerError({
            cause: "CreateFailed",
            message: `Sandbox image ${imageName} not found. Please build the image first using: ./scripts/docker-build-all.sh`,
          }),
        )
      }

      // Create container with security settings
      const containerName = generateContainerName(toolPair)

      // Build HostConfig with optional gVisor runtime
      const hostConfig: Docker.HostConfig = {
        NetworkMode: CONTAINER_SECURITY.network,
        ReadonlyRootfs: CONTAINER_SECURITY.readonly,
        Tmpfs: CONTAINER_SECURITY.tmpfs,
        Memory: CONTAINER_SECURITY.memory,
        CpuQuota: CONTAINER_SECURITY.cpus * 100000, // Convert to CPU quota (100000 = 1 CPU)
        PidsLimit: CONTAINER_SECURITY.pidsLimit,
        CapDrop: CONTAINER_SECURITY.capDrop,
        SecurityOpt: CONTAINER_SECURITY.securityOpt,
        Ulimits: [
          {
            Name: "nofile",
            Soft: CONTAINER_SECURITY.ulimit.nofile.soft,
            Hard: CONTAINER_SECURITY.ulimit.nofile.hard,
          },
        ],
        AutoRemove: false, // We'll manage cleanup explicitly
      }

      // Add gVisor runtime if enabled
      if (SandboxConfig.useGvisor) {
        hostConfig.Runtime = SandboxConfig.gvisorRuntime
      }

      const container = yield* Effect.tryPromise({
        try: async () => {
          return await docker.createContainer({
            Image: imageName,
            name: containerName,
            HostConfig: hostConfig,
            Labels: {
              "toolkata.tool-pair": toolPair,
              "toolkata.environment": environment,
            },
            Env: [`TOOL_PAIR=${toolPair}`, `ENVIRONMENT=${environment}`],
            // Attach stdin/stdout/stderr for terminal interaction
            OpenStdin: true,
            Tty: true,
            // Keep container running
            Cmd: ["/bin/bash"], // Will use entrypoint.sh in production
          })
        },
        catch: (error) => {
          return new ContainerError({
            cause: "CreateFailed",
            message: error instanceof Error ? error.message : "Unknown error creating container",
            originalError: error,
          })
        },
      })

      // Start the container
      yield* Effect.tryPromise({
        try: async () => await container.start(),
        catch: (error) => {
          return new ContainerError({
            cause: "CreateFailed",
            message: error instanceof Error ? error.message : "Failed to start container",
            originalError: error,
          })
        },
      })

      return {
        id: container.id,
        name: containerName,
        toolPair,
        createdAt: new Date(),
      }
    }).pipe(
      Effect.catchTag("EnvironmentError", (error) =>
        Effect.fail(
          new ContainerError({
            cause: "CreateFailed",
            message: `Invalid environment: ${error.message}`,
            originalError: error,
          }),
        ),
      ),
    )

  const destroy = (containerId: string) =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: async () => {
          const docker = dockerClient.docker

          try {
            const container = docker.getContainer(containerId)

            // Get container info to check if it exists
            await container.inspect()

            // Kill and remove container with timeout
            await Promise.race([
              container.kill(),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Container kill timed out after 10 seconds")),
                  10000,
                ),
              ),
            ])

            await Promise.race([
              container.remove(),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Container remove timed out after 10 seconds")),
                  10000,
                ),
              ),
            ])
          } catch (error) {
            // If container doesn't exist (404), that's okay
            if (error instanceof Error && "statusCode" in error && error.statusCode === 404) {
              return // Container already gone
            }
            throw error
          }
        },
        catch: (error) => {
          return new ContainerError({
            cause:
              error instanceof Error && "statusCode" in error && error.statusCode === 404
                ? "NotFoundError"
                : "DestroyFailed",
            message: error instanceof Error ? error.message : "Unknown error destroying container",
            originalError: error,
          })
        },
      })

      return result
    }).pipe(
      Effect.timeout("10 seconds"),
      Effect.catchAll(() =>
        Effect.fail(
          new ContainerError({
            cause: "DestroyFailed",
            message:
              "Container destroy timed out after 10 seconds. Container may be in an inconsistent state.",
          }),
        ),
      ),
    )

  const get = (containerId: string) =>
    Effect.tryPromise({
      try: async () => {
        const docker = dockerClient.docker
        const container = docker.getContainer(containerId)

        const inspect = await container.inspect()

        return {
          id: containerId,
          name: inspect.Name?.replace(/^\//, "") ?? containerId,
          toolPair: inspect.Config?.Labels?.["toolkata.tool-pair"] ?? "unknown",
          createdAt: new Date(inspect.Created ?? Date.now()),
        }
      },
      catch: (error) => {
        return new ContainerError({
          cause:
            error instanceof Error && "statusCode" in error && error.statusCode === 404
              ? "NotFoundError"
              : "DockerUnavailable",
          message: error instanceof Error ? error.message : "Unknown error getting container",
          originalError: error,
        })
      },
    })

  // Clean up orphaned containers (stopped sandbox containers from previous runs)
  const cleanupOrphaned = Effect.tryPromise(async () => {
    const docker = dockerClient.docker
    const containers = await docker.listContainers({
      all: true,
      filters: {
        name: ["sandbox-"],
        status: ["exited", "dead"],
      },
    })

    if (containers.length === 0) {
      return 0
    }

    console.log(`[ContainerService] Cleaning up ${containers.length} orphaned container(s)`)

    for (const containerInfo of containers) {
      try {
        const container = docker.getContainer(containerInfo.Id)
        await container.remove({ force: true })
        console.log(
          `[ContainerService] Removed orphaned container: ${containerInfo.Names?.[0] ?? containerInfo.Id}`,
        )
      } catch (err) {
        console.error(
          `[ContainerService] Failed to remove orphaned container ${containerInfo.Id}:`,
          err,
        )
      }
    }

    return containers.length
  }).pipe(
    Effect.catchAll((error) => {
      console.error("[ContainerService] Failed to cleanup orphaned containers:", error)
      return Effect.succeed(0)
    }),
  )

  return { create, destroy, get, cleanupOrphaned }
})

// Live layer
export const ContainerServiceLive = Layer.effect(ContainerService, make)

// Docker client live layer (default to Unix socket)
export const DockerClientLive = Layer.effect(
  DockerClient,
  Effect.sync(() => ({
    docker: new Docker({ socketPath: process.env["DOCKER_HOST"] ?? "/var/run/docker.sock" }),
  })),
)
