/**
 * useKeyboardNavigation - Custom hook for keyboard navigation on step pages.
 *
 * Provides keyboard shortcuts for navigating between steps:
 * - Left Arrow (←) - Previous step
 * - Right Arrow (→) - Next step
 * - Question Mark (?) - Show keyboard shortcuts modal
 *
 * Note: Escape (Esc) is NOT handled by this hook to avoid conflicts.
 * Each component (modals, terminal) handles its own Escape behavior:
 * - KeyboardShortcutsModal: Closes modal
 * - InteractiveTerminal: Blurs terminal (exits focus trap)
 *
 * @example
 * ```tsx
 * function StepPage() {
 *   const { showModal, closeModal } = useKeyboardShortcutsModal()
 *   useKeyboardNavigation({
 *     currentStep: 3,
 *     totalSteps: 12,
 *     toolPair: "jj-git",
 *     onNextStep: () => router.push('/jj-git/4'),
 *     onPreviousStep: () => router.push('/jj-git/2'),
 *     onShowHelp: () => showModal(),
 *   })
 *
 *   return (
 *     <>
 *       <StepContent />
 *       {showModal && <KeyboardShortcutsModal onClose={closeModal} />}
 *     </>
 *   )
 * }
 * ```
 */

"use client"

import { useEffect, useCallback, useState } from "react"

export interface KeyboardNavigationOptions {
  /**
   * Current step number (1-indexed).
   */
  readonly currentStep: number

  /**
   * Total number of steps.
   */
  readonly totalSteps: number

  /**
   * Tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Callback when user presses next step key.
   */
  readonly onNextStep?: () => void

  /**
   * Callback when user presses previous step key.
   */
  readonly onPreviousStep?: () => void

  /**
   * Callback when user presses help key (?).
   */
  readonly onShowHelp?: () => void

  /**
   * Whether shortcuts are enabled (default: true).
   * Disable when modal is open or terminal is focused.
   */
  readonly enabled?: boolean
}

export interface KeyboardShortcutsModalOptions {
  /**
   * Whether the modal is currently shown.
   */
  readonly isOpen: boolean

  /**
   * Callback to close the modal.
   */
  readonly onClose: () => void
}

/**
 * Hook for managing keyboard shortcuts modal state.
 */
export function useKeyboardShortcutsModal(): KeyboardShortcutsModalOptions & {
  readonly showModal: () => void
} {
  const [isOpen, setIsOpen] = useState(false)

  const showModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closeModal()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => {
        document.removeEventListener("keydown", handleKeyDown)
      }
    }

    // Return no-op cleanup when modal is closed for type consistency
    return () => {}
  }, [isOpen, closeModal])

  return { isOpen, onClose: closeModal, showModal }
}

/**
 * Hook for keyboard navigation on step pages.
 *
 * Adds keyboard shortcuts for:
 * - Arrow navigation (←/→ for prev/next step)
 * - Help modal (?)
 *
 * Escape key is NOT handled here - individual components handle it.
 */
export function useKeyboardNavigation({
  currentStep,
  totalSteps,
  toolPair: _toolPair,
  onNextStep,
  onPreviousStep,
  onShowHelp,
  enabled = true,
}: KeyboardNavigationOptions): void {
  useEffect(() => {
    if (!enabled) {
      // Return a no-op cleanup function for type consistency
      return () => {}
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or terminal
      const target = event.target as HTMLElement
      const tagName = target.tagName.toUpperCase()
      const isInput =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.getAttribute("role") === "textbox"

      if (isInput) return

      // Arrow keys for navigation
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        if (currentStep > 1 && onPreviousStep) {
          onPreviousStep()
        }
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        if (currentStep < totalSteps && onNextStep) {
          onNextStep()
        }
      } else if (event.key === "?" && onShowHelp) {
        // Show help modal (only if not combined with modifier keys)
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          onShowHelp()
        }
      }
      // Note: Escape key is intentionally NOT handled here to avoid conflicts
      // Each component (modals, terminal) handles its own Escape behavior
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentStep, totalSteps, onNextStep, onPreviousStep, onShowHelp, enabled])
}
