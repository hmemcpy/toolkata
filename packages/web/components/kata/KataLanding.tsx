"use client"

import Link from "next/link"
import { useEffect, type JSX } from "react"
import { useKataProgress } from "../../contexts/KataProgressContext"
import { useTerminalContext } from "../../contexts/TerminalContext"
import type { KataFrontmatter } from "../../lib/content/schemas"
import type { SandboxConfig } from "../ui/InteractiveTerminal"

/**
 * Status of a Kata for display purposes.
 */
type KataStatus = "locked" | "unlocked" | "completed"

/**
 * Props for individual Kata card display.
 */
export interface KataCardProps {
  readonly toolPair: string
  readonly frontmatter: KataFrontmatter
  readonly kataId: string
  readonly status: KataStatus
  readonly stats?:
    | {
        readonly attempts: number
        readonly completedAt: string
      }
    | undefined
}

/**
 * Individual Kata card component.
 *
 * Displays:
 * - Kata number, title, and description
 * - Status icon (locked, unlocked, completed)
 * - Lock/unlock state with appropriate messaging
 * - Start button (for unlocked) or lock message (for locked)
 * - Completion stats (for completed Katas)
 */
export function KataCard({
  toolPair,
  frontmatter,
  kataId,
  status,
  stats,
}: KataCardProps): JSX.Element {
  const kataNum = Number.parseInt(kataId, 10)

  // Status icon rendering
  const renderStatusIcon = (): JSX.Element => {
    switch (status) {
      case "locked":
        return (
          <div
            className="w-10 h-10 rounded-full bg-[var(--color-border)] flex items-center justify-center"
            aria-label="Locked"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--color-text-dim)]"
            >
              <title>Locked</title>
              <path
                d="M4.5 7V5.5a3.5 3.5 0 1 1 7 0V7M4.5 7h7M4.5 7v4.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )
      case "unlocked":
        return (
          <div
            className="w-10 h-10 rounded-full bg-[var(--color-accent)] bg-opacity-20 flex items-center justify-center"
            aria-label="Unlocked - Ready to start"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--color-accent)]"
            >
              <title>Play</title>
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          </div>
        )
      case "completed":
        return (
          <div
            className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center"
            aria-label="Completed"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--color-bg)]"
            >
              <title>Completed</title>
              <path
                d="M3.5 8l3 3 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )
    }
  }

  // Completion date formatting
  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date)
  }

  return (
    <div
      className={`
        relative bg-[var(--color-surface)] border
        ${status === "locked" ? "border-[var(--color-border)] opacity-60" : "border-[var(--color-border)]"}
        ${status === "unlocked" ? "hover:border-[var(--color-accent)] transition-colors" : ""}
        p-5
      `}
    >
      {/* Header: Number + Status Icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-sm text-[var(--color-text-dim)]">
          <span className="text-[var(--color-accent)]">{kataNum}</span>
          <span className="mx-1">/</span>
          <span>7</span>
        </div>
        {renderStatusIcon()}
      </div>

      {/* Title and Focus */}
      <h3 className="text-base font-bold font-mono text-[var(--color-text-primary)] mb-1">
        {frontmatter.title}
      </h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-3 leading-relaxed">
        {frontmatter.focus}
      </p>

      {/* Duration */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)] font-mono mb-4">
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <title>Duration</title>
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{frontmatter.duration}</span>
        <span className="text-[var(--color-border)]">·</span>
        <span>{frontmatter.exercises.length} exercises</span>
      </div>

      {/* Status-specific content */}
      {status === "completed" && stats ? (
        <div className="pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--color-accent)]">Completed</span>
            <span className="text-[var(--color-text-muted)]">
              {stats.attempts} attempt{stats.attempts !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-[10px] text-[var(--color-text-dim)] mt-1">
            {formatDate(stats.completedAt)}
          </div>
        </div>
      ) : status === "locked" ? (
        <div className="pt-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)] font-mono">
            Complete previous Kata to unlock
          </p>
        </div>
      ) : (
        <div className="pt-3 border-t border-[var(--color-border)]">
          <Link
            href={`/${toolPair}/kata/${kataId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] font-mono text-sm hover:bg-[var(--color-accent-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label={`Start ${frontmatter.title}`}
          >
            <span>Start</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <title>Arrow right</title>
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}

/**
 * Props for the KataLanding component.
 */
export interface KataLandingProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Array of Kata frontmatter data.
   * Ordered by kata number.
   */
  readonly katas: readonly {
    readonly frontmatter: KataFrontmatter
    readonly kataId: string
  }[]

  /**
   * Whether user was redirected from attempting to access a locked Kata.
   * Shows a flash message when true.
   */
  readonly lockedRedirect: boolean

  /**
   * Sandbox configuration for the terminal.
   */
  readonly sandboxConfig?: SandboxConfig
}

/**
 * Kata Landing Page Component
 *
 * Displays all Katas with their unlock status and progress.
 *
 * Features:
 * - Progress indicator at top (X/N completed)
 * - Vertical list of Kata cards
 * - Lock/unlock/completed states
 * - Empty state for users who haven't completed Step 12
 * - Completion stats for finished Katas
 * - Flash message when redirected from locked Kata access
 *
 * @example
 * ```tsx
 * import { KataLanding } from "@/components/kata/KataLanding"
 *
 * export function KataPage() {
 *   const katas = await loadAllKatas("jj-git")
 *   const { completedKatas, kataStats, isKataUnlocked } = useKataProgress()
 *   const lockedRedirect = searchParams.locked === "true"
 *
 *   return (
 *     <KataLanding
 *       toolPair="jj-git"
 *       katas={katas}
 *       lockedRedirect={lockedRedirect}
 *     />
 *   )
 * }
 * ```
 */
export function KataLanding({
  toolPair,
  katas,
  lockedRedirect,
  sandboxConfig,
}: KataLandingProps): JSX.Element {
  const { completedKatas, kataStats, isKataUnlocked } = useKataProgress()
  const { setSandboxConfig } = useTerminalContext()

  // Register sandbox config in context on mount
  useEffect(() => {
    setSandboxConfig(sandboxConfig)
  }, [sandboxConfig, setSandboxConfig])

  // Get status for each Kata
  const getKataStatus = (kataId: string): KataStatus => {
    if (completedKatas.includes(kataId)) {
      return "completed"
    }
    if (isKataUnlocked(kataId)) {
      return "unlocked"
    }
    return "locked"
  }

  const completedCount = completedKatas.length

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Flash message for locked Kata redirect */}
      {lockedRedirect && (
        <div
          className="mb-6 bg-[var(--color-surface)] border border-[var(--color-warning)] border-opacity-40 p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--color-warning)] flex-shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <title>Locked</title>
              <path
                d="M4.5 7V5.5a3.5 3.5 0 1 1 7 0V7M4.5 7h7M4.5 7v4.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-[var(--color-text-muted)] font-mono">
              Complete previous Kata to unlock
            </p>
          </div>
        </div>
      )}

      {/* Header with progress */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono text-[var(--color-text-primary)] mb-2">
          Kata Practice
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Hands-on scenarios with auto-validation. Complete each kata to unlock the next.
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-4 mb-2">
          <div className="font-mono text-sm">
            <span className="text-[var(--color-accent)]">{completedCount}</span>
            <span className="text-[var(--color-text-dim)]">/{katas.length} Katas completed</span>
          </div>
        </div>
        <div className="w-full h-1 bg-[var(--color-border)] rounded overflow-hidden">
          <div
            className="h-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${katas.length > 0 ? (completedCount / katas.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* All Katas completed message */}
      {completedCount === katas.length && (
        <div className="mb-6 bg-[var(--color-surface)] border border-[var(--color-accent)] border-opacity-30 p-5">
          <div className="flex items-start gap-3 mb-4">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--color-accent)] flex-shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <title>Completed</title>
              <path
                d="M16.25 5.5L7.75 14L3.75 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <h2 className="text-sm font-bold font-mono text-[var(--color-text-primary)] mb-1">
                All Katas completed
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                You're ready to use jj in real projects. Keep practicing to maintain muscle memory.
              </p>
            </div>
          </div>

          {/* Final stats */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
            <div>
              <div className="text-[10px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
                Total Attempts
              </div>
              <div className="text-lg font-mono text-[var(--color-accent)]">
                {Object.values(kataStats).reduce((sum, stat) => sum + stat.attempts, 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
                Exercises Completed
              </div>
              <div className="text-lg font-mono text-[var(--color-accent)]">
                {Object.values(kataStats).reduce(
                  (sum, stat) => sum + stat.exercisesCompleted.length,
                  0,
                )}
              </div>
            </div>
          </div>

          {/* Completion date */}
          {Object.values(kataStats).length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <div className="text-[10px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
                Final Kata Completed
              </div>
              <div className="text-xs font-mono text-[var(--color-text-muted)]">
                {(() => {
                  const lastKataStat = Object.values(kataStats)
                    .filter((stat) => stat.completedAt)
                    .sort(
                      (a, b) =>
                        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
                    )[0]
                  return lastKataStat
                    ? new Date(lastKataStat.completedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kata cards list */}
      <div className="space-y-4">
        {katas.map(({ frontmatter, kataId }) => {
          const status = getKataStatus(kataId)
          const stats = kataStats[kataId]

          return (
            <KataCard
              key={kataId}
              toolPair={toolPair}
              frontmatter={frontmatter}
              kataId={kataId}
              status={status}
              stats={stats}
            />
          )
        })}
      </div>
    </div>
  )
}
