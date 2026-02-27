"use client"

import { useStepProgress } from "../../hooks/useStepProgress"
import type { StepMeta } from "../../services/content"
import type { SandboxConfig } from "./InteractiveTerminal"
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
   * Sandbox configuration for the terminal.
   */
  readonly sandboxConfig?: SandboxConfig
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
  sandboxConfig: _sandboxConfig,
}: OverviewPageClientWrapperProps) {
  const { currentStep, isStepComplete } = useStepProgress(toolPair, totalSteps)
  // Create Set of completed steps for StepList
  const completedSteps = new Set<number>(
    steps.filter((step) => isStepComplete(step.step)).map((step) => step.step),
  )

  return (
    <>
      <section className="lg:col-span-3">
        <StepList
          toolPair={toolPair}
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          {...(estimatedTimes !== undefined ? { estimatedTimes } : {})}
        />
      </section>
    </>
  )
}
