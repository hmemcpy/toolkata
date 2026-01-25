/**
 * DirectionToggle - Toggle switch for bidirectional command comparison.
 *
 * Features:
 * - Client-side component for interactive direction switching
 * - Terminal bracket style: [from ↔ to]
 * - Dynamic labels based on tool pair (e.g., [git ↔ jj] or [ZIO ↔ Cats Effect])
 * - Accessibility: role="switch", aria-checked, keyboard support
 * - Touch target >= 44px for mobile
 * - Displays reversed state: [to ↔ from]
 *
 * @example
 * ```tsx
 * import { DirectionToggle } from "@/components/ui/DirectionToggle"
 *
 * <DirectionToggle toolPair="jj-git" />
 * <DirectionToggle toolPair="cats-zio" />
 * ```
 */

"use client"

import type React from "react"
import { useDirection } from "../../hooks/useDirection"
import { getPairing } from "../../content/pairings"

/**
 * Props for DirectionToggle component.
 */
export interface DirectionToggleProps {
  /**
   * The tool pairing slug (e.g., "jj-git", "cats-zio").
   * Used to determine the from/to tool names.
   */
  readonly toolPair: string
}

/**
 * DirectionToggle component.
 *
 * Renders a toggle switch in terminal bracket style that allows
 * switching between from→to and to→from comparison direction.
 */
export function DirectionToggle({ toolPair }: DirectionToggleProps): React.JSX.Element {
  const { isReversed, toggleDirection } = useDirection()
  const pairing = getPairing(toolPair)

  // Get tool names from pairing, fallback to generic names
  const fromName = pairing?.from.name ?? "from"
  const toName = pairing?.to.name ?? "to"

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
  // Normal: [from ↔ to] (e.g., [git ↔ jj] or [ZIO ↔ Cats Effect])
  // Reversed: [to ↔ from]
  const label = isReversed ? `[${toName} ↔ ${fromName}]` : `[${fromName} ↔ ${toName}]`
  const currentDirection = isReversed ? `${toName} to ${fromName}` : `${fromName} to ${toName}`
  const nextDirection = isReversed ? `${fromName} to ${toName}` : `${toName} to ${fromName}`

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isReversed}
      aria-label={`Toggle direction: currently ${currentDirection}. Click to switch to ${nextDirection}.`}
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
