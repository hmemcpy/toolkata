/**
 * SideBySide - Two-column command comparison component.
 *
 * Displays commands side-by-side with subtle color-coded backgrounds
 * for visual distinction. Left column shows "from" tool (git),
 * right column shows "to" tool (jj).
 *
 * Features:
 * - Two-column layout (git on left, jj on right)
 * - Subtle background tint for each column
 * - Mobile: stacks vertically with arrow indicator
 * - Semantic table for accessibility
 * - Supports direction toggle via DirectionContext
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

"use client"

import { useDirectionContext } from "../../contexts/DirectionContext"
import type { JSX } from "react"

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
}

/**
 * Column data for rendering
 */
interface ColumnData {
  readonly label: string
  readonly commands: readonly string[]
  readonly comments: readonly string[]
  readonly bgClass: string
  readonly textColorClass: string
}

/**
 * SideBySide component for comparing commands side-by-side.
 *
 * When direction is reversed (via DirectionContext), the columns swap:
 * - Normal (git→jj): git left (orange), jj right (green)
 * - Reversed (jj→git): jj left (green), git right (orange)
 */
export function SideBySide({
  fromCommands,
  toCommands,
  fromLabel = "git",
  toLabel = "jj",
  fromComments = [],
  toComments = [],
}: SideBySideProps): JSX.Element {
  const { isReversed } = useDirectionContext()

  // When reversed, swap the columns
  // fromCommands (git) moves to right (orange), toCommands (jj) moves to left (green)
  const leftColumn: ColumnData = isReversed
    ? {
        label: toLabel,
        commands: toCommands,
        comments: toComments,
        bgClass: "bg-[rgba(57,217,108,0.08)]", // green for jj
        textColorClass: "text-[var(--color-accent)]",
      }
    : {
        label: fromLabel,
        commands: fromCommands,
        comments: fromComments,
        bgClass: "bg-[rgba(255,176,0,0.08)]", // orange for git
        textColorClass: "text-[var(--color-accent-alt)]",
      }

  const rightColumn: ColumnData = isReversed
    ? {
        label: fromLabel,
        commands: fromCommands,
        comments: fromComments,
        bgClass: "bg-[rgba(255,176,0,0.08)]", // orange for git
        textColorClass: "text-[var(--color-accent-alt)]",
      }
    : {
        label: toLabel,
        commands: toCommands,
        comments: toComments,
        bgClass: "bg-[rgba(57,217,108,0.08)]", // green for jj
        textColorClass: "text-[var(--color-accent)]",
      }

  // For accessibility table, preserve semantic order (from, to)
  // Visual order changes but semantic order stays the same
  const tableLeftLabel = fromLabel
  const tableRightLabel = toLabel

  return (
    <div className="my-6 overflow-x-auto">
      {/* Desktop: side-by-side, Mobile: stacked */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left column */}
        <div
          className={`overflow-hidden rounded border border-[var(--color-border)] ${leftColumn.bgClass}`}
        >
          <div className="border-b border-[var(--color-border)] px-4 py-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              {leftColumn.label}
            </span>
          </div>
          <div className="p-4">
            {leftColumn.commands.map((cmd, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
              <div key={i} className="mb-3 last:mb-0">
                <code className="block text-sm text-[var(--color-text)] !bg-transparent !p-0">
                  {cmd}
                </code>
                {leftColumn.comments[i] && (
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {leftColumn.comments[i]}
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
        <div
          className={`overflow-hidden rounded border border-[var(--color-border)] ${rightColumn.bgClass}`}
        >
          <div className="border-b border-[var(--color-border)] px-4 py-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              {rightColumn.label}
            </span>
          </div>
          <div className="p-4">
            {rightColumn.commands.map((cmd, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
              <div key={i} className="mb-3 last:mb-0">
                <code className="block text-sm text-[var(--color-text)] !bg-transparent !p-0">
                  {cmd}
                </code>
                {rightColumn.comments[i] && (
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {rightColumn.comments[i]}
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
          aria-label={`Command comparison: ${tableLeftLabel} vs ${tableRightLabel}`}
          summary={`Side-by-side comparison of ${tableLeftLabel} and ${tableRightLabel} commands`}
        >
          <caption>
            Command comparison: {tableLeftLabel} commands on the left, {tableRightLabel} commands on
            the right
          </caption>
          <thead>
            <tr>
              <th scope="col">{tableLeftLabel}</th>
              <th scope="col">{tableRightLabel}</th>
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
