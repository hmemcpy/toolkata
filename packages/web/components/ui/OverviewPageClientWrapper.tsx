"use client"

import { useStepProgress } from "../../hooks/useStepProgress"
import { StepList } from "./StepList"
import Link from "next/link"
import type { StepMeta } from "../../services/content"

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
}

/**
 * Client-side wrapper for overview page progress features.
 *
 * This component:
 * - Hydrates progress from localStorage using useStepProgress hook
 * - Highlights the current step in StepList
 * - Shows "Continue Step N →" or "Start Learning →" based on progress
 * - Provides functional "Reset Progress" button
 * - Displays progress summary (completed/total count, time remaining)
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
}: OverviewPageClientWrapperProps) {
  const { currentStep, completedCount, isStepComplete, resetProgress, isLoading } = useStepProgress(
    toolPair,
    totalSteps,
  )

  // Create Set of completed steps for StepList
  const completedSteps = new Set<number>(
    steps.filter((step) => isStepComplete(step.step)).map((step) => step.step),
  )

  // Calculate time remaining (average 3 min per step)
  const remainingSteps = totalSteps - completedCount
  const avgTimePerStep = 3 // minutes
  const remainingMins = remainingSteps * avgTimePerStep

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left column: Introduction + Steps */}
      <div className="lg:col-span-2 space-y-12">
        {/* Steps List with real progress */}
        <section>
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
      </div>

      {/* Right column: Progress summary */}
      <aside className="lg:col-span-1">
        <div className="sticky top-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="mb-4 text-sm font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            Your Progress
          </h3>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] mb-2">
              <span>
                {completedCount} / {totalSteps} steps
              </span>
              <span>{totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0}%</span>
            </div>
            <div className="h-2 w-full bg-[var(--color-bg)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all duration-[var(--transition-normal)]"
                style={{
                  width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Time remaining estimate */}
          {!isLoading && completedCount > 0 && completedCount < totalSteps && (
            <div className="mb-6 text-sm text-[var(--color-text-muted)]">
              ~{remainingMins} min remaining
            </div>
          )}

          {/* Continue button or Start button */}
          {!isLoading &&
            (completedCount > 0 ? (
              <Link
                href={`/${toolPair}/${currentStep}`}
                className="block w-full text-center px-4 py-3 text-sm font-mono text-[var(--color-bg)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
              >
                Continue Step {currentStep} →
              </Link>
            ) : (
              <Link
                href={`/${toolPair}/1`}
                className="block w-full text-center px-4 py-3 text-sm font-mono text-[var(--color-bg)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
              >
                Start Learning →
              </Link>
            ))}

          {/* Divider */}
          <div className="my-6 border-t border-[var(--color-border)]" />

          {/* Reset progress option */}
          <button
            type="button"
            onClick={resetProgress}
            className="w-full text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
          >
            Reset Progress
          </button>
        </div>
      </aside>
    </div>
  )
}
