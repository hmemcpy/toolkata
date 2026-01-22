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
  readonly showKeyboardHints?: boolean
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
  showKeyboardHints = true,
  isCompleted = false,
  className = "",
}: StepProgressProps): JSX.Element {
  return (
    <header className={`border-b border-[var(--color-border)] ${className}`}>
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Step navigation"
      >
        {/* Previous step link */}
        <div className="flex items-center w-24">
          {previousHref ? (
            <Link
              href={previousHref}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] flex items-center gap-1"
              aria-label={currentStep === 1 ? "Back to overview" : "Previous step"}
            >
              <span aria-hidden="true">←</span>
              <span className="hidden sm:inline">
                {currentStep === 1 ? "Overview" : `Step ${currentStep - 1}`}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        {/* Step indicator - links to overview */}
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

        {/* Next step link */}
        <div className="flex items-center justify-end w-24">
          {nextHref ? (
            <Link
              href={nextHref}
              className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] flex items-center gap-1"
              aria-label="Next step"
            >
              <span className="hidden sm:inline">Step {currentStep + 1}</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      </nav>

      {/* Keyboard hints - only show when enabled */}
      {showKeyboardHints && (
        <div className="border-t border-[var(--color-border)] px-4 py-1 sm:px-6 lg:px-8">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            <kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)]">
              ←
            </kbd>{" "}
            <kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)]">
              →
            </kbd>{" "}
            to navigate · Press{" "}
            <kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)]">
              ?
            </kbd>{" "}
            for help
          </p>
        </div>
      )}
    </header>
  )
}
