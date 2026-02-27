"use client"

import React, { useState } from "react"
import { useStepProgress } from "../../hooks/useStepProgress"
import { useInlineTerminal } from "../../contexts/InlineTerminalContext"
import { Navigation } from "./Navigation"

export interface NavigationWrapperProps {
  readonly currentStep: number
  readonly totalSteps: number
  readonly toolPair: string
  readonly className?: string
}

/**
 * Client-side wrapper for Navigation that integrates with progress tracking
 * and provides a soft gate encouraging terminal use before advancing.
 */
export function NavigationWrapper({
  currentStep,
  totalSteps,
  toolPair,
  className = "",
}: NavigationWrapperProps) {
  const { isStepComplete, markComplete, setCurrentStep } = useStepProgress(toolPair, totalSteps)
  const { hasUsedTerminal, sandboxConfig } = useInlineTerminal()
  const [showGatePrompt, setShowGatePrompt] = useState(false)

  // Update current step when component mounts
  React.useEffect(() => {
    setCurrentStep(currentStep)
  }, [currentStep, setCurrentStep])

  const isCompleted = isStepComplete(currentStep)

  const handleComplete = () => {
    // Soft gate: if terminal is available and hasn't been used, show prompt
    const sandboxEnabled = sandboxConfig !== undefined && sandboxConfig.enabled !== false
    if (sandboxEnabled && !hasUsedTerminal && !showGatePrompt) {
      setShowGatePrompt(true)
      return
    }

    // Second click (or terminal used): proceed normally
    setShowGatePrompt(false)
    markComplete(currentStep)
  }

  return (
    <div>
      {/* Soft gate prompt */}
      {showGatePrompt ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-2">
          <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-mono text-[var(--color-text-muted)]">
            Try the terminal before continuing. Click again to skip.
          </div>
        </div>
      ) : null}

      <Navigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        toolPair={toolPair}
        onComplete={handleComplete}
        isCompleted={isCompleted}
        className={className}
      />
    </div>
  )
}
