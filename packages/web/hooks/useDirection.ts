"use client"

import { useCallback, useEffect, useState } from "react"
import type { Direction } from "@/core/PreferencesStore"
import { getPreferencesStore } from "@/core/PreferencesStore"

/**
 * Return type for useDirection hook
 */
export interface DirectionState {
  /**
   * Current direction preference ("default" or "reversed")
   */
  readonly direction: Direction
  /**
   * Whether the direction is reversed (convenience boolean)
   */
  readonly isReversed: boolean
  /**
   * Whether localStorage is available for persistence
   */
  readonly isAvailable: boolean
  /**
   * Whether the hook is still loading from localStorage
   */
  readonly isLoading: boolean
  /**
   * Set direction to a specific value
   */
  readonly setDirection: (direction: Direction) => void
  /**
   * Toggle between default and reversed
   */
  readonly toggleDirection: () => void
}

/**
 * React hook for managing direction preference
 *
 * Direction controls which tool appears on the left vs right in comparisons:
 * - "default": First tool on left (e.g., git→jj for jj-git pairing)
 * - "reversed": Second tool on left (e.g., jj→git for jj-git pairing)
 *
 * Features:
 * - Hydrates direction from localStorage on mount
 * - Persists changes to localStorage
 * - Graceful degradation when localStorage unavailable
 * - Re-renders component when direction changes
 *
 * Note: This is distinct from GitToggle in kata mode, which shows/hides
 * the git column entirely for immersive learning. Direction toggle
 * swaps which tool appears on which side in comparisons.
 *
 * @example
 * ```tsx
 * function SideBySideComparison() {
 *   const { direction, isReversed, toggleDirection } = useDirection()
 *
 *   return (
 *     <div>
 *       <button onClick={toggleDirection}>
 *         {isReversed ? "jj → git" : "git → jj"}
 *       </button>
 *       <div className="flex">
 *         {isReversed ? (
 *           <>
 *             <div>{jjCode}</div>
 *             <div>{gitCode}</div>
 *           </>
 *         ) : (
 *           <>
 *             <div>{gitCode}</div>
 *             <div>{jjCode}</div>
 *           </>
 *         )}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useDirection(): DirectionState {
  const store = getPreferencesStore()

  // Start with default to avoid hydration mismatch, then sync from localStorage
  const [direction, setDirectionState] = useState<Direction>("default")
  const [isLoading, setIsLoading] = useState(true)

  // Sync from localStorage on mount (client-side only)
  useEffect(() => {
    const storedDirection = store.getDirection()
    setDirectionState(storedDirection)
    setIsLoading(false)
  }, [store])

  // Listen for storage events from other tabs/windows
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === "toolkata_preferences") {
        const storedDirection = store.getDirection()
        setDirectionState(storedDirection)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [store])

  const setDirection = useCallback(
    (newDirection: Direction) => {
      store.setDirection(newDirection)
      setDirectionState(newDirection)
    },
    [store],
  )

  const toggleDirection = useCallback(() => {
    const newDirection = store.toggleDirection()
    setDirectionState(newDirection)
  }, [store])

  return {
    direction,
    isReversed: direction === "reversed",
    isAvailable: store.isAvailable(),
    isLoading,
    setDirection,
    toggleDirection,
  }
}
