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
import { useTerminalContext } from "../../contexts/TerminalContext"

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
 *
 * Note: The terminal has been moved to a collapsible sidebar (TerminalProvider),
 * accessible via the FAB toggle button or TryIt components in MDX content.
 */
export function StepPageClientWrapper({
  toolPair,
  currentStep,
  totalSteps,
  title,
  previousHref,
  nextHref,
  children,
}: StepPageClientWrapperProps) {
  const router = useRouter()
  const { isOpen, onClose, showModal } = useKeyboardShortcutsModal()
  const { toggleSidebar } = useTerminalContext()

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
    onToggleTerminal: toggleSidebar,
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
      <article className="my-8 prose prose-invert max-w-none prose-a:text-[var(--color-accent)] prose-a:hover:text-[var(--color-accent-hover)] prose-code:bg-[var(--color-surface)] prose-code:text-[var(--color-accent)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[var(--color-surface)] prose-pre:rounded-md prose-pre:p-3 prose-pre:px-4">
        {children}
      </article>

      {/* Navigation Footer */}
      <NavigationWrapper toolPair={toolPair} currentStep={currentStep} totalSteps={totalSteps} />

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
