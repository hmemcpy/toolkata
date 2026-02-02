"use client"

import { useState, useCallback, useEffect } from "react"
import { Effect, pipe } from "effect"
import { CMSClient, CMSClientLive } from "@/services/cms-client"
import { getSandboxHttpUrl } from "@/lib/sandbox-url"
import Link from "next/link"

/**
 * Dashboard metric card.
 */
interface MetricCard {
  readonly label: string
  readonly value: string | number
  readonly icon: string
  readonly href?: string
}

/**
 * Run an Effect with the CMS client.
 */
function runCMSEffect<A, E>(
  effect: Effect.Effect<A, E, CMSClient>,
): Promise<A> {
  return Effect.runPromise(
    pipe(effect, Effect.provide(CMSClientLive)),
  )
}

/**
 * Admin Dashboard Page.
 *
 * Provides an overview of the entire system including:
 * - GitHub API rate limit status
 * - Recent commits/activity
 * - Quick links to common actions
 * - System health indicators
 *
 * Follows the terminal aesthetic design system.
 */
export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [cmsAvailable, setCmsAvailable] = useState(false)
  const [sandboxAvailable, setSandboxAvailable] = useState(false)
  const [_githubAvailable, setGithubAvailable] = useState(false)
  const [rateLimit, setRateLimit] = useState<{ readonly remaining: number; readonly limit: number } | null>(null)
  const [recentCommits, setRecentCommits] = useState<{ readonly sha: string; readonly message: string; readonly date: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  // Check system status on mount
  useEffect(() => {
    async function checkStatus() {
      setIsLoading(true)
      setError(null)

      try {
        // Check CMS status
        try {
          const client = await runCMSEffect(CMSClient)
          const status = await runCMSEffect(client.getStatus())
          setCmsAvailable(status.available)
          setGithubAvailable(status.available)

          // Get rate limit info if GitHub is available
          if (status.available) {
            try {
              const commitsResponse = await runCMSEffect(client.getCommitHistory({ limit: 5 }))
              setRecentCommits(
                commitsResponse.commits.map((c) => ({
                  sha: c.shortSha,
                  message: c.message.split("\n")[0] ?? c.message,
                  date: c.author.date,
                })),
              )
            } catch {
              // Commits might fail if repo is empty
            }
          }
        } catch {
          setCmsAvailable(false)
          setGithubAvailable(false)
        }

        // Check sandbox status
        try {
          const sandboxUrl = getSandboxHttpUrl()
          const response = await fetch(`${sandboxUrl}/health`, {
            signal: AbortSignal.timeout(5000),
          })
          setSandboxAvailable(response.ok)
        } catch {
          setSandboxAvailable(false)
        }

        // Get GitHub rate limit from API
        try {
          const token = process.env["NEXT_PUBLIC_GITHUB_TOKEN"]
          if (token) {
            const response = await fetch("https://api.github.com/rate_limit", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: AbortSignal.timeout(5000),
            })
            if (response.ok) {
              const data = (await response.json()) as { resources: { core: { remaining: number; limit: number } } }
              setRateLimit({
                remaining: data.resources.core.remaining,
                limit: data.resources.core.limit,
              })
            }
          }
        } catch {
          // Rate limit check is optional
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [])

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }, [])

  // Dashboard metrics
  const metrics: readonly MetricCard[] = [
    {
      label: "Content Files",
      value: cmsAvailable ? "✓" : "—",
      icon: "[📄]",
      href: "/admin/cms",
    },
    {
      label: "Rate Limit",
      value: rateLimit ? `${rateLimit.remaining}/${rateLimit.limit}` : "—",
      icon: "[≈]",
      href: "/admin/rate-limits",
    },
    {
      label: "Containers",
      value: sandboxAvailable ? "✓" : "—",
      icon: "[⌘]",
      href: "/admin/containers",
    },
    {
      label: "Metrics",
      value: sandboxAvailable ? "✓" : "—",
      icon: "[≡]",
      href: "/admin/metrics",
    },
  ]

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-mono font-semibold text-[var(--color-text)] mb-2">
            Dashboard
          </h1>
          <p className="text-sm font-mono text-[var(--color-text-muted)]">
            Loading system status...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-mono font-semibold text-[var(--color-text)] mb-2">
          Dashboard
        </h1>
        <p className="text-sm font-mono text-[var(--color-text-muted)]">
          System overview and quick access to admin functions
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-[rgba(255,65,54,0.1)] border border-[var(--color-error)] rounded text-sm font-mono text-[var(--color-error)]">
          <span className="mr-2">⚠</span>
          {error}
        </div>
      )}

      {/* System health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 border rounded ${cmsAvailable ? "border-[var(--color-accent)] bg-[var(--color-accent-glow)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-[var(--color-text-dim)]">[📝]</span>
            <span className="text-sm font-mono text-[var(--color-text)]">CMS / GitHub</span>
          </div>
          <p className={`text-xs font-mono ${cmsAvailable ? "text-[var(--color-accent)]" : "text-[var(--color-error)]"}`}>
            {cmsAvailable ? "● Connected" : "● Disconnected"}
          </p>
        </div>

        <div className={`p-4 border rounded ${sandboxAvailable ? "border-[var(--color-accent)] bg-[var(--color-accent-glow)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-[var(--color-text-dim)]">[⌘]</span>
            <span className="text-sm font-mono text-[var(--color-text)]">Sandbox API</span>
          </div>
          <p className={`text-xs font-mono ${sandboxAvailable ? "text-[var(--color-accent)]" : "text-[var(--color-error)]"}`}>
            {sandboxAvailable ? "● Connected" : "● Disconnected"}
          </p>
        </div>

        <div className="p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-[var(--color-text-dim)]">[≈]</span>
            <span className="text-sm font-mono text-[var(--color-text)]">GitHub Rate Limit</span>
          </div>
          <p className="text-xs font-mono text-[var(--color-text)]">
            {rateLimit ? (
              <>
                <span className={rateLimit.remaining < 100 ? "text-[var(--color-error)]" : "text-[var(--color-accent)]"}>
                  {rateLimit.remaining}
                </span>
                <span className="text-[var(--color-text-dim)]"> / {rateLimit.limit} remaining</span>
              </>
            ) : (
              <span className="text-[var(--color-text-dim)]">Unavailable</span>
            )}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-mono font-semibold text-[var(--color-text)] mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href ?? "#"}
              className="group p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-[var(--color-text-dim)]">
                  {metric.icon}
                </span>
                <span className="text-xs font-mono text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                  →
                </span>
              </div>
              <p className="text-sm font-mono text-[var(--color-text)]">
                {metric.label}
              </p>
              <p className="text-xs font-mono text-[var(--color-text-dim)] mt-1">
                {metric.value}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent commits */}
      {recentCommits.length > 0 && (
        <div>
          <h2 className="text-sm font-mono font-semibold text-[var(--color-text)] mb-3">
            Recent Commits
          </h2>
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded overflow-hidden">
            {recentCommits.map((commit, index) => (
              <div
                key={commit.sha}
                className={`px-4 py-3 flex items-start gap-3 ${
                  index !== recentCommits.length - 1 ? "border-b border-[var(--color-border)]" : ""
                }`}
              >
                <span className="text-xs font-mono text-[var(--color-text-dim)] mt-0.5 flex-shrink-0">
                  [{commit.sha.slice(0, 6)}]
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-[var(--color-text)] truncate">
                    {commit.message}
                  </p>
                  <p className="text-xs font-mono text-[var(--color-text-dim)] mt-1">
                    {formatTimestamp(commit.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Getting started */}
      {recentCommits.length === 0 && !error && (
        <div className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded text-center">
          <span className="text-3xl mb-3 block">[▓]</span>
          <h3 className="text-sm font-mono font-semibold text-[var(--color-text)] mb-2">
            Welcome to the Admin Dashboard
          </h3>
          <p className="text-xs font-mono text-[var(--color-text-muted)] mb-4">
            Use the quick actions above to manage your content, view metrics, and configure the system.
          </p>
          <Link
            href="/admin/cms"
            className="inline-block px-4 py-2 text-xs font-mono border border-[var(--color-accent)] rounded text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)] transition-colors"
          >
            [→] Open Content Editor
          </Link>
        </div>
      )}
    </div>
  )
}
