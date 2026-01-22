/**
 * StepProgressWithDirection - Direction-aware step progress header wrapper
 *
 * This is a client component wrapper that combines:
 * - DirectionProvider: Provides direction context to children
 * - DirectionToggle: The toggle button for switching comparison direction
 * - StepProgress: The presentational header component
 *
 * Features:
 * - SSR-safe with DirectionProvider handling hydration
 * - Provides direction state to all nested components
 * - Renders DirectionToggle in the center section next to title
 * - Passes all props through to StepProgress component
 *
 * @example
 * ```tsx
 * import { StepProgressWithDirection } from "@/components/ui/StepProgressWithDirection"
 *
 * <StepProgressWithDirection
 *   toolPair="jj-git"
 *   currentStep={3}
 *   totalSteps={12}
 *   title="Your First Commits"
 *   previousHref="/jj-git/2"
 *   nextHref="/jj-git/4"
 * />
 * ```
 */

"use client"

import type { JSX } from "react"
import { DirectionProvider } from "../../contexts/DirectionContext"
import { DirectionToggle } from "./DirectionToggle"
import { StepProgress, type StepProgressProps } from "./StepProgress"

export interface StepProgressWithDirectionProps extends StepProgressProps {}

/**
 * StepProgressWithDirection component
 *
 * Wraps StepProgress with DirectionProvider and DirectionToggle.
 * This allows the step header to display and control the bidirectional
 * comparison direction without prop drilling through intermediate
 * components.
 *
 * The DirectionProvider wraps the entire component, making direction
 * state available to any nested components that might need it.
 */
export function StepProgressWithDirection(props: StepProgressWithDirectionProps): JSX.Element {
  const { toolPair, ...stepProgressProps } = props

  return (
    <DirectionProvider toolPair={toolPair}>
      <StepProgress
        {...stepProgressProps}
        toolPair={toolPair}
        directionToggle={<DirectionToggle />}
      />
    </DirectionProvider>
  )
}
