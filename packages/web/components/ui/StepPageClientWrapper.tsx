/**
 * StepPageClientWrapper - Client component wrapper for step pages with keyboard navigation.
 *
 * This wrapper provides:
 * - Keyboard navigation (←/→ for prev/next step, ? for help, Esc to close)
 * - Keyboard shortcuts modal
 * - Integration with progress tracking and navigation components
 *
 * @example
 * ```tsx
 * <StepPageClientWrapper
 *   toolPair="jj-git"
 *   currentStep={3}
 *   totalSteps={12}
 *   title="Your First Commits"
 *   nextHref="/jj-git/4"
 *   previousHref="/jj-git/2"
 *   suggestedCommands={["jj status", "jj log"]}
 * >
 *   <StepContent />
 * </StepPageClientWrapper>
 * ```
 */

"use client"

import { useRouter } from "next/navigation"
import { useKeyboardNavigation, useKeyboardShortcutsModal } from "../../hooks/useKeyboardNavigation"
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal"
import { NavigationWrapper } from "./NavigationWrapper"
import { StepProgressWrapper } from "./StepProgressWrapper"
import { TerminalWithSuggestionsWrapper } from "./TerminalWithSuggestionsWrapper"

export interface StepPageClientWrapperProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Current step number (1-indexed).
   */
  readonly currentStep: number

  /**
   * Total number of steps.
   */
  readonly totalSteps: number

  /**
   * Step title for display in progress header.
   */
  readonly title: string

  /**
   * Link to previous step, or null if on first step.
   */
  readonly previousHref: string | null

  /**
   * Link to next step, or null if on last step.
   */
  readonly nextHref: string | null

  /**
   * Suggested commands to display with the terminal.
   */
  readonly suggestedCommands: readonly string[]

  /**
   * Child components (the actual step content).
   */
  readonly children: React.ReactNode
}

/**
 * StepPageClientWrapper component.
 *
 * Client component that wraps step content with:
 * - Keyboard navigation
 * - Keyboard shortcuts modal
 * - Progress tracking
 * - Navigation (prev/next buttons)
 * - Interactive terminal with command suggestions
 */
export function StepPageClientWrapper({
  toolPair,
  currentStep,
  totalSteps,
  title,
  previousHref,
  nextHref,
  suggestedCommands,
  children,
}: StepPageClientWrapperProps) {
  const router = useRouter()
  const { isOpen, onClose, showModal } = useKeyboardShortcutsModal()

  const handleNextStep = () => {
    if (nextHref) {
      router.push(nextHref)
    }
  }

  const handlePreviousStep = () => {
    if (previousHref) {
      router.push(previousHref)
    }
  }

  // Set up keyboard navigation
  useKeyboardNavigation({
    currentStep,
    totalSteps,
    toolPair,
    onNextStep: handleNextStep,
    onPreviousStep: handlePreviousStep,
    onShowHelp: showModal,
  })

  return (
    <>
      {/* Step Progress Header with keyboard hints */}
      <StepProgressWrapper
        toolPair={toolPair}
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        previousHref={previousHref}
        nextHref={nextHref}
      />

      {/* MDX Content */}
      <article className="my-8 prose prose-invert max-w-none">{children}</article>

      {/* Interactive Terminal with Command Suggestions */}
      {suggestedCommands.length > 0 ? (
        <section className="my-12">
          <h2 className="mb-6 text-xl font-mono font-medium text-[var(--color-text)]">
            Try It Yourself
          </h2>
          <TerminalWithSuggestionsWrapper
            toolPair={toolPair}
            stepId={currentStep.toString()}
            suggestedCommands={suggestedCommands}
          />
        </section>
      ) : null}

      {/* Navigation Footer */}
      <NavigationWrapper
        toolPair={toolPair}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={isOpen} onClose={onClose} />

      {/* Keyboard hint in footer - visible only when help modal isn't open */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={showModal}
          className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Press ? for keyboard shortcuts
        </button>
      </div>
    </>
  )
}
