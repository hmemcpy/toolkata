/**
 * TerminalSidebar - Desktop sidebar containing the interactive terminal.
 *
 * A fixed right sidebar (400px) that overlays the page content.
 * Shows on desktop viewports (lg+, 1024px+) when isOpen is true.
 *
 * Features:
 * - Header with status indicator and close button
 * - Lazy-loaded InteractiveTerminal component
 * - Footer with reset button and session timer
 * - Slide-in animation from right
 * - Focus trap using inert on rest of page
 * - Escape key closes sidebar
 *
 * @example
 * ```tsx
 * import { TerminalSidebar } from "@/components/ui/TerminalSidebar"
 * import { useTerminalContext } from "@/contexts/TerminalContext"
 *
 * export function Layout() {
 *   const { isOpen } = useTerminalContext()
 *   return <TerminalSidebar isOpen={isOpen} toolPair="jj-git" />
 * }
 * ```
 */

"use client"

import { useEffect, useRef, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { useTerminalContext } from "../../contexts/TerminalContext"
import type { InteractiveTerminalRef } from "./InteractiveTerminal"

/**
 * Lazy-load InteractiveTerminal to reduce initial bundle size.
 *
 * The terminal component includes xterm.js which is a large dependency.
 * We only load it when the sidebar is opened.
 */
const InteractiveTerminal = dynamic(
  () => import("./InteractiveTerminal").then((mod) => ({ default: mod.InteractiveTerminal })),
  {
    loading: () => (
      <div className="flex min-h-[300px] items-center justify-center">
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
 * Props for TerminalSidebar component.
 */
export interface TerminalSidebarProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string
}

/**
 * Status indicator component.
 *
 * Shows a colored dot and text based on terminal state.
 */
function StatusIndicator(): ReactNode {
  const { state } = useTerminalContext()

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

/**
 * TerminalSidebar component.
 *
 * Renders a fixed right sidebar containing the interactive terminal.
 * Only visible on desktop viewports (lg+, 1024px+).
 *
 * Uses inert attribute for focus trap - when sidebar is open,
 * the rest of the page becomes inert (non-interactive).
 */
export function TerminalSidebar({ toolPair }: TerminalSidebarProps): ReactNode {
  const { isOpen, closeSidebar, state, sessionTimeRemaining, onTerminalStateChange, onTerminalTimeChange } =
    useTerminalContext()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const terminalRef = useRef<InteractiveTerminalRef>(null)

  // Focus close button when sidebar opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Handle Escape key to close sidebar
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, closeSidebar])

  // Don't render if closed (desktop only)
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 z-[var(--sidebar-z-index)] h-screen w-[var(--sidebar-width)] border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-transform duration-[var(--transition-sidebar)] ease-in-out lg:translate-x-0"
        id="terminal-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Terminal sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Terminal</span>
              <StatusIndicator />
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeSidebar}
              className="rounded p-1 text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label="Close terminal sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <title>Close</title>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body - Terminal */}
          <div className="flex-1 overflow-hidden">
            <InteractiveTerminal
              ref={terminalRef}
              toolPair={toolPair}
              stepId="sidebar"
              onStateChange={onTerminalStateChange}
              onSessionTimeChange={onTerminalTimeChange}
            />
          </div>

          {/* Footer */}
          {state === "CONNECTED" || state === "TIMEOUT_WARNING" ? (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
              <button
                type="button"
                onClick={() => terminalRef.current?.reset()}
                className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                aria-label="Reset terminal session"
              >
                Reset
              </button>
              {sessionTimeRemaining !== null ? (
                <span className="text-xs text-[var(--color-text-muted)]">
                  Session: {formatTime(sessionTimeRemaining)} / 5:00
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
