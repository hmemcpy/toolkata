/**
 * Callout - Tips, warnings, and notes for tutorial content.
 *
 * Features:
 * - Three variants: TIP (green), WARNING (yellow), NOTE (gray)
 * - Left border accent for visual distinction
 * - Accessible with role="note"
 * - Supports MDX inline code rendering
 *
 * @example
 * ```tsx
 * <Callout variant="tip">
 *   jj never loses data. Use <code>jj op log</code> to see all operations
 *   and <code>jj undo</code> to reverse any mistake.
 * </Callout>
 * ```
 */

type CalloutVariant = "tip" | "warning" | "note"

interface CalloutProps {
  /**
   * The variant of callout to display.
   * - tip: Green accent for helpful hints
   * - warning: Yellow accent for cautions
   * - note: Gray accent for general information
   * @default "note"
   */
  readonly variant?: CalloutVariant

  /**
   * Content to display inside the callout.
   */
  readonly children: React.ReactNode
}

/**
 * Variant configuration for styling and labels.
 */
const VARIANT_CONFIG = {
  tip: {
    label: "TIP",
    borderColor: "var(--color-accent)",
  },
  warning: {
    label: "WARNING",
    borderColor: "var(--color-warning)",
  },
  note: {
    label: "NOTE",
    borderColor: "var(--color-text-muted)",
  },
} as const

/**
 * Callout component for displaying tips, warnings, and notes.
 */
export function Callout({ variant = "note", children }: CalloutProps) {
  const config = VARIANT_CONFIG[variant]

  return (
    <div
      role="note"
      aria-label={config.label}
      className="my-4 border-l-3 border-transparent pl-4"
      style={{
        borderLeftColor: config.borderColor,
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
      }}
    >
      <div className="m-0 text-sm text-[var(--color-text)] leading-[var(--line-height-normal)]">
        <span className="font-semibold" style={{ color: config.borderColor }}>
          {config.label}:
        </span>{" "}
        {children}
      </div>
    </div>
  )
}
