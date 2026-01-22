/**
 * DirectionToggle - Bidirectional comparison direction toggle button.
 *
 * Features:
 * - Terminal bracket style: [git ↔ jj]
 * - Consumes DirectionContext for state and toggle callback
 * - SSR-safe with isLoading state to prevent hydration mismatch
 * - Keyboard accessible (Enter/Space to toggle)
 * - Touch target >= 44px for mobile
 * - Proper ARIA attributes for screen readers
 *
 * @example
 * ```tsx
 * import { DirectionProvider } from "@/contexts/DirectionContext"
 * import { DirectionToggle } from "@/components/ui/DirectionToggle"
 *
 * // In parent component with DirectionProvider
 * <DirectionToggle />
 * ```
 */

"use client"

import { useDirectionContext } from "../../contexts/DirectionContext"

/**
 * DirectionToggle component.
 *
 * Renders a toggle button that switches between default (git→jj) and
 * reversed (jj→git) comparison direction. Uses terminal bracket style
 * matching the existing design system.
 *
 * Must be used within a DirectionProvider.
 */
export function DirectionToggle() {
  const { isReversed, isLoading, toggle, fromTool, toTool } =
    useDirectionContext()

  // Don't render during hydration to prevent flash of default content
  if (isLoading) {
    return (
      <span
        className="inline-block min-h-[44px] px-3 py-2 text-sm font-mono text-[var(--color-text-dim)]"
        aria-hidden="true"
      >
        {`[${fromTool} ↔ ${toTool}]`}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isReversed}
      aria-label={`Switch comparison direction between ${fromTool} and ${toTool}`}
      className={[
        "inline-flex min-h-[44px] cursor-pointer items-center",
        "border border-[var(--color-border)] bg-[var(--color-surface)]",
        "px-3 py-2 text-sm font-mono transition-colors",
        "hover:border-[var(--color-border-focus)] hover:bg-[var(--color-surface-hover)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        "active:bg-[var(--color-surface-hover)]",
      ].join(" ")}
    >
      <span
        className={[
          "font-mono",
          isReversed
            ? "text-[var(--color-accent-alt)]"
            : "text-[var(--color-text-muted)]",
        ].join(" ")}
      >
        {fromTool}
      </span>
      <span className="mx-2 text-[var(--color-text-dim)]">↔</span>
      <span
        className={[
          "font-mono",
          isReversed
            ? "text-[var(--color-text-muted)]"
            : "text-[var(--color-accent)]",
        ].join(" ")}
      >
        {toTool}
      </span>
    </button>
  )
}
