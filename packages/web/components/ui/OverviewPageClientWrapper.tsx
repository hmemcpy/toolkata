"use client"

import Link from "next/link"
import { useStepProgress } from "../../hooks/useStepProgress"
import { useKataProgress } from "../../contexts/KataProgressContext"
import type { StepMeta } from "../../services/content"
import { StepList } from "./StepList"

/**
 * Props for OverviewPageClientWrapper component
 */
export interface OverviewPageClientWrapperProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Total number of steps for this pairing.
   */
  readonly totalSteps: number

  /**
   * Array of step metadata.
   */
  readonly steps: readonly StepMeta[]

  /**
   * Estimated time per step (optional, for display).
   */
  readonly estimatedTimes?: ReadonlyMap<number, string>

  /**
   * Initial progress from server-side cookie reading.
   * When provided, eliminates hydration flicker.
   */
  readonly initialProgress?:
    | {
        readonly completedSteps: readonly number[]
        readonly currentStep: number
      }
    | undefined
}

/**
 * Client-side wrapper for overview page step list with progress.
 *
 * This component:
 * - Hydrates progress from localStorage using useStepProgress hook
 * - Highlights the current step in StepList
 * - Shows completed steps with checkmarks
 * - Shows Kata Practice section after Step 12 completion (jj-git only)
 *
 * @example
 * ```tsx
 * <OverviewPageClientWrapper
 *   toolPair="jj-git"
 *   totalSteps={12}
 *   steps={steps}
 *   estimatedTimes={estimatedTimes}
 * />
 * ```
 */
export function OverviewPageClientWrapper({
  toolPair,
  totalSteps,
  steps,
  estimatedTimes,
  initialProgress,
}: OverviewPageClientWrapperProps) {
  const { currentStep, isStepComplete, isLoading } = useStepProgress(toolPair, totalSteps, {
    initialProgress,
  })
  const { completedKatas } = useKataProgress()

  // Create Set of completed steps for StepList
  const completedSteps = new Set<number>(
    steps.filter((step) => isStepComplete(step.step)).map((step) => step.step),
  )

  // Check if Step 12 is complete (for Kata section display)
  const step12Completed = isStepComplete(12)
  const kataProgressFraction = `${completedKatas.length}/7`

  return (
    <>
      <section className="lg:col-span-3">
        {!isLoading ? (
          <StepList
            toolPair={toolPair}
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            {...(estimatedTimes !== undefined ? { estimatedTimes } : {})}
          />
        ) : (
          <StepList
            toolPair={toolPair}
            steps={steps}
            completedSteps={completedSteps}
            {...(estimatedTimes !== undefined ? { estimatedTimes } : {})}
          />
        )}
      </section>

      {/* Kata Practice section - only for jj-git after Step 12 completion */}
      {toolPair === "jj-git" && step12Completed && (
        <section className="lg:col-span-3 mt-8">
          <div className="border border-[#3f3f46] rounded-lg p-6 bg-[#0a0a0a]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-mono text-white mb-2">
                  Kata Practice
                </h2>
                <p className="text-sm text-[#d1d5dc] mb-1">
                  Practice your jj skills with hands-on exercises
                </p>
                <p className="text-sm text-[var(--color-accent)] font-mono">
                  {kataProgressFraction} Katas completed
                </p>
              </div>
              <Link
                href={`/${toolPair}/kata`}
                className="inline-flex items-center justify-center px-4 py-2 bg-[var(--color-accent)] text-[#0a0a0a] font-mono text-sm font-medium rounded hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
              >
                Start Kata Practice →
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
