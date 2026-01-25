/**
 * DirectionContext - Provides direction preference state to all components.
 *
 * Features:
 * - Context for accessing direction without prop drilling
 * - Follows same pattern as TerminalContext
 * - Used by SideBySide, ScalaComparisonBlock, and GlossaryClient components
 * - Syncs with localStorage and re-renders when direction changes
 */

"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import type { DirectionPreference } from "../core/PreferencesStore"
import { getPreferencesStore } from "../core/PreferencesStore"

/**
 * Direction context value with state and actions
 */
export interface DirectionContextValue {
  readonly direction: DirectionPreference
  readonly isReversed: boolean
  readonly toggleDirection: () => void
  readonly setDirection: (direction: DirectionPreference) => void
}

/**
 * Create the context with a default value
 */
const DirectionContext = React.createContext<DirectionContextValue | null>(null)

/**
 * Props for DirectionProvider
 */
export interface DirectionProviderProps {
  readonly children: React.ReactNode
}

/**
 * DirectionProvider - Provides direction preference to child components.
 *
 * This provider manages direction state with localStorage persistence
 * and provides the direction state + actions to all child components.
 *
 * @example
 * ```tsx
 * <DirectionProvider>
 *   <App />
 * </DirectionProvider>
 * ```
 */
export function DirectionProvider({ children }: DirectionProviderProps) {
  const [direction, setDirectionState] = useState<DirectionPreference>("git-to-jj")
  const [isHydrated, setIsHydrated] = useState(false)

  const store = getPreferencesStore()

  // Sync from localStorage on mount (client-side only)
  useEffect(() => {
    const storedDirection = store.getDirection()
    setDirectionState(storedDirection)
    setIsHydrated(true)
  }, [store])

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

  const isReversed = direction === "jj-to-git"

  const value = useMemo<DirectionContextValue>(
    () => ({
      direction: isHydrated ? direction : "git-to-jj",
      isReversed: isHydrated ? isReversed : false,
      toggleDirection,
      setDirection,
    }),
    [direction, isHydrated, isReversed, toggleDirection, setDirection],
  )

  return <DirectionContext.Provider value={value}>{children}</DirectionContext.Provider>
}

/**
 * Hook to access the direction context
 *
 * @throws Error if used outside DirectionProvider
 *
 * @example
 * ```tsx
 * const { isReversed, direction } = useDirectionContext()
 * ```
 */
export function useDirectionContext(): DirectionContextValue {
  const context = React.useContext(DirectionContext)
  if (!context) {
    throw new Error("useDirectionContext must be used within DirectionProvider")
  }
  return context
}
