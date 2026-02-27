"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { useInlineTerminal } from "../../contexts/InlineTerminalContext"
import type { InteractiveTerminalRef } from "./InteractiveTerminal"

/**
 * Lazy-load InteractiveTerminal for SSR safety and bundle optimization.
 */
const InteractiveTerminal = dynamic(
  () => import("./InteractiveTerminal").then((mod) => ({ default: mod.InteractiveTerminal })),
  {
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center">
          <div
            className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-accent)]"
            aria-hidden="true"
          />
          <p className="text-sm text-[var(--color-text-muted)]">Loading terminal...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
)

/**
 * Format seconds as MM:SS.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Status indicator dot and text.
 */
function StatusIndicator({ state }: { readonly state: string }): ReactNode {
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

export interface InlineTerminalProps {
  readonly toolPair: string
}

/**
 * InlineTerminal - Self-contained terminal widget for inline rendering in lessons.
 *
 * Features:
 * - Header with status indicator, timer, reset button, expand button
 * - xterm.js via dynamic import
 * - Expand-to-fullscreen overlay
 * - Idle state with "Start Terminal" call-to-action
 * - Default height: min(400px, 50vh)
 */
export function InlineTerminal({ toolPair }: InlineTerminalProps): ReactNode {
  const {
    state,
    sessionTimeRemaining,
    sandboxConfig,
    authToken,
    registerTerminal,
    registerTerminalElement,
    onTerminalStateChange,
    onTerminalErrorChange,
    onTerminalTimeChange,
    onSessionIdChange,
    flushCommandQueue,
  } = useInlineTerminal()

  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<InteractiveTerminalRef | null>(null)

  // Track latest registerTerminal to avoid stale closures
  const registerTerminalLatest = useRef(registerTerminal)
  registerTerminalLatest.current = registerTerminal
  const lastRegisteredRef = useRef<InteractiveTerminalRef | null>(null)

  const terminalRefCallback = useCallback((ref: InteractiveTerminalRef | null) => {
    if (ref !== lastRegisteredRef.current) {
      lastRegisteredRef.current = ref
      terminalRef.current = ref
      registerTerminalLatest.current(ref)
    }
  }, [])

  // Register container element for scroll-to
  useEffect(() => {
    registerTerminalElement(containerRef.current)
    return () => registerTerminalElement(null)
  }, [registerTerminalElement])

  // Flush command queue when PTY is ready
  const handlePtyReady = useCallback(() => {
    flushCommandQueue()
  }, [flushCommandQueue])

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isExpanded])

  // Prevent body scroll when expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isExpanded])

  // Don't render if sandbox disabled
  if (sandboxConfig !== undefined && sandboxConfig.enabled === false) {
    return null
  }

  const terminalContent = (
    <div
      className={
        isExpanded
          ? "fixed inset-0 z-50 flex flex-col bg-[var(--color-surface)]"
          : "flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
      }
      style={isExpanded ? undefined : { height: "min(400px, 50vh)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--color-text)]">Terminal</span>
          <StatusIndicator state={state} />
        </div>
        <div className="flex items-center gap-2">
          {/* Timer */}
          {sessionTimeRemaining !== null &&
          (state === "CONNECTED" || state === "TIMEOUT_WARNING") ? (
            <span className="text-xs text-[var(--color-text-muted)] font-mono">
              {formatTime(sessionTimeRemaining)}
            </span>
          ) : null}

          {/* Reset button */}
          {state === "CONNECTED" || state === "TIMEOUT_WARNING" ? (
            <button
              type="button"
              onClick={() => terminalRef.current?.reset()}
              className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] px-2 py-1 rounded"
              aria-label="Reset terminal session"
            >
              Reset
            </button>
          ) : null}

          {/* Expand/Collapse button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] p-1 rounded"
            aria-label={isExpanded ? "Exit fullscreen" : "Expand terminal to fullscreen"}
          >
            {isExpanded ? (
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
                <title>Collapse</title>
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
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
                <title>Expand</title>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div className="min-h-0 flex-1">
        <InteractiveTerminal
          ref={terminalRefCallback}
          toolPair={toolPair}
          stepId="inline"
          {...(sandboxConfig !== undefined ? { sandboxConfig } : {})}
          {...(authToken !== null ? { authToken } : {})}
          onStateChange={onTerminalStateChange}
          onErrorChange={onTerminalErrorChange}
          onSessionTimeChange={onTerminalTimeChange}
          onSessionIdChange={onSessionIdChange}
          onPtyReady={handlePtyReady}
        />
      </div>
    </div>
  )

  return (
    <div ref={containerRef} className="my-6" id="inline-terminal">
      {terminalContent}
    </div>
  )
}
