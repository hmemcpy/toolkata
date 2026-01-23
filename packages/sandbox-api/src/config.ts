/**
 * Sandbox configuration module
 *
 * Centralized configuration for sandbox behavior including gVisor integration.
 * Environment variables control runtime behavior for different deployment scenarios.
 */

/**
 * Sandbox configuration
 *
 * @remarks
 * - `useGvisor`: Controls whether gVisor (runsc) runtime is used for containers
 *   - Defaults to `true` (defense-in-depth security)
 *   - Set `SANDBOX_USE_GVISOR=false` to disable (useful for debugging)
 * - `gvisorRuntime`: The Docker runtime name for gVisor
 *   - Defaults to `runsc` (standard gVisor runtime)
 *   - Can be overridden via `SANDBOX_GVISOR_RUNTIME` env var
 *
 * @example
 * ```bash
 * # Enable gVisor (default)
 * SANDBOX_USE_GVISOR=true
 *
 * # Disable gVisor (use runc)
 * SANDBOX_USE_GVISOR=false
 *
 * # Custom runtime name
 * SANDBOX_GVISOR_RUNTIME=runsc-custom
 * ```
 */
export const SandboxConfig = {
  /**
   * Whether to use gVisor runtime for container isolation
   * @default true
   */
  useGvisor: process.env.SANDBOX_USE_GVISOR !== "false",

  /**
   * Docker runtime name for gVisor
   * @default "runsc"
   */
  gvisorRuntime: (process.env.SANDBOX_GVISOR_RUNTIME ?? "runsc") as string,
} as const

/**
 * TypeScript type for gVisor configuration
 */
export type GvisorConfig = typeof SandboxConfig

/**
 * Validate gVisor configuration at startup
 *
 * @returns Validation result with optional error message
 */
export const validateGvisorConfig = (): {
  readonly valid: boolean
  readonly message?: string
} => {
  if (SandboxConfig.useGvisor) {
    const runtime = SandboxConfig.gvisorRuntime
    if (runtime.length === 0) {
      return {
        valid: false,
        message: "SANDBOX_GVISOR_RUNTIME cannot be empty when gVisor is enabled",
      }
    }
    if (runtime.includes(" ") || runtime.includes("\t") || runtime.includes("\n")) {
      return {
        valid: false,
        message: "SANDBOX_GVISOR_RUNTIME cannot contain whitespace",
      }
    }
  }
  return { valid: true }
}
