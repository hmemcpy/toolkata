/**
 * TryIt - Compact inline component for running commands in the sidebar terminal.
 *
 * Displays a command with a small "Run" button on the right that:
 * - Opens the sidebar if closed
 * - Starts the terminal if idle
 * - Sends the command to the terminal
 *
 * Used in MDX content like: `<TryIt command="jj status" />`
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
   * Optional description text shown as a tooltip.
   */
  readonly description?: string
}

/**
 * Button states for user feedback.
 */
type ButtonState = "idle" | "sending"

/**
 * TryIt component - compact inline command with Run button.
 */
export function TryIt({ command, description }: TryItProps): React.JSX.Element {
  const { executeCommand } = useTerminalContext()
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const handleRun = useCallback(() => {
    setButtonState("sending")
    executeCommand(command)

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setButtonState("idle")
    }, 500)
  }, [command, executeCommand])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className="my-2 flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5"
      title={description}
    >
      <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm text-[var(--color-accent)]">
        {command}
      </code>
      <button
        type="button"
        onClick={handleRun}
        disabled={buttonState === "sending"}
        aria-label={`Run command: ${command}`}
        className="shrink-0 rounded bg-[var(--color-accent)] px-2 py-0.5 text-xs font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-70"
      >
        {buttonState === "sending" ? "Sent" : "Run"}
      </button>
    </div>
  )
}
