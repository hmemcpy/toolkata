/**
 * SandboxClient - Effect-TS client service for sandbox API.
 *
 * Manages WebSocket connections to the sandbox API for interactive terminal sessions.
 *
 * @example
 * ```ts
 * import { SandboxClient } from "./services/sandbox-client"
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* SandboxClient
 *   const session = yield* client.createSession("jj-git")
 *   // Connect WebSocket to session.wsUrl
 *   return session
 * })
 * ```
 */

import { Context, Data, Effect, Layer } from "effect"
import { getSandboxHttpUrl, SANDBOX_API_KEY, SANDBOX_API_URL } from "../lib/sandbox-url"

/**
 * Error types for sandbox operations.
 */
export class SandboxClientError extends Data.TaggedClass("SandboxClientError")<{
  readonly cause: "NetworkError" | "SessionFailed" | "WebSocketError"
  readonly message: string
  readonly originalError?: unknown
}> {}

/**
 * Session response from the sandbox API.
 */
export interface Session {
  readonly sessionId: string
  readonly wsUrl: string
  readonly status: "RUNNING"
  readonly createdAt: string
  readonly expiresAt: string
}

/**
 * Request body for creating a session.
 */
interface CreateSessionRequest {
  readonly toolPair: string
  readonly environment?: string
  readonly init?: readonly string[]
  readonly timeout?: number
}

/**
 * WebSocket message types for terminal communication.
 */
export interface TerminalMessage {
  readonly type: "input" | "output" | "resize" | "status"
  readonly data: string | TerminalResizeData
}

export interface TerminalResizeData {
  readonly rows: number
  readonly cols: number
}

/**
 * Options for creating a session.
 */
export interface CreateSessionOptions {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Runtime environment (e.g., "bash", "node", "python").
   */
  readonly environment?: string

  /**
   * Initialization commands to run on session start.
   */
  readonly init?: readonly string[]

  /**
   * Session timeout in seconds.
   */
  readonly timeout?: number

  /**
   * Optional JWT auth token for tiered rate limiting.
   * If provided, included as Authorization: Bearer header.
   */
  readonly authToken?: string

  /**
   * Optional callback for WebSocket messages.
   */
  readonly onMessage?: (message: TerminalMessage) => void

  /**
   * Optional callback for connection close.
   */
  readonly onClose?: (event: CloseEvent) => void

  /**
   * Optional callback for connection errors.
   */
  readonly onError?: (error: Event) => void
}

/**
 * WebSocket connection wrapper.
 */
export interface WebSocketConnection {
  readonly ws: WebSocket
  readonly send: (data: string) => Effect.Effect<void, SandboxClientError>
  readonly close: () => Effect.Effect<void, never>
}

/**
 * SandboxClient interface.
 *
 * Provides methods for creating sessions and managing WebSocket connections.
 */
export interface SandboxClientShape {
  /**
   * Create a new sandbox session.
   *
   * @param options - Session creation options.
   * @returns The session info with WebSocket URL.
   */
  readonly createSession: (
    options: CreateSessionOptions,
  ) => Effect.Effect<Session, SandboxClientError>

  /**
   * Destroy a session by ID.
   *
   * @param sessionId - The session ID to destroy.
   */
  readonly destroySession: (sessionId: string) => Effect.Effect<void, SandboxClientError>

  /**
   * Get session status.
   *
   * @param sessionId - The session ID to check.
   * @returns The session status.
   */
  readonly getSessionStatus: (sessionId: string) => Effect.Effect<
    {
      readonly sessionId: string
      readonly status: "IDLE" | "STARTING" | "RUNNING" | "DESTROYING"
      readonly createdAt: string
      readonly expiresAt: string
      readonly toolPair: string
    },
    SandboxClientError
  >

  /**
   * Connect to a session via WebSocket.
   *
   * @param sessionId - The session ID to connect to.
   * @param options - Connection options with callbacks.
   * @returns A WebSocket connection wrapper.
   */
  readonly connectWebSocket: (
    sessionId: string,
    options: CreateSessionOptions,
  ) => Effect.Effect<WebSocketConnection, SandboxClientError>
}

/**
 * SandboxClient tag for dependency injection.
 */
export class SandboxClient extends Context.Tag("SandboxClient")<
  SandboxClient,
  SandboxClientShape
>() {}

/**
 * Parse WebSocket URL from session response for browser environment.
 */
function getWebSocketUrl(session: Session): string {
  // If the session already has a full WebSocket URL, use it
  if (session.wsUrl.startsWith("ws://") || session.wsUrl.startsWith("wss://")) {
    return session.wsUrl
  }

  // Otherwise, construct it from the base URL (with /api/v1 prefix)
  const baseUrl = SANDBOX_API_URL.replace(/^https?:\/\//, "")
  const protocol = SANDBOX_API_URL.startsWith("https") ? "wss" : "ws"
  return `${protocol}://${baseUrl}/api/v1/sessions/${session.sessionId}/ws`
}

/**
 * Create the SandboxClient implementation.
 */
const make = Effect.succeed<SandboxClientShape>({
  createSession: (options: CreateSessionOptions) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()

        // Build headers, including API key and auth token if configured
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }
        if (SANDBOX_API_KEY !== "") {
          headers["X-API-Key"] = SANDBOX_API_KEY
        }
        // Include JWT auth token for tiered rate limiting
        if (options.authToken) {
          headers["Authorization"] = `Bearer ${options.authToken}`
        }

        // Build request body with optional sandbox config
        const requestBody: CreateSessionRequest = {
          toolPair: options.toolPair,
          ...(options.environment || options.init || options.timeout
            ? {
                ...(options.environment ? { environment: options.environment } : {}),
                ...(options.init ? { init: options.init } : {}),
                ...(options.timeout ? { timeout: options.timeout } : {}),
              }
            : {}),
        }

        const response = await fetch(`${apiUrl}/api/v1/sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "Unknown error" }))
          throw new SandboxClientError({
            cause: "SessionFailed",
            message: error.message ?? `Failed to create session: ${response.status}`,
            originalError: error,
          })
        }

        const data = (await response.json()) as Session
        return {
          ...data,
          wsUrl: getWebSocketUrl(data),
        }
      },
      catch: (error) =>
        new SandboxClientError({
          cause: error instanceof SandboxClientError ? error.cause : "NetworkError",
          message: error instanceof Error ? error.message : "Failed to create session",
          originalError: error,
        }),
    }),

  destroySession: (sessionId: string) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()

        // Build headers, including API key if configured
        const headers: Record<string, string> = {}
        if (SANDBOX_API_KEY !== "") {
          headers["X-API-Key"] = SANDBOX_API_KEY
        }

        const response = await fetch(`${apiUrl}/api/v1/sessions/${sessionId}`, {
          method: "DELETE",
          headers,
        })

        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to destroy session: ${response.status}`)
        }
      },
      catch: (error) =>
        new SandboxClientError({
          cause: "NetworkError",
          message: error instanceof Error ? error.message : "Failed to destroy session",
          originalError: error,
        }),
    }),

  getSessionStatus: (sessionId: string) =>
    Effect.tryPromise({
      try: async () => {
        const apiUrl = getSandboxHttpUrl()

        // Build headers, including API key if configured
        const headers: Record<string, string> = {}
        if (SANDBOX_API_KEY !== "") {
          headers["X-API-Key"] = SANDBOX_API_KEY
        }

        const response = await fetch(`${apiUrl}/api/v1/sessions/${sessionId}`, {
          headers,
        })

        if (!response.ok) {
          throw new Error(`Failed to get session status: ${response.status}`)
        }

        return (await response.json()) as {
          readonly sessionId: string
          readonly status: "IDLE" | "STARTING" | "RUNNING" | "DESTROYING"
          readonly createdAt: string
          readonly expiresAt: string
          readonly toolPair: string
        }
      },
      catch: (error) =>
        new SandboxClientError({
          cause: "NetworkError",
          message: error instanceof Error ? error.message : "Failed to get session status",
          originalError: error,
        }),
    }),

  connectWebSocket: (sessionId: string, options: CreateSessionOptions) =>
    Effect.sync(() => {
      const wsUrl = `${SANDBOX_API_URL}/api/v1/sessions/${sessionId}/ws`

      // Build WebSocket query parameters
      // Browser WebSocket API doesn't support custom headers, so we use query params
      const params = new URLSearchParams()
      if (SANDBOX_API_KEY !== "") {
        params.set("api_key", SANDBOX_API_KEY)
      }
      // Include JWT auth token for tiered rate limiting
      if (options.authToken) {
        params.set("token", options.authToken)
      }
      const paramString = params.toString()
      const finalWsUrl = paramString ? `${wsUrl}?${paramString}` : wsUrl

      const ws = new WebSocket(finalWsUrl)

      const send = (data: string): Effect.Effect<void, SandboxClientError> =>
        Effect.try({
          try: () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data)
            } else {
              throw new Error("WebSocket is not open")
            }
          },
          catch: (error) =>
            new SandboxClientError({
              cause: "WebSocketError",
              message: error instanceof Error ? error.message : "Failed to send WebSocket message",
              originalError: error,
            }),
        })

      const close = (): Effect.Effect<void, never> =>
        Effect.sync(() => {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close()
          }
        })

      // Set up event handlers
      ws.onopen = () => {
        // Send initial terminal dimensions if provided
        // This will be handled by the terminal component
      }

      ws.onmessage = (event: MessageEvent) => {
        if (options.onMessage) {
          try {
            const data = typeof event.data === "string" ? event.data : ""
            options.onMessage({
              type: "output",
              data,
            } satisfies TerminalMessage)
          } catch {
            // Ignore message parsing errors
          }
        }
      }

      ws.onerror = (error: Event) => {
        if (options.onError) {
          options.onError(error)
        }
      }

      ws.onclose = (event: CloseEvent) => {
        if (options.onClose) {
          options.onClose(event)
        }
      }

      return {
        ws,
        send,
        close,
      } satisfies WebSocketConnection
    }),
})

/**
 * Live layer for SandboxClient.
 *
 * Provides the real implementation for browser use.
 */
export const SandboxClientLive = Layer.effect(SandboxClient, make)
