"use client"

import type { ReactNode } from "react"
import { useDirection } from "@/hooks/useDirection"

/**
 * Props for DirectionToggle component.
 */
export interface DirectionToggleProps {
  /**
   * The "from" tool label (e.g., "git" in jj-git pairing)
   */
  readonly fromTool: string
  /**
   * The "to" tool label (e.g., "jj" in jj-git pairing)
   */
  readonly toTool: string
  /**
   * Optional CSS class name for custom styling.
   */
  readonly className?: string
}

/**
 * DirectionToggle - Toggle button to swap comparison direction.
 *
 * Displays as `[git → jj]` and swaps to `[jj → git]` when clicked.
 * Terminal bracket style matching the design system.
 *
 * The toggle state persists in localStorage via PreferencesStore.
 * Uses role="switch" with aria-checked for accessibility.
 *
 * Features:
 * - Terminal bracket aesthetic `[X → Y]`
 * - Touch target >= 44px for mobile
 * - Keyboard: Enter/Space to toggle
 * - Screen reader: announces direction state changes
 * - Graceful degradation when localStorage unavailable
 *
 * @example
 * ```tsx
 * <DirectionToggle fromTool="git" toTool="jj" />
 * ```
 */
export function DirectionToggle({
  fromTool,
  toTool,
  className = "",
}: DirectionToggleProps): ReactNode {
  const { isReversed, toggleDirection, isLoading, isAvailable } = useDirection()

  // Determine display order based on direction
  const leftTool = isReversed ? toTool : fromTool
  const rightTool = isReversed ? fromTool : toTool

  // Accessible label describing current state and action
  const ariaLabel = isReversed
    ? `Direction: ${toTool} to ${fromTool}. Click to show ${fromTool} to ${toTool}.`
    : `Direction: ${fromTool} to ${toTool}. Click to show ${toTool} to ${fromTool}.`

  // During loading, show default direction to avoid hydration mismatch
  // The button is still interactive, it will just sync state after hydration
  const displayLeft = isLoading ? fromTool : leftTool
  const displayRight = isLoading ? toTool : rightTool

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isReversed}
      aria-label={ariaLabel}
      onClick={toggleDirection}
      disabled={!isAvailable && !isLoading}
      className={`
        inline-flex items-center justify-center
        min-h-[44px] min-w-[44px] px-3 py-2
        font-mono text-sm
        border border-[var(--color-border)]
        rounded
        bg-[var(--color-surface)]
        hover:bg-[var(--color-surface-hover)]
        focus:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
        transition-colors duration-[var(--transition-fast)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isAvailable ? undefined : "Preference storage unavailable"}
    >
      <span className="text-[var(--color-text-dim)]">[</span>
      <span
        className={`${
          isReversed
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-git,#f97316)]"
        }`}
      >
        {displayLeft}
      </span>
      <span className="mx-1 text-[var(--color-text-dim)]">→</span>
      <span
        className={`${
          isReversed
            ? "text-[var(--color-git,#f97316)]"
            : "text-[var(--color-accent)]"
        }`}
      >
        {displayRight}
      </span>
      <span className="text-[var(--color-text-dim)]">]</span>
    </button>
  )
}
