"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RateLimitTable, RateLimitTableSkeleton } from "../../../../components/admin/RateLimitTable"
import type { RateLimitInfo, AdjustRateLimitRequest } from "../../../../components/admin/RateLimitTable"

/**
 * RateLimitsClient props.
 */
interface RateLimitsClientProps {
  readonly rateLimits: readonly RateLimitInfo[]
  readonly error: string | null
  readonly refreshRateLimits: () => Promise<void>
  readonly resetRateLimit: (clientId: string) => Promise<void>
  readonly adjustRateLimit: (clientId: string, params: AdjustRateLimitRequest) => Promise<void>
}

/**
 * Client component for rate limits page with action handlers.
 *
 * Handles the interactive parts of the page:
 * - Reset rate limit with confirmation
 * - Adjust rate limit with modal
 * - Refresh data
 * - Loading states
 * - Error display with retry
 */
export function RateLimitsClient(props: RateLimitsClientProps) {
  const { rateLimits, error, refreshRateLimits, resetRateLimit, adjustRateLimit } = props
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Handle reset action
  async function handleReset(clientId: string) {
    startTransition(async () => {
      try {
        await resetRateLimit(clientId)
        router.refresh()
      } catch (error) {
        console.error("Failed to reset rate limit:", error)
      }
    })
  }

  // Handle adjust action
  async function handleAdjust(clientId: string, params: AdjustRateLimitRequest) {
    startTransition(async () => {
      try {
        await adjustRateLimit(clientId, params)
        router.refresh()
      } catch (error) {
        console.error("Failed to adjust rate limit:", error)
      }
    })
  }

  // Handle refresh
  async function handleRefresh() {
    startTransition(async () => {
      try {
        await refreshRateLimits()
        router.refresh()
      } catch (error) {
        console.error("Failed to refresh rate limits:", error)
      }
    })
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-mono text-[var(--color-text)]">
              [≈] Rate Limits
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              View and manage rate limit status for all clients
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            [↻] {isPending ? "Retrying..." : "Retry"}
          </button>
        </div>

        {/* Error State */}
        <ErrorState message={error} onRetry={handleRefresh} isRetrying={isPending} />
      </div>
    )
  }

  // Show skeleton while initial data is loading (empty array with no error means loading)
  if (rateLimits.length === 0 && !error) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-mono text-[var(--color-text)]">
              [≈] Rate Limits
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              View and manage rate limit status for all clients
            </p>
          </div>
        </div>

        {/* Skeleton */}
        <RateLimitTableSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-mono text-[var(--color-text)]">
            [≈] Rate Limits
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            View and manage rate limit status for all clients
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          [↻] {isPending ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Rate limits table or empty state */}
      {rateLimits.length === 0 ? (
        <EmptyState />
      ) : (
        <RateLimitTable
          rateLimits={rateLimits}
          onReset={handleReset}
          onAdjust={handleAdjust}
          isActionPending={isPending}
        />
      )}
    </div>
  )
}

/**
 * Error state when data fetch fails.
 */
interface ErrorStateProps {
  readonly message: string
  readonly onRetry: () => void
  readonly isRetrying: boolean
}

function ErrorState(props: ErrorStateProps) {
  const { message, onRetry, isRetrying } = props
  return (
    <div className="border border-[var(--color-error)] rounded bg-[var(--color-surface)] p-12 text-center">
      <p className="text-[var(--color-error)] font-mono text-sm mb-2">
        [!] Error loading rate limits
      </p>
      <p className="text-[var(--color-text-muted)] font-mono text-sm mb-6">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="px-4 py-2 text-sm font-mono bg-[var(--color-error)] text-white rounded hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRetrying ? "Retrying..." : "Retry"}
      </button>
    </div>
  )
}

/**
 * Empty state when no rate limits exist yet.
 */
function EmptyState() {
  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-surface)] p-12 text-center">
      <p className="text-[var(--color-text-muted)] font-mono text-sm">
        No rate limit activity yet
      </p>
      <p className="mt-2 text-[var(--color-text-dim)] font-mono text-xs">
        Rate limits will appear here when clients use the sandbox API
      </p>
    </div>
  )
}
