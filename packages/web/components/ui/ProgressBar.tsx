import type { JSX } from "react"

export interface ProgressBarProps {
  readonly current: number
  readonly total: number
  readonly showLabel?: boolean
  readonly className?: string
  readonly variant?: "default" | "compact"
}

export function ProgressBar({
  current,
  total,
  showLabel = true,
  className = "",
  variant = "default",
}: ProgressBarProps): JSX.Element {
  const progressPercent = Math.round((current / total) * 100)
  const filledBlocks = Math.round((current / total) * 10)

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 font-mono ${className}`}>
        <span className="text-[var(--color-text-dim)] text-xs">[</span>
        <span className="text-[var(--color-accent)] text-xs">{"█".repeat(filledBlocks)}</span>
        <span className="text-[var(--color-border)] text-xs">{"░".repeat(10 - filledBlocks)}</span>
        <span className="text-[var(--color-text-dim)] text-xs">]</span>
        {showLabel && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {current}/{total}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`font-mono ${className}`}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${current} of ${total} steps complete`}
      tabIndex={0}
    >
      {/* ASCII-style progress visualization */}
      <div className="flex items-center gap-3">
        {/* Progress blocks */}
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }, (_, i) => {
            const blockKey = `progress-block-${i}-of-${total}-filled-${i < filledBlocks}`
            return (
              <div
                key={blockKey}
                className={`
                  w-2 h-4 transition-all duration-200
                  ${i < filledBlocks ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}
                `}
                style={
                  i < filledBlocks
                    ? {
                        boxShadow: "0 0 8px var(--color-accent-glow-strong)",
                      }
                    : undefined
                }
              />
            )
          })}
        </div>

        {/* Percentage and count */}
        {showLabel && (
          <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
            <span className="text-[var(--color-accent)]">{progressPercent}%</span>
            <span className="text-[var(--color-text-dim)]">│</span>
            <span>
              {current}/{total}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
