"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { DirectionState } from "../hooks/useDirection"
import { useDirection } from "../hooks/useDirection"

/**
 * DirectionContext - React Context for bidirectional comparison direction
 *
 * Provides direction state to all nested components without prop drilling.
 * Wraps the useDirection hook in a React Context for convenient access.
 *
 * Features:
 * - SSR-safe (no hydration mismatch)
 * - Memoized callbacks to prevent unnecessary re-renders
 * - Type-safe access with helpful error when used outside provider
 * - Direction state: isReversed, isLoading, toggle, fromTool, toTool
 *
 * @example
 * ```tsx
 * // In a layout or parent component
 * import { DirectionProvider } from "@/contexts/DirectionContext"
 *
 * export default function Layout({ children, params }) {
 *   return (
 *     <DirectionProvider toolPair={params.toolPair}>
 *       {children}
 *     </DirectionProvider>
 *   )
 * }
 *
 * // In any nested component
 * import { useDirectionContext } from "@/contexts/DirectionContext"
 *
 * export function MyComponent() {
 *   const { isReversed, toggle, fromTool, toTool } = useDirectionContext()
 *
 *   return (
 *     <button onClick={toggle} aria-checked={isReversed} role="switch">
 *       {fromTool} ↔ {toTool}
 *     </button>
 *   )
 * }
 * ```
 */

interface DirectionContextValue {
  readonly state: DirectionState
}

const DirectionContext = createContext<DirectionContextValue | null>(null)

/**
 * Provider props
 */
export interface DirectionProviderProps {
  readonly toolPair: string
  readonly children: ReactNode
}

/**
 * DirectionProvider - Provides direction state to all children
 *
 * Must be rendered with a toolPair prop. Wraps children with
 * a context that provides direction state from useDirection hook.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @param children - React children to receive direction context
 */
export function DirectionProvider({ toolPair, children }: DirectionProviderProps) {
  const state = useDirection(toolPair)

  return (
    <DirectionContext.Provider value={{ state }}>
      {children}
    </DirectionContext.Provider>
  )
}

/**
 * useDirectionContext - Access direction state from context
 *
 * Throws a helpful error if used outside DirectionProvider.
 *
 * @returns DirectionState with isReversed, isLoading, toggle, fromTool, toTool
 * @throws Error if used outside DirectionProvider
 */
export function useDirectionContext(): DirectionState {
  const context = useContext(DirectionContext)

  if (!context) {
    throw new Error(
      "useDirectionContext must be used within a DirectionProvider. " +
        "Wrap your component tree with <DirectionProvider toolPair={toolPair}>.",
    )
  }

  return context.state
}
