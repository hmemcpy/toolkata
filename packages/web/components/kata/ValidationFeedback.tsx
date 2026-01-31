"use client"

import type { JSX } from "react"

/**
 * Validation state for the current exercise.
 */
export type ValidationState = "idle" | "validating" | "success" | "error"

/**
 * Props for the ValidationFeedback component.
 */
export interface ValidationFeedbackProps {
  /**
   * Current validation state.
   */
  readonly state: ValidationState

  /**
   * Optional hint message to display on error state.
   * If not provided for error state, shows a generic "Try again" message.
   */
  readonly hint?: string | null

  /**
   * Optional message to display on success state.
   * If not provided, shows "Exercise complete" message.
   */
  readonly successMessage?: string

  /**
   * Optional message to display on validating state.
   * If not provided, shows "Validating solution..." message.
   */
  readonly validatingMessage?: string

  /**
   * Whether this is the final exercise completion (shows different message).
   */
  readonly isKataComplete?: boolean
}

/**
 * ValidationFeedback - Displays validation state feedback for Kata exercises.
 *
 * Shows different UI states based on validation:
 * - **idle**: Component renders nothing (use null check in parent)
 * - **validating**: Spinner with loading message
 * - **success**: Green checkmark with completion message
 * - **error**: Red X with helpful hint text
 *
 * Accessibility:
 * - Uses `role="status"` for screen reader announcements
 * - Uses `aria-live="polite"` for non-intrusive updates
 * - Icons have `aria-hidden="true"` with `<title>` elements
 *
 * Design:
 * - Follows terminal aesthetic (monospace, minimal)
 * - Success: green accent color (#22c55e)
 * - Error: red color (#ef4444)
 * - Validating: neutral surface color
 *
 * @example
 * ```tsx
 * import { ValidationFeedback } from "@/components/kata/ValidationFeedback"
 *
 * function MyComponent() {
 *   const [state, setState] = useState<ValidationState>("idle")
 *   const [hint, setHint] = useState<string | null>(null)
 *
 *   return (
 *     <>
 *       {state !== "idle" && (
 *         <ValidationFeedback
 *           state={state}
 *           hint={hint}
 *           isKataComplete={false}
 *         />
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function ValidationFeedback({
  state,
  hint,
  successMessage,
  validatingMessage = "Validating solution...",
  isKataComplete = false,
}: ValidationFeedbackProps): JSX.Element {
  // Don't render anything in idle state
  if (state === "idle") {
    return <></>
  }

  // Determine styling based on state
  const wrapperClasses = {
    validating:
      "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]",
    success:
      "bg-[var(--color-accent)] bg-opacity-10 border-[var(--color-accent)] text-[var(--color-accent)]",
    error: "bg-red-500 bg-opacity-10 border-red-500 text-red-400",
  }[state]

  return (
    <div
      className={`
        mb-4 p-3 rounded border text-sm font-mono
        ${wrapperClasses}
      `}
      role="status"
      aria-live="polite"
    >
      {state === "validating" && (
        <div className="flex items-center gap-2">
          <div
            className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            aria-hidden="true"
          />
          <span>{validatingMessage}</span>
        </div>
      )}

      {state === "success" && (
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <title>Success</title>
            <path
              d="M3.5 8l3 3 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            {successMessage ??
              (isKataComplete
                ? "Kata complete! Returning to landing..."
                : "Exercise complete! Moving to next exercise...")}
          </span>
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <title>Error</title>
            <path
              d="M8 3v6M8 13v.01M3 8a5 5 0 1 1 10 0 5 5 0 0 1-10 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{hint ?? "Validation failed. Try again."}</span>
        </div>
      )}
    </div>
  )
}
