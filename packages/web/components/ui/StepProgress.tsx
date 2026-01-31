"use client"

import Link from "next/link"
import type { JSX } from "react"
import { useStepProgress } from "../../hooks/useStepProgress"

export interface StepProgressProps {
  readonly currentStep: number
  readonly totalSteps: number
  readonly title: string
  readonly toolPair: string
  readonly overviewHref?: string
  readonly previousHref?: string | null | undefined
  readonly nextHref?: string | null | undefined
  readonly editHref?: string
  readonly onReportBug?: () => void
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
  editHref,
  onReportBug,
  isCompleted = false,
  className = "",
}: StepProgressProps): JSX.Element {
  const { isStepComplete } = useStepProgress(toolPair, totalSteps)
  const step12Complete = isStepComplete(12)

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

      {/* Secondary navigation bar with prev/next and glossary link */}
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

          {/* Glossary and Kata links */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href={`/${toolPair}/glossary`}
              className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors"
            >
              [Glossary]
            </Link>
            {toolPair === "jj-git" && (
              <Link
                href={`/${toolPair}/kata`}
                className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors flex items-center gap-1"
                aria-label={
                  step12Complete
                    ? "Go to Kata practice"
                    : "Kata practice - complete Step 12 to unlock"
                }
              >
                <span>[Kata]</span>
                {!step12Complete && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-label="Locked"
                  >
                    <title>Locked - Complete Step 12 to unlock</title>
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                )}
              </Link>
            )}
            {editHref && (
              <a
                href={editHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors flex items-center gap-1"
                aria-label="Edit this page on GitHub"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                <span className="hidden sm:inline">Edit</span>
              </a>
            )}
            {onReportBug && (
              <button
                type="button"
                onClick={onReportBug}
                className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                aria-label="Report an issue with this page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="hidden sm:inline">Report an issue</span>
              </button>
            )}
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
