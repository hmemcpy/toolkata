"use client"

import { useCallback, useEffect, useState } from "react"
import type { ToolPairProgress } from "../core/ProgressStore"
import { getProgressStore } from "../core/ProgressStore"
import { updateProgressInCookieSync } from "../core/progress-cookie"

/**
 * Return type for useStepProgress hook
 */
export interface StepProgressState {
  readonly progress: ToolPairProgress | undefined
  readonly isLoading: boolean
  readonly isAvailable: boolean
  readonly completedCount: number
  readonly currentStep: number
  readonly isStepComplete: (step: number) => boolean
  readonly markComplete: (step: number) => void
  readonly setCurrentStep: (step: number) => void
  readonly resetProgress: () => void
}

/**
 * React hook for managing step progress
 *
 * Features:
 * - Hydrates progress from localStorage on mount
 * - Avoids SSR mismatch with isLoading state
 * - Provides memoized callbacks for progress operations
 * - Graceful degradation when localStorage unavailable
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @param totalSteps - Total number of steps for this pairing (for progress calc)
 */
export function useStepProgress(toolPair: string, _totalSteps?: number): StepProgressState {
  const [progress, setProgress] = useState<ToolPairProgress | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  const store = getProgressStore()

  // Load progress on mount (client-side only)
  useEffect(() => {
    setProgress(store.getProgress(toolPair))
    setIsLoading(false)
  }, [toolPair, store])

  // Sync progress to cookie whenever it changes
  const syncToCookie = useCallback(
    (newProgress: ToolPairProgress | undefined) => {
      if (newProgress) {
        updateProgressInCookieSync(toolPair, newProgress.completedSteps, newProgress.currentStep)
      }
    },
    [toolPair],
  )

  // Memoized callbacks
  const markComplete = useCallback(
    (step: number) => {
      store.markComplete(toolPair, step)
      const newProgress = store.getProgress(toolPair)
      setProgress(newProgress)
      syncToCookie(newProgress)
    },
    [store, toolPair, syncToCookie],
  )

  const setCurrentStep = useCallback(
    (step: number) => {
      store.setCurrentStep(toolPair, step)
      const newProgress = store.getProgress(toolPair)
      setProgress(newProgress)
      syncToCookie(newProgress)
    },
    [store, toolPair, syncToCookie],
  )

  const resetProgress = useCallback(() => {
    store.resetProgress(toolPair)
    setProgress(undefined)
    updateProgressInCookieSync(toolPair, [], 1)
  }, [store, toolPair])

  const isStepComplete = useCallback(
    (step: number) => {
      return progress?.completedSteps.includes(step) ?? false
    },
    [progress?.completedSteps],
  )

  const completedCount = progress?.completedSteps.length ?? 0
  const currentStep = progress?.currentStep ?? 1

  return {
    progress,
    isLoading,
    isAvailable: store.isAvailable(),
    completedCount,
    currentStep,
    isStepComplete,
    markComplete,
    setCurrentStep,
    resetProgress,
  }
}

/**
 * Convenience hook that also includes progress percentage
 *
 * @param toolPair - The tool pairing slug
 * @param totalSteps - Total number of steps (required for percentage)
 */
export function useStepProgressWithPercent(toolPair: string, totalSteps: number) {
  const base = useStepProgress(toolPair, totalSteps)
  const percent = totalSteps > 0 ? (base.completedCount / totalSteps) * 100 : 0

  return {
    ...base,
    percent,
    totalSteps,
  }
}
