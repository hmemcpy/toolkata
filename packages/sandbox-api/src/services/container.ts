import { Context, Data, Effect, Layer } from "effect"
import Docker from "dockerode"

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
  readonly create: (toolPair: string) => Effect.Effect<Container, ContainerError>
  readonly destroy: (containerId: string) => Effect.Effect<void, ContainerError>
  readonly get: (containerId: string) => Effect.Effect<Container, ContainerError>
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

export const DockerClient = Context.GenericTag<DockerClientShape>("DockerClient")

// Security configuration from PLAN.md
const CONTAINER_SECURITY = {
  // Network isolation - no network access
  network: "none",

  // Read-only root filesystem (tmpfs for writable areas)
  readonly: true,
  tmpfs: {
    "/home/sandbox/workspace": "size=50M",
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

// Image name (built from packages/sandbox-api/docker/Dockerfile)
const SANDBOX_IMAGE = "toolkata-sandbox:latest"

// Helper: Generate unique container name
const generateContainerName = (toolPair: string): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `sandbox-${toolPair}-${timestamp}-${random}`
}

// Helper: Validate tool pair
const isValidToolPair = (toolPair: string): boolean => {
  // Only jj-git is supported for MVP
  return toolPair === "jj-git"
}

// Service implementation
const make = Effect.gen(function* () {
  const dockerClient = yield* DockerClient

  const create = Effect.tryPromise({
    try: async (toolPair: string): Promise<Container> => {
      // Validate tool pair
      if (!isValidToolPair(toolPair)) {
        throw new ContainerError({
          cause: "CreateFailed",
          message: `Unsupported tool pair: ${toolPair}. Only jj-git is supported.`,
        })
      }

      const docker = dockerClient.docker

      // Check if image exists, pull if needed
      try {
        await docker.getImage(SANDBOX_IMAGE).inspect()
      } catch {
        // Image doesn't exist, need to pull it
        throw new ContainerError({
          cause: "CreateFailed",
          message: `Sandbox image ${SANDBOX_IMAGE} not found. Please build the image first.`,
        })
      }

      // Create container with security settings
      const containerName = generateContainerName(toolPair)
      const container = await docker.createContainer({
        Image: SANDBOX_IMAGE,
        name: containerName,
        HostConfig: {
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
        },
        Env: [`TOOL_PAIR=${toolPair}`],
        // Attach stdin/stdout/stderr for terminal interaction
        OpenStdin: true,
        Tty: true,
        // Keep container running
        Cmd: ["/bin/bash"], // Will use entrypoint.sh in production
      })

      // Start the container
      await container.start()

      return {
        id: container.id,
        name: containerName,
        toolPair,
        createdAt: new Date(),
      }
    },
    catch: (error) => {
      if (error instanceof ContainerError) {
        return error
      }
      return new ContainerError({
        cause: "CreateFailed",
        message: error instanceof Error ? error.message : "Unknown error creating container",
        originalError: error,
      })
    },
  })

  const destroy = Effect.tryPromise({
    try: async (containerId: string): Promise<void> => {
      const docker = dockerClient.docker

      try {
        const container = docker.getContainer(containerId)

        // Get container info to check if it exists
        await container.inspect()

        // Kill and remove container
        await container.kill()
        await container.remove()
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

  const get = Effect.tryPromise({
    try: async (containerId: string): Promise<Container> => {
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

  return { create, destroy, get }
})

// Live layer
export const ContainerServiceLive = Layer.effect(ContainerService, make)

// Docker client live layer (default to Unix socket)
export const DockerClientLive = Layer.effect(
  DockerClient,
  Effect.sync(() => ({
    docker: new Docker({ socketPath: process.env.DOCKER_HOST ?? "/var/run/docker.sock" }),
  })),
)
