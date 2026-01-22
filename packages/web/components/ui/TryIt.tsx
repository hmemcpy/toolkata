/**
 * TryIt - MDX component for running commands in the sidebar terminal.
 *
 * Displays a command in monospace with a "Run" button that:
 * - Opens the sidebar if closed
 * - Sends the command to the terminal
 * - Shows "Sent" feedback briefly (500ms)
 *
 * Used in MDX content like: `<TryIt command="jj status" description="Check repository status" />`
 *
 * @example
 * ```tsx
 * <TryIt command="jj status" description="Check repository status" />
 * ```
 */

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTerminalContext } from "../../contexts/TerminalContext"

/**
 * Props for the TryIt component.
 */
export interface TryItProps {
  /**
   * The command to execute in the terminal (e.g., "jj status").
   */
  readonly command: string

  /**
   * Optional description text to display below the command.
   */
  readonly description?: string
}

/**
 * Button states for user feedback.
 */
type ButtonState = "idle" | "sending"

/**
 * TryIt component with command display and Run button.
 *
 * Features:
 * - Monospace command display (same style as CodeBlock)
 * - Green "Run" button (min 44px height, min 80px width)
 * - Optional description text
 * - "Sent" flash feedback (500ms)
 * - Debounced clicks (500ms)
 * - Accessibility: aria-label, keyboard navigation
 */
export function TryIt({ command, description }: TryItProps): React.JSX.Element {
  const { executeCommand } = useTerminalContext()
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  /**
   * Handle Run button click.
   *
   * - Opens sidebar if closed
   * - Sends command to terminal
   * - Shows "Sent" feedback for 500ms
   * - Debounces subsequent clicks for 500ms
   */
  const handleRun = useCallback(() => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Show feedback immediately
    setButtonState("sending")

    // Execute the command (opens sidebar, queues if needed)
    executeCommand(command)

    // Reset button state after 500ms
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setButtonState("idle")
    }, 500)

    // Set debounce timeout to prevent rapid clicks
    debounceTimeoutRef.current = setTimeout(() => {
      debounceTimeoutRef.current = undefined
    }, 500)
  }, [command, executeCommand])

  /**
   * Clean up timeouts on unmount.
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const isDisabled = buttonState === "sending"

  return (
    <div className="my-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {/* Header with command label */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">Command</span>
      </div>

      {/* Command display in monospace */}
      <pre className="mb-4 overflow-x-auto rounded bg-[var(--color-bg)] p-3">
        <code className="text-sm text-[var(--color-accent)]">{command}</code>
      </pre>

      {/* Optional description */}
      {description ? (
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">{description}</p>
      ) : null}

      {/* Run button */}
      <button
        type="button"
        onClick={handleRun}
        disabled={isDisabled}
        aria-label={`Run command: ${command}`}
        className={`
          flex min-h-[44px] min-w-[80px] items-center justify-center
          rounded bg-[var(--color-accent)] px-6 py-2
          text-sm font-medium text-[var(--color-bg)]
          transition-colors duration-200
          hover:bg-[var(--color-accent-hover)]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
          disabled:cursor-not-allowed disabled:opacity-70
          focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
        `}
      >
        {buttonState === "sending" ? "Sent!" : "Run"}
      </button>
    </div>
  )
}
