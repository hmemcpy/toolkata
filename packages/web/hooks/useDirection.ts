"use client"

import { useCallback, useEffect, useState } from "react"
import type { DirectionPreference } from "../core/PreferencesStore"
import { getPreferencesStore } from "../core/PreferencesStore"

/**
 * Return type for useDirection hook
 */
export interface DirectionState {
  readonly direction: DirectionPreference
  readonly isReversed: boolean
  readonly isAvailable: boolean
  readonly setDirection: (direction: DirectionPreference) => void
  readonly toggleDirection: () => void
  readonly resetToDefault: () => void
}

/**
 * React hook for managing direction preference
 *
 * Features:
 * - Hydrates direction from localStorage on mount
 * - Provides memoized callbacks for direction operations
 * - Graceful degradation when localStorage unavailable
 *
 * @example
 * ```tsx
 * const { direction, isReversed, toggleDirection } = useDirection()
 *
 * return (
 *   <button onClick={toggleDirection}>
 *     {isReversed ? "[jj ↔ git]" : "[git ↔ jj]"}
 *   </button>
 * )
 * ```
 */
export function useDirection(): DirectionState {
  const [direction, setDirectionState] = useState<DirectionPreference>("git-to-jj")
  const [isHydrated, setIsHydrated] = useState(false)

  const store = getPreferencesStore()

  // Sync from localStorage on mount (client-side only)
  useEffect(() => {
    const storedDirection = store.getDirection()
    setDirectionState(storedDirection)
    setIsHydrated(true)
  }, [store])

  // Memoized callbacks
  const setDirection = useCallback(
    (newDirection: DirectionPreference) => {
      store.setDirection(newDirection)
      setDirectionState(newDirection)
    },
    [store],
  )

  const toggleDirection = useCallback(() => {
    const newDirection = store.toggleDirection()
    setDirectionState(newDirection)
  }, [store])

  const resetToDefault = useCallback(() => {
    store.setDirection("git-to-jj")
    setDirectionState("git-to-jj")
  }, [store])

  const isReversed = direction === "jj-to-git"

  return {
    direction: isHydrated ? direction : "git-to-jj", // Default to avoid hydration mismatch
    isReversed: isHydrated ? isReversed : false,
    isAvailable: store.isAvailable(),
    setDirection,
    toggleDirection,
    resetToDefault,
  }
}
