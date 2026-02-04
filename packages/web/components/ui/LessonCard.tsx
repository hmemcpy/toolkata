import GitOriginal from "devicons-react/icons/GitOriginal"
import ScalaOriginal from "devicons-react/icons/ScalaOriginal"
import TypescriptOriginal from "devicons-react/icons/TypescriptOriginal"
import Link from "next/link"
import type { JSX } from "react"
import type { TutorialEntry } from "../../content/pairings"
import { isPairing } from "../../content/pairings"

/**
 * Jujutsu (jj) icon - rotating arrows representing version control evolution.
 */
function JjIcon({ size = 24 }: { readonly size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[var(--color-text-dim)]"
      role="img"
      aria-label="jj version control icon"
    >
      <title>jj version control</title>
      {/* Rotating arrows */}
      <path
        d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.364 2.636"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.364-2.636"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 5.636L18.364 2.272 21.636 5.544"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 18.364L5.636 21.728 2.364 18.456"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Terminal icon for single-tool tutorials (tmux, vim, etc.).
 */
function TerminalIcon({ size = 24 }: { readonly size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[var(--color-text-dim)]"
      role="img"
      aria-label="terminal icon"
    >
      <title>terminal</title>
      <path
        d="M4 17l6-6-6-6M12 19h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Get the icon component for a tool pairing based on the icon name.
 * Returns null if no icon is defined.
 */
function getToolIcon(iconName: string | undefined, size = 24): JSX.Element | null {
  if (!iconName) return null

  switch (iconName) {
    case "scala":
      return <ScalaOriginal size={size} />
    case "typescript":
      return <TypescriptOriginal size={size} />
    case "git-branch":
      return <GitOriginal size={size} />
    case "arrows-clockwise":
      return <JjIcon size={size} />
    case "terminal":
      return <TerminalIcon size={size} />
    default:
      return null
  }
}

export interface LessonCardProps {
  readonly entry: TutorialEntry
  readonly completedSteps?: number | undefined
  readonly currentStep?: number | undefined
  readonly className?: string | undefined
}

export function LessonCard({
  entry,
  completedSteps = 0,
  currentStep,
  className = "",
}: LessonCardProps): JSX.Element {
  const isPublished = entry.status === "published"
  const hasProgress = completedSteps > 0
  const progressPercent = Math.round((completedSteps / entry.steps) * 100)

  const isPairingEntry = isPairing(entry)

  return (
    <Link
      href={`/${entry.slug}`}
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
      aria-label={
        isPairingEntry
          ? `${entry.to.name} if you know ${entry.from.name}${!isPublished ? " (coming soon)" : ""}`
          : `Learn ${entry.tool.name}${!isPublished ? " (coming soon)" : ""}`
      }
    >
      {/* Terminal window header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-error)] opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)] opacity-60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] opacity-60" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {getToolIcon(isPairingEntry ? entry.to.icon : entry.tool.icon, 16)}
          <span className="text-[10px] text-[var(--color-text-dim)] font-mono">
            {entry.slug}.sh
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="p-5">
        {/* Tool names - show arrow for pairings, just tool name for tutorials */}
        <div className="mb-3">
          <h2 className="text-lg font-bold font-mono flex items-center gap-2">
            {isPairingEntry ? (
              <>
                <span className="text-[var(--color-accent)]">{entry.to.name}</span>
                <span className="text-[var(--color-text-dim)]">←</span>
                <span className="text-[var(--color-accent-alt)]">{entry.from.name}</span>
              </>
            ) : (
              <span className="text-[var(--color-accent)]">{entry.tool.name}</span>
            )}
          </h2>
        </div>

        {/* Progress bar and CTA - data from server-side cookies */}
        {isPublished ? (
          <div className="space-y-3">
            {hasProgress ? (
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
                  {completedSteps}/{entry.steps}
                </span>
              </div>
            ) : (
              <div className="text-xs text-[var(--color-text-muted)] font-mono flex items-center gap-2">
                <span className="text-[var(--color-text-dim)]">$</span>
                <span>{entry.steps} steps</span>
                <span className="text-[var(--color-text-dim)]">·</span>
                <span>{entry.estimatedTime}</span>
              </div>
            )}

            <div className="font-mono text-sm text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)]">
              {hasProgress && currentStep ? `→ continue step ${currentStep}` : "→ start learning"}
            </div>
          </div>
        ) : (
          <div className="font-mono text-xs text-[var(--color-text-dim)]">
            <span className="text-[var(--color-warning)]"># </span>
            coming soon...
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[var(--color-border)] mt-3 font-mono text-[10px]">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-dim)]"
              >
                {tag}
              </span>
            ))}
          </div>
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
