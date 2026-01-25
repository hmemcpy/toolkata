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

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useKeyboardNavigation, useKeyboardShortcutsModal } from "../../hooks/useKeyboardNavigation"
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal"
import { NavigationWrapper } from "./NavigationWrapper"
import { StepProgressWrapper } from "./StepProgressWrapper"
import { useTerminalContext } from "../../contexts/TerminalContext"
import type { SandboxConfig } from "./InteractiveTerminal"

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

  /**
   * Commands from the step's MDX frontmatter to show in the info panel.
   */
  readonly stepCommands: readonly string[]

  /**
   * Sandbox configuration for this step.
   */
  readonly sandboxConfig?: SandboxConfig
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
  stepCommands,
  sandboxConfig,
}: StepPageClientWrapperProps) {
  const router = useRouter()
  const { isOpen, onClose, showModal } = useKeyboardShortcutsModal()
  const { toggleSidebar, setContextCommands, setSandboxConfig } = useTerminalContext()

  // Register step commands in context on mount and when step changes
  useEffect(() => {
    setContextCommands(stepCommands)

    // Clear commands when leaving this step
    return () => {
      setContextCommands([])
    }
  }, [stepCommands, setContextCommands])

  // Register sandbox config in context on mount and when step changes
  useEffect(() => {
    setSandboxConfig(sandboxConfig)

    // No need to clear on unmount - next step will set its own config
  }, [sandboxConfig, setSandboxConfig])

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
      <article className="my-8 prose prose-invert max-w-none prose-a:text-[var(--color-accent)] prose-a:hover:text-[var(--color-accent-hover)] prose-code:bg-[var(--color-surface)] prose-code:text-[var(--color-accent)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[var(--color-surface)] prose-pre:rounded-md prose-pre:p-3 prose-pre:px-4 prose-pre:code:bg-transparent prose-pre:code:text-inherit prose-pre:code:p-0">
        {children}
      </article>

      {/* Navigation Footer */}
      <NavigationWrapper toolPair={toolPair} currentStep={currentStep} totalSteps={totalSteps} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={isOpen} onClose={onClose} />
    </>
  )
}
