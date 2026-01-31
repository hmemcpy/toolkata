import { revalidatePath } from "next/cache"
import { getSandboxHttpUrl, ADMIN_API_KEY } from "../../../lib/sandbox-url"
import { RateLimitTable, type RateLimitInfo } from "../../../components/admin/RateLimitTable"

/**
 * Rate limits admin page.
 *
 * Displays all current rate limit statuses for clients using the sandbox API.
 * Fetches data server-side and renders the RateLimitTable component.
 *
 * Features:
 * - Server-side data fetching for fast initial load
 * - Refresh button to revalidate and fetch fresh data
 * - Empty state when no rate limits exist
 * - Terminal aesthetic styling
 */
export default async function RateLimitsPage() {
  // Fetch rate limits from admin API
  const rateLimits = await fetchRateLimits()

  // Server action to refresh rate limit data
  async function refreshRateLimits() {
    "use server"
    revalidatePath("/admin/rate-limits")
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
        <form action={refreshRateLimits}>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            [↻] Refresh
          </button>
        </form>
      </div>

      {/* Rate limits table or empty state */}
      {rateLimits.length === 0 ? (
        <EmptyState />
      ) : (
        <RateLimitTable
          rateLimits={rateLimits}
        />
      )}
    </div>
  )
}

/**
 * Fetch rate limits from admin API.
 */
async function fetchRateLimits(): Promise<readonly RateLimitInfo[]> {
  try {
    const apiUrl = getSandboxHttpUrl()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (ADMIN_API_KEY !== "") {
      headers["X-Admin-Key"] = ADMIN_API_KEY
    }

    const response = await fetch(`${apiUrl}/admin/rate-limits`, {
      headers,
      // Don't cache - always show fresh data
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`Failed to fetch rate limits: ${response.status}`)
      return []
    }

    const data = (await response.json()) as { readonly rateLimits: readonly RateLimitInfo[] }
    return data.rateLimits
  } catch (error) {
    console.error("Error fetching rate limits:", error)
    return []
  }
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
