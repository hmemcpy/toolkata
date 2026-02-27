"use client"

import React from "react"
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
 */
export function NavigationWrapper({
  currentStep,
  totalSteps,
  toolPair,
  className = "",
}: NavigationWrapperProps) {
  const { isStepComplete, markComplete, setCurrentStep } = useStepProgress(toolPair, totalSteps)

  // Update current step when component mounts
  React.useEffect(() => {
    setCurrentStep(currentStep)
  }, [currentStep, setCurrentStep])

  const isCompleted = isStepComplete(currentStep)

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
