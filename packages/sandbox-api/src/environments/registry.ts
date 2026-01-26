import type { EnvironmentConfig } from "./types.js"
import type { EnvironmentInfo } from "./types.js"
import { bashEnvironment, nodeEnvironment, pythonEnvironment } from "./builtin.js"

/**
 * Central registry of all available environments
 *
 * This registry combines built-in environments with any plugin environments.
 * To add a new environment, either:
 * 1. Add it to builtin.ts (for core environments)
 * 2. Create a plugin in environments/plugins/ and import it here
 */

// All registered environments (built-in + plugins)
const REGISTERED_ENVIRONMENTS: EnvironmentConfig[] = [
  bashEnvironment,
  nodeEnvironment,
  pythonEnvironment,
  // Add plugin environments here
  // ...myCustomEnvironment,
]

/**
 * Get environment configuration by name
 *
 * @param name - Environment name (e.g., "bash", "node", "python")
 * @returns EnvironmentConfig or undefined if not found
 */
export const getEnvironment = (name: string): EnvironmentConfig | undefined => {
  return REGISTERED_ENVIRONMENTS.find((env) => env.name === name)
}

/**
 * List all registered environment names
 *
 * @returns Array of environment names
 */
export const listEnvironmentNames = (): string[] => {
  return REGISTERED_ENVIRONMENTS.map((env) => env.name)
}

/**
 * List all registered environments with full info (public-safe)
 *
 * @returns Array of EnvironmentInfo objects (excludes internal config like dockerImage)
 */
export const listEnvironments = (): EnvironmentInfo[] => {
  return REGISTERED_ENVIRONMENTS.map((env) => ({
    name: env.name,
    description: env.description,
    category: env.category,
    defaultTimeout: env.defaultTimeout,
  }))
}

/**
 * List all registered environment configurations (internal use)
 *
 * @returns Array of full EnvironmentConfig objects including dockerImage
 */
export const listEnvironmentConfigs = (): readonly EnvironmentConfig[] => {
  return REGISTERED_ENVIRONMENTS
}

/**
 * Check if an environment is registered
 *
 * @param name - Environment name
 * @returns true if environment exists
 */
export const hasEnvironment = (name: string): boolean => {
  return REGISTERED_ENVIRONMENTS.some((env) => env.name === name)
}

/**
 * Get the default environment (bash)
 *
 * @returns The bash environment configuration
 */
export const getDefaultEnvironment = (): EnvironmentConfig => {
  return bashEnvironment
}
