/**
 * DirectionContext - Provides direction preference state to all components.
 *
 * Features:
 * - Context for accessing direction without prop drilling
 * - Follows same pattern as TerminalContext
 * - Used by SideBySide and GlossaryClient components
 */

"use client"

import React from "react"
import type { DirectionPreference } from "../core/PreferencesStore"
import { getPreferencesStore } from "../core/PreferencesStore"

/**
 * Direction context state
 */
export interface DirectionContextState {
  readonly direction: DirectionPreference
  readonly isReversed: boolean
}

/**
 * Direction context value (read-only)
 */
export type DirectionContextValue = DirectionContextState

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
 * This provider reads from localStorage and provides the direction state
 * to all child components via context.
 *
 * @example
 * ```tsx
 * <DirectionProvider>
 *   <App />
 * </DirectionProvider>
 * ```
 */
export function DirectionProvider({ children }: DirectionProviderProps) {
  // Read direction from localStorage
  const store = getPreferencesStore()
  const direction = store.getDirection()
  const isReversed = direction === "jj-to-git"

  const value: DirectionContextValue = {
    direction,
    isReversed,
  }

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
