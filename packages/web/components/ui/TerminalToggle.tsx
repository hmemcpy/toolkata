/**
 * TerminalToggle - Floating action button (FAB) to toggle the terminal sidebar/bottom sheet.
 *
 * A fixed button in the bottom-right corner that opens the terminal.
 * Shows a connection indicator dot when the terminal is connected.
 * Hidden when the sidebar is open on desktop (visible on all viewports otherwise).
 *
 * Features:
 * - 56px touch target (≥44px requirement for accessibility)
 * - Connection indicator dot (green when CONNECTED, gray otherwise)
 * - Hidden when sidebar is open (desktop)
 * - Visible on all viewports
 * - Keyboard: Enter/Space to toggle
 *
 * @example
 * ```tsx
 * import { TerminalToggle } from "@/components/ui/TerminalToggle"
 *
 * export function Layout() {
 *   return <TerminalToggle />
 * }
 * ```
 */

"use client"

import type { ReactNode } from "react"
import { useTerminalContext } from "../../contexts/TerminalContext"

/**
 * Props for TerminalToggle component.
 */
export interface TerminalToggleProps {
  /**
   * Optional CSS class name for custom styling.
   */
  readonly className?: string
}

/**
 * TerminalToggle component.
 *
 * Renders a floating action button in the bottom-right corner.
 * Toggles the terminal sidebar/bottom sheet when clicked.
 */
export function TerminalToggle({ className = "" }: TerminalToggleProps): ReactNode {
  const { state, isOpen, toggleSidebar } = useTerminalContext()

  // Hide on desktop when sidebar is open
  if (isOpen) {
    return null
  }

  // Connection indicator color
  const getIndicatorColor = () => {
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

  // Button label with connection status
  const getButtonLabel = (): string => {
    let statusText: string
    switch (state) {
      case "IDLE":
        statusText = "Open terminal"
        break
      case "CONNECTING":
        statusText = "Terminal connecting..."
        break
      case "CONNECTED":
        statusText = "Terminal connected"
        break
      case "TIMEOUT_WARNING":
        statusText = "Terminal expires soon"
        break
      case "EXPIRED":
        statusText = "Terminal expired"
        break
      case "ERROR":
        statusText = "Terminal error"
        break
      default:
        // Handle STATIC state which exists in the union
        statusText = "Terminal"
        break
    }

    return `${statusText} (Press T to toggle)`
  }

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={`
        fixed bottom-6 right-6 z-[var(--toggle-z-index)]
        flex h-14 w-14 items-center justify-center
        rounded-full
        bg-[var(--color-surface)]
        border border-[var(--color-border)]
        shadow-lg
        transition-all duration-[var(--transition-normal)]
        hover:bg-[var(--color-surface-hover)]
        hover:scale-105
        focus:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
        active:scale-95
        ${className}
      `}
      aria-label={getButtonLabel()}
      aria-controls="terminal-sidebar"
      aria-expanded={isOpen}
    >
      {/* Terminal icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 text-[var(--color-text)]"
        aria-hidden="true"
      >
        <title>Terminal</title>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>

      {/* Connection indicator dot */}
      <div
        className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-surface)] ${getIndicatorColor()} ${
          state === "CONNECTING" ? "animate-pulse" : ""
        }`}
        aria-hidden="true"
      />

      {/* Keyboard shortcut hint (visible on focus) */}
      <span className="sr-only group-focus/sr-only:not-sr-only">
        Press T to toggle
      </span>
    </button>
  )
}
