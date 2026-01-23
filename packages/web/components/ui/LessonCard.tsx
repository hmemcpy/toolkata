import Link from "next/link"
import type { JSX } from "react"
import type { ToolPairing } from "../../content/pairings"

export interface LessonCardProps {
  readonly pairing: ToolPairing
  readonly completedSteps?: number
  readonly currentStep?: number
  readonly className?: string
  readonly skeleton?: boolean
}

export function LessonCard({
  pairing,
  completedSteps = 0,
  currentStep,
  className = "",
  skeleton = false,
}: LessonCardProps): JSX.Element {
  const isPublished = pairing.status === "published"
  const hasProgress = completedSteps > 0
  const progressPercent = Math.round((completedSteps / pairing.steps) * 100)

  return (
    <Link
      href={`/${pairing.slug}`}
      className={`
        group block relative
        bg-[var(--color-surface)]
        border border-[var(--color-border)]
        p-0
        transition-all duration-300
        hover:border-[var(--color-accent)]
        focus:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
        card-glow
        ${!isPublished ? "opacity-50 pointer-events-none" : ""}
        ${className}
      `}
      tabIndex={isPublished ? 0 : -1}
      aria-label={`${pairing.to.name} if you know ${pairing.from.name}${!isPublished ? " (coming soon)" : ""}`}
    >
      {/* Terminal window header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-error)] opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)] opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] opacity-60" />
        </div>
        <span className="text-[10px] text-[var(--color-text-dim)] font-mono ml-auto">
          {pairing.slug}.sh
        </span>
      </div>

      {/* Card content */}
      <div className="p-5">
        {skeleton ? (
          /* Full skeleton loading state - matches card content dimensions */
          <div className="space-y-3">
            {/* Title skeleton */}
            <div className="h-6 w-28 bg-[var(--color-border)] rounded animate-pulse" />
            {/* Description skeleton */}
            <div className="h-4 w-36 bg-[var(--color-border)] rounded animate-pulse" />
            {/* Progress skeleton */}
            <div className="h-4 w-32 bg-[var(--color-border)] rounded animate-pulse" />
            {/* CTA skeleton */}
            <div className="h-5 w-24 bg-[var(--color-border)] rounded animate-pulse" />
          </div>
        ) : (
          <>
            {/* Tool names with arrow */}
            <div className="mb-3">
              <h2 className="text-lg font-bold font-mono flex items-center gap-2">
                <span className="text-[var(--color-accent)]">{pairing.to.name}</span>
                <span className="text-[var(--color-text-dim)]">←</span>
                <span className="text-[var(--color-accent-alt)]">{pairing.from.name}</span>
              </h2>
            </div>

            {/* Description as comment */}
            <p className="text-xs text-[var(--color-text-muted)] mb-4 font-mono">
              <span className="text-[var(--color-text-dim)]"># </span>
              {pairing.to.description}
            </p>

            {/* Progress or step count */}
            {isPublished ? (
              <div className="space-y-3">
                {hasProgress ? (
                  <div className="space-y-2">
                    {/* ASCII-style progress bar */}
                    <div className="font-mono text-xs">
                      <span className="text-[var(--color-text-dim)]">[</span>
                      <span className="text-[var(--color-accent)]">
                        {"█".repeat(Math.round(progressPercent / 10))}
                      </span>
                      <span className="text-[var(--color-border)]">
                        {"░".repeat(10 - Math.round(progressPercent / 10))}
                      </span>
                      <span className="text-[var(--color-text-dim)]">]</span>
                      <span className="text-[var(--color-text-muted)] ml-2">
                        {completedSteps}/{pairing.steps}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] font-mono flex items-center gap-2">
                    <span className="text-[var(--color-text-dim)]">$</span>
                    <span>{pairing.steps} steps</span>
                    <span className="text-[var(--color-text-dim)]">·</span>
                    <span>{pairing.estimatedTime}</span>
                  </div>
                )}

                {/* CTA */}
                <div className="font-mono text-sm text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)]">
                  {hasProgress && currentStep ? (
                    <>→ continue step {currentStep}</>
                  ) : (
                    <>→ start learning</>
                  )}
                </div>
              </div>
            ) : (
              <div className="font-mono text-xs text-[var(--color-text-dim)]">
                <span className="text-[var(--color-warning)]"># </span>
                coming soon...
              </div>
            )}
          </>
        )}
      </div>

      {/* Hover glow effect overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-accent-glow) 0%, transparent 70%)",
        }}
      />
    </Link>
  )
}
