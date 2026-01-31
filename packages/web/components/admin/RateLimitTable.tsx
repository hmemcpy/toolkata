"use client"

import { useState } from "react"
import { AdjustRateLimitModal, type AdjustRateLimitParams } from "./AdjustRateLimitModal"

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
 * Adjust rate limit parameters.
 */
export interface AdjustRateLimitRequest {
  readonly windowDuration?: number
  readonly maxRequests?: number
}

/**
 * RateLimitTable props.
 */
interface RateLimitTableProps {
  readonly rateLimits: readonly RateLimitInfo[]
  readonly onReset?: (clientId: string) => void
  readonly onAdjust?: (clientId: string, params: AdjustRateLimitRequest) => void
  readonly isActionPending?: boolean
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
 * - Reset and Adjust actions with confirmation modal
 */
export function RateLimitTable(props: RateLimitTableProps) {
  const { rateLimits, onReset, onAdjust, isActionPending } = props
  const [sortColumn, setSortColumn] = useState<SortColumn>("clientId")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState("")
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Open adjust modal for a client
  function handleOpenAdjust(clientId: string) {
    setSelectedClientId(clientId)
    setShowAdjustModal(true)
  }

  // Handle adjust modal submit
  function handleAdjustSubmit(params: AdjustRateLimitParams) {
    if (onAdjust && selectedClientId) {
      onAdjust(selectedClientId, params)
    }
    setShowAdjustModal(false)
    setSelectedClientId("")
  }

  // Handle reset button click (with confirmation)
  function handleResetClick(clientId: string) {
    setSelectedClientId(clientId)
    setShowResetConfirm(true)
  }

  // Confirm reset
  function handleConfirmReset() {
    if (onReset && selectedClientId) {
      onReset(selectedClientId)
    }
    setShowResetConfirm(false)
    setSelectedClientId("")
  }

  // Cancel reset
  function handleCancelReset() {
    setShowResetConfirm(false)
    setSelectedClientId("")
  }

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
              sortedRateLimits.map((limit) => {
                // Use conditional object building for exactOptionalPropertyTypes compatibility
                const commonProps = {
                  rateLimit: limit,
                  formatRelativeTime,
                }

                if (onReset && onAdjust) {
                  return (
                    <RateLimitRow
                      key={limit.clientId}
                      {...commonProps}
                      onReset={handleResetClick}
                      onAdjust={handleOpenAdjust}
                      {...(isActionPending !== undefined && { isActionPending })}
                    />
                  )
                }

                if (onReset) {
                  return (
                    <RateLimitRow
                      key={limit.clientId}
                      {...commonProps}
                      onReset={handleResetClick}
                      {...(isActionPending !== undefined && { isActionPending })}
                    />
                  )
                }

                if (onAdjust) {
                  return (
                    <RateLimitRow
                      key={limit.clientId}
                      {...commonProps}
                      onAdjust={handleOpenAdjust}
                      {...(isActionPending !== undefined && { isActionPending })}
                    />
                  )
                }

                return <RateLimitRow key={limit.clientId} {...commonProps} />
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-xs font-mono text-[var(--color-text-dim)]">
        Showing {sortedRateLimits.length} of {rateLimits.length} rate limits
      </div>

      {/* Adjust Modal */}
      {onAdjust && (
        <AdjustRateLimitModal
          isOpen={showAdjustModal}
          clientId={selectedClientId}
          onClose={() => setShowAdjustModal(false)}
          onSubmit={handleAdjustSubmit}
          {...(isActionPending !== undefined && { isLoading: isActionPending })}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCancelReset}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCancelReset()
            }
          }}
          role="presentation"
          style={{ cursor: "pointer" }}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
          >
            <div className="px-6 py-4">
              <h3 id="reset-confirm-title" className="text-lg font-semibold font-mono text-[var(--color-text)] mb-2">
                Reset Rate Limit?
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Are you sure you want to reset the rate limit for client{" "}
                <code className="px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-xs font-mono text-[var(--color-accent)]">
                  {selectedClientId}
                </code>
                ? This will clear their current usage counters.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelReset}
                  disabled={isActionPending}
                  className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isActionPending}
                  className="px-4 py-2 text-sm font-mono bg-[var(--color-error)] text-white rounded hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActionPending ? "Resetting..." : "Reset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Single rate limit row.
 */
interface RateLimitRowProps {
  readonly rateLimit: RateLimitInfo
  readonly formatRelativeTime: (timestamp: number) => string
  readonly onReset?: (clientId: string) => void
  readonly onAdjust?: (clientId: string) => void
  readonly isActionPending?: boolean
}

function RateLimitRow(props: RateLimitRowProps) {
  const { rateLimit, formatRelativeTime, onReset, onAdjust, isActionPending } = props

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
          <button
            type="button"
            onClick={() => onReset?.(rateLimit.clientId)}
            disabled={!onReset || isActionPending}
            className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
            title="Reset rate limit"
          >
            [↻]
          </button>
          <button
            type="button"
            onClick={() => onAdjust?.(rateLimit.clientId)}
            disabled={!onAdjust || isActionPending}
            className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
            title="Adjust rate limit"
          >
            [⚙]
          </button>
        </div>
      </td>
    </tr>
  )
}

/**
 * RateLimitTableSkeleton props.
 */
interface RateLimitTableSkeletonProps {
  readonly rowCount?: number
}

/**
 * Skeleton loader for the rate limit table.
 *
 * Shows a shimmering placeholder while data is loading.
 * Follows terminal aesthetic with subtle animation.
 */
export function RateLimitTableSkeleton(props: RateLimitTableSkeletonProps) {
  const { rowCount = 5 } = props

  // Generate stable keys for skeleton rows (outside of render to avoid linter warning)
  const skeletonRows = Array.from({ length: rowCount }, (_, index) => `skeleton-${index}`)

  return (
    <div className="space-y-4">
      {/* Skeleton search bar */}
      <div className="flex items-center gap-2">
        <div className="w-12 h-8 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="flex-1 h-10 bg-[var(--color-border)] rounded animate-pulse" />
      </div>

      {/* Skeleton table */}
      <div className="border border-[var(--color-border)] rounded bg-[var(--color-surface)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Client ID
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Sessions
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Commands
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                WebSockets
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Hour Window
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Minute Window
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((key) => (
              <tr key={key} className="border-b border-[var(--color-border)] last:border-b-0">
                <td className="px-4 py-3">
                  <div className="h-4 w-32 bg-[var(--color-border)] rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-16 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-3 w-12 bg-[var(--color-border)] rounded animate-pulse opacity-50" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-10 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-3 w-20 bg-[var(--color-border)] rounded animate-pulse opacity-50" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-6 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-3 w-8 bg-[var(--color-border)] rounded animate-pulse opacity-50" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-16 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-3 w-14 bg-[var(--color-border)] rounded animate-pulse opacity-50" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-16 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-3 w-14 bg-[var(--color-border)] rounded animate-pulse opacity-50" />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-7 w-12 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-7 w-12 bg-[var(--color-border)] rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Skeleton summary */}
      <div className="h-4 w-48 bg-[var(--color-border)] rounded animate-pulse" />
    </div>
  )
}
