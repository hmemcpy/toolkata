/**
 * SideBySide - Two-column command comparison component.
 *
 * Displays commands side-by-side with subtle color-coded backgrounds
 * for visual distinction. Left column shows "from" tool (e.g., git),
 * right column shows "to" tool (e.g., jj).
 *
 * Features:
 * - Two-column layout (from tool on left, to tool on right)
 * - Subtle background tint for each column
 * - Mobile: stacks vertically with arrow indicator
 * - Semantic table for accessibility
 * - Respects TerminalContext showGitEquivalents setting (hides git column by default)
 *
 * @example
 * ```tsx
 * <SideBySide
 *   fromCommands={["git add .", "git commit -m 'message'"]}
 *   toCommands={["jj describe -m 'message'", "jj new"]}
 *   fromLabel="git"
 *   toLabel="jj"
 * />
 * ```
 */

import type { JSX } from "react"
import { useTerminalContext } from "../../contexts/TerminalContext"

interface SideBySideProps {
  /**
   * Commands to show on the left (from tool, e.g., git).
   */
  readonly fromCommands: readonly string[]

  /**
   * Commands to show on the right (to tool, e.g., jj).
   */
  readonly toCommands: readonly string[]

  /**
   * Label for the left column.
   * @default "git"
   */
  readonly fromLabel?: string

  /**
   * Label for the right column.
   * @default "jj"
   */
  readonly toLabel?: string

  /**
   * Optional comment or explanation to show alongside a command.
   * Maps index to comment text. Use empty string or skip index for no comment.
   */
  readonly fromComments?: readonly string[]
  readonly toComments?: readonly string[]

  /**
   * Whether to validate this snippet during build-time snippet validation.
   * Set to false to skip validation for pseudo-code or teaching examples.
   * This prop is only used by the validation system, not for rendering.
   */
  readonly validate?: boolean

  /**
   * Override for showing git equivalents.
   * If not provided, uses TerminalContext.showGitEquivalents.
   * When false, only the right (to) column is shown at full width.
   */
  readonly showGit?: boolean
}

/**
 * SideBySide component for comparing commands side-by-side.
 *
 * Shows "from" tool on the left (orange) and "to" tool on the right (green).
 * Respects TerminalContext.showGitEquivalents to optionally hide the git column.
 */
export function SideBySide({
  fromCommands,
  toCommands,
  fromLabel = "git",
  toLabel = "jj",
  fromComments = [],
  toComments = [],
  // validate is only used by the validation system
  validate: _validate,
  // Use prop override if provided, otherwise read from context
  showGit: showGitProp,
}: SideBySideProps): JSX.Element {
  // Read showGitEquivalents from context (defaults to false if not in provider)
  let contextShowGit = false
  try {
    const { showGitEquivalents } = useTerminalContext()
    contextShowGit = showGitEquivalents
  } catch {
    // Not in TerminalProvider, use default (false)
  }

  // Prop override takes precedence over context
  const showGit = showGitProp ?? contextShowGit

  return (
    <div className="my-6 overflow-x-auto">
      {/* When showGit is false: single column (full width) */}
      {!showGit ? (
        <div className="grid grid-cols-1">
          {/* Right column only (to tool - green) */}
          <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[rgba(57,217,108,0.08)]">
            <div className="border-b border-[var(--color-border)] px-4 py-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                {toLabel}
              </span>
            </div>
            <div className="p-4">
              {toCommands.map((cmd, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
                <div key={i} className="mb-3 last:mb-0">
                  <code className="block text-sm text-[var(--color-text)] !bg-transparent !p-0">
                    {cmd}
                  </code>
                  {toComments[i] && (
                    <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                      {toComments[i]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Desktop: side-by-side, Mobile: stacked
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left column (from tool - orange) */}
          <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[rgba(255,176,0,0.08)]">
            <div className="border-b border-[var(--color-border)] px-4 py-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                {fromLabel}
              </span>
            </div>
            <div className="p-4">
              {fromCommands.map((cmd, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
                <div key={i} className="mb-3 last:mb-0">
                  <code className="block text-sm text-[var(--color-text)] !bg-transparent !p-0">
                    {cmd}
                  </code>
                  {fromComments[i] && (
                    <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                      {fromComments[i]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: arrow indicator */}
          <div className="flex items-center justify-center md:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-[var(--color-accent)]"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>

          {/* Right column (to tool - green) */}
          <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[rgba(57,217,108,0.08)]">
            <div className="border-b border-[var(--color-border)] px-4 py-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                {toLabel}
              </span>
            </div>
            <div className="p-4">
              {toCommands.map((cmd, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
                <div key={i} className="mb-3 last:mb-0">
                  <code className="block text-sm text-[var(--color-text)] !bg-transparent !p-0">
                    {cmd}
                  </code>
                  {toComments[i] && (
                    <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                      {toComments[i]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Accessible table for screen readers (visually hidden) */}
      <div className="sr-only">
        <table
          aria-label={`Command comparison: ${fromLabel} vs ${toLabel}`}
          summary={`Side-by-side comparison of ${fromLabel} and ${toLabel} commands`}
        >
          <caption>
            Command comparison: {fromLabel} commands on the left, {toLabel} commands on the right
          </caption>
          <thead>
            <tr>
              <th scope="col">{fromLabel}</th>
              <th scope="col">{toLabel}</th>
            </tr>
          </thead>
          <tbody>
            {fromCommands.map((cmd, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
              <tr key={i}>
                <td>{cmd}</td>
                <td>{toCommands[i] ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
