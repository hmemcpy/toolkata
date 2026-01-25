"use client"

import Link from "next/link"
import type { JSX } from "react"

export interface StepProgressProps {
  readonly currentStep: number
  readonly totalSteps: number
  readonly title: string
  readonly toolPair: string
  readonly overviewHref?: string
  readonly previousHref?: string | null | undefined
  readonly nextHref?: string | null | undefined
  readonly isCompleted?: boolean
  readonly className?: string
}

export function StepProgress({
  currentStep,
  totalSteps,
  title,
  toolPair,
  overviewHref = `/${toolPair}`,
  previousHref,
  nextHref,
  isCompleted = false,
  className = "",
}: StepProgressProps): JSX.Element {
  return (
    <header className={`border-b border-[var(--color-border)] ${className}`}>
      {/* Step indicator - centered */}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-1">
          <Link
            href={overviewHref}
            className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            {toolPair}
          </Link>
          <h1 className="text-base font-mono font-semibold text-[var(--color-text)] text-center flex items-center gap-2">
            {isCompleted && <span aria-label="Step completed">✓</span>}
            {title}
          </h1>
          <span className="text-xs font-mono text-[var(--color-text-muted)] text-center">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
      </div>

      {/* Secondary navigation bar with prev/next and cheat sheet link */}
      <nav
        className="border-t border-[var(--color-border)] px-4 py-1.5 sm:px-6 lg:px-8"
        aria-label="Step navigation"
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Previous link */}
          <div className="w-24">
            {previousHref ? (
              <Link
                href={previousHref}
                className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors flex items-center gap-1"
                aria-label={currentStep === 1 ? "Back to overview" : "Previous step"}
              >
                <span aria-hidden="true">←</span>
                <span className="hidden sm:inline">
                  {currentStep === 1 ? "Overview" : `Step ${currentStep - 1}`}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </div>

          {/* Cheat sheet link */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href={`/${toolPair}/cheatsheet`}
              className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors"
            >
              [Cheat Sheet]
            </Link>
          </div>

          {/* Next link */}
          <div className="w-24 flex justify-end">
            {nextHref ? (
              <Link
                href={nextHref}
                className="text-xs font-mono text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors flex items-center gap-1"
                aria-label="Next step"
              >
                <span className="hidden sm:inline">Step {currentStep + 1}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
