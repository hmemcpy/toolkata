/**
 * MobileBottomSheet - Bottom sheet for mobile viewports containing the interactive terminal.
 *
 * A bottom sheet UI for viewports < 1024px (lg breakpoint) that slides up from
 * the bottom of the screen. Provides drag handle for visual affordance and
 * swipe-to-close gesture.
 *
 * Features:
 * - ~60% viewport height, max 600px
 * - Drag handle at top (24px, visual affordance)
 * - Swipe-to-close gesture (100px threshold)
 * - Same content as desktop sidebar (terminal, footer)
 * - Focus trap when open
 * - Touch gesture detection for swipe down to close
 *
 * @example
 * ```tsx
 * import { MobileBottomSheet } from "@/components/ui/MobileBottomSheet"
 * import { useTerminalContext } from "@/contexts/TerminalContext"
 *
 * export function Layout() {
 *   const { isOpen } = useTerminalContext()
 *   return <MobileBottomSheet isOpen={isOpen} toolPair="jj-git" />
 * }
 * ```
 */

"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { useTerminalContext } from "../../contexts/TerminalContext"

/**
 * Lazy-load InteractiveTerminal to reduce initial bundle size.
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
 * Props for MobileBottomSheet component.
 */
export interface MobileBottomSheetProps {
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
 * Swipe threshold in pixels to close the bottom sheet.
 */
const SWIPE_THRESHOLD = 100

/**
 * MobileBottomSheet component.
 *
 * Renders a bottom sheet for mobile viewports (< lg breakpoint, 1024px).
 * Slides up from bottom, includes drag handle and swipe-to-close gesture.
 */
export function MobileBottomSheet({ toolPair }: MobileBottomSheetProps): ReactNode {
  const { isOpen, closeSidebar, state, sessionTimeRemaining } = useTerminalContext()
  const sheetRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

  // Set inert on page content when sheet is open (focus trap)
  useEffect(() => {
    const pageContent = document.getElementById("main-content")
    if (!pageContent) return

    if (isOpen) {
      pageContent.setAttribute("inert", "")
    } else {
      pageContent.removeAttribute("inert")
    }

    return () => {
      pageContent.removeAttribute("inert")
    }
  }, [isOpen])

  // Handle Escape key to close sheet
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

  // Touch gesture handlers for swipe-to-close
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0]
    if (touch) {
      setStartY(touch.clientY)
      setIsDragging(true)
      setCurrentY(0)
    }
  }, [])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isDragging) return

    const touch = event.touches[0]
    if (touch) {
      const deltaY = touch.clientY - startY

      // Only track downward swipes
      if (deltaY > 0) {
        setCurrentY(deltaY)
        event.preventDefault()
      }
    }
  }, [isDragging, startY])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    if (currentY > SWIPE_THRESHOLD) {
      closeSidebar()
    }

    setIsDragging(false)
    setCurrentY(0)
  }, [isDragging, currentY, closeSidebar])

  // Don't render if closed (mobile only - handled by CSS media query)
  if (!isOpen) {
    return null
  }

  // Calculate transform based on drag
  const transform = currentY > 0 ? `translateY(${currentY}px)` : "translateY(0)"
  const opacity = currentY > 0 ? 1 - currentY / 300 : 1

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-[var(--sidebar-z-index)] max-h-[60vh] min-h-[300px] w-auto rounded-t-xl border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-transform duration-[var(--transition-sidebar)] ease-in-out max-lg:translate-y-0 lg:hidden"
      id="terminal-bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Terminal"
      style={{
        transform,
        opacity,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex h-full flex-col">
        {/* Drag Handle */}
        <div
          ref={handleRef}
          className="flex cursor-grab touch-none items-center justify-center border-b border-[var(--color-border)] px-4 py-3 active:cursor-grabbing"
          aria-hidden="true"
        >
          <div className="h-1 w-12 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">Terminal</span>
            <StatusIndicator />
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded p-1 text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
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
          <InteractiveTerminal toolPair={toolPair} stepId="mobile" />
        </div>

        {/* Footer */}
        {state === "CONNECTED" || state === "TIMEOUT_WARNING" ? (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
            <button
              type="button"
              onClick={() => {
                // Trigger reset via context or direct call
                // For now, the reset button inside InteractiveTerminal handles this
              }}
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

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--backdrop-z-index)] bg-black/50 transition-opacity duration-[var(--transition-sidebar)]"
        onClick={closeSidebar}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            closeSidebar()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close terminal"
      />
    </div>
  )
}
