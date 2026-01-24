/**
 * InitOverlay - Displays initialization progress when setting up a step.
 *
 * Shows:
 * - A semi-transparent overlay
 * - "Setting up step N..." message
 * - Current command being executed
 * - Simple progress indicator
 *
 * @example
 * ```tsx
 * <InitOverlay
 *   isVisible={isInitializing}
 *   currentStep={3}
 *   currentCommand="jj git init --colocate"
 * />
 * ```
 */

"use client"

import type { ReactNode } from "react"

export interface InitOverlayProps {
  /**
   * Whether the overlay should be visible.
   */
  readonly isVisible: boolean

  /**
   * The current step number being initialized.
   */
  readonly currentStep: number

  /**
   * The command currently being executed, or null if waiting.
   */
  readonly currentCommand: string | null
}

/**
 * InitOverlay component.
 *
 * Renders a modal overlay showing initialization progress.
 * Uses fixed positioning to overlay the entire viewport.
 */
export function InitOverlay({
  isVisible,
  currentStep,
  currentCommand,
}: InitOverlayProps): ReactNode {
  if (!isVisible) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Setting up step ${currentStep}`}
    >
      <div className="mx-4 max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg">
        {/* Header */}
        <h2 className="mb-4 text-center font-mono text-lg text-[var(--color-text)]">
          Setting up step {currentStep}...
        </h2>

        {/* Current command */}
        {currentCommand && (
          <div className="mb-4">
            <p className="mb-1 text-xs text-[var(--color-text-muted)]">Running:</p>
            <code className="block rounded bg-[var(--color-bg)] px-3 py-2 font-mono text-sm text-[var(--color-accent)]">
              {currentCommand}
            </code>
          </div>
        )}

        {/* Progress indicator - simple animated dots */}
        <div className="flex items-center justify-center gap-1">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]"
            style={{ animationDelay: "300ms" }}
          />
        </div>

        {/* Helper text */}
        <p className="mt-4 text-center text-xs text-[var(--color-text-dim)]">
          Please wait while the environment is prepared
        </p>
      </div>
    </div>
  )
}
