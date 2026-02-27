/**
 * StepPageClientWrapper - Client component wrapper for step pages with keyboard navigation.
 *
 * Wraps children with SandboxConfigProvider and provides:
 * - Keyboard navigation (left/right for prev/next step, ? for help)
 * - Keyboard shortcuts modal
 * - Integration with progress tracking and navigation components
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useKeyboardNavigation, useKeyboardShortcutsModal } from "../../hooks/useKeyboardNavigation"
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal"
import { NavigationWrapper } from "./NavigationWrapper"
import { StepProgressWrapper } from "./StepProgressWrapper"
import { ReportBugModal } from "./ReportBugModal"
import { SandboxConfigProvider, type ExerciseData } from "../../contexts/SandboxConfigContext"
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
  readonly exerciseData?: ExerciseData
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
  exerciseData,
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
    <SandboxConfigProvider
      toolPair={toolPair}
      sandboxConfig={sandboxConfig}
      authToken={authToken ?? null}
      exerciseData={exerciseData}
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

      {/* Navigation Footer */}
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
    </SandboxConfigProvider>
  )
}
