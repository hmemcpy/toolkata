import { Context, Data, Effect, Layer } from "effect"
import Docker from "dockerode"
import type { EnvironmentConfig } from "./types.js"
import type { EnvironmentInfo } from "./types.js"
import { EnvironmentError } from "./types.js"
import {
  getEnvironment as getEnvFromRegistry,
  listEnvironments as listEnvsFromRegistry,
  listEnvironmentConfigs,
  listEnvironmentNames,
} from "./registry.js"
import { getDefaultEnvironment } from "./registry.js"

/**
 * Environment Service
 *
 * Provides access to environment configurations for multi-environment sandbox support.
 * This service wraps the environment registry in Effect-TS patterns for proper
 * dependency injection and error handling.
 */

// Service interface
export interface EnvironmentServiceShape {
  /**
   * Get environment configuration by name
   *
   * @param name - Environment name (e.g., "bash", "node", "python")
   * @returns EnvironmentConfig
   * @throws EnvironmentError with cause="NotFound" if environment doesn't exist
   */
  readonly get: (name: string) => Effect.Effect<EnvironmentConfig, EnvironmentError>

  /**
   * Get default environment (bash)
   *
   * @returns EnvironmentConfig for bash
   */
  readonly getDefault: Effect.Effect<EnvironmentConfig, never>

  /**
   * List all available environments
   *
   * @returns Array of EnvironmentInfo objects (public-safe info without internal config)
   */
  readonly list: Effect.Effect<readonly EnvironmentInfo[], never>

  /**
   * Check if an environment exists
   *
   * @param name - Environment name
   * @returns true if environment exists
   */
  readonly has: (name: string) => Effect.Effect<boolean, never>

  /**
   * Get all environment names
   *
   * @returns Array of environment name strings
   */
  readonly listNames: Effect.Effect<readonly string[], never>

  /**
   * Validate that all registered environment Docker images exist
   *
   * Checks that all registered environment images are present in Docker.
   * This should be called at server startup to fail fast if images are missing.
   *
   * @returns Effect that succeeds if all images exist, fails with MissingImagesError if any are missing
   */
  readonly validateAllImages: Effect.Effect<void, MissingImagesError>
}

// Service tag
export class EnvironmentService extends Context.Tag("EnvironmentService")<
  EnvironmentService,
  EnvironmentServiceShape
>() {}

// Service implementation
const make = Effect.sync(() => {
  const get = (name: string): Effect.Effect<EnvironmentConfig, EnvironmentError> => {
    const env = getEnvFromRegistry(name)

    if (env === undefined) {
      return Effect.fail(
        new EnvironmentError({
          cause: "NotFound",
          message: `Environment not found: ${name}`,
          availableEnvironments: listEnvironmentNames(),
        }),
      )
    }

    return Effect.succeed(env)
  }

  const getDefault: Effect.Effect<EnvironmentConfig, never> = Effect.sync(() =>
    getDefaultEnvironment(),
  )

  const list: Effect.Effect<readonly EnvironmentInfo[], never> = Effect.sync(() =>
    Object.freeze(listEnvsFromRegistry()),
  )

  const has = (name: string): Effect.Effect<boolean, never> =>
    Effect.succeed(listEnvironmentNames().includes(name))

  const listNames: Effect.Effect<readonly string[], never> = Effect.sync(() =>
    Object.freeze(listEnvironmentNames()),
  )

  // Create Docker client for image validation
  const docker = new Docker({
    socketPath: process.env["DOCKER_HOST"] ?? "/var/run/docker.sock",
  })

  // Validate all environment images exist at startup
  const validateAllImages = Effect.gen(function* () {
    const environments = listEnvironmentConfigs()
    const missingImages: Array<{ envName: string; imageName: string }> = []

    // Check each environment's image
    for (const env of environments) {
      const imageExists = yield* Effect.tryPromise({
        try: async () => {
          try {
            await docker.getImage(env.dockerImage).inspect()
            return true
          } catch {
            return false
          }
        },
        catch: () => false,
      })

      if (!imageExists) {
        missingImages.push({ envName: env.name, imageName: env.dockerImage })
      }
    }

    // If any images are missing, fail with clear error message
    if (missingImages.length > 0) {
      const missingList = missingImages.map((m) => `  - ${m.envName}: ${m.imageName}`).join("\n")
      const message = `Missing ${missingImages.length} environment image(s):\n${missingList}\n\nBuild images with: bun run docker:build:all`
      return yield* Effect.fail(
        new MissingImagesError({
          cause: "MissingImages",
          message,
          missingImages: Object.freeze(missingImages),
        }),
      )
    }

    console.log(`[EnvironmentService] All ${environments.length} environment images validated`)
  })

  return {
    get,
    getDefault,
    list,
    has,
    listNames,
    validateAllImages,
  } satisfies EnvironmentServiceShape
})

// Live layer
export const EnvironmentServiceLive = Layer.effect(EnvironmentService, make)

// Re-export types for convenience
export type { EnvironmentConfig, EnvironmentInfo, EnvironmentError } from "./types.js"
export { bashEnvironment, nodeEnvironment, pythonEnvironment } from "./builtin.js"

// MissingImagesError for startup validation
export class MissingImagesError extends Data.TaggedClass("MissingImagesError")<{
  readonly cause: "MissingImages"
  readonly message: string
  readonly missingImages: ReadonlyArray<{ readonly envName: string; readonly imageName: string }>
}> {}
