import { Context, Effect, Layer } from "effect"
import type { EnvironmentConfig } from "./types.js"
import type { EnvironmentInfo } from "./types.js"
import { EnvironmentError } from "./types.js"
import { getEnvironment as getEnvFromRegistry, listEnvironments as listEnvsFromRegistry, listEnvironmentNames } from "./registry.js"
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

  const getDefault: Effect.Effect<EnvironmentConfig, never> = Effect.sync(() => getDefaultEnvironment())

  const list: Effect.Effect<readonly EnvironmentInfo[], never> = Effect.sync(() =>
    Object.freeze(listEnvsFromRegistry()),
  )

  const has = (name: string): Effect.Effect<boolean, never> =>
    Effect.succeed(listEnvironmentNames().includes(name))

  const listNames: Effect.Effect<readonly string[], never> = Effect.sync(() =>
    Object.freeze(listEnvironmentNames()),
  )

  return { get, getDefault, list, has, listNames } satisfies EnvironmentServiceShape
})

// Live layer
export const EnvironmentServiceLive = Layer.effect(EnvironmentService, make)

// Re-export types for convenience
export type { EnvironmentConfig, EnvironmentInfo, EnvironmentError } from "./types.js"
export { bashEnvironment, nodeEnvironment, pythonEnvironment } from "./builtin.js"
