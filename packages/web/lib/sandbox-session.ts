/**
 * Shared sandbox session utilities.
 *
 * Extracted from InteractiveTerminal.tsx for reuse by
 * InlineTryItTerminal and ExerciseSection.
 */

import { getSandboxHttpUrl, SANDBOX_API_KEY, SANDBOX_API_URL } from "./sandbox-url"

/**
 * WebSocket message types sent by the sandbox API.
 */
interface WsConnectedMessage {
  readonly type: "connected"
  readonly sessionId: string
}

interface WsOutputMessage {
  readonly type: "output"
  readonly data: string
}

interface WsErrorMessage {
  readonly type: "error"
  readonly message: string
}

interface WsInitCompleteMessage {
  readonly type: "initComplete"
}

export type WsMessage = WsConnectedMessage | WsOutputMessage | WsErrorMessage | WsInitCompleteMessage

/**
 * Type guard to check if a value is a valid WebSocket message.
 */
export const isWsMessage = (value: unknown): value is WsMessage => {
  if (typeof value !== "object" || value === null) return false
  const obj = value as Record<string, unknown>
  const type = obj["type"]
  if (type === "connected") return typeof obj["sessionId"] === "string"
  if (type === "output") return typeof obj["data"] === "string"
  if (type === "error") return typeof obj["message"] === "string"
  if (type === "initComplete") return true
  return false
}

/**
 * Parse a JSON string into a WebSocket message, or return null if invalid.
 */
export const parseWsMessage = (data: string): WsMessage | null => {
  try {
    const parsed: unknown = JSON.parse(data)
    return isWsMessage(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Options for creating a sandbox session.
 */
export interface CreateSessionOptions {
  readonly toolPair: string
  readonly environment?: string | undefined
  readonly init?: readonly string[] | undefined
  readonly timeout?: number | undefined
  readonly authToken?: string | null | undefined
}

/**
 * Result of creating a sandbox session.
 */
export interface SessionInfo {
  readonly sessionId: string
  readonly expiresAt: string
}

/**
 * Create a new sandbox session via HTTP POST.
 */
export async function createSession(options: CreateSessionOptions): Promise<SessionInfo> {
  const httpUrl = getSandboxHttpUrl()

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (SANDBOX_API_KEY) {
    headers["X-API-Key"] = SANDBOX_API_KEY
  }
  if (options.authToken) {
    headers["Authorization"] = `Bearer ${options.authToken}`
  }

  const requestBody: Record<string, unknown> = { toolPair: options.toolPair }
  if (options.environment) {
    requestBody["environment"] = options.environment
  }
  if (options.init) {
    requestBody["init"] = options.init
  }
  if (options.timeout) {
    requestBody["timeout"] = options.timeout
  }

  const response = await fetch(`${httpUrl}/api/v1/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Failed to create session" }))
    throw new Error(errorData.message ?? "Failed to create session")
  }

  const session = await response.json()
  return { sessionId: session.sessionId, expiresAt: session.expiresAt }
}

/**
 * Destroy a sandbox session using sendBeacon (safe for page unload).
 */
export function destroySessionBeacon(sessionId: string): void {
  const httpUrl = getSandboxHttpUrl()
  const url = `${httpUrl}/api/v1/sessions/${sessionId}/destroy`
  const body = JSON.stringify({ apiKey: SANDBOX_API_KEY })
  navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))
}

/**
 * Destroy a sandbox session via fetch (for normal cleanup).
 */
export async function destroySession(sessionId: string): Promise<void> {
  const httpUrl = getSandboxHttpUrl()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (SANDBOX_API_KEY) {
    headers["X-API-Key"] = SANDBOX_API_KEY
  }

  try {
    await fetch(`${httpUrl}/api/v1/sessions/${sessionId}/destroy`, {
      method: "POST",
      headers,
    })
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Build a WebSocket URL for connecting to a sandbox session.
 */
export function buildWebSocketUrl(
  sessionId: string,
  options?: {
    readonly authToken?: string | null
    readonly cols?: number
    readonly rows?: number
  },
): string {
  const wsBase = SANDBOX_API_URL.replace(/^http:\/\//, "ws://").replace(
    /^https:\/\//,
    "wss://",
  )

  const params = new URLSearchParams()
  if (SANDBOX_API_KEY) {
    params.set("api_key", SANDBOX_API_KEY)
  }
  if (options?.authToken) {
    params.set("token", options.authToken)
  }
  if (options?.cols) {
    params.set("cols", String(options.cols))
  }
  if (options?.rows) {
    params.set("rows", String(options.rows))
  }

  return `${wsBase}/api/v1/sessions/${sessionId}/ws?${params.toString()}`
}

/**
 * xterm.js theme config (shared across terminal instances).
 */
export const XTERM_THEME = {
  background: "#0c0c0c",
  foreground: "#fafafa",
  cursor: "#22c55e",
  cursorAccent: "#0c0c0c",
  black: "#0a0a0a",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  magenta: "#a855f7",
  cyan: "#06b6d4",
  white: "#fafafa",
  brightBlack: "#525252",
  brightRed: "#ef4444",
  brightGreen: "#22c55e",
  brightYellow: "#eab308",
  brightBlue: "#3b82f6",
  brightMagenta: "#a855f7",
  brightCyan: "#06b6d4",
  brightWhite: "#ffffff",
} as const

/**
 * xterm.js terminal options (shared across terminal instances).
 */
export const XTERM_OPTIONS = {
  theme: XTERM_THEME,
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 14,
  lineHeight: 1.0,
  cursorBlink: true,
  cursorStyle: "block" as const,
  scrollback: 1000,
  allowTransparency: false,
} as const
