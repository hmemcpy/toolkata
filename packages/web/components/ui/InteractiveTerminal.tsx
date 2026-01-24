/**
 * InteractiveTerminal - xterm.js-based sandbox terminal component.
 *
 * Provides an interactive terminal experience connecting to the sandbox API.
 *
 * Features:
 * - xterm.js integration with theming
 * - WebSocket connection for bidirectional I/O
 * - Session management (create, destroy, timeout)
 * - Status indicators (connecting, connected, error, expired)
 * - Session timer display
 * - Reset functionality
 *
 * @example
 * ```tsx
 * <InteractiveTerminal
 *   toolPair="jj-git"
 *   stepId="03"
 *   onCommandInsert={(command) => console.log(command)}
 * />
 * ```
 */

"use client"

import "@xterm/xterm/css/xterm.css"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { getSandboxHttpUrl, SANDBOX_API_KEY, SANDBOX_API_URL } from "../../lib/sandbox-url"

/**
 * Terminal connection states.
 *
 * Exported for use in TerminalContext to track terminal state.
 */
export type TerminalState =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "TIMEOUT_WARNING"
  | "EXPIRED"
  | "ERROR"

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

type WsMessage = WsConnectedMessage | WsOutputMessage | WsErrorMessage

/**
 * Type guard to check if a value is a valid WebSocket message.
 */
const isWsMessage = (value: unknown): value is WsMessage => {
  if (typeof value !== "object" || value === null) return false
  const obj = value as Record<string, unknown>
  const type = obj["type"]
  if (type === "connected") return typeof obj["sessionId"] === "string"
  if (type === "output") return typeof obj["data"] === "string"
  if (type === "error") return typeof obj["message"] === "string"
  return false
}

/**
 * Parse a JSON string into a WebSocket message, or return null if invalid.
 */
const parseWsMessage = (data: string): WsMessage | null => {
  try {
    const parsed: unknown = JSON.parse(data)
    return isWsMessage(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Imperative handle for InteractiveTerminal.
 *
 * Exposed via ref to allow external command insertion.
 */
export interface InteractiveTerminalRef {
  /**
   * Insert a command into the terminal.
   *
   * Writes the command to the terminal display and sends it via WebSocket.
   * Does NOT auto-focus the terminal - caller should manage focus if needed.
   *
   * @param command - The command string to insert (e.g., "jj status")
   */
  readonly insertCommand: (command: string) => void

  /**
   * Focus the terminal input.
   *
   * Attempts to focus the terminal for keyboard input.
   * Note: xterm.js terminal focus is handled by the browser.
   */
  readonly focus: () => void

  /**
   * Reset the terminal session.
   *
   * Closes the WebSocket connection, clears the terminal display,
   * and starts a new session.
   */
  readonly reset: () => void

  /**
   * Start the terminal session.
   *
   * Initiates connection to the sandbox if in IDLE state.
   */
  readonly start: () => void
}

/**
 * Props for InteractiveTerminal component.
 */
export interface InteractiveTerminalProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * The step ID for this terminal instance.
   */
  readonly stepId: string

  /**
   * Optional callback when user clicks a suggested command.
   */
  readonly onCommandInsert?: (command: string) => void

  /**
   * Optional callback when terminal state changes.
   *
   * Called when the terminal transitions between states:
   * IDLE, CONNECTING, CONNECTED, TIMEOUT_WARNING, EXPIRED, ERROR
   *
   * Used by TerminalProvider to track terminal state for the sidebar.
   */
  readonly onStateChange?: (state: TerminalState) => void

  /**
   * Optional callback when session time remaining changes.
   *
   * Called approximately every second when session is active.
   * Passes the remaining time in seconds, or null if no session is active.
   *
   * Used by TerminalProvider to display the session timer in the sidebar footer.
   */
  readonly onSessionTimeChange?: (remaining: number | null) => void

  /**
   * Optional callback when PTY is ready to receive commands.
   *
   * Called when the first message is received from the server,
   * indicating the PTY is initialized and ready to process commands.
   */
  readonly onPtyReady?: () => void
}

/**
 * Terminal interface for xterm.js (avoiding any types).
 */
interface ITerminal {
  write: (data: string) => void
  clear: () => void
  focus: () => void
  onData: (listener: (data: string) => void) => void
  onResize: (listener: (size: { readonly cols: number; readonly rows: number }) => void) => void
  dispose: () => void
}

/**
 * FitAddon interface.
 */
interface IFitAddon {
  fit: () => void
}

/**
 * InteractiveTerminal component with xterm.js and WebSocket.
 */
export const InteractiveTerminal = forwardRef<InteractiveTerminalRef, InteractiveTerminalProps>(
  function InteractiveTerminal(
    {
      toolPair,
      stepId: _stepId,
      onCommandInsert,
      onStateChange,
      onSessionTimeChange,
      onPtyReady,
    }: InteractiveTerminalProps,
    ref,
  ) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const terminalInstanceRef = useRef<ITerminal | null>(null)
    const fitAddonRef = useRef<IFitAddon | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const messageBufferRef = useRef<string[]>([]) // Buffer for messages before terminal ready
    const isResettingRef = useRef(false) // Flag to prevent EXPIRED state during reset
    const retryCountRef = useRef(0) // Counter to prevent infinite retry loops
    const hasErrorRef = useRef(false) // Flag to prevent EXPIRED after ERROR
    const ptyReadyRef = useRef(false) // Flag to track when PTY is ready to receive commands
    const terminalReadyRef = useRef(false) // Flag to track when xterm.js is ready
    const ptyReadyCalledRef = useRef(false) // Flag to track if we've called onPtyReady

    const [state, setState] = useState<TerminalState>("IDLE")
    const [error, setError] = useState<string | null>(null)
    const [timeRemaining, setTimeRemaining] = useState<number>(300) // 5 minutes in seconds

    // Call onStateChange callback when state changes
    useEffect(() => {
      onStateChange?.(state)
    }, [state, onStateChange])

    // Call onSessionTimeChange callback when time remaining changes
    useEffect(() => {
      onSessionTimeChange?.(timeRemaining)
    }, [timeRemaining, onSessionTimeChange])

    /**
     * Insert a command into the terminal programmatically.
     *
     * This is exposed via useImperativeHandle for external components
     * (like TryIt) to insert commands.
     */
    const insertCommand = useCallback(
      (command: string) => {
        // Send the command via WebSocket - the server will echo it back
        const ws = wsRef.current
        console.log("[insertCommand]", command, {
          hasWs: !!ws,
          readyState: ws?.readyState,
          isOpen: ws?.readyState === WebSocket.OPEN,
        })
        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("[insertCommand] Sending via WebSocket")
          ws.send(`${command}\n`)
        } else {
          console.log("[insertCommand] WebSocket not open, not sending")
        }

        // Notify parent callback
        onCommandInsert?.(command)
      },
      [onCommandInsert],
    )

    /**
     * Focus the terminal.
     *
     * xterm.js terminals receive keyboard input when the container element is focused.
     */
    const focus = useCallback(() => {
      const container = terminalRef.current
      if (container) {
        container.focus()
      }
    }, [])

    // Clean up WebSocket connection
    const cleanup = useCallback(() => {
      if (wsRef.current) {
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          wsRef.current.close()
        }
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = undefined
      }
    }, [])

    // Storage key for persisting session
    const sessionStorageKey = `sandbox-session-${toolPair}`

    // Start the sandbox session
    const startSession = useCallback(async () => {
      console.log("[startSession] Starting session")
      ptyReadyRef.current = false // Reset PTY ready flag for new session
      terminalReadyRef.current = false // Reset terminal ready flag
      ptyReadyCalledRef.current = false // Reset PTY ready called flag
      setState("CONNECTING")
      setError(null)
      hasErrorRef.current = false // Clear error flag for new connection attempt

      try {
        const httpUrl = getSandboxHttpUrl()

        // Check circuit breaker status before attempting connection
        try {
          const statusResponse = await fetch(`${httpUrl}/api/v1/status`)
          if (statusResponse.ok) {
            const status = await statusResponse.json()
            if (status.isOpen) {
              setState("ERROR")
              setError(status.reason ?? "Sandbox temporarily unavailable due to high load")
              hasErrorRef.current = true
              return
            }
          }
        } catch {
          // Status check failed - continue anyway, session creation will fail if unavailable
        }

        // Check for existing session in localStorage
        let sessionId: string | null = null
        const stored = localStorage.getItem(sessionStorageKey)
        if (stored) {
          try {
            const { sessionId: storedId, expiresAt } = JSON.parse(stored) as {
              sessionId: string
              expiresAt: string
            }
            // Check if session hasn't expired (with 1 minute buffer)
            if (new Date(expiresAt).getTime() > Date.now() + 60000) {
              sessionId = storedId
            } else {
              localStorage.removeItem(sessionStorageKey)
            }
          } catch {
            localStorage.removeItem(sessionStorageKey)
          }
        }

        // Create new session if no valid stored session
        if (!sessionId) {
          const headers: Record<string, string> = { "Content-Type": "application/json" }
          if (SANDBOX_API_KEY) {
            headers["X-API-Key"] = SANDBOX_API_KEY
          }
          const response = await fetch(`${httpUrl}/api/v1/sessions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ toolPair }),
          })

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ message: "Failed to create session" }))
            throw new Error(errorData.message ?? "Failed to create session")
          }

          const session = await response.json()
          sessionId = session.sessionId

          // Store session in localStorage
          localStorage.setItem(
            sessionStorageKey,
            JSON.stringify({
              sessionId: session.sessionId,
              expiresAt: session.expiresAt,
            }),
          )
        }

        // Use the original WebSocket URL (ws:// or wss://) for the connection
        const wsBase = SANDBOX_API_URL.replace(/^http:\/\//, "ws://").replace(
          /^https:\/\//,
          "wss://",
        )

        // Estimate terminal size from container for initial PTY sizing
        // Use typical monospace character dimensions (9px wide, 17px tall)
        let cols = 80
        let rows = 24
        if (terminalRef.current) {
          const rect = terminalRef.current.getBoundingClientRect()
          // Account for padding (12px on each side from p-3)
          const availableWidth = rect.width - 24
          const availableHeight = rect.height - 24
          cols = Math.max(40, Math.floor(availableWidth / 9))
          rows = Math.max(10, Math.floor(availableHeight / 17))
        }

        // Build WebSocket URL with size parameters
        const params = new URLSearchParams()
        if (SANDBOX_API_KEY) {
          params.set("api_key", SANDBOX_API_KEY)
        }
        params.set("cols", String(cols))
        params.set("rows", String(rows))
        const wsUrl = `${wsBase}/api/v1/sessions/${sessionId}/ws?${params.toString()}`

        // Connect WebSocket
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          retryCountRef.current = 0 // Reset retry counter on successful connection
          isResettingRef.current = false // Clear reset flag on successful connection
          hasErrorRef.current = false // Clear error flag on successful connection
          setState("CONNECTED")
          setTimeRemaining(300) // Reset timer
        }

        ws.onmessage = async (event: MessageEvent) => {
          // Handle both string and binary (Blob) data
          let data: string
          if (typeof event.data === "string") {
            data = event.data
          } else if (event.data instanceof Blob) {
            data = await event.data.text()
          } else {
            return // Unknown data type
          }

          // Parse WebSocket control messages (JSON starting with {)
          if (data.startsWith("{")) {
            const msg = parseWsMessage(data)
            if (msg) {
              // Skip control messages (connected, error)
              if (msg.type === "connected" || msg.type === "error") {
                return
              }
              // Extract terminal output from output messages (e.g., welcome banner)
              if (msg.type === "output") {
                data = msg.data
              }
            }
          }

          // Mark PTY as ready when we receive the first message
          if (!ptyReadyRef.current) {
            ptyReadyRef.current = true
            console.log("[ws.onmessage] PTY ready, terminal ready:", terminalReadyRef.current)
          }

          const terminal = terminalInstanceRef.current
          if (terminal) {
            // Flush any buffered messages first
            if (messageBufferRef.current.length > 0) {
              console.log("[ws.onmessage] Flushing buffer:", messageBufferRef.current.length, "messages")
              for (const msg of messageBufferRef.current) {
                terminal.write(msg)
              }
              messageBufferRef.current = []
            }
            console.log("[ws.onmessage] Writing data:", JSON.stringify(data))
            terminal.write(data)

            // Check for shell prompt pattern to signal PTY is ready for commands
            // Look for $ character which is distinctive for shell prompts (may have ANSI codes)
            if (!ptyReadyCalledRef.current && terminalReadyRef.current) {
              if (data.includes("$")) {
                console.log("[ws.onmessage] Found shell prompt, notifying parent to flush commands")
                ptyReadyCalledRef.current = true
                onPtyReady?.()
              }
            }
          } else {
            console.log("[ws.onmessage] Buffering data (terminal not ready):", JSON.stringify(data))
            // Buffer message until terminal is ready
            messageBufferRef.current.push(data)
          }
        }

        ws.onerror = (event: Event) => {
          console.error("WebSocket error:", event)
          // Clear stored session on error (it may be invalid)
          localStorage.removeItem(sessionStorageKey)

          // Auto-retry once with a fresh session
          if (retryCountRef.current < 1) {
            retryCountRef.current++
            startSession()
            return
          }

          // Give up after retry
          retryCountRef.current = 0
          isResettingRef.current = false // Clear reset flag when giving up
          hasErrorRef.current = true // Prevent onclose from showing EXPIRED
          setState("ERROR")
          setError("Connection error. Please try again.")
        }

        ws.onclose = () => {
          // Clear stored session - server session is gone either way
          localStorage.removeItem(sessionStorageKey)

          // Don't show EXPIRED if we're intentionally resetting or already in error state
          if (!isResettingRef.current && !hasErrorRef.current) {
            setState("EXPIRED")
            setError("Session expired. Click to restart.")
          }
        }

        wsRef.current = ws
      } catch (err) {
        setState("ERROR")
        setError(err instanceof Error ? err.message : "Failed to connect to sandbox")
      }
    }, [toolPair, sessionStorageKey])

    // Reset the terminal (creates fresh session if expired/error, otherwise reconnects)
    const reset = useCallback(() => {
      // Set flag to prevent EXPIRED state during reset (cleared in ws.onopen)
      isResettingRef.current = true

      cleanup()

      // Clear terminal display
      const terminal = terminalInstanceRef.current
      if (terminal) {
        terminal.clear()
      }

      // Clear localStorage to force a fresh session (expired session won't exist on server)
      localStorage.removeItem(sessionStorageKey)

      // Set state to IDLE first to trigger init state reset
      setState("IDLE")

      // Start fresh session after a brief delay to allow state update to propagate
      setTimeout(() => {
        startSession()
      }, 0)
    }, [cleanup, startSession, sessionStorageKey])

    /**
     * Expose imperative handle for external command insertion.
     *
     * Allows TryIt component (via TerminalContext) to insert commands into the terminal.
     */
    useImperativeHandle(
      ref,
      () => ({
        insertCommand,
        focus,
        reset,
        start: startSession,
      }),
      [insertCommand, focus, reset, startSession],
    )

    // Initialize xterm.js when terminal container is available
    // biome-ignore lint/correctness/useExhaustiveDependencies: state is needed to re-run when terminal div becomes available after CONNECTED
    useEffect(() => {
      // Only initialize when terminal div is rendered and not already initialized
      if (!terminalRef.current || terminalInstanceRef.current) return

      // Dynamic import for SSR safety
      const initTerminal = async () => {
        const { Terminal } = await import("@xterm/xterm")
        const { FitAddon } = await import("@xterm/addon-fit")

        const terminal = new Terminal({
          theme: {
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
          },
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 14,
          lineHeight: 1.0,
          cursorBlink: true,
          cursorStyle: "block",
          scrollback: 1000,
          allowTransparency: false,
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)

        const container = terminalRef.current
        if (!container) {
          return
        }

        terminal.open(container)
        fitAddon.fit()
        terminal.focus() // Auto-focus the terminal when it opens

        // Set refs BEFORE flushing buffer so onmessage can use them
        terminalInstanceRef.current = terminal
        fitAddonRef.current = fitAddon
        terminalReadyRef.current = true

        console.log("[initTerminal] Terminal ready, PTY ready:", ptyReadyRef.current, "buffer length:", messageBufferRef.current.length)
        // Don't flush commands here - wait for prompt to appear in onmessage
        // This ensures we don't send commands before the shell is ready

        // Flush any buffered messages that arrived before terminal was ready
        if (messageBufferRef.current.length > 0) {
          console.log("[initTerminal] Flushing buffer:", messageBufferRef.current.length, "messages")
          for (const msg of messageBufferRef.current) {
            terminal.write(msg)
          }
          messageBufferRef.current = []
          // Re-fit after flushing to ensure proper display
          fitAddon.fit()
        }

        // Also flush after a short delay in case messages are still arriving
        setTimeout(() => {
          if (messageBufferRef.current.length > 0) {
            for (const msg of messageBufferRef.current) {
              terminal.write(msg)
            }
            messageBufferRef.current = []
            fitAddon.fit()
          }
        }, 100)

        // Send initial terminal size to server
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "resize",
              rows: terminal.rows,
              cols: terminal.cols,
            }),
          )
        }

        // Handle user input
        terminal.onData((data: string) => {
          const ws = wsRef.current
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data)
          }
        })

        // Handle terminal resize
        terminal.onResize((size: { readonly cols: number; readonly rows: number }) => {
          const ws = wsRef.current
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "resize",
                rows: size.rows,
                cols: size.cols,
              }),
            )
          }
        })
      }

      initTerminal()

      // Handle window resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
        }
      }

      window.addEventListener("resize", handleResize)

      // Watch for container size changes (e.g., panel resize)
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
        }
      })
      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current)
      }

      return () => {
        cleanup()
        window.removeEventListener("resize", handleResize)
        resizeObserver.disconnect()
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.dispose()
          terminalInstanceRef.current = null
        }
      }
    }, [cleanup, state])

    // Refit terminal when state changes (e.g., when footer appears)
    useEffect(() => {
      if (fitAddonRef.current && (state === "CONNECTED" || state === "TIMEOUT_WARNING")) {
        // Small delay to let DOM update
        setTimeout(() => {
          fitAddonRef.current?.fit()
        }, 50)
      }
    }, [state])

    // Session timer countdown
    useEffect(() => {
      if (state !== "CONNECTED" && state !== "TIMEOUT_WARNING") return

      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          const next = prev - 1
          if (next <= 60 && state === "CONNECTED") {
            setState("TIMEOUT_WARNING")
          }
          if (next <= 0) {
            cleanup()
            setState("EXPIRED")
            return 0
          }
          return next
        })
      }, 1000)

      return () => clearInterval(timer)
    }, [state, cleanup])

    return (
      <div className="flex h-full flex-col">
        {/* Terminal container */}
        {state === "IDLE" ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Click below to start the interactive sandbox
            </p>
            <button
              type="button"
              onClick={startSession}
              className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Start Terminal
            </button>
          </div>
        ) : state === "CONNECTING" ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
              <div
                className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-accent)]"
                aria-hidden="true"
              />
              <p className="text-sm text-[var(--color-text-muted)]">Starting sandbox...</p>
            </div>
          </div>
        ) : state === "ERROR" || state === "EXPIRED" ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <p className="mb-4 text-sm text-[var(--color-error)]">{error ?? "An error occurred"}</p>
            <button
              type="button"
              onClick={reset}
              className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1 p-3">
            <div
              ref={terminalRef}
              tabIndex={0}
              className="h-full overflow-hidden outline-none"
              aria-label="Interactive terminal sandbox. Press Escape to exit terminal focus."
              role="application"
              onKeyDown={(e) => {
                // Allow Escape to exit terminal focus (resolves focus trap)
                if (e.key === "Escape") {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
            />
          </div>
        )}
      </div>
    )
  },
)
