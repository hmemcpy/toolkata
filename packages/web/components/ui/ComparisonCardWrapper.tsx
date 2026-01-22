"use client"

import type { ToolPairing } from "../../content/pairings"
import { useStepProgress } from "../../hooks/useStepProgress"
import { ComparisonCard } from "./ComparisonCard"

export interface ComparisonCardWrapperProps {
  readonly pairing: ToolPairing
  readonly className?: string
}

/**
 * Client-side wrapper for ComparisonCard that hydrates progress from localStorage.
 *
 * This component uses the useStepProgress hook to load progress data and passes
 * it to the server-side ComparisonCard component. The separation allows the home
 * page to remain a server component while still displaying client-side progress.
 */
export function ComparisonCardWrapper({ pairing, className = "" }: ComparisonCardWrapperProps) {
  const { completedCount, currentStep, isLoading } = useStepProgress(pairing.slug, pairing.steps)

  // During SSR/hydration, show default state (no progress)
  // This prevents hydration mismatch
  if (isLoading) {
    return <ComparisonCard pairing={pairing} className={className} />
  }

  return (
    <ComparisonCard
      pairing={pairing}
      completedSteps={completedCount}
      currentStep={currentStep}
      className={className}
    />
  )
}
