/**
 * TryIt - Compact inline component for running commands in the sidebar terminal.
 *
 * Displays an editable command with a "Run" button that:
 * - Opens the sidebar if closed
 * - Starts the terminal if idle
 * - Sends the command to the terminal
 * - Optionally shows expected output
 *
 * Used in MDX content like:
 * `<TryIt command="jj status" expectedOutput="Working copy changes:..." />`
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
   * Serves as the initial value if editable.
   */
  readonly command: string

  /**
   * Optional description text shown as a tooltip.
   */
  readonly description?: string

  /**
   * Optional expected output to display below the command.
   * Helps users verify their command worked correctly.
   */
  readonly expectedOutput?: string

  /**
   * Whether the command input should be editable.
   * @default true
   */
  readonly editable?: boolean
}

/**
 * Button states for user feedback.
 */
type ButtonState = "idle" | "sending"

/**
 * TryIt component - editable inline command with Run button and optional expected output.
 */
export function TryIt({
  command,
  description,
  expectedOutput,
  editable = true
}: TryItProps): React.JSX.Element {
  const { executeCommand } = useTerminalContext()
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const [editedCommand, setEditedCommand] = useState(command)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const handleRun = useCallback(() => {
    setButtonState("sending")
    // Send the current input value (edited or original)
    executeCommand(editedCommand)

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setButtonState("idle")
    }, 500)
  }, [editedCommand, executeCommand])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  // Reset edited command when the original command prop changes
  useEffect(() => {
    setEditedCommand(command)
  }, [command])

  const commonInputProps = {
    className: "flex-1 bg-transparent font-mono text-sm text-[var(--color-accent)] outline-none placeholder:text-[var(--color-text-dim)]",
    "aria-label": description ?? `Command: ${command}`,
    title: description,
  }

  return (
    <div className="my-2 flex flex-col gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {/* Command row with input and button */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[var(--color-text-dim)]">$</span>
        {editable ? (
          <input
            {...commonInputProps}
            type="text"
            value={editedCommand}
            onChange={(e) => setEditedCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRun()
              }
            }}
            placeholder={command}
          />
        ) : (
          <code {...commonInputProps}>{command}</code>
        )}
        <button
          type="button"
          onClick={handleRun}
          disabled={buttonState === "sending"}
          aria-label={`Run command: ${editedCommand}`}
          className="shrink-0 rounded bg-[var(--color-accent)] px-2 py-0.5 text-xs font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-70"
        >
          {buttonState === "sending" ? "Sent" : "Run"}
        </button>
      </div>

      {/* Expected output (optional) */}
      {expectedOutput && (
        <div className="pl-4 text-xs font-mono text-[var(--color-text-muted)]">
          <span className="text-[var(--color-text-dim)]"># Expected output:</span>
          <pre className="mt-1 whitespace-pre-wrap break-words">{expectedOutput}</pre>
        </div>
      )}
    </div>
  )
}
