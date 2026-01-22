import type { JSX } from "react"
import Link from "next/link"
import { ProgressBar } from "./ProgressBar"
import type { ToolPairing } from "../../content/pairings"

export interface ComparisonCardProps {
  readonly pairing: ToolPairing
  readonly completedSteps?: number
  readonly currentStep?: number
  readonly className?: string
}

export function ComparisonCard({
  pairing,
  completedSteps = 0,
  currentStep,
  className = "",
}: ComparisonCardProps): JSX.Element {
  const isPublished = pairing.status === "published"
  const hasProgress = completedSteps > 0

  return (
    <Link
      href={`/${pairing.slug}`}
      className={`
        group block
        bg-[var(--color-surface)]
        border border-[var(--color-border)]
        rounded-[var(--radius-md)]
        p-6
        transition-all duration-[var(--transition-normal)]
        hover:border-[var(--color-border-focus)]
        hover:bg-[var(--color-surface-hover)]
        focus:outline-none
        focus-visible:[var(--focus-ring)]
        ${!isPublished ? "opacity-60" : ""}
        ${className}
      `}
      tabIndex={isPublished ? 0 : -1}
      aria-label={`${pairing.to.name} if you know ${pairing.from.name}${!isPublished ? " (coming soon)" : ""}`}
    >
      {/* Header: Tool names */}
      <div className="mb-3">
        <h2 className="text-xl font-bold font-mono text-[var(--color-text)]">
          {pairing.to.name} ← {pairing.from.name}
        </h2>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--color-text-muted)] mb-4 font-mono">
        {pairing.to.description}
      </p>

      {/* Progress or step count */}
      {isPublished ? (
        <div className="space-y-3">
          {hasProgress ? (
            <ProgressBar current={completedSteps} total={pairing.steps} />
          ) : (
            <div className="text-sm text-[var(--color-text-muted)] font-mono">
              {pairing.steps} steps · {pairing.estimatedTime}
            </div>
          )}

          {/* CTA button */}
          <div
            className={`
              text-sm font-mono font-medium
              ${hasProgress ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"}
              group-hover:text-[var(--color-accent-hover)]
            `}
          >
            {hasProgress && currentStep ? (
              <span>Continue Step {currentStep} →</span>
            ) : (
              <span>Start Learning →</span>
            )}
          </div>
        </div>
      ) : (
        <div
          className="
            text-sm font-mono
            text-[var(--color-text-muted)]
            py-2 px-3
            bg-[var(--color-bg)]
            rounded-[var(--radius-sm)]
            inline-block
          "
        >
          Coming soon
        </div>
      )}
    </Link>
  )
}
