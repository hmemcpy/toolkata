import type { JSX, CSSProperties } from "react"

export interface ProgressBarProps {
  readonly current: number
  readonly total: number
  readonly showLabel?: boolean
  readonly className?: string
}

export function ProgressBar({
  current,
  total,
  showLabel = true,
  className = "",
}: ProgressBarProps): JSX.Element {
  const filledBlocks = Math.round((current / total) * 8)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="flex h-4 items-center gap-0.5"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${current} of ${total} steps complete`}
        tabIndex={0}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={`block-${i < filledBlocks ? "filled" : "empty"}-${i}`}
            className="h-3 w-1.5 rounded-sm"
            style={
              {
                "--block-color": i < filledBlocks ? "var(--color-accent)" : "var(--color-border)",
              } as CSSProperties
            }
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-sm font-mono text-[var(--color-text-muted)]">
          {current}/{total}
        </span>
      )}
    </div>
  )
}
