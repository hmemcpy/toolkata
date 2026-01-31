import { useState } from "react"

/**
 * Container info from the admin API.
 */
export interface ContainerInfo {
  readonly id: string
  readonly name: string
  readonly status: "running" | "stopped" | "exited" | "dead" | "paused" | "restarting" | "created"
  readonly image: string
  readonly createdAt: number
  readonly startedAt?: number
  readonly toolPair?: string
  readonly sessionId?: string
  readonly cpuPercent?: number
  readonly memoryUsage?: number
  readonly memoryLimit?: number
  readonly memoryPercent?: number
}

/**
 * ContainerGrid props.
 */
interface ContainerGridProps {
  readonly containers: readonly ContainerInfo[]
  readonly onRestart?: (containerId: string) => void
  readonly onStop?: (containerId: string) => void
  readonly onRemove?: (containerId: string, force?: boolean) => void
  readonly onViewLogs?: (containerId: string) => void
  readonly isActionPending?: boolean
}

/**
 * Sortable column keys.
 */
type SortColumn =
  | "name"
  | "status"
  | "toolPair"
  | "sessionId"
  | "createdAt"
  | "cpuPercent"
  | "memoryPercent"

/**
 * Sort direction.
 */
type SortDirection = "asc" | "desc"

/**
 * ContainerGrid component.
 *
 * Displays containers in a sortable table with filtering.
 * Features:
 * - Sortable columns (click header to sort)
 * - Filter by status, toolPair
 * - Search by container name or ID
 * - Terminal aesthetic styling
 * - Responsive table with horizontal scroll on small screens
 * - Restart, stop, remove, view logs actions
 */
export function ContainerGrid(props: ContainerGridProps) {
  const { containers, onRestart, onStop, onRemove, onViewLogs, isActionPending } = props
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [toolPairFilter, setToolPairFilter] = useState<string>("all")
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [selectedContainerId, setSelectedContainerId] = useState("")
  const [selectedContainerName, setSelectedContainerName] = useState("")

  // Get unique tool pairs from containers
  const toolPairs = Array.from(
    new Set(containers.map((c) => c.toolPair).filter((pair): pair is string => pair !== undefined)),
  ).sort()

  // Filter containers
  const filteredContainers = containers.filter((container) => {
    // Status filter
    if (statusFilter !== "all" && container.status !== statusFilter) {
      return false
    }

    // Tool pair filter
    if (toolPairFilter !== "all" && container.toolPair !== toolPairFilter) {
      return false
    }

    // Search query (name or ID)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        container.name.toLowerCase().includes(query) ||
        container.id.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Sort by column
  const sortedContainers = [...filteredContainers].sort((a, b) => {
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    // Handle undefined values (sort them last)
    if (aVal === undefined && bVal === undefined) return 0
    if (aVal === undefined) return 1
    if (bVal === undefined) return -1

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

  // Handle remove button click (with confirmation)
  function handleRemoveClick(container: ContainerInfo) {
    setSelectedContainerId(container.id)
    setSelectedContainerName(container.name)
    setShowRemoveConfirm(true)
  }

  // Confirm remove
  function handleConfirmRemove(force = false) {
    if (onRemove && selectedContainerId) {
      onRemove(selectedContainerId, force)
    }
    setShowRemoveConfirm(false)
    setSelectedContainerId("")
    setSelectedContainerName("")
  }

  // Cancel remove
  function handleCancelRemove() {
    setShowRemoveConfirm(false)
    setSelectedContainerId("")
    setSelectedContainerName("")
  }

  // Format timestamp as relative time
  function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  // Format memory as MB/GB
  function formatMemory(bytes?: number): string {
    if (bytes === undefined) return "N/A"
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }

  // Truncate container ID for display
  function truncateId(id: string): string {
    return id.length > 12 ? `${id.substring(0, 12)}...` : id
  }

  // Get status color class
  function getStatusColorClass(status: ContainerInfo["status"]): string {
    switch (status) {
      case "running":
        return "text-[var(--color-accent)]"
      case "stopped":
      case "exited":
        return "text-[var(--color-error)]"
      case "dead":
        return "text-[var(--color-warning)]"
      case "paused":
        return "text-[var(--color-text-muted)]"
      case "restarting":
        return "text-[var(--color-accent-alt)]"
      case "created":
        return "text-[var(--color-text-dim)]"
      default:
        return "text-[var(--color-text-muted)]"
    }
  }

  // Get status icon
  function getStatusIcon(status: ContainerInfo["status"]): string {
    switch (status) {
      case "running":
        return "●"
      case "stopped":
      case "exited":
        return "■"
      case "dead":
        return "✕"
      case "paused":
        return "❚❚"
      case "restarting":
        return "↻"
      case "created":
        return "○"
      default:
        return "?"
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2">
          <label htmlFor="search" className="text-sm font-mono text-[var(--color-text-muted)]">
            Search:
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name or ID..."
            className="flex-1 px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--color-accent)]"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-mono text-[var(--color-text-muted)]">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--color-accent)]"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="exited">Exited</option>
            <option value="dead">Dead</option>
            <option value="paused">Paused</option>
            <option value="restarting">Restarting</option>
            <option value="created">Created</option>
          </select>
        </div>

        {/* Tool pair filter */}
        {toolPairs.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="toolpair-filter" className="text-sm font-mono text-[var(--color-text-muted)]">
              Tool:
            </label>
            <select
              id="toolpair-filter"
              value={toolPairFilter}
              onChange={(e) => setToolPairFilter(e.target.value)}
              className="px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--color-accent)]"
            >
              <option value="all">All</option>
              {toolPairs.map((pair) => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border border-[var(--color-border)] rounded bg-[var(--color-surface)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Name{getSortIndicator("name")}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Status{getSortIndicator("status")}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("toolPair")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Tool Pair{getSortIndicator("toolPair")}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Session ID
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("createdAt")}
                  className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Created{getSortIndicator("createdAt")}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("cpuPercent")}
                  className="flex items-center gap-1 justify-end focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  CPU{getSortIndicator("cpuPercent")}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
                <button
                  type="button"
                  onClick={() => handleSort("memoryPercent")}
                  className="flex items-center gap-1 justify-end focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
                >
                  Memory{getSortIndicator("memoryPercent")}
                </button>
              </th>
              <th className="px-4 py-3 text-center font-mono font-semibold text-[var(--color-text)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedContainers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)] font-mono">
                  {containers.length === 0
                    ? "No containers found"
                    : "No containers match your filters"}
                </td>
              </tr>
            ) : (
              sortedContainers.map((container) => (
                <tr
                  key={container.id}
                  className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="px-4 py-3 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[var(--color-text)]" title={container.name}>
                        {container.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-dim)]" title={container.id}>
                        {truncateId(container.id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className={getStatusColorClass(container.status)}>
                      {getStatusIcon(container.status)} {container.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)]">
                    {container.toolPair ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-muted)]">
                    <span className="text-xs" title={container.sessionId}>
                      {container.sessionId ? truncateId(container.sessionId) : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-muted)]">
                    {formatRelativeTime(container.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-text)]">
                    {container.cpuPercent !== undefined
                      ? `${container.cpuPercent.toFixed(1)}%`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <div className="flex flex-col items-end">
                      <span className="text-[var(--color-text)]">
                        {container.memoryPercent !== undefined
                          ? `${container.memoryPercent.toFixed(1)}%`
                          : "N/A"}
                      </span>
                      <span className="text-xs text-[var(--color-text-dim)]">
                        {formatMemory(container.memoryUsage)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {onViewLogs && (
                        <button
                          type="button"
                          onClick={() => onViewLogs(container.id)}
                          disabled={isActionPending}
                          className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
                          title="View logs"
                        >
                          [log]
                        </button>
                      )}
                      {onRestart && container.status !== "running" && (
                        <button
                          type="button"
                          onClick={() => onRestart(container.id)}
                          disabled={isActionPending}
                          className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
                          title="Restart container"
                        >
                          [↻]
                        </button>
                      )}
                      {onStop && container.status === "running" && (
                        <button
                          type="button"
                          onClick={() => onStop(container.id)}
                          disabled={isActionPending || container.status !== "running"}
                          className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent-alt)] hover:text-[var(--color-accent-alt)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
                          title="Stop container"
                        >
                          [■]
                        </button>
                      )}
                      {onRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveClick(container)}
                          disabled={isActionPending}
                          className="px-2 py-1 text-xs font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-error)] hover:text-[var(--color-error)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
                          title="Remove container"
                        >
                          [×]
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-xs font-mono text-[var(--color-text-dim)]">
        Showing {sortedContainers.length} of {containers.length} containers
      </div>

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCancelRemove}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleCancelRemove()
            }
          }}
          role="presentation"
          style={{ cursor: "pointer" }}
        >
          <div
            className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-confirm-title"
          >
            <div className="px-6 py-4">
              <h3 id="remove-confirm-title" className="text-lg font-semibold font-mono text-[var(--color-text)] mb-2">
                Remove Container?
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Are you sure you want to remove container{" "}
                <code className="px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-xs font-mono text-[var(--color-accent)]">
                  {selectedContainerName}
                </code>
                ? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelRemove}
                  disabled={isActionPending}
                  className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmRemove(false)}
                  disabled={isActionPending}
                  className="px-4 py-2 text-sm font-mono border border-[var(--color-warning)] rounded text-[var(--color-warning)] hover:bg-[var(--color-warning)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActionPending ? "Removing..." : "Remove"}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmRemove(true)}
                  disabled={isActionPending}
                  className="px-4 py-2 text-sm font-mono bg-[var(--color-error)] text-white rounded hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Force
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
 * ContainerGridSkeleton props.
 */
interface ContainerGridSkeletonProps {
  readonly rowCount?: number
}

/**
 * Skeleton loader for the container grid.
 *
 * Shows a shimmering placeholder while data is loading.
 * Follows terminal aesthetic with subtle animation.
 */
export function ContainerGridSkeleton(props: ContainerGridSkeletonProps) {
  const { rowCount = 5 } = props

  // Generate stable keys for skeleton rows
  const skeletonRows = Array.from({ length: rowCount }, (_, index) => `skeleton-${index}`)

  return (
    <div className="space-y-4">
      {/* Skeleton filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2">
          <div className="w-14 h-8 bg-[var(--color-border)] rounded animate-pulse" />
          <div className="flex-1 h-10 bg-[var(--color-border)] rounded animate-pulse" />
        </div>
        <div className="w-32 h-10 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="w-32 h-10 bg-[var(--color-border)] rounded animate-pulse" />
      </div>

      {/* Skeleton table */}
      <div className="border border-[var(--color-border)] rounded bg-[var(--color-surface)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Name
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Status
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Tool Pair
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Session ID
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[var(--color-text)]">
                Created
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)]">
                CPU
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-text)]">
                Memory
              </th>
              <th className="px-4 py-3 text-center font-mono font-semibold text-[var(--color-text)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((key) => (
              <tr key={key} className="border-b border-[var(--color-border)] last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-32 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-3 w-24 bg-[var(--color-border)] rounded animate-pulse opacity-50" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-16 bg-[var(--color-border)] rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-20 bg-[var(--color-border)] rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-24 bg-[var(--color-border)] rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-16 bg-[var(--color-border)] rounded animate-pulse" />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="h-4 w-12 ml-auto bg-[var(--color-border)] rounded animate-pulse" />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col gap-1 items-end">
                    <div className="h-4 w-12 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-3 w-16 bg-[var(--color-border)] rounded animate-pulse opacity-50" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-7 w-12 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-7 w-8 bg-[var(--color-border)] rounded animate-pulse" />
                    <div className="h-7 w-8 bg-[var(--color-border)] rounded animate-pulse" />
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

