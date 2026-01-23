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

  /**
   * Optional expected output to display below the command.
   * Shown in muted monospace styling.
   */
  readonly expectedOutput?: string

  /**
   * Whether the command input should be editable.
   * Defaults to true.
   */
  readonly editable?: boolean
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
 * - Editable command input (when editable is true, default)
 * - Green "Run" button (min 44px height, min 80px width)
 * - Optional description text
 * - Optional expected output display
 * - "Sent" flash feedback (500ms)
 * - Debounced clicks (500ms)
 * - Accessibility: aria-label, keyboard navigation
 */
export function TryIt({
  command,
  description,
  expectedOutput,
  editable = true,
}: TryItProps): React.JSX.Element {
  const { executeCommand } = useTerminalContext()
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const [editedCommand, setEditedCommand] = useState(command)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Update edited command when the original command prop changes
  useEffect(() => {
    setEditedCommand(command)
  }, [command])

  /**
   * Handle Run button click.
   *
   * - Opens sidebar if closed
   * - Sends command to terminal (edited command if editable)
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
    // Use editedCommand if editable, otherwise use original command
    executeCommand(editable ? editedCommand : command)

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
  }, [command, editedCommand, editable, executeCommand])

  /**
   * Reset the edited command to the original command.
   */
  const handleReset = useCallback(() => {
    setEditedCommand(command)
    inputRef.current?.focus()
  }, [command])

  /**
   * Handle keyboard input in the editable field.
   * - Enter: Run the command
   * - Escape: Reset to original command
   * - Tab: Move focus to Run button (default behavior)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleRun()
      } else if (e.key === "Escape") {
        e.preventDefault()
        handleReset()
      }
      // Tab key uses default browser behavior to move to next focusable element
    },
    [handleRun, handleReset],
  )

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
      {editable ? (
        <div className="mb-4 rounded bg-[var(--color-bg)] p-3">
          <input
            ref={inputRef}
            type="text"
            value={editedCommand}
            onChange={(e) => setEditedCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Command to execute. Press Enter to run, Escape to reset."
            className={`
              w-full bg-transparent text-sm font-mono
              text-[var(--color-accent)]
              placeholder:text-[var(--color-text-dim)]
              outline-none
              focus:outline-none
            `}
          />
        </div>
      ) : (
        <pre className="mb-4 overflow-x-auto rounded bg-[var(--color-bg)] p-3">
          <code className="text-sm text-[var(--color-accent)]">{command}</code>
        </pre>
      )}

      {/* Optional expected output */}
      {expectedOutput ? (
        <div className="mb-4 rounded bg-[var(--color-bg)] p-3">
          <div className="mb-2 flex items-center">
            <span className="text-xs text-[var(--color-text-muted)]">Expected output</span>
          </div>
          <pre className="overflow-x-auto">
            <code className="text-sm text-[var(--color-text-dim)] whitespace-pre-wrap font-mono">
              {expectedOutput}
            </code>
          </pre>
        </div>
      ) : null}

      {/* Optional description */}
      {description ? (
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">{description}</p>
      ) : null}

      {/* Run button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleRun}
        disabled={isDisabled}
        aria-label={`Run command: ${editable ? editedCommand : command}`}
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
