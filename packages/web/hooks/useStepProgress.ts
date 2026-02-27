"use client"

import { useCallback, useEffect, useState } from "react"
import type { ToolPairProgress } from "../core/ProgressStore"
import { getProgressStore } from "../core/ProgressStore"

/**
 * Return type for useStepProgress hook
 */
export interface StepProgressState {
  readonly progress: ToolPairProgress | undefined
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
 * - Provides memoized callbacks for progress operations
 * - Graceful degradation when localStorage unavailable
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @param totalSteps - Total number of steps for this pairing (for progress calc)
 */
export function useStepProgress(toolPair: string, _totalSteps?: number): StepProgressState {
  const store = getProgressStore()
  const [progress, setProgress] = useState<ToolPairProgress | undefined>(() =>
    store.getProgress(toolPair),
  )

  // Sync from localStorage on mount.
  useEffect(() => {
    const storedProgress = store.getProgress(toolPair)
    if (storedProgress) {
      setProgress(storedProgress)
    }
  }, [toolPair, store])

  // Memoized callbacks
  const markComplete = useCallback(
    (step: number) => {
      store.markComplete(toolPair, step)
      const newProgress = store.getProgress(toolPair)
      setProgress(newProgress)
    },
    [store, toolPair],
  )

  const setCurrentStep = useCallback(
    (step: number) => {
      store.setCurrentStep(toolPair, step)
      const newProgress = store.getProgress(toolPair)
      setProgress(newProgress)
    },
    [store, toolPair],
  )

  const resetProgress = useCallback(() => {
    store.resetProgress(toolPair)
    setProgress(undefined)
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
