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
 * - Escape key closes sidebar
 * - Main content remains interactive (no focus trap)
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

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { useTerminalContext } from "../../contexts/TerminalContext"
import type { InteractiveTerminalRef } from "./InteractiveTerminal"
import { SplitPane } from "./SplitPane"
import { InfoPanel } from "./InfoPanel"

const MIN_SIDEBAR_WIDTH = 300
const MAX_SIDEBAR_WIDTH = 800

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
 * Features:
 * - Collapsible without disconnecting the session
 * - Resizable via drag handle on left edge
 * - Width persisted to localStorage
 */
export function TerminalSidebar({ toolPair }: TerminalSidebarProps): ReactNode {
  const {
    isOpen,
    closeSidebar,
    state,
    sessionTimeRemaining,
    sandboxConfig,
    sidebarWidth,
    setSidebarWidth,
    infoPanelCollapsed,
    setInfoPanelCollapsed,
    infoPanelHeight,
    setInfoPanelHeight,
    registerTerminal,
    onTerminalStateChange,
    onTerminalTimeChange,
    flushCommandQueue,
  } = useTerminalContext()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<InteractiveTerminalRef | null>(null)

  // Resizing state
  const [isResizing, setIsResizing] = useState(false)

  // Track previous isOpen value to detect user-initiated opens vs restores
  const prevIsOpenRef = useRef(isOpen)
  const isHydratedRef = useRef(false)

  // Track latest registerTerminal function to avoid stale closures
  const registerTerminalRef = useRef(registerTerminal)
  registerTerminalRef.current = registerTerminal

  // Track the last registered ref to avoid duplicate registrations
  const lastRegisteredRef = useRef<InteractiveTerminalRef | null>(null)

  // Use callback ref to register terminal when it mounts/unmounts
  // The terminal is registered whenever it's mounted, regardless of sidebar state
  const terminalRefCallback = useCallback(
    (ref: InteractiveTerminalRef | null) => {
      // Only register if the ref actually changed
      if (ref !== lastRegisteredRef.current) {
        lastRegisteredRef.current = ref
        terminalRef.current = ref
        registerTerminalRef.current(ref)
      }
    },
    [], // Empty deps - this ref callback should be stable
  )

  // Mark as hydrated after initial mount + localStorage restore settles
  useEffect(() => {
    const timeout = setTimeout(() => {
      isHydratedRef.current = true
    }, 100) // Wait for localStorage restore to complete
    return () => clearTimeout(timeout)
  }, [])

  // Focus close button only when user explicitly opens the sidebar
  // (not on initial restore from localStorage)
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    // Only focus if transitioning from closed to open AND hydration is complete
    if (!wasOpen && isOpen && isHydratedRef.current) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Callback when PTY is ready to receive commands
  const handlePtyReady = useCallback(() => {
    flushCommandQueue()
  }, [flushCommandQueue])

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, setSidebarWidth])

  // Handle Escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closeSidebar()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, closeSidebar])

  // If sandbox is disabled, don't render the sidebar at all
  if (sandboxConfig?.enabled === false) {
    return null
  }

  return (
    <>
      {/* Sidebar - always mounted, hidden via transform when closed */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 top-0 z-[var(--sidebar-z-index)] hidden h-screen border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-transform duration-[var(--transition-sidebar)] ease-in-out lg:block ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } ${isResizing ? "select-none" : ""}`}
        style={{ width: `${sidebarWidth}px` }}
        id="terminal-sidebar"
        role="complementary"
        aria-label="Terminal sidebar"
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-[var(--color-accent)] transition-colors"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          tabIndex={0}
        />
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

          {/* Body - Terminal and Info Panel with SplitPane */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <SplitPane
              topContent={
                <InteractiveTerminal
                  ref={terminalRefCallback}
                  toolPair={toolPair}
                  stepId="sidebar"
                  {...(sandboxConfig !== undefined ? { sandboxConfig } : {})}
                  onStateChange={onTerminalStateChange}
                  onSessionTimeChange={onTerminalTimeChange}
                  onPtyReady={handlePtyReady}
                />
              }
              bottomContent={<InfoPanel />}
              bottomHeightPercent={infoPanelHeight}
              onBottomHeightChange={setInfoPanelHeight}
              isBottomCollapsed={infoPanelCollapsed}
              onBottomCollapsedChange={setInfoPanelCollapsed}
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
