import type { JSX } from "react"
import Link from "next/link"

export interface NavigationProps {
  readonly currentStep: number
  readonly totalSteps: number
  readonly toolPair: string
  readonly previousTitle?: string | null
  readonly nextTitle?: string | null
  readonly onComplete?: () => void
  readonly isCompleted?: boolean
  readonly className?: string
}

export function Navigation({
  currentStep,
  totalSteps,
  toolPair,
  previousTitle,
  nextTitle,
  onComplete,
  isCompleted = false,
  className = "",
}: NavigationProps): JSX.Element {
  const hasPrevious = currentStep > 1
  const hasNext = currentStep < totalSteps

  return (
    <footer className={`border-t border-[var(--color-border)] ${className}`}>
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Step navigation"
      >
        {/* Previous button */}
        <div className="flex-1">
          {hasPrevious && previousTitle ? (
            <Link
              href={`/${toolPair}/${currentStep - 1}`}
              className="
                group inline-flex min-h-[44px] items-center gap-2
                text-sm font-mono text-[var(--color-text-muted)]
                hover:text-[var(--color-text)]
                focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]
                transition-colors duration-[var(--transition-fast)]
              "
              aria-label={`Go to previous step: ${previousTitle}`}
            >
              <span aria-hidden="true" className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]">
                ←
              </span>
              <span className="hidden sm:inline">Step {currentStep - 1}:</span>
              <span className="hidden sm:inline truncate max-w-[150px]">{previousTitle}</span>
              <span className="sm:hidden">Previous</span>
            </Link>
          ) : (
            <div className="min-h-[44px]" aria-hidden="true" />
          )}
        </div>

        {/* Mark Complete button - centered */}
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleted}
            className={`
              inline-flex min-h-[44px] items-center justify-center gap-2
              px-6 py-2.5
              text-sm font-mono font-medium
              rounded-[var(--radius-md)]
              transition-all duration-[var(--transition-fast)]
              focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]
              ${
                isCompleted
                  ? `
                    bg-[var(--color-surface)]
                    text-[var(--color-text-muted)]
                    cursor-default
                  `
                  : `
                    bg-[var(--color-accent)]
                    text-[var(--color-bg)]
                    hover:bg-[var(--color-accent-hover)]
                    active:scale-[0.98]
                  `
              }
            `}
            aria-label={isCompleted ? "Step completed" : "Mark step as complete"}
          >
            {isCompleted ? (
              <>
                <span aria-hidden="true">✓</span>
                <span>Done</span>
              </>
            ) : (
              <span>Mark Complete</span>
            )}
          </button>
        </div>

        {/* Next button */}
        <div className="flex-1 flex justify-end">
          {hasNext && nextTitle ? (
            <Link
              href={`/${toolPair}/${currentStep + 1}`}
              className="
                group inline-flex min-h-[44px] items-center gap-2
                text-sm font-mono text-[var(--color-accent)]
                hover:text-[var(--color-accent-hover)]
                focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]
                transition-colors duration-[var(--transition-fast)]
              "
              aria-label={`Go to next step: ${nextTitle}`}
            >
              <span className="hidden sm:inline truncate max-w-[150px]">{nextTitle}</span>
              <span className="hidden sm:inline">:</span>
              <span className="hidden sm:inline">Step {currentStep + 1}</span>
              <span className="sm:hidden">Next</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <div className="min-h-[44px]" aria-hidden="true" />
          )}
        </div>
      </nav>
    </footer>
  )
}
