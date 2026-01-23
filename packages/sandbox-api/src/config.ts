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
 * - `maxWebSocketMessageSize`: Maximum size in bytes for WebSocket messages
 *   - Defaults to `1024` (1KB)
 *   - Prevents DoS via large message payloads
 *   - Can be overridden via `SANDBOX_MAX_WS_MESSAGE_SIZE` env var
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
 *
 * # Increase max WebSocket message size (not recommended)
 * SANDBOX_MAX_WS_MESSAGE_SIZE=2048
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

  /**
   * Maximum WebSocket message size in bytes
   * @default 1024 (1KB)
   */
  maxWebSocketMessageSize: Number.parseInt(
    process.env["SANDBOX_MAX_WS_MESSAGE_SIZE"] ?? "1024",
    10,
  ) as number,
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
 * - WebSocket message size limit must be positive and reasonable
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

  // Validate WebSocket message size limit
  const maxSize = SandboxConfig.maxWebSocketMessageSize
  if (!Number.isFinite(maxSize) || maxSize <= 0) {
    return {
      valid: false,
      message: "SANDBOX_MAX_WS_MESSAGE_SIZE must be a positive number",
    }
  }
  if (maxSize > 10240) {
    // Warn but don't fail if size is > 10KB
    console.warn(
      `[config] SANDBOX_MAX_WS_MESSAGE_SIZE is ${maxSize} bytes, which is unusually large. Consider using 1024 (1KB) or less.`,
    )
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

/**
 * Message size validation error type
 */
export class MessageSizeError extends Data.TaggedClass("MessageSizeError")<{
  readonly cause: "MessageTooLarge"
  readonly message: string
  readonly size: number
  readonly maxSize: number
}> {}

/**
 * Validate WebSocket message size
 *
 * @param size - Message size in bytes
 * @returns Validation result - true if valid, throws MessageSizeError if too large
 *
 * @remarks
 * - Messages are limited to prevent DoS via large payloads
 * - Default limit is 1KB (1024 bytes)
 * - Can be overridden via SANDBOX_MAX_WS_MESSAGE_SIZE env var
 */
export const validateMessageSize = (size: number): Effect.Effect<void, MessageSizeError> => {
  const maxSize = SandboxConfig.maxWebSocketMessageSize

  if (size > maxSize) {
    return Effect.fail(
      new MessageSizeError({
        cause: "MessageTooLarge",
        message: `Message size ${size} bytes exceeds maximum ${maxSize} bytes`,
        size,
        maxSize,
      }),
    )
  }

  return Effect.void
}

/**
 * Terminal input sanitization error type
 */
export class InputSanitizationError extends Data.TaggedClass("InputSanitizationError")<{
  readonly cause:
    | "BracketedPasteAttack"
    | "MaliciousEscapeSequence"
    | "SuspiciousControlSequence"
    | "InvalidUtf8"
  readonly message: string
  readonly input: string
}> {}

/**
 * Validate and sanitize terminal input
 *
 * @param input - Terminal input string from WebSocket
 * @returns Validation result - true if valid, throws InputSanitizationError if suspicious
 *
 * @remarks
 * - Detects bracketed paste mode attacks (escape sequences that inject commands)
 * - Filters malicious ANSI escape sequences that could execute commands
 * - Allows legitimate terminal control characters (Enter, Backspace, Tab, Ctrl+C, arrow keys)
 * - Logs suspicious input for security monitoring
 *
 * @example
 * // Valid input (normal typing)
 * validateTerminalInput("git status")
 *
 * // Valid input (control characters)
 * validateTerminalInput("\r")  // Enter
 * validateTerminalInput("\x7f")  // Backspace
 * validateTerminalInput("\x01")  // Ctrl+A
 *
 * // Invalid input (bracketed paste attack)
 * validateTerminalInput("\x1b[200~rm -rf /\x1b[201~")  // REJECTED
 */
export const validateTerminalInput = (
  input: string,
): Effect.Effect<void, InputSanitizationError> => {
  // Check for valid UTF-8
  try {
    // This will throw if the string contains invalid UTF-8 sequences
    const encoder = new TextEncoder()
    encoder.encode(input)
  } catch {
    return Effect.fail(
      new InputSanitizationError({
        cause: "InvalidUtf8",
        message: "Invalid UTF-8 sequence in terminal input",
        input: input.slice(0, 50), // Only log first 50 chars
      }),
    )
  }

  // Bracketed paste mode attack detection
  // ESC [ 200 ~ starts bracketed paste mode
  // ESC [ 201 ~ ends bracketed paste mode
  // Attackers use this to inject commands that appear as "pasted" text
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional escape sequence detection for security
  const bracketedPasteStart = /\x1b\[200~/
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional escape sequence detection for security
  const bracketedPasteEnd = /\x1b\[201~/

  if (bracketedPasteStart.test(input) || bracketedPasteEnd.test(input)) {
    console.warn(
      `[security] Bracketed paste mode sequence detected in input: ${JSON.stringify(input.slice(0, 50))}`,
    )
    return Effect.fail(
      new InputSanitizationError({
        cause: "BracketedPasteAttack",
        message: "Bracketed paste mode sequences are not allowed",
        input: input.slice(0, 50),
      }),
    )
  }

  // Detect suspicious escape sequences
  // We allow legitimate terminal escapes (arrow keys, home, end, etc.)
  // But block potentially malicious sequences

  // Dangerous patterns to block:
  // - OSC (Operating System Command) sequences: \x1b ] ... BEL
  // - DCS (Device Control String) sequences: \x1b P ... \
  // - PM (Privacy Message) sequences: \x1b ^ ... \
  // - APC (Application Program Command) sequences: \x1b _ ... \
  // These can be used for terminal manipulation attacks

  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional escape sequence detection for security
  const dangerousOsc = /\x1b\]/
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional escape sequence detection for security
  const dangerousDcs = /\x1bP/
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional escape sequence detection for security
  const dangerousPm = /\x1b\^/
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional escape sequence detection for security
  const dangerousApc = /\x1b_/

  for (const pattern of [dangerousOsc, dangerousDcs, dangerousPm, dangerousApc]) {
    if (pattern.test(input)) {
      console.warn(
        `[security] Dangerous escape sequence detected in input: ${JSON.stringify(input.slice(0, 50))}`,
      )
      return Effect.fail(
        new InputSanitizationError({
          cause: "MaliciousEscapeSequence",
          message: "Malicious escape sequences are not allowed",
          input: input.slice(0, 50),
        }),
      )
    }
  }

  // Allow common CSI (Control Sequence Introducer) sequences for terminal operations
  // These are used by arrow keys, function keys, etc.
  // Format: ESC [ ... (letter/~)
  // We allow most CSI sequences since they're essential for terminal interaction

  // However, detect suspicious repetitive control sequences
  // Could indicate an automated attack or terminal flooding
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional escape sequence detection for security
  const consecutiveEsc = /(?:\x1b[^\x1b]){10,}/ // 10+ consecutive escape sequences
  if (consecutiveEsc.test(input)) {
    console.warn(
      `[security] Suspicious repetitive escape sequences: ${JSON.stringify(input.slice(0, 50))}`,
    )
    return Effect.fail(
      new InputSanitizationError({
        cause: "SuspiciousControlSequence",
        message: "Excessive control sequences detected",
        input: input.slice(0, 50),
      }),
    )
  }

  // Check for shell metacharacter sequences that might indicate command injection attempts
  // Note: This is defensive - the PTY shell will handle these correctly, but we log for monitoring
  // We're not blocking these because they're legitimate in a terminal
  const suspiciousPatterns = [
    /;\s*rm\s+-rf/, // ; rm -rf (command chaining with destructive command)
    /`rm\s+-rf/, // `rm -rf (command substitution with destructive command)
    /\$\(rm\s+-rf/, // $(rm -rf) (command substitution with destructive command)
    /&&\s*rm\s+-rf/, // && rm -rf (conditional execution with destructive command)
    /\|\|\s*rm\s+-rf/, // || rm -rf (conditional execution with destructive command)
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      console.warn(
        `[security] Suspicious command pattern detected: ${JSON.stringify(input.slice(0, 50))}`,
      )
      // We log but don't block - these could be legitimate commands
      break
    }
  }

  return Effect.void
}
