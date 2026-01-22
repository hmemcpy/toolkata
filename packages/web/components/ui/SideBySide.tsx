/**
 * SideBySide - Two-column command comparison component.
 *
 * Displays commands side-by-side with subtle color-coded backgrounds
 * for visual distinction. Supports bidirectional comparison.
 *
 * Features:
 * - Two-column layout with direction toggle support
 * - Subtle background tint for each column
 * - Mobile: stacks vertically with arrow indicator
 * - Semantic table for accessibility
 *
 * @example
 * ```tsx
 * // Default direction: git → jj
 * <SideBySide
 *   fromCommands={["git add .", "git commit -m 'message'"]}
 *   toCommands={["jj describe -m 'message'", "jj new"]}
 *   fromLabel="git"
 *   toLabel="jj"
 * />
 *
 * // Reversed direction: jj → git
 * <SideBySide
 *   fromCommands={["jj log"]}
 *   toCommands={["git log"]}
 *   fromLabel="jj"
 *   toLabel="git"
 *   isReversed={true}
 * />
 * ```
 */

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
   * Reverse the visual column order and colors.
   *
   * When `true`:
   * - toCommands appears on the LEFT with green background
   * - fromCommands appears on the RIGHT with orange background
   * - Labels swap positions visually
   *
   * Semantic props remain unchanged (fromCommands always means "from" tool).
   * This allows the same data to be viewed in either direction.
   *
   * @default false
   */
  readonly isReversed?: boolean
}

/**
 * SideBySide component for comparing commands side-by-side.
 */
export function SideBySide({
  fromCommands,
  toCommands,
  fromLabel = "git",
  toLabel = "jj",
  fromComments = [],
  toComments = [],
  isReversed = false,
}: SideBySideProps) {
  // When reversed, visually swap columns while keeping semantic props unchanged
  const leftCommands = isReversed ? toCommands : fromCommands
  const rightCommands = isReversed ? fromCommands : toCommands
  const leftComments = isReversed ? toComments : fromComments
  const rightComments = isReversed ? fromComments : toComments
  const leftLabel = isReversed ? toLabel : fromLabel
  const rightLabel = isReversed ? fromLabel : toLabel
  const leftBg = isReversed
    ? "bg-[rgba(34, 197, 94, 0.05)]" // jj/green
    : "bg-[rgba(249, 115, 22, 0.05)]" // git/orange
  const rightBg = isReversed
    ? "bg-[rgba(249, 115, 22, 0.05)]" // git/orange
    : "bg-[rgba(34, 197, 94, 0.05)]" // jj/green

  return (
    <div className="my-6 overflow-x-auto">
      {/* Desktop: side-by-side, Mobile: stacked */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left column */}
        <div className={`overflow-hidden rounded border border-[var(--color-border)] ${leftBg}`}>
          <div className="border-b border-[var(--color-border)] px-4 py-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              {leftLabel}
            </span>
          </div>
          <div className="p-4">
            {leftCommands.map((cmd, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
              <div key={i} className="mb-3 last:mb-0">
                <code className="block text-sm text-[var(--color-text)]">{cmd}</code>
                {leftComments[i] && (
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {leftComments[i]}
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

        {/* Right column */}
        <div className={`overflow-hidden rounded border border-[var(--color-border)] ${rightBg}`}>
          <div className="border-b border-[var(--color-border)] px-4 py-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              {rightLabel}
            </span>
          </div>
          <div className="p-4">
            {rightCommands.map((cmd, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
              <div key={i} className="mb-3 last:mb-0">
                <code className="block text-sm text-[var(--color-text)]">{cmd}</code>
                {rightComments[i] && (
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {rightComments[i]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accessible table for screen readers (visually hidden) */}
      <div className="sr-only">
        <table
          aria-label={`Command comparison: ${fromLabel} vs ${toLabel}`}
          summary={`Side-by-side comparison of ${fromLabel} and ${toLabel} commands`}
        >
          <caption>
            {isReversed
              ? `Command comparison: ${toLabel} commands on the left, ${fromLabel} commands on the right`
              : `Command comparison: ${fromLabel} commands on the left, ${toLabel} commands on the right`}
          </caption>
          <thead>
            <tr>
              <th scope="col">{leftLabel}</th>
              <th scope="col">{rightLabel}</th>
            </tr>
          </thead>
          <tbody>
            {leftCommands.map((cmd, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
              <tr key={i}>
                <td>{cmd}</td>
                <td>{rightCommands[i] ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
