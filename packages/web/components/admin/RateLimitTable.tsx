"use client"

import { useState } from "react"

/**
 * Rate limit info from the admin API.
 */
export interface RateLimitInfo {
  readonly clientId: string
  readonly sessionCount: number
  readonly sessionsPerHour: number
  readonly hourWindowStart: number
  readonly hourWindowEnd: number
  readonly activeSessions: readonly string[]
  readonly commandCount: number
  readonly commandsPerMinute: number
  readonly minuteWindowStart: number
  readonly minuteWindowEnd: number
  readonly activeWebSocketIds: readonly string[]
  readonly maxConcurrentSessions: number
  readonly maxConcurrentWebSockets: number
}

/**
 * RateLimitTable props.
 */
interface RateLimitTableProps {
  readonly rateLimits: readonly RateLimitInfo[]
}

/**
 * Sortable column keys.
 */
type SortColumn =
  | "clientId"
  | "sessionCount"
  | "commandCount"
  | "hourWindowStart"
  | "minuteWindowStart"

/**
 * Sort direction.
 */
type SortDirection = "asc" | "desc"

/**
 * RateLimitTable component.
 *
 * Displays rate limit status for all clients in a sortable table.
 * Features:
 * - Sortable columns (click header to sort)
 * - Search/filter by client ID
 * - Terminal aesthetic styling
 * - Responsive table with horizontal scroll on small screens
 *
 * Note: Reset and Adjust actions are placeholders for P1.4 implementation.
 */
export function RateLimitTable(props: RateLimitTableProps) {
  const { rateLimits } = props
  const [sortColumn, setSortColumn] = useState<SortColumn>("clientId")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter by search query
  const filteredRateLimits = rateLimits.filter((limit) =>
    limit.clientId.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Sort by column
  const sortedRateLimits = [...filteredRateLimits].sort((a, b) => {
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    }

    return 0
  })

  // Toggle sort direction and column
  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Get sort indicator
  function getSortIndicator(column: SortColumn): string {
    if (sortColumn !== column) return ""
    return sortDirection === "asc" ? " ▲" : " ▼"
  }

  // Format timestamp as relative time
  function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    return `${hours}h ago`
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <label htmlFor="search" className="text-sm font-mono text-[var(--color-text-muted)]">
          Filter:
        </label>
        <input
          id="search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Client ID..."
          className="flex-1 px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--color-accent)]"
        />
      </div>

      {/* Table */}
      <div className="border border-[var(--color-border)] rounded bg-[var(--color-surface)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("clientId")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Client ID{getSortIndicator("clientId")}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("sessionCount")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Sessions{getSortIndicator("sessionCount")}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("commandCount")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Commands{getSortIndicator("commandCount")}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                WebSockets
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("hourWindowStart")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Hour Window{getSortIndicator("hourWindowStart")}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("minuteWindowStart")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Minute Window{getSortIndicator("minuteWindowStart")}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRateLimits.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)] font-mono">
                  No rate limits match your filter
                </td>
              </tr>
            ) : (
              sortedRateLimits.map((limit) => (
                <RateLimitRow
                  key={limit.clientId}
                  rateLimit={limit}
                  formatRelativeTime={formatRelativeTime}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-xs font-mono text-[var(--color-text-dim)]">
        Showing {sortedRateLimits.length} of {rateLimits.length} rate limits
      </div>
    </div>
  )
}

/**
 * Single rate limit row.
 */
interface RateLimitRowProps {
  readonly rateLimit: RateLimitInfo
  readonly formatRelativeTime: (timestamp: number) => string
}

function RateLimitRow(props: RateLimitRowProps) {
  const { rateLimit, formatRelativeTime } = props

  // Calculate session usage percentage
  const sessionUsage = rateLimit.maxConcurrentSessions > 0
    ? Math.round((rateLimit.sessionCount / rateLimit.maxConcurrentSessions) * 100)
    : 0

  // Calculate command usage percentage (per minute)
  const commandUsage = rateLimit.commandsPerMinute > 0
    ? Math.round((rateLimit.commandCount / rateLimit.commandsPerMinute) * 100)
    : 0

  // Get usage color class
  function getUsageColorClass(usage: number): string {
    if (usage >= 90) return "text-[var(--color-error)]"
    if (usage >= 70) return "text-[var(--color-warning)]"
    return "text-[var(--color-accent)]"
  }

  return (
    <tr className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors">
      <td className="px-4 py-3 font-mono text-[var(--color-text)]">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[200px]" title={rateLimit.clientId}>
            {rateLimit.clientId}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono">
        <div className="flex flex-col">
          <span className={getUsageColorClass(sessionUsage)}>
            {rateLimit.sessionCount} / {rateLimit.maxConcurrentSessions}
          </span>
          {rateLimit.activeSessions.length > 0 && (
            <span className="text-xs text-[var(--color-text-dim)]">
              {rateLimit.activeSessions.length} active
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 font-mono">
        <div className="flex flex-col">
          <span className={getUsageColorClass(commandUsage)}>
            {rateLimit.commandCount}
          </span>
          <span className="text-xs text-[var(--color-text-dim)]">
            / {rateLimit.commandsPerMinute}/min
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono">
        <div className="flex flex-col">
          <span className="text-[var(--color-text)]">
            {rateLimit.activeWebSocketIds.length}
          </span>
          <span className="text-xs text-[var(--color-text-dim)]">
            / {rateLimit.maxConcurrentWebSockets}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-[var(--color-text-muted)]">
        <div className="flex flex-col">
          <span>{formatRelativeTime(rateLimit.hourWindowStart)}</span>
          <span className="text-xs text-[var(--color-text-dim)]">
            ends {formatRelativeTime(rateLimit.hourWindowEnd)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-[var(--color-text-muted)]">
        <div className="flex flex-col">
          <span>{formatRelativeTime(rateLimit.minuteWindowStart)}</span>
          <span className="text-xs text-[var(--color-text-dim)]">
            ends {formatRelativeTime(rateLimit.minuteWindowEnd)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Reset button - to be implemented in P1.4 */}
          <button
            type="button"
            disabled
            className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
            title="Reset rate limit (to be implemented)"
          >
            [↻]
          </button>
          {/* Adjust button - to be implemented in P1.3/P1.4 */}
          <button
            type="button"
            disabled
            className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
            title="Adjust rate limit (to be implemented)"
          >
            [⚙]
          </button>
        </div>
      </td>
    </tr>
  )
}
