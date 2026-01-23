import { Data, Effect } from "effect"

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
 * - `apiKey`: Shared secret for API authentication
 *   - Defaults to empty string (no auth required in development)
 *   - Set `SANDBOX_API_KEY` in production to require authentication
 *   - Frontend must send `X-API-Key` header with this value
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
 *
 * # Set API key for production
 * SANDBOX_API_KEY=your-secret-key-here
 * ```
 */
export const SandboxConfig = {
  /**
   * Whether to use gVisor runtime for container isolation
   * @default true
   */
  useGvisor: process.env["SANDBOX_USE_GVISOR"] !== "false",

  /**
   * Docker runtime name for gVisor
   * @default "runsc"
   */
  gvisorRuntime: (process.env["SANDBOX_GVISOR_RUNTIME"] ?? "runsc") as string,

  /**
   * API key for authentication
   * @default "" (no authentication required)
   */
  apiKey: (process.env["SANDBOX_API_KEY"] ?? "") as string,
} as const

/**
 * Allowed origins for WebSocket connections
 *
 * @remarks
 * - Origins are validated during WebSocket upgrade to prevent CSRF attacks
 * - Set via `SANDBOX_ALLOWED_ORIGINS` env var (comma-separated)
 * - Empty string means allow any origin (development only)
 * - Production should explicitly set allowed origins
 *
 * @example
 * ```bash
 * # Allow specific origins
 * SANDBOX_ALLOWED_ORIGINS=https://toolkata.com,https://www.toolkata.com
 *
 * # Allow localhost for development
 * SANDBOX_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
 * ```
 */
export const getAllowedOrigins = (): readonly string[] => {
  const envValue = process.env["SANDBOX_ALLOWED_ORIGINS"] ?? ""

  // Empty means allow any origin (development)
  if (envValue === "") {
    return []
  }

  // Split by comma and trim whitespace
  return envValue
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

/**
 * TypeScript type for gVisor configuration
 */
export type GvisorConfig = typeof SandboxConfig

/**
 * Check if running in production mode
 *
 * @returns true if NODE_ENV === "production"
 *
 * @remarks
 * Production mode is determined by the NODE_ENV environment variable.
 * This is the standard convention across Node.js ecosystems.
 */
export const isProduction = (): boolean => {
  return process.env["NODE_ENV"] === "production"
}

/**
 * Validate gVisor configuration at startup
 *
 * @returns Validation result with optional error message
 *
 * @remarks
 * - In production mode, gVisor MUST be enabled for security
 * - In development, gVisor can be disabled for debugging
 * - Runtime name must be non-empty and contain no whitespace
 */
export const validateGvisorConfig = (): {
  readonly valid: boolean
  readonly message?: string
} => {
  const production = isProduction()

  // In production, gVisor must be enabled
  if (production && !SandboxConfig.useGvisor) {
    return {
      valid: false,
      message:
        "gVisor runtime is required in production mode. Set SANDBOX_USE_GVISOR=true or NODE_ENV=development for local testing.",
    }
  }

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

/**
 * Authentication error type
 */
export class AuthError extends Data.TaggedClass("AuthError")<{
  readonly cause: "MissingApiKey" | "InvalidApiKey" | "AuthRequired"
  readonly message: string
}> {}

/**
 * Validate API key from request headers
 *
 * @param apiKey - API key from X-API-Key header
 * @returns Validation result - true if auth valid, throws AuthError if invalid
 *
 * @remarks
 * - If `SANDBOX_API_KEY` is empty (development), no auth required
 * - If `SANDBOX_API_KEY` is set, the provided key must match exactly
 * - Throws AuthError for missing or invalid keys
 */
export const validateApiKey = (apiKey: string | null): Effect.Effect<void, AuthError> => {
  const expectedKey = SandboxConfig.apiKey

  // No auth required in development
  if (expectedKey === "") {
    return Effect.void
  }

  // Auth required: check if key was provided
  if (apiKey === null || apiKey === "") {
    return Effect.fail(
      new AuthError({
        cause: "MissingApiKey",
        message: "X-API-Key header is required",
      }),
    )
  }

  // Auth required: check if key matches
  if (apiKey !== expectedKey) {
    return Effect.fail(
      new AuthError({
        cause: "InvalidApiKey",
        message: "Invalid API key",
      }),
    )
  }

  return Effect.void
}

/**
 * Check if authentication is required
 *
 * @returns true if API key is configured and required
 */
export const isAuthRequired = (): boolean => {
  return SandboxConfig.apiKey !== ""
}

/**
 * Origin validation error type
 */
export class OriginValidationError extends Data.TaggedClass("OriginValidationError")<{
  readonly cause: "InvalidOrigin" | "OriginRequired"
  readonly message: string
  readonly origin?: string
}> {}

/**
 * Validate Origin header for WebSocket upgrade
 *
 * @param origin - Origin header value from request
 * @returns Validation result - true if valid, throws OriginValidationError if invalid
 *
 * @remarks
 * - If no allowed origins configured (empty list), allow any origin (development)
 * - If allowed origins configured, the provided origin must match exactly
 * - Throws OriginValidationError for missing or invalid origins (when restricted)
 */
export const validateOrigin = (
  origin: string | null | undefined,
): Effect.Effect<void, OriginValidationError> => {
  const allowedOrigins = getAllowedOrigins()

  // No restrictions configured (development mode)
  if (allowedOrigins.length === 0) {
    return Effect.void
  }

  // Origin required but not provided
  if (origin === null || origin === undefined || origin === "") {
    return Effect.fail(
      new OriginValidationError({
        cause: "OriginRequired",
        message: "Origin header is required",
      }),
    )
  }

  // Check if origin is in allowed list
  const isAllowed = allowedOrigins.includes(origin)
  if (!isAllowed) {
    return Effect.fail(
      new OriginValidationError({
        cause: "InvalidOrigin",
        message: `Origin not allowed: ${origin}`,
        origin,
      }),
    )
  }

  return Effect.void
}
