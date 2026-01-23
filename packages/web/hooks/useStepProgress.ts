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
 * Options for useStepProgress hook
 */
export interface UseStepProgressOptions {
  /**
   * Initial progress from server-side cookie reading.
   * When provided, eliminates hydration flicker by starting with correct state.
   */
  readonly initialProgress?:
    | {
        readonly completedSteps: readonly number[]
        readonly currentStep: number
      }
    | undefined
}

/**
 * React hook for managing step progress
 *
 * Features:
 * - Accepts initial progress from server to prevent hydration flicker
 * - Hydrates progress from localStorage on mount
 * - Syncs progress to cookie for SSR
 * - Provides memoized callbacks for progress operations
 * - Graceful degradation when localStorage unavailable
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git")
 * @param totalSteps - Total number of steps for this pairing (for progress calc)
 * @param options - Optional configuration including initialProgress from server
 */
export function useStepProgress(
  toolPair: string,
  _totalSteps?: number,
  options?: UseStepProgressOptions,
): StepProgressState {
  // Initialize with server-provided progress to prevent hydration flicker
  const initialProgress: ToolPairProgress | undefined = options?.initialProgress
    ? {
        completedSteps: [...options.initialProgress.completedSteps],
        currentStep: options.initialProgress.currentStep,
        lastVisited: new Date().toISOString(),
      }
    : undefined

  const [progress, setProgress] = useState<ToolPairProgress | undefined>(initialProgress)
  // When we have initial progress from server, no loading needed
  const [isLoading, setIsLoading] = useState(options?.initialProgress === undefined)

  const store = getProgressStore()

  // Sync from localStorage on mount (client-side only)
  // This handles the case where localStorage has a different value than the cookie
  useEffect(() => {
    const storedProgress = store.getProgress(toolPair)
    if (storedProgress) {
      setProgress(storedProgress)
      // Sync cookie with localStorage value
      updateProgressInCookieSync(
        toolPair,
        storedProgress.completedSteps,
        storedProgress.currentStep,
      )
    }
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
 * @param options - Optional configuration including initialProgress from server
 */
export function useStepProgressWithPercent(
  toolPair: string,
  totalSteps: number,
  options?: UseStepProgressOptions,
) {
  const base = useStepProgress(toolPair, totalSteps, options)
  const percent = totalSteps > 0 ? (base.completedCount / totalSteps) * 100 : 0

  return {
    ...base,
    percent,
    totalSteps,
  }
}
