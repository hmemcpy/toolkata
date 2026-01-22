import type { JSX } from "react"
import Link from "next/link"

export interface StepProgressProps {
  readonly currentStep: number
  readonly totalSteps: number
  readonly title: string
  readonly toolPair: string
  readonly overviewHref?: string
  readonly nextHref?: string | null
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
  nextHref = currentStep < totalSteps ? `/${toolPair}/${currentStep + 1}` : null,
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
        {/* Back link - always visible */}
        <div className="flex items-center">
          <Link
            href={overviewHref}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] flex items-center gap-1"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        {/* Step indicator */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-mono text-[var(--color-text)] text-center flex items-center gap-2">
            {isCompleted && <span aria-label="Step completed">✓</span>}
            Step {currentStep} of {totalSteps}
          </span>
          <h1 className="text-sm font-mono text-[var(--color-text-muted)] text-center hidden sm:block">
            {title}
          </h1>
        </div>

        {/* Next link or placeholder */}
        <div className="flex items-center">
          {nextHref ? (
            <Link
              href={nextHref}
              className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] flex items-center gap-1"
              aria-label={`Go to step ${currentStep + 1}`}
            >
              <span className="hidden sm:inline">Step {currentStep + 1}</span>
              <span className="sm:hidden">{currentStep + 1}</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className="w-16 sm:w-24" aria-hidden="true" />
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
