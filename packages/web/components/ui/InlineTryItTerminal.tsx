/**
 * InlineTryItTerminal - Disposable per-TryIt terminal widget.
 *
 * Creates an isolated sandbox session, runs setup commands silently,
 * auto-executes the initial command, and destroys the session on unmount.
 *
 * Much simpler than InlineTerminal — no header bar, no expand-to-fullscreen,
 * no timer display, no session persistence.
 */

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { SandboxConfig } from "./InteractiveTerminal"
import {
  buildWebSocketUrl,
  createSession,
  destroySession,
  destroySessionBeacon,
  parseWsMessage,
  XTERM_OPTIONS,
} from "../../lib/sandbox-session"

type TerminalStatus = "starting" | "running-setup" | "ready" | "error"

export interface InlineTryItTerminalProps {
  readonly toolPair: string
  readonly sandboxConfig: SandboxConfig | undefined
  readonly authToken: string | null
  readonly setupCommands: readonly string[]
  readonly initialCommand: string
  readonly onClose: () => void
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
  rows: number
  cols: number
}

/**
 * FitAddon interface.
 */
interface IFitAddon {
  fit: () => void
}

export function InlineTryItTerminal({
  toolPair,
  sandboxConfig,
  authToken,
  setupCommands,
  initialCommand,
  onClose,
}: InlineTryItTerminalProps) {
  const [status, setStatus] = useState<TerminalStatus>("starting")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const terminalDivRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<ITerminal | null>(null)
  const fitAddonRef = useRef<IFitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const messageBufferRef = useRef<string[]>([])
  const setupPhaseRef = useRef(true)
  const mountedRef = useRef(true)
  const hasErrorRef = useRef(false)

  // Cleanup function
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
  }, [])

  // Main session lifecycle — runs once on mount, props are stable for this component's lifetime
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount — component is remounted with new props
  useEffect(() => {
    mountedRef.current = true

    const run = async () => {
      try {
        // Create session
        const session = await createSession({
          toolPair,
          environment: sandboxConfig?.environment,
          init: setupCommands.length > 0 ? [...(sandboxConfig?.init ?? []), ...setupCommands] : sandboxConfig?.init,
          timeout: sandboxConfig?.timeout,
          authToken,
        })

        if (!mountedRef.current) {
          // Component unmounted during session creation
          await destroySession(session.sessionId)
          return
        }

        sessionIdRef.current = session.sessionId
        setStatus("running-setup")

        // Build WebSocket URL
        const container = terminalDivRef.current
        let cols = 80
        let rows = 12
        if (container) {
          const rect = container.getBoundingClientRect()
          const availableWidth = rect.width - 24
          const availableHeight = rect.height - 24
          cols = Math.max(40, Math.floor(availableWidth / 9))
          rows = Math.max(8, Math.floor(availableHeight / 17))
        }

        const wsUrl = buildWebSocketUrl(session.sessionId, { authToken, cols, rows })
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mountedRef.current) return
          // Setup commands are handled as init commands by the server
        }

        ws.onmessage = async (event: MessageEvent) => {
          if (!mountedRef.current) return

          let data: string
          if (typeof event.data === "string") {
            data = event.data
          } else if (event.data instanceof Blob) {
            data = await event.data.text()
          } else {
            return
          }

          // Parse control messages
          if (data.startsWith("{")) {
            const msg = parseWsMessage(data)
            if (msg) {
              if (msg.type === "connected" || msg.type === "error") {
                if (msg.type === "error") {
                  hasErrorRef.current = true
                  setStatus("error")
                  setErrorMessage(msg.message)
                }
                return
              }
              if (msg.type === "initComplete") {
                // Setup done — switch to user-visible mode
                setupPhaseRef.current = false
                setStatus("ready")

                // Initialize xterm.js now
                await initXterm()

                // Auto-execute the initial command
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(`${initialCommand}\n`)
                }
                return
              }
              if (msg.type === "output") {
                data = msg.data
              }
            }
          }

          // During setup phase, buffer silently (don't show setup output)
          if (setupPhaseRef.current) {
            return
          }

          // Write to terminal
          const terminal = terminalInstanceRef.current
          if (terminal) {
            if (messageBufferRef.current.length > 0) {
              for (const msg of messageBufferRef.current) {
                terminal.write(msg)
              }
              messageBufferRef.current = []
            }
            terminal.write(data)
          } else {
            messageBufferRef.current.push(data)
          }
        }

        ws.onerror = () => {
          if (!mountedRef.current) return
          hasErrorRef.current = true
          setStatus("error")
          setErrorMessage("Connection error. Please try again.")
        }

        ws.onclose = () => {
          if (!mountedRef.current) return
          if (!hasErrorRef.current) {
            // Session ended (timeout or server-side close)
            setStatus("error")
            setErrorMessage("Session ended.")
          }
        }
      } catch (err) {
        if (!mountedRef.current) return
        setStatus("error")
        setErrorMessage(err instanceof Error ? err.message : "Failed to connect to sandbox")
      }
    }

    const initXterm = async () => {
      if (!terminalDivRef.current || terminalInstanceRef.current) return

      const { Terminal } = await import("@xterm/xterm")
      const { FitAddon } = await import("@xterm/addon-fit")

      if (!mountedRef.current || !terminalDivRef.current) return

      const terminal = new Terminal(XTERM_OPTIONS)
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      terminal.open(terminalDivRef.current)
      fitAddon.fit()
      terminal.focus()

      terminalInstanceRef.current = terminal
      fitAddonRef.current = fitAddon

      // Flush buffered messages
      if (messageBufferRef.current.length > 0) {
        for (const msg of messageBufferRef.current) {
          terminal.write(msg)
        }
        messageBufferRef.current = []
        fitAddon.fit()
      }

      // Send terminal size to server
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

      // Allow browser shortcuts to pass through
      terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        if (event.key === "F12") return false
        if (event.ctrlKey && event.shiftKey && event.key === "I") return false
        if (event.ctrlKey && event.shiftKey && event.key === "J") return false
        if (event.metaKey && event.altKey && event.key === "i") return false
        return true
      })

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

    run()

    // Handle window resize
    const handleResize = () => {
      fitAddonRef.current?.fit()
    }
    window.addEventListener("resize", handleResize)

    // Watch for container size changes
    const resizeObserver = new ResizeObserver(() => {
      fitAddonRef.current?.fit()
    })
    if (terminalDivRef.current) {
      resizeObserver.observe(terminalDivRef.current)
    }

    return () => {
      mountedRef.current = false
      window.removeEventListener("resize", handleResize)
      resizeObserver.disconnect()
      cleanup()

      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose()
        terminalInstanceRef.current = null
      }

      // Destroy session
      const sid = sessionIdRef.current
      if (sid) {
        destroySessionBeacon(sid)
        sessionIdRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  // Destroy session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = sessionIdRef.current
      if (sid) {
        destroySessionBeacon(sid)
        sessionIdRef.current = null
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  return (
    <div className="mt-2 rounded border border-[var(--color-border)] bg-[#0c0c0c] overflow-hidden">
      {/* Minimal header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5">
        <div className="flex items-center gap-2">
          {status === "starting" || status === "running-setup" ? (
            <>
              <div
                className="h-2 w-2 rounded-full bg-[var(--color-warning)] animate-pulse"
                aria-hidden="true"
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                {status === "starting" ? "Starting..." : "Setting up..."}
              </span>
            </>
          ) : status === "error" ? (
            <>
              <div className="h-2 w-2 rounded-full bg-[var(--color-error)]" aria-hidden="true" />
              <span className="text-xs text-[var(--color-error)]">
                {errorMessage ?? "Error"}
              </span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
              <span className="text-xs text-[var(--color-text-muted)]">Connected</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] p-1 rounded"
          aria-label="Close terminal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <title>Close</title>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalDivRef}
        className="overflow-hidden outline-none"
        style={{ height: "200px" }}
        tabIndex={0}
        aria-label="Interactive terminal sandbox. Press Escape to exit terminal focus."
        role="application"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      />
    </div>
  )
}
