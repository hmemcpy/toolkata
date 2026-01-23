"use client"

import type { ToolPairing } from "../../content/pairings"
import { useStepProgress } from "../../hooks/useStepProgress"
import { LessonCard } from "./LessonCard"

export interface LessonCardWrapperProps {
  readonly pairing: ToolPairing
  readonly className?: string
}

/**
 * Client-side wrapper for LessonCard that hydrates progress from localStorage.
 *
 * This component uses the useStepProgress hook to load progress data and passes
 * it to the server-side LessonCard component. The separation allows the home
 * page to remain a server component while still displaying client-side progress.
 */
export function LessonCardWrapper({ pairing, className = "" }: LessonCardWrapperProps) {
  const { completedCount, currentStep, isLoading } = useStepProgress(pairing.slug, pairing.steps)

  // During SSR/hydration, show default state (no progress)
  // This prevents hydration mismatch
  if (isLoading) {
    return <LessonCard pairing={pairing} className={className} />
  }

  return (
    <LessonCard
      pairing={pairing}
      completedSteps={completedCount}
      currentStep={currentStep}
      className={className}
    />
  )
}
