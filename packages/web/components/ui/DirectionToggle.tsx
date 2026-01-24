/**
 * DirectionToggle - Toggle switch for bidirectional command comparison.
 *
 * Features:
 * - Client-side component for interactive direction switching
 * - Terminal bracket style: [git ↔ jj]
 * - Accessibility: role="switch", aria-checked, keyboard support
 * - Touch target >= 44px for mobile
 * - Displays reversed state: [jj ↔ git]
 *
 * @example
 * ```tsx
 * import { DirectionToggle } from "@/components/ui/DirectionToggle"
 *
 * <DirectionToggle />
 * ```
 */

"use client"

import type React from "react"
import { useDirection } from "../../hooks/useDirection"

/**
 * DirectionToggle component.
 *
 * Renders a toggle switch in terminal bracket style that allows
 * switching between git→jj and jj→git comparison direction.
 */
export function DirectionToggle(): React.JSX.Element {
  const { direction, isReversed, toggleDirection } = useDirection()

  const handleClick = () => {
    toggleDirection()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Space and Enter to toggle
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      toggleDirection()
    }
  }

  // Terminal bracket style with direction indicator
  // git→jj shows: [git ↔ jj]
  // jj→git shows: [jj ↔ git]
  const label = isReversed ? "[jj ↔ git]" : "[git ↔ jj]"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isReversed}
      aria-label={`Toggle direction: currently ${direction}. Click to switch to ${isReversed ? "git to jj" : "jj to git"}.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        "px-3 py-2 text-sm font-mono border border-[var(--color-border)] rounded-md",
        "text-[var(--color-text)] bg-[var(--color-surface)]",
        "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-focus)]",
        "focus:outline-none focus-visible:ring-[var(--focus-ring)] focus:border-[var(--color-accent)]",
        "transition-colors duration-[var(--transition-fast)]",
        "min-h-[44px]", // Touch target
        "inline-flex items-center justify-center",
      ].join(" ")}
    >
      {label}
    </button>
  )
}
