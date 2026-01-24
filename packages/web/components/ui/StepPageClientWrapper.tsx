/**
 * StepPageClientWrapper - Client component wrapper for step pages with keyboard navigation.
 *
 * This wrapper provides:
 * - Keyboard navigation (←/→ for prev/next step, ? for help, Esc to close)
 * - Keyboard shortcuts modal
 * - Integration with progress tracking and navigation components
 * - Step initialization (runs init commands when entering a step)
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

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useKeyboardNavigation, useKeyboardShortcutsModal } from "../../hooks/useKeyboardNavigation"
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal"
import { NavigationWrapper } from "./NavigationWrapper"
import { StepProgressWrapper } from "./StepProgressWrapper"
import { InitOverlay } from "./InitOverlay"
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

  /**
   * Commands from the step's MDX frontmatter to show in the info panel.
   */
  readonly stepCommands: readonly string[]

  /**
   * Commands to run when entering this step to set up prerequisites.
   */
  readonly initCommands: readonly string[]
}

/**
 * StepPageClientWrapper component.
 *
 * Client component that wraps step content with:
 * - Keyboard navigation
 * - Keyboard shortcuts modal
 * - Progress tracking
 * - Navigation (prev/next buttons)
 * - Step initialization
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
  initCommands,
}: StepPageClientWrapperProps) {
  const router = useRouter()
  const { isOpen, onClose, showModal } = useKeyboardShortcutsModal()
  const {
    toggleSidebar,
    setContextCommands,
    state,
    runInitSequence,
    setSessionInitializedStep,
    sessionInitializedStep,
    isInitializing,
    currentInitCommand,
  } = useTerminalContext()

  // Track whether initialization has been triggered for this step
  const initTriggeredRef = useRef(false)

  // Register step commands in context on mount and when step changes
  useEffect(() => {
    setContextCommands(stepCommands)

    // Clear commands when leaving this step
    return () => {
      setContextCommands([])
    }
  }, [stepCommands, setContextCommands])

  // Reset init trigger when step changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentStep is the trigger for resetting the ref
  useEffect(() => {
    initTriggeredRef.current = false
  }, [currentStep])

  // Run initialization when terminal connects and step needs setup
  useEffect(() => {
    // Only run when terminal is connected
    if (state !== "CONNECTED" && state !== "TIMEOUT_WARNING") {
      return
    }

    // Don't run if already triggered for this step
    if (initTriggeredRef.current) {
      return
    }

    // Don't run if this step is already initialized
    if (sessionInitializedStep === currentStep) {
      return
    }

    // Mark as triggered
    initTriggeredRef.current = true

    // Run init commands if there are any
    if (initCommands.length > 0) {
      runInitSequence(initCommands).then(() => {
        setSessionInitializedStep(currentStep)
      })
    } else {
      setSessionInitializedStep(currentStep)
    }
  }, [
    state,
    currentStep,
    sessionInitializedStep,
    initCommands,
    runInitSequence,
    setSessionInitializedStep,
  ])

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
      {/* Initialization Overlay */}
      <InitOverlay
        isVisible={isInitializing}
        currentStep={currentStep}
        currentCommand={currentInitCommand}
      />

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
      <NavigationWrapper
        toolPair={toolPair}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={isOpen} onClose={onClose} />
    </>
  )
}
