"use client"

import { useCallback, useEffect, useState } from "react"
import type { Direction } from "../core/PreferencesStore"
import { getPreferencesStore } from "../core/PreferencesStore"
import { getPairing } from "../content/pairings"

/**
 * Return type for useDirection hook
 */
export interface DirectionState {
  readonly isReversed: boolean
  readonly isLoading: boolean
  readonly isAvailable: boolean
  readonly toggle: () => void
  readonly fromTool: string
  readonly toTool: string
}

/**
 * React hook for managing bidirectional comparison direction
 *
 * Features:
 * - Hydrates direction preference from localStorage on mount
 * - Avoids SSR mismatch with isLoading state
 * - Provides memoized toggle callback
 * - Computes fromTool/toTool names based on toolPair + direction
 * - Graceful degradation when localStorage unavailable
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 *
 * @example
 * ```tsx
 * const { isReversed, isLoading, toggle, fromTool, toTool } = useDirection("jj-git")
 * // isReversed: false (default: git → jj)
 * // fromTool: "git", toTool: "jj"
 *
 * toggle()
 * // isReversed: true (reversed: jj → git)
 * // fromTool: "jj", toTool: "git"
 * ```
 */
export function useDirection(toolPair: string): DirectionState {
  const [direction, setDirection] = useState<Direction>("default")
  const [isLoading, setIsLoading] = useState(true)

  const store = getPreferencesStore()
  const pairing = getPairing(toolPair)

  // Load direction preference on mount (client-side only)
  useEffect(() => {
    setDirection(store.getDirection())
    setIsLoading(false)
  }, [store])

  // Memoized toggle callback
  const toggle = useCallback(() => {
    store.toggleDirection()
    setDirection(store.getDirection())
  }, [store])

  // Compute fromTool/toTool based on direction
  // When reversed, swap the tools
  const isReversed = direction === "reversed"
  const fromTool = isReversed ? (pairing?.to.name ?? "") : (pairing?.from.name ?? "")
  const toTool = isReversed ? (pairing?.from.name ?? "") : (pairing?.to.name ?? "")

  return {
    isReversed,
    isLoading,
    isAvailable: store.isAvailable(),
    toggle,
    fromTool,
    toTool,
  }
}
