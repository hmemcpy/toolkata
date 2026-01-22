"use client"

import Link from "next/link"
import { useStepProgress } from "../../hooks/useStepProgress"

/**
 * Props for ProgressCard component
 */
export interface ProgressCardProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Total number of steps for this pairing.
   */
  readonly totalSteps: number
}

/**
 * Progress card showing user's learning progress.
 *
 * Displays:
 * - Progress bar with completed/total count
 * - Time remaining estimate
 * - "Continue Step N →" or "Start Learning →" button
 * - "Reset Progress" button
 *
 * @example
 * ```tsx
 * <ProgressCard toolPair="jj-git" totalSteps={12} />
 * ```
 */
export function ProgressCard({ toolPair, totalSteps }: ProgressCardProps) {
  const { currentStep, completedCount, resetProgress, isLoading } = useStepProgress(
    toolPair,
    totalSteps,
  )

  // Calculate time remaining (average 3 min per step)
  const remainingSteps = totalSteps - completedCount
  const avgTimePerStep = 3 // minutes
  const remainingMins = remainingSteps * avgTimePerStep

  return (
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
        <div className="mb-6 text-sm text-[var(--color-text-muted)]">~{remainingMins} min remaining</div>
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
  )
}
