"use client"

import { useStepProgress } from "../../hooks/useStepProgress"
import { Navigation } from "./Navigation"

export interface NavigationWrapperProps {
  readonly currentStep: number
  readonly totalSteps: number
  readonly toolPair: string
  readonly className?: string
}

/**
 * Client-side wrapper for Navigation that integrates with progress tracking.
 *
 * This component:
 * - Uses useStepProgress hook to manage step completion
 * - Auto-marks current step complete when user clicks "Next" or "Mark Complete"
 * - Updates current step in progress when page loads
 * - Shows completion state in the Navigation component
 */
export function NavigationWrapper({
  currentStep,
  totalSteps,
  toolPair,
  className = "",
}: NavigationWrapperProps) {
  const { isStepComplete, markComplete, setCurrentStep } = useStepProgress(toolPair, totalSteps)

  // Update current step when component mounts
  // This tracks which step the user is currently viewing
  if (currentStep !== undefined) {
    // Use useEffect to avoid setState during render
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      setCurrentStep(currentStep)
    }, [currentStep, setCurrentStep])
  }

  const isCompleted = isStepComplete(currentStep)

  // Handle completion button click
  const handleComplete = () => {
    markComplete(currentStep)
  }

  return (
    <Navigation
      currentStep={currentStep}
      totalSteps={totalSteps}
      toolPair={toolPair}
      onComplete={handleComplete}
      isCompleted={isCompleted}
      className={className}
    />
  )
}

// Import React for useEffect
import React from "react"
