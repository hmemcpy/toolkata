import Link from "next/link"
import type { JSX } from "react"
import type { StepMeta } from "../../services/content"

/**
 * Section grouping for tutorial steps.
 *
 * Maps step numbers to section names for organization.
 */
const STEP_SECTIONS: readonly {
  readonly name: string
  readonly steps: readonly number[]
}[] = [
  { name: "Fundamentals", steps: [1, 2, 3, 4] },
  { name: "Daily Workflow", steps: [5, 6, 7, 8] },
  { name: "Advanced", steps: [9, 10, 11, 12] },
] as const

/**
 * Completion state for a step.
 */
export type StepCompletionState = "completed" | "current" | "pending"

/**
 * Props for StepList component.
 */
export interface StepListProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Array of step metadata.
   */
  readonly steps: readonly StepMeta[]

  /**
   * The current step number (highlights as in-progress).
   */
  readonly currentStep?: number

  /**
   * Set of completed step numbers.
   */
  readonly completedSteps?: ReadonlySet<number>

  /**
   * Estimated time per step (optional, for display).
   */
  readonly estimatedTimes?: ReadonlyMap<number, string>

  /**
   * Optional CSS class name.
   */
  readonly className?: string
}

/**
 * Get the completion state for a step.
 */
function getStepState(
  step: number,
  currentStep: number | undefined,
  completedSteps: ReadonlySet<number> | undefined,
): StepCompletionState {
  if (currentStep !== undefined && step === currentStep) {
    return "current"
  }
  if (completedSteps?.has(step)) {
    return "completed"
  }
  return "pending"
}

/**
 * Icon for step completion state.
 */
function StepIcon({ state }: { readonly state: StepCompletionState }): JSX.Element {
  switch (state) {
    case "completed":
      return (
        <span className="text-[var(--color-accent)]" aria-label="Completed" role="img">
          ✓
        </span>
      )
    case "current":
      return (
        <span className="text-[var(--color-accent)]" aria-label="Current step" role="img">
          →
        </span>
      )
    case "pending":
      return (
        <span className="text-[#d1d5dc]" aria-label="Not started" role="img">
          ○
        </span>
      )
  }
}

/**
 * StepList component.
 *
 * Displays a checklist of tutorial steps grouped by section.
 * Each step shows completion state and links to the step page.
 *
 * @example
 * ```tsx
 * <StepList
 *   toolPair="jj-git"
 *   steps={steps}
 *   currentStep={3}
 *   completedSteps={new Set([1, 2])}
 * />
 * ```
 */
export function StepList({
  toolPair,
  steps,
  currentStep,
  completedSteps = new Set<number>(),
  estimatedTimes,
  className = "",
}: StepListProps): JSX.Element {
  // Convert steps array to a Map for O(1) lookup
  const stepsMap = new Map(steps.map((step) => [step.step, step]))

  return (
    <div className={className}>
      <h2 className="text-sm font-mono font-medium text-[#d1d5dc] uppercase tracking-wide">
        Steps
      </h2>
      <div className="mt-4 space-y-6">
        {STEP_SECTIONS.map((section) => {
          const sectionSteps = section.steps
            .map((stepNum) => stepsMap.get(stepNum))
            .filter((step): step is StepMeta => step !== undefined)

          if (sectionSteps.length === 0) {
            return null
          }

          return (
            <section key={section.name}>
              <h3 className="mb-3 text-sm font-mono font-medium text-white border-b border-[var(--color-border)] pb-1">
                {section.name}{" "}
                <span className="text-[var(--color-text-dim)]">
                  ({sectionSteps.length} {sectionSteps.length === 1 ? "lesson" : "lessons"})
                </span>
              </h3>
              <ul className="space-y-2">
                {sectionSteps.map((step) => {
                  const state = getStepState(step.step, currentStep, completedSteps)
                  const isCurrent = state === "current"

                  return (
                    <li key={step.step}>
                      <Link
                        href={`/${toolPair}/${step.step}`}
                        className={`
                          group flex items-center gap-3 rounded-md px-3 py-2
                          transition-all duration-[var(--transition-fast)]
                          focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]
                          ${
                            isCurrent
                              ? "bg-[var(--color-surface-hover)]"
                              : "hover:bg-[var(--color-surface-hover)]"
                          }
                        `}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        {/* Icon */}
                        <span className="flex-shrink-0 w-4 text-center" aria-hidden="true">
                          <StepIcon state={state} />
                        </span>

                        {/* Step number and title */}
                        <span className="flex-1 min-w-0">
                          <span
                            className={`
                              text-sm font-mono
                              ${
                                isCurrent
                                  ? "text-white"
                                  : state === "completed"
                                    ? "text-[#d1d5dc] group-hover:text-white"
                                    : "text-[#d1d5dc] group-hover:text-white"
                              }
                              transition-colors duration-[var(--transition-fast)]
                            `}
                          >
                            {step.step}. {step.title}
                          </span>
                          {isCurrent && (
                            <span
                              className="ml-2 text-xs font-mono text-[var(--color-text-muted)]"
                              aria-label="Current step"
                            >
                              ← current
                            </span>
                          )}
                        </span>

                        {/* Estimated time */}
                        {estimatedTimes?.get(step.step) && (
                          <span
                            className="flex-shrink-0 text-xs font-mono text-[#d1d5dc]"
                            aria-label={`Estimated time: ${estimatedTimes.get(step.step)}`}
                          >
                            {estimatedTimes.get(step.step)}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
