/**
 * TerminalWithSuggestionsWrapper - Client component wrapper for lazy-loading TerminalWithSuggestions.
 *
 * This component handles the dynamic import of TerminalWithSuggestions with SSR disabled,
 * which is required for xterm.js (uses browser APIs like window and document).
 *
 * By lazy-loading the terminal component, we reduce the initial bundle size significantly.
 * The terminal is only loaded when the user scrolls to the "Try It" section.
 *
 * @example
 * ```tsx
 * <TerminalWithSuggestionsWrapper
 *   toolPair="jj-git"
 *   stepId="03"
 *   suggestedCommands={["jj status", "jj log"]}
 * />
 * ```
 */

"use client"

import dynamic from "next/dynamic"

/**
 * Lazy-load TerminalWithSuggestions for better performance.
 *
 * The terminal component with xterm.js is relatively large (~200KB gzipped).
 * We only load it when the user actually needs it (scrolls to "Try It" section).
 *
 * - ssr: false - xterm.js requires browser APIs (window, document)
 * - loading - shows a placeholder while the component loads
 */
const TerminalWithSuggestions = dynamic(
  () => import("./TerminalWithSuggestions").then((mod) => mod.TerminalWithSuggestions),
  {
    ssr: false,
    loading: () => (
      <div className="my-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex min-h-[200px] items-center justify-center p-8">
          <div className="text-center">
            <div
              className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-accent)]"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--color-text-muted)]">Loading terminal...</p>
          </div>
        </div>
      </div>
    ),
  },
)

export interface TerminalWithSuggestionsWrapperProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * The step ID for this terminal instance.
   */
  readonly stepId: string

  /**
   * Suggested commands to display below the terminal.
   */
  readonly suggestedCommands: readonly string[]
}

/**
 * TerminalWithSuggestionsWrapper component.
 *
 * Client component that lazy-loads TerminalWithSuggestions.
 * This allows the terminal to be loaded on-demand rather than in the initial bundle.
 */
export function TerminalWithSuggestionsWrapper({
  toolPair,
  stepId,
  suggestedCommands,
}: TerminalWithSuggestionsWrapperProps) {
  return (
    <TerminalWithSuggestions toolPair={toolPair} stepId={stepId} suggestedCommands={suggestedCommands} />
  )
}
