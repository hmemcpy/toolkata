/**
 * SideBySideWithDirection - Direction-aware SideBySide wrapper
 *
 * This is a client component wrapper that consumes direction context
 * and passes the isReversed prop to the SideBySide component.
 *
 * Features:
 * - Consumes useDirectionContext for direction state
 * - Handles isLoading to prevent SSR hydration mismatch
 * - Passes all props through to SideBySide component
 * - Renders default direction during hydration
 *
 * @example
 * ```tsx
 * import { SideBySideWithDirection } from "@/components/ui/SideBySideWithDirection"
 *
 * <SideBySideWithDirection
 *   fromCommands={["git add .", "git commit -m 'message'"]}
 *   toCommands={["jj describe -m 'message'", "jj new"]}
 *   fromLabel="git"
 *   toLabel="jj"
 * />
 * ```
 */

"use client"

import type { JSX } from "react"
import { useDirectionContext } from "../../contexts/DirectionContext"
import { SideBySide } from "./SideBySide"

/**
 * Props for SideBySideWithDirection component.
 * Matches the internal SideBySideProps interface.
 */
export interface SideBySideWithDirectionProps {
  readonly fromCommands: readonly string[]
  readonly toCommands: readonly string[]
  readonly fromLabel?: string
  readonly toLabel?: string
  readonly fromComments?: readonly string[]
  readonly toComments?: readonly string[]
}

/**
 * SideBySideWithDirection component
 *
 * Wraps SideBySide with direction context consumption.
 * This allows the SideBySide component to respond to bidirectional
 * comparison direction without prop drilling through intermediate
 * components.
 *
 * During SSR/hydration (isLoading=true), renders with default direction
 * to prevent hydration mismatch. After hydration, swaps columns if
 * isReversed=true.
 */
export function SideBySideWithDirection(props: SideBySideWithDirectionProps): JSX.Element {
  const { isReversed, isLoading } = useDirectionContext()

  // During SSR/hydration, use default direction to prevent mismatch
  // After hydration, use the actual direction preference
  const effectiveIsReversed = isLoading ? false : isReversed

  return <SideBySide {...props} isReversed={effectiveIsReversed} />
}
