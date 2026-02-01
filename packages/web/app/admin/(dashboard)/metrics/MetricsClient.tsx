"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type {
  SystemMetricsInfo,
  SandboxMetricsInfo,
  RateLimitMetricsInfo,
} from "./MetricsTypes"

/**
 * MetricsClient props.
 */
interface MetricsClientProps {
  readonly systemMetrics: SystemMetricsInfo | null
  readonly sandboxMetrics: SandboxMetricsInfo | null
  readonly rateLimitMetrics: RateLimitMetricsInfo | null
  readonly error: string | null
  readonly refreshMetrics: () => Promise<void>
}

/**
 * Auto-refresh interval (30 seconds).
 */
const REFRESH_INTERVAL = 30000

/**
 * MetricsClient component.
 *
 * Client-side component that handles auto-refresh and displays metrics panels.
 * Features:
 * - Auto-refresh every 30 seconds
 * - Last updated timestamp display
 * - Manual refresh button
 * - Three sections: System, Sandbox, Rate Limits
 * - Error display with retry button
 */
export function MetricsClient(props: MetricsClientProps) {
  const {
    systemMetrics: initialSystemMetrics,
    sandboxMetrics: initialSandboxMetrics,
    rateLimitMetrics: initialRateLimitMetrics,
    error,
    refreshMetrics,
  } = props

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh()
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Handle refresh
  function handleRefresh() {
    startTransition(async () => {
      await refreshMetrics()
      setLastUpdated(new Date())
      router.refresh()
    })
  }

  // Format timestamp as readable time
  function formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold font-mono text-[var(--color-text)]">
            Metrics
          </h1>
          <span className="text-sm font-mono text-[var(--color-text-dim)]">
            Last updated: {formatTime(lastUpdated)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          [{isPending ? "Refreshing..." : "Refresh"}]
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 border border-[var(--color-warning)] rounded bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-[var(--color-warning)]">{error}</span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              className="px-3 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              [Retry]
            </button>
          </div>
        </div>
      )}

      {/* Metrics Panels */}
      <div className="space-y-6">
        {/* System Metrics */}
        <section>
          <h2 className="text-lg font-semibold font-mono text-[var(--color-text)] mb-4">
            System
          </h2>
          {initialSystemMetrics ? (
            <SystemPanel metrics={initialSystemMetrics} />
          ) : (
            <div className="p-4 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-center text-[var(--color-text-muted)] font-mono text-sm">
              System metrics unavailable
            </div>
          )}
        </section>

        {/* Sandbox Metrics */}
        <section>
          <h2 className="text-lg font-semibold font-mono text-[var(--color-text)] mb-4">
            Sandbox
          </h2>
          {initialSandboxMetrics ? (
            <SandboxPanel metrics={initialSandboxMetrics} />
          ) : (
            <div className="p-4 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-center text-[var(--color-text-muted)] font-mono text-sm">
              Sandbox metrics unavailable
            </div>
          )}
        </section>

        {/* Rate Limit Metrics */}
        <section>
          <h2 className="text-lg font-semibold font-mono text-[var(--color-text)] mb-4">
            Rate Limits
          </h2>
          {initialRateLimitMetrics ? (
            <RateLimitPanel metrics={initialRateLimitMetrics} />
          ) : (
            <div className="p-4 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-center text-[var(--color-text-muted)] font-mono text-sm">
              Rate limit metrics unavailable
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * SystemPanel props.
 */
interface SystemPanelProps {
  readonly metrics: SystemMetricsInfo
}

/**
 * SystemPanel component.
 *
 * Displays system metrics in a grid layout.
 * Shows CPU, memory, disk, and network stats with color coding for thresholds.
 */
function SystemPanel(props: SystemPanelProps) {
  const { metrics } = props

  // Format bytes as MB/GB
  function formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }

  // Get color class based on percentage threshold
  function getPercentColorClass(percent: number): string {
    if (percent >= 90) return "text-[var(--color-error)]"
    if (percent >= 80) return "text-[var(--color-warning)]"
    if (percent >= 60) return "text-[var(--color-accent-alt)]"
    return "text-[var(--color-accent)]"
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU */}
      <MetricCard
        label="CPU"
        value={`${metrics.cpu.percent.toFixed(1)}%`}
        detail={`Load: ${metrics.cpu.loadAvg[0]?.toFixed(2) ?? "0"} (${metrics.cpu.cpuCount} cores)`}
        colorClass={getPercentColorClass(metrics.cpu.percent)}
      />

      {/* Memory */}
      <MetricCard
        label="Memory"
        value={`${metrics.memory.percent.toFixed(1)}%`}
        detail={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
        colorClass={getPercentColorClass(metrics.memory.percent)}
      />

      {/* Disk */}
      <MetricCard
        label="Disk"
        value={`${metrics.disk.percent.toFixed(1)}%`}
        detail={`${formatBytes(metrics.disk.used)} / ${formatBytes(metrics.disk.total)}`}
        colorClass={getPercentColorClass(metrics.disk.percent)}
      />

      {/* Network */}
      <MetricCard
        label="Network"
        value="RX/TX"
        detail={`↓ ${formatBytes(metrics.network.rxBytes)} / ↑ ${formatBytes(metrics.network.txBytes)}`}
        colorClass="text-[var(--color-text)]"
      />
    </div>
  )
}

/**
 * SandboxPanel props.
 */
interface SandboxPanelProps {
  readonly metrics: SandboxMetricsInfo
}

/**
 * SandboxPanel component.
 *
 * Displays sandbox metrics in a grid layout.
 * Shows session counts, container count, and errors.
 */
function SandboxPanel(props: SandboxPanelProps) {
  const { metrics } = props

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Sessions"
        value={metrics.totalSessions.toString()}
        detail="All time"
        colorClass="text-[var(--color-text)]"
      />

      <MetricCard
        label="Running Sessions"
        value={metrics.runningSessions.toString()}
        detail="Active now"
        colorClass={
          metrics.runningSessions > 0
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-text-muted)]"
        }
      />

      <MetricCard
        label="Containers"
        value={metrics.containers.toString()}
        detail="Docker containers"
        colorClass="text-[var(--color-text)]"
      />

      <MetricCard
        label="Errors"
        value={metrics.errors.toString()}
        detail="Error count"
        colorClass={
          metrics.errors > 0 ? "text-[var(--color-error)]" : "text-[var(--color-text-muted)]"
        }
      />
    </div>
  )
}

/**
 * RateLimitPanel props.
 */
interface RateLimitPanelProps {
  readonly metrics: RateLimitMetricsInfo
}

/**
 * RateLimitPanel component.
 *
 * Displays rate limit metrics in a grid layout.
 * Shows client counts, violations, and top clients.
 */
function RateLimitPanel(props: RateLimitPanelProps) {
  const { metrics } = props

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Clients"
          value={metrics.totalClients.toString()}
          detail="Known clients"
          colorClass="text-[var(--color-text)]"
        />

        <MetricCard
          label="Active Clients"
          value={metrics.activeClients.toString()}
          detail="With activity"
          colorClass={
            metrics.activeClients > 0
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-muted)]"
          }
        />

        <MetricCard
          label="Violations"
          value={metrics.violations.toString()}
          detail="Rate limit hits"
          colorClass={
            metrics.violations > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"
          }
        />

        {/* Empty card for layout balance */}
        <MetricCard
          label="Top Clients"
          value={metrics.topClients.length.toString()}
          detail="By activity"
          colorClass="text-[var(--color-text)]"
        />
      </div>

      {/* Top clients table */}
      {metrics.topClients.length > 0 && (
        <div className="border border-[var(--color-border)] rounded bg-[var(--color-surface)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                  Client ID
                </th>
                <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)]">
                  Sessions
                </th>
                <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)]">
                  Commands
                </th>
                <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)]">
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.topClients.map((client) => (
                <tr
                  key={client.clientId}
                  className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">
                    <code className="text-xs">{client.clientId}</code>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-text)]">
                    {client.sessionCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-text)]">
                    {client.commandCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-accent)]">
                    {client.activeSessions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * MetricCard props.
 */
interface MetricCardProps {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly colorClass: string
}

/**
 * MetricCard component.
 *
 * Single metric card with label, value, and detail.
 * Color coding for thresholds based on colorClass prop.
 */
function MetricCard(props: MetricCardProps) {
  const { label, value, detail, colorClass } = props

  return (
    <div className="p-4 border border-[var(--color-border)] rounded bg-[var(--color-surface)]">
      <div className="flex flex-col">
        <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wide">
          {label}
        </span>
        <span className={`text-2xl font-semibold font-mono ${colorClass}`}>
          {value}
        </span>
        <span className="text-xs font-mono text-[var(--color-text-dim)] mt-1">
          {detail}
        </span>
      </div>
    </div>
  )
}
