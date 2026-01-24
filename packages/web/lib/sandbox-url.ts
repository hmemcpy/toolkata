/**
 * Sandbox URL utilities.
 *
 * Provides consistent URL handling for the sandbox API across the codebase.
 */

/**
 * Sandbox API base URL from environment.
 * Defaults to ws://localhost:3001 for local development.
 */
export const SANDBOX_API_URL = process.env["NEXT_PUBLIC_SANDBOX_API_URL"] ?? "ws://localhost:3001"

/**
 * Sandbox API key from environment.
 * Only required in production when SANDBOX_API_KEY is set on the server.
 */
export const SANDBOX_API_KEY = process.env["NEXT_PUBLIC_SANDBOX_API_KEY"] ?? ""

/**
 * Convert a WebSocket URL to an HTTP URL.
 *
 * - ws:// becomes http://
 * - wss:// becomes https://
 * - Port is preserved
 *
 * @example
 * ```ts
 * wsToHttp("ws://localhost:3001")   // "http://localhost:3001"
 * wsToHttp("wss://api.example.com") // "https://api.example.com"
 * wsToHttp("http://localhost:3001") // "http://localhost:3001" (unchanged)
 * ```
 */
export const wsToHttp = (url: string): string =>
  url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://")

/**
 * Get the HTTP base URL for the sandbox API.
 */
export const getSandboxHttpUrl = (): string => wsToHttp(SANDBOX_API_URL)
