/**
 * KataCTA - Call-to-action component for Kata practice system.
 *
 * This component displays a "Tutorial Complete" section with a link to start
 * the first Kata. It only shows when all steps in the tutorial are completed.
 *
 * @example
 * ```tsx
 * <KataCTA toolPair="jj-git" totalSteps={12} />
 * ```
 */

"use client"

import Link from "next/link"
import { useStepProgress } from "../../hooks/useStepProgress"

export interface KataCTAProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Total number of steps in the tutorial.
   */
  readonly totalSteps: number
}

/**
 * KataCTA component.
 *
 * Shows a "Tutorial Complete" section with a link to the Kata landing page
 * when all tutorial steps are completed. Hidden otherwise.
 */
export function KataCTA({ toolPair, totalSteps }: KataCTAProps) {
  const { completedCount, isAvailable, isLoading } = useStepProgress(toolPair, totalSteps)

  // Don't render anything if progress is not available or still loading
  if (isLoading || !isAvailable) {
    return null
  }

  // Only show if all steps are complete
  const allStepsComplete = completedCount === totalSteps
  if (!allStepsComplete) {
    return null
  }

  return (
    <section className="my-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="mb-4 text-2xl font-bold text-[var(--color-text-primary)]">
        Tutorial Complete
      </h2>
      <p className="mb-4 text-base text-[var(--color-text-secondary)]">
        You've completed all {totalSteps} steps of the {toolPair === "jj-git" ? "jj" : toolPair} tutorial.
        Ready to test your knowledge with hands-on practice?
      </p>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
        The Kata system offers scenario-based exercises where you'll solve realistic
        problems using the tools you've learned. Each Kata includes automatic validation
        to verify your solutions.
      </p>
      <Link
        href={`/${toolPair}/kata`}
        className="inline-flex items-center gap-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
      >
        <span>Start Your First Kata</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>
    </section>
  )
}
