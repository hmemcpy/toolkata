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

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import type { TerminalMessage } from "../../services/sandbox-client"

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
  | "STATIC"

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
  insertCommand: (command: string) => void

  /**
   * Focus the terminal input.
   *
   * Attempts to focus the terminal for keyboard input.
   * Note: xterm.js terminal focus is handled by the browser.
   */
  focus: () => void
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
   * Optional preloaded commands to display as suggestions.
   *
   * If provided, commands are shown as buttons below the terminal.
   * This is used by the sidebar TryIt functionality.
   */
  readonly preloadCommands?: readonly string[]

  /**
   * Optional callback when terminal state changes.
   *
   * Called when the terminal transitions between states:
   * IDLE, CONNECTING, CONNECTED, TIMEOUT_WARNING, EXPIRED, ERROR, STATIC
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
}

/**
 * Format seconds as MM:SS.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Terminal interface for xterm.js (avoiding any types).
 */
interface ITerminal {
  write: (data: string) => void
  clear: () => void
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
 * Status indicator component.
 */
function StatusIndicator({ state }: { readonly state: TerminalState }) {
  const getStatusColor = () => {
    switch (state) {
      case "CONNECTED":
        return "bg-[var(--color-accent)]"
      case "CONNECTING":
      case "TIMEOUT_WARNING":
        return "bg-[var(--color-warning)]"
      case "ERROR":
      case "EXPIRED":
        return "bg-[var(--color-error)]"
      default:
        return "bg-[var(--color-text-dim)]"
    }
  }

  const getStatusText = () => {
    switch (state) {
      case "CONNECTED":
        return "Connected"
      case "CONNECTING":
        return "Starting..."
      case "TIMEOUT_WARNING":
        return "Expires soon"
      case "EXPIRED":
        return "Expired"
      case "ERROR":
        return "Error"
      case "STATIC":
        return "Static Mode"
      default:
        return "Idle"
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${getStatusColor()} ${
          state === "CONNECTING" ? "animate-pulse" : ""
        }`}
        aria-hidden="true"
      />
      <span className="text-xs text-[var(--color-text-muted)]">{getStatusText()}</span>
    </div>
  )
}

/**
 * Props for StaticModeContent component.
 */
interface StaticModeContentProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Callback when user wants to try the interactive terminal again.
   */
  readonly onTryInteractive: () => void
}

/**
 * Copy button state for user feedback.
 */
type CopyState = "idle" | "copied" | "error"

/**
 * StaticModeContent - Fallback static command blocks when sandbox unavailable.
 *
 * Shows copyable code blocks with commands for users to run locally.
 * Includes a link to the cheat sheet for reference.
 */
function StaticModeContent({ toolPair, onTryInteractive }: StaticModeContentProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle")

  // Define commands to show in static mode based on the tool pair
  // For jj-git, show essential commands for getting started
  const staticCommands =
    toolPair === "jj-git"
      ? ["jj status", "jj log", "jj describe -m 'Your commit message'", "jj new", "jj diff"]
      : []

  const handleCopyAll = async () => {
    const allCommands = staticCommands.join("\n")
    try {
      await navigator.clipboard.writeText(allCommands)
      setCopyState("copied")
      setTimeout(() => setCopyState("idle"), 2000)
    } catch {
      setCopyState("error")
      setTimeout(() => setCopyState("idle"), 2000)
    }
  }

  const handleCopySingle = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopyState("copied")
      setTimeout(() => setCopyState("idle"), 2000)
    } catch {
      setCopyState("error")
      setTimeout(() => setCopyState("idle"), 2000)
    }
  }

  return (
    <div className="flex min-h-[200px] flex-col p-6">
      {/* Message */}
      <div className="mb-4">
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          Interactive sandbox unavailable. Copy commands to try locally.
        </p>
        <a
          href={`/${toolPair}/diff`}
          className="text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          View diff →
        </a>
      </div>

      {/* Command blocks */}
      <div className="mb-4 flex flex-col gap-2">
        {staticCommands.map((command, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order matters
            key={index}
            className="group flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 transition-colors hover:border-[var(--color-border-focus)]"
          >
            <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--color-text)]">
              {command}
            </code>
            <button
              type="button"
              onClick={() => handleCopySingle(command)}
              className="ml-3 flex-shrink-0 text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label={`Copy command: ${command}`}
            >
              {copyState === "copied" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-[var(--color-accent)]"
                >
                  <title>Copied</title>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : copyState === "error" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-[var(--color-error)]"
                >
                  <title>Error</title>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <title>Copy</title>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <button
          type="button"
          onClick={onTryInteractive}
          className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Try Interactive Terminal
        </button>
        <button
          type="button"
          onClick={handleCopyAll}
          className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Copy All Commands
        </button>
      </div>
    </div>
  )
}

/**
 * InteractiveTerminal component with xterm.js and WebSocket.
 */
export const InteractiveTerminal = forwardRef<InteractiveTerminalRef, InteractiveTerminalProps>(
  function InteractiveTerminal(
    { toolPair, stepId: _stepId, onCommandInsert, preloadCommands = [], onStateChange, onSessionTimeChange }: InteractiveTerminalProps,
    ref,
  ) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const terminalInstanceRef = useRef<ITerminal | null>(null)
    const fitAddonRef = useRef<IFitAddon | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

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
        const terminal = terminalInstanceRef.current
        if (!terminal) {
          return
        }

        // Write the command to the terminal display
        terminal.write(`\r${command}`)

        // Send the command via WebSocket
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(`${command}\r`)
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
      }),
      [insertCommand, focus],
    )

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

    // Start the sandbox session
    const startSession = useCallback(async () => {
      setState("CONNECTING")
      setError(null)

      try {
        const apiUrl = process.env["NEXT_PUBLIC_SANDBOX_API_URL"] ?? "ws://localhost:3001"
        const httpUrl = apiUrl.replace(/^wss?:\/\//, "http://").replace(/:\d+/, ":3001")

        // Create session
        const response = await fetch(`${httpUrl}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolPair }),
        })

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Failed to create session" }))
          throw new Error(errorData.message ?? "Failed to create session")
        }

        const session = await response.json()
        const wsUrl = `${apiUrl}/sessions/${session.sessionId}/ws`

        // Connect WebSocket
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          setState("CONNECTED")
          setTimeRemaining(300) // Reset timer
        }

        ws.onmessage = (event: MessageEvent) => {
          const terminal = terminalInstanceRef.current
          if (terminal) {
            const data = typeof event.data === "string" ? event.data : ""
            terminal.write(data)
          }
        }

        ws.onerror = (event: Event) => {
          console.error("WebSocket error:", event)
          setState("ERROR")
          setError("Connection error. Try again or use static mode.")
        }

        ws.onclose = (_event: CloseEvent) => {
          if (state !== "ERROR" && state !== "EXPIRED") {
            setState("EXPIRED")
            setError("Session expired. Click to restart.")
          }
        }

        wsRef.current = ws
      } catch (err) {
        setState("ERROR")
        setError(err instanceof Error ? err.message : "Failed to connect to sandbox")
      }
    }, [toolPair, state])

    // Reset the terminal
    const reset = useCallback(() => {
      cleanup()

      // Clear terminal
      const terminal = terminalInstanceRef.current
      if (terminal) {
        terminal.clear()
      }

      startSession()
    }, [cleanup, startSession])

    // Initialize xterm.js on mount
    useEffect(() => {
      if (!terminalRef.current) return

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
          lineHeight: 1.4,
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

        terminalInstanceRef.current = terminal
        fitAddonRef.current = fitAddon

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
                data: { rows: size.rows, cols: size.cols },
              } satisfies TerminalMessage),
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

      return () => {
        cleanup()
        window.removeEventListener("resize", handleResize)
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.dispose()
        }
      }
    }, [cleanup])

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
      <div className="my-4">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text)]">SANDBOX</span>
              <StatusIndicator state={state} />
            </div>
            {state === "CONNECTED" || state === "TIMEOUT_WARNING" ? (
              <span className="text-xs text-[var(--color-text-muted)]">
                Session: {formatTime(timeRemaining)} / 5:00
              </span>
            ) : null}
          </div>

          {/* Terminal container */}
          {state === "IDLE" ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center p-8">
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
            <div className="flex min-h-[200px] items-center justify-center p-8">
              <div className="text-center">
                <div
                  className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-accent)]"
                  aria-hidden="true"
                />
                <p className="text-sm text-[var(--color-text-muted)]">Starting sandbox...</p>
              </div>
            </div>
          ) : state === "ERROR" || state === "EXPIRED" ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center p-8">
              <p className="mb-2 text-sm text-[var(--color-error)]">
                {error ?? "An error occurred"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setState("STATIC")
                    setError(null)
                  }}
                  className="rounded border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  Use Static Mode
                </button>
              </div>
            </div>
          ) : state === "STATIC" ? (
            <StaticModeContent toolPair={toolPair} onTryInteractive={() => setState("IDLE")} />
          ) : (
            <div
              ref={terminalRef}
              tabIndex={0}
              className="min-h-[200px] max-h-[400px] overflow-hidden outline-none"
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
          )}

          {/* Footer */}
          {state === "CONNECTED" || state === "TIMEOUT_WARNING" ? (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2">
              <button
                type="button"
                onClick={reset}
                className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Reset
              </button>
              <span className="text-xs text-[var(--color-text-muted)]">
                Session: {formatTime(timeRemaining)} / 5:00
              </span>
            </div>
          ) : null}
        </div>

        {/* Suggested commands */}
        {preloadCommands.length > 0 && (state === "CONNECTED" || state === "TIMEOUT_WARNING") ? (
          <div className="mt-2">
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">Tap to run:</p>
            <div className="flex flex-col gap-2">
              {preloadCommands.map((command, index) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order matters
                  key={index}
                  type="button"
                  onClick={() => insertCommand(command)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm font-mono text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  {command}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  },
)
