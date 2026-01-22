"use client"

import { useStepProgress } from "../../hooks/useStepProgress"
import { StepProgress } from "./StepProgress"

export interface StepProgressWrapperProps {
  readonly currentStep: number
  readonly totalSteps: number
  readonly title: string
  readonly toolPair: string
  readonly overviewHref?: string
  readonly nextHref?: string | null
  readonly showKeyboardHints?: boolean
  readonly className?: string
}

/**
 * Client-side wrapper for StepProgress that integrates with progress tracking.
 *
 * This component:
 * - Uses useStepProgress hook to check step completion status
 * - Displays ✓ icon in header when step is completed
 * - Tracks current step when page loads
 */
export function StepProgressWrapper({
  currentStep,
  totalSteps,
  title,
  toolPair,
  overviewHref,
  nextHref,
  showKeyboardHints,
  className = "",
}: StepProgressWrapperProps) {
  const { isStepComplete, setCurrentStep } = useStepProgress(toolPair, totalSteps)

  // Update current step when component mounts
  // This tracks which step the user is currently viewing
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    setCurrentStep(currentStep)
  }, [currentStep, setCurrentStep])

  const isCompleted = isStepComplete(currentStep)

  return (
    <StepProgress
      currentStep={currentStep}
      totalSteps={totalSteps}
      title={title}
      toolPair={toolPair}
      overviewHref={overviewHref ?? `/${toolPair}`}
      nextHref={nextHref ?? null}
      showKeyboardHints={showKeyboardHints ?? true}
      isCompleted={isCompleted}
      className={className}
    />
  )
}

// Import React for useEffect
import React from "react"
