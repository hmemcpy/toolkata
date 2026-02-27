/**
 * StepPageClientWrapper - Client component wrapper for step pages with keyboard navigation.
 *
 * Wraps children with InlineTerminalProvider (step-scoped) and provides:
 * - Keyboard navigation (left/right for prev/next step, ? for help)
 * - Keyboard shortcuts modal
 * - Integration with progress tracking and navigation components
 * - Inline terminal auto-appended at bottom (unless MDX places <Terminal /> explicitly)
 * - Soft gate encouraging terminal use before navigating
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useKeyboardNavigation, useKeyboardShortcutsModal } from "../../hooks/useKeyboardNavigation"
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal"
import { NavigationWrapper } from "./NavigationWrapper"
import { StepProgressWrapper } from "./StepProgressWrapper"
import { ReportBugModal } from "./ReportBugModal"
import { TerminalAutoAppend } from "./TerminalAutoAppend"
import { InlineTerminalProvider } from "../../contexts/InlineTerminalContext"
import type { SandboxConfig } from "./InteractiveTerminal"

export interface StepPageClientWrapperProps {
  readonly toolPair: string
  readonly currentStep: number
  readonly totalSteps: number
  readonly title: string
  readonly previousHref: string | null
  readonly nextHref: string | null
  readonly editHref?: string
  readonly children: React.ReactNode
  readonly stepCommands: readonly string[]
  readonly sandboxConfig?: SandboxConfig
  readonly authToken?: string | null
}

export function StepPageClientWrapper({
  toolPair,
  currentStep,
  totalSteps,
  title,
  previousHref,
  nextHref,
  editHref,
  children,
  stepCommands: _stepCommands,
  sandboxConfig,
  authToken,
}: StepPageClientWrapperProps) {
  const router = useRouter()
  const { isOpen, onClose, showModal } = useKeyboardShortcutsModal()

  // Bug report modal state
  const [isBugModalOpen, setIsBugModalOpen] = useState(false)

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

  // Set up keyboard navigation (no terminal toggle - T shortcut removed)
  useKeyboardNavigation({
    currentStep,
    totalSteps,
    toolPair,
    onNextStep: handleNextStep,
    onPreviousStep: handlePreviousStep,
    onShowHelp: showModal,
  })

  return (
    <InlineTerminalProvider
      toolPair={toolPair}
      sandboxConfig={sandboxConfig}
      authToken={authToken ?? null}
    >
      {/* Step Progress Header */}
      <StepProgressWrapper
        toolPair={toolPair}
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        previousHref={previousHref}
        nextHref={nextHref}
        {...(editHref !== undefined ? { editHref } : {})}
        onReportBug={() => setIsBugModalOpen(true)}
      />

      {/* MDX Content */}
      <article className="my-8 prose prose-invert max-w-none prose-a:text-[var(--color-accent)] prose-a:hover:text-[var(--color-accent-hover)] prose-code:bg-[var(--color-surface)] prose-code:text-[var(--color-accent)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[var(--color-surface)] prose-pre:rounded-md prose-pre:p-3 prose-pre:px-4 prose-pre:code:bg-transparent prose-pre:code:text-inherit prose-pre:code:p-0">
        {children}
      </article>

      {/* Auto-appended terminal (if MDX doesn't include <Terminal />) */}
      <TerminalAutoAppend toolPair={toolPair} />

      {/* Navigation Footer with soft gate */}
      <NavigationWrapper toolPair={toolPair} currentStep={currentStep} totalSteps={totalSteps} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={isOpen} onClose={onClose} />

      {/* Bug report modal */}
      <ReportBugModal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        context={{
          page: `${toolPair} - Step ${currentStep}`,
          step: title,
        }}
      />
    </InlineTerminalProvider>
  )
}
