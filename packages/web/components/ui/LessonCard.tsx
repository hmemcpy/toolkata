import type { TutorialEntry } from "@/content/pairings"
import { isPairing } from "@/content/pairings"
import GitOriginal from "devicons-react/icons/GitOriginal"
import ScalaOriginal from "devicons-react/icons/ScalaOriginal"
import TypescriptOriginal from "devicons-react/icons/TypescriptOriginal"
import Link from "next/link"
import type { CSSProperties, JSX } from "react"

const CATEGORY_STYLE: Record<
  TutorialEntry["category"],
  { readonly lane: string; readonly accent: string; readonly glow: string }
> = {
  "Version Control": {
    lane: "vcs",
    accent: "var(--color-accent)",
    glow: "var(--color-accent-glow)",
  },
  "Frameworks & Libraries": {
    lane: "effects",
    accent: "var(--color-framework)",
    glow: "rgba(92, 207, 148, 0.15)",
  },
  "Package Management": {
    lane: "pkg",
    accent: "var(--color-warning)",
    glow: "rgba(255, 220, 0, 0.14)",
  },
  "Build Tools": {
    lane: "build",
    accent: "var(--color-ce)",
    glow: "var(--color-ce-glow)",
  },
  Other: {
    lane: "workflow",
    accent: "var(--color-accent-alt)",
    glow: "var(--color-accent-alt-glow)",
  },
}

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
  const inferredFromCurrentStep = currentStep !== undefined && currentStep > 1 ? currentStep - 1 : 0
  const effectiveCompletedSteps = Math.max(completedSteps, inferredFromCurrentStep)
  const hasProgress = effectiveCompletedSteps > 0
  const progressPercent = Math.round((effectiveCompletedSteps / entry.steps) * 100)
  const continueStep =
    currentStep !== undefined && currentStep > 1 && currentStep <= entry.steps
      ? currentStep
      : undefined
  const isPairingEntry = isPairing(entry)
  const categoryStyle = CATEGORY_STYLE[entry.category]
  const cardStyle = {
    "--card-accent": categoryStyle.accent,
    "--card-glow": categoryStyle.glow,
  } as CSSProperties

  return (
    <Link
      href={`/${entry.slug}`}
      style={cardStyle}
      className={`
        group block relative overflow-hidden
        bg-[var(--color-surface)]
        border border-[var(--color-border)]
        p-4 sm:p-5
        transition-all duration-300
        hover:border-[var(--card-accent)]
        focus:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--card-accent)]
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
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="px-1.5 py-0.5 border border-[var(--color-border)] font-mono text-[10px]"
            style={{ color: categoryStyle.accent }}
          >
            [{categoryStyle.lane}]
          </span>
          {getToolIcon(isPairingEntry ? entry.to.icon : entry.tool.icon, 16)}
        </div>
        <span className="font-mono text-[10px] text-[var(--color-text-dim)]">{entry.slug}</span>
      </div>

      {/* Tool names - show arrow for pairings, just tool name for tutorials */}
      <div className="mb-3">
        <h2 className="text-lg font-bold font-mono flex items-center gap-2">
          {isPairingEntry ? (
            <>
              <span style={{ color: categoryStyle.accent }}>{entry.to.name}</span>
              <span className="text-[var(--color-text-dim)]">←</span>
              <span className="text-[var(--color-accent-alt)]">{entry.from.name}</span>
            </>
          ) : (
            <span style={{ color: categoryStyle.accent }}>{entry.tool.name}</span>
          )}
        </h2>
      </div>

      {/* Progress and CTA */}
      {isPublished ? (
        <div className="space-y-3">
          {hasProgress ? (
            <div className="font-mono text-xs">
              <span className="text-[var(--color-text-dim)]">[</span>
              <span style={{ color: categoryStyle.accent }}>
                {"█".repeat(Math.round(progressPercent / 10))}
              </span>
              <span className="text-[var(--color-border)]">
                {"░".repeat(10 - Math.round(progressPercent / 10))}
              </span>
              <span className="text-[var(--color-text-dim)]">]</span>
              <span className="text-[var(--color-text-muted)] ml-2">
                {effectiveCompletedSteps}/{entry.steps}
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

          <div className="font-mono text-sm" style={{ color: categoryStyle.accent }}>
            {continueStep ? `→ continue step ${continueStep}` : "→ start learning"}
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

      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, var(--card-glow) 0%, transparent 70%)",
        }}
      />
    </Link>
  )
}
